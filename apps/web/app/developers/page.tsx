import { PageShell } from '@/components/PageShell';
import { CopyButton } from '@/components/CopyButton';
import {
  Code,
  Zap,
  Shield,
  Layers,
  Server,
  Lock,
} from 'lucide-react';
import { SAID_PROGRAM_ID } from '@agentproof/core';

export const dynamic = 'force-dynamic';

export default function DevelopersPage() {
  const baseUrl = '/api/v1';

  return (
    <PageShell>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem', maxWidth: 840 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.2rem 0.65rem',
            background: 'var(--accent-solana-subtle)',
            border: '1px solid var(--accent-solana-border)',
            borderRadius: 4,
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-solana)',
            marginBottom: '0.75rem',
          }}
        >
          <Code size={12} />
          <span>SOLANA AGENT INFRASTRUCTURE • REST API &amp; X402</span>
        </div>

        <h1
          style={{
            fontSize: '2.2rem',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            marginBottom: '0.75rem',
            color: 'var(--text-primary)',
          }}
        >
          Sentinel Developer API Reference
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          A public, machine-readable REST API for querying real-time Solana AI agent reliability, uptime, latency, and SAID Protocol verification.
          CORS enabled across all endpoints for autonomous agent-to-agent routing and frontends.
        </p>
      </div>

      {/* Base URL + Key Properties */}
      <section className="card" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'var(--bg-surface-1)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Base API Path
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
              /api/v1
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <CopyButton text="/api/v1" label="Copy Base Path" />
            <span
              className="badge font-mono"
              style={{
                background: 'var(--status-success-bg)',
                color: 'var(--status-success)',
                border: '1px solid var(--status-success-border)',
              }}
            >
              NETWORK: SOLANA MAINNET
            </span>
            <span
              className="badge font-mono"
              style={{
                background: 'var(--status-limited-bg)',
                color: 'var(--status-limited)',
                border: '1px solid var(--status-limited-border)',
              }}
            >
              CORS ENABLED (*)
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Blockchain', value: 'Solana Mainnet' },
            { label: 'SAID Program', value: `${SAID_PROGRAM_ID.slice(0, 6)}...` },
            { label: 'Authentication', value: 'None (Public Read)' },
            { label: 'Machine Payments', value: 'x402 Header Ready' },
            { label: 'Response Format', value: 'JSON' },
            { label: 'Rate Limiting', value: 'Fair use' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '0.75rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{label}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Endpoint Index Table */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Available REST Endpoints
        </h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Description</th>
                <th>Cache / Auth</th>
              </tr>
            </thead>
            <tbody>
              {[
                { method: 'GET', path: '/health', desc: 'Sentinel service health, Solana network, and SAID program status', cache: 'No cache' },
                { method: 'GET', path: '/network-stats', desc: 'Aggregated network uptime, total probes, and active incidents', cache: '30 s' },
                { method: 'GET', path: '/screen?wallet=:address', desc: 'SAID Trust Screen: Combined identity, trust tier & operational SLA', cache: 'x402 ready' },
                { method: 'GET', path: '/agents', desc: 'Paginated list of discovered Solana AI agents', cache: '30 s' },
                { method: 'GET', path: '/agents/solana/:wallet', desc: 'Single agent SAID identity & metadata details', cache: '30 s' },
                { method: 'GET', path: '/agents/solana/:wallet/reliability', desc: 'Uptime % & latency across 24h / 7d / 30d + Sentinel Score', cache: '30 s' },
                { method: 'GET', path: '/agents/solana/:wallet/services', desc: 'Declared MCP and A2A service endpoints', cache: '30 s' },
                { method: 'GET', path: '/agents/solana/:wallet/observations', desc: 'Forensic probe observation audit trail', cache: 'No cache' },
                { method: 'GET', path: '/agents/solana/:wallet/badge.svg', desc: 'Live embeddable SVG uptime badge for GitHub/Docs', cache: '60 s' },
                { method: 'POST', path: '/api/cron/monitor', desc: 'Trigger background monitoring cycle (Secured via CRON_SECRET)', cache: 'Bearer token' },
              ].map(({ method, path, desc, cache }) => (
                <tr key={path}>
                  <td>
                    <span
                      className="badge font-mono"
                      style={{
                        background: method === 'GET' ? 'rgba(20, 241, 149, 0.12)' : 'rgba(0, 240, 255, 0.12)',
                        color: method === 'GET' ? '#14f195' : '#00f0ff',
                        fontSize: '0.7rem',
                      }}
                    >
                      {method}
                    </span>
                  </td>
                  <td>
                    <code className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--accent-solana)' }}>
                      {path}
                    </code>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{desc}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{cache}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Featured: Trust Screening Endpoint & x402 */}
      <section className="card" style={{ padding: '2rem', marginBottom: '2.5rem', background: 'var(--bg-surface-1)', border: '1px solid var(--accent-solana-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--accent-solana)' }}>
          <Zap size={20} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Machine-Payable Trust Screening: GET /api/v1/screen
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Autonomous orchestrators or AI agents on Solana can pre-screen targets before dispatching high-value requests. The screening endpoint cross-references official SAID verification and trust tiering with Sentinel’s empirical 24h uptime and latency metrics:
        </p>

        <div style={{ background: 'var(--bg-surface-2)', padding: '1.25rem', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#14f195', overflowX: 'auto', marginBottom: '1.25rem' }}>
          {`// Response example: GET /api/v1/screen?wallet=5dpw6KEQPn...
{
  "wallet": "5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G",
  "verified": true,
  "trustTier": "TIER_1",
  "operationalStatus": "ONLINE",
  "sentinelScore": 94,
  "uptime24h": 99.8,
  "medianLatencyMs": 142,
  "activeIncidents": 0,
  "recommendation": "PROCEED",
  "reasons": [
    "SAID Protocol verified agent on Solana Mainnet.",
    "Excellent 24h operational uptime (99.8%).",
    "Zero active downtime incidents."
  ],
  "screenedAt": "2026-10-03T12:00:00.000Z"
}`}
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong>x402 Protocol Support:</strong> When <code className="font-mono">ENABLE_X402=true</code> is configured in the environment, callers without payment credentials receive an <code className="font-mono">HTTP 402 Payment Required</code> response containing the payment challenge scheme and cost in micro-SOL or USDC, enabling automated machine monetization.
        </div>
      </section>

      {/* SVG Badge Integration */}
      <section className="card" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          Embeddable SVG Reliability Badges
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          Showcase continuous uptime on GitHub repositories, documentation sites, or agent profiles using dynamic SVG badges:
        </p>

        <div style={{ background: 'var(--bg-surface-2)', padding: '1rem', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', overflowX: 'auto' }}>
          [![Sentinel Uptime](https://your-domain.com/api/v1/agents/solana/WALLET_ADDRESS/badge.svg)](https://your-domain.com/agents/solana/WALLET_ADDRESS)
        </div>
      </section>
    </PageShell>
  );
}
