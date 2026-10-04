'use client';

import React, { useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight, Zap } from 'lucide-react';

interface TrustScreenData {
  wallet: string;
  verified: boolean;
  trustTier: string;
  reputationScore?: number;
  screenedAt: string;
  operationalStatus: string;
  sentinelScore?: number | null;
  uptime24h?: number | null;
  medianLatencyMs?: number | null;
  recommendation: 'PROCEED' | 'CAUTION' | 'REJECT';
  reasons: string[];
}

export function TrustScreenButton({ wallet }: { wallet: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrustScreenData | null>(null);

  const handleRunScreen = async () => {
    setLoading(true);
    setError(null);
    setIsOpen(true);

    try {
      const res = await fetch(`/api/v1/screen?wallet=${encodeURIComponent(wallet)}`);
      if (!res.ok) {
        throw new Error(`Trust screen request failed (${res.status} ${res.statusText})`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to complete SAID trust screen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleRunScreen}
        className="btn btn-primary btn-sm"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.4rem 0.85rem',
          background: 'var(--accent-solana)',
          color: '#000',
          fontWeight: 700,
        }}
      >
        <Zap size={14} />
        <span>Run SAID Trust Screen</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: 580,
              width: '100%',
              padding: '2rem',
              background: 'var(--bg-surface-1)',
              border: '1px solid var(--accent-solana-border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--accent-solana)', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
                  <ShieldCheck size={13} />
                  <span>SAID PROTOCOL TRUST SCREEN</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Automated Agent Screening
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.6rem' }}
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Loader2 size={32} className="spin" style={{ margin: '0 auto 1rem', color: 'var(--accent-solana)' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Querying SAID Protocol &amp; Sentinel Telemetry...
                </p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Analyzing verified identity, trust tier, endpoint reachability, and recent incident history.
                </span>
              </div>
            ) : error ? (
              <div style={{ padding: '1.5rem', background: '#2a1010', border: '1px solid #7f1d1d', borderRadius: 6, color: '#f87171', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  <AlertTriangle size={16} />
                  <span>Screening Error</span>
                </div>
                <p style={{ margin: 0 }}>{error}</p>
              </div>
            ) : result ? (
              <div>
                {/* Recommendation Banner */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 6,
                    marginBottom: '1.25rem',
                    background:
                      result.recommendation === 'PROCEED'
                        ? 'rgba(20, 241, 149, 0.12)'
                        : result.recommendation === 'CAUTION'
                        ? 'rgba(251, 191, 36, 0.12)'
                        : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${
                      result.recommendation === 'PROCEED'
                        ? 'rgba(20, 241, 149, 0.35)'
                        : result.recommendation === 'CAUTION'
                        ? 'rgba(251, 191, 36, 0.35)'
                        : 'rgba(239, 68, 68, 0.35)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  {result.recommendation === 'PROCEED' ? (
                    <CheckCircle2 size={24} color="#14f195" />
                  ) : result.recommendation === 'CAUTION' ? (
                    <AlertTriangle size={24} color="#fbbf24" />
                  ) : (
                    <XCircle size={24} color="#ef4444" />
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      RECOMMENDATION: {result.recommendation}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Screened at {new Date(result.screenedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '0.65rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ padding: '0.75rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SAID VERIFICATION</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: result.verified ? '#14f195' : 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {result.verified ? 'VERIFIED' : 'UNVERIFIED'}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TRUST TIER</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#00f0ff', marginTop: '0.2rem' }}>
                      {result.trustTier}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SENTINEL SCORE</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-solana)', marginTop: '0.2rem' }}>
                      {result.sentinelScore !== null && result.sentinelScore !== undefined ? `${result.sentinelScore}/100` : 'N/A'}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>24H UPTIME</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {result.uptime24h !== null && result.uptime24h !== undefined ? `${result.uptime24h.toFixed(1)}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Evidence Reasons */}
                {result.reasons && result.reasons.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                      Evaluation Factors
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {result.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Machine-payable via x402 header</span>
                  <code className="font-mono">GET /api/v1/screen?wallet=...</code>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
