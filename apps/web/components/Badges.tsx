import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Database,
  Link2,
  HelpCircle,
  Lock,
  Activity,
  FileCheck2,
  Award,
} from 'lucide-react';
import type { SaidVerificationStatus } from '@agentproof/core';

export function SaidVerificationBadge({ status }: { status?: SaidVerificationStatus | string }) {
  if (status === 'VERIFIED') {
    return (
      <span
        className="badge font-mono"
        style={{
          background: 'rgba(20, 241, 149, 0.12)',
          color: '#14f195',
          border: '1px solid rgba(20, 241, 149, 0.35)',
          fontSize: '0.72rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
        title="Official SAID Protocol verified agent on Solana Mainnet"
      >
        <ShieldCheck size={12} />
        <span>SAID VERIFIED</span>
      </span>
    );
  }

  if (status === 'PENDING') {
    return (
      <span
        className="badge font-mono"
        style={{
          background: 'rgba(251, 191, 36, 0.12)',
          color: '#fbbf24',
          border: '1px solid rgba(251, 191, 36, 0.35)',
          fontSize: '0.72rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
        title="SAID Protocol verification in review"
      >
        <Clock size={12} />
        <span>VERIFICATION PENDING</span>
      </span>
    );
  }

  return (
    <span
      className="badge font-mono"
      style={{
        background: 'var(--bg-surface-2)',
        color: 'var(--text-muted)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.72rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
      }}
      title="Unverified on SAID Protocol"
    >
      <HelpCircle size={12} />
      <span>SAID UNVERIFIED</span>
    </span>
  );
}

export function TrustTierBadge({ tier }: { tier?: string | null }) {
  if (!tier || tier === 'UNRATED' || tier === 'UNKNOWN') {
    return (
      <span
        className="badge font-mono"
        style={{
          background: 'var(--bg-surface-2)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.7rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
        }}
      >
        <Award size={10} />
        <span>UNRATED TIER</span>
      </span>
    );
  }

  const isTier1 = tier.toUpperCase().includes('1');
  const isTier2 = tier.toUpperCase().includes('2');

  return (
    <span
      className="badge font-mono"
      style={{
        background: isTier1
          ? 'rgba(0, 240, 255, 0.12)'
          : isTier2
          ? 'rgba(129, 140, 248, 0.12)'
          : 'rgba(100, 116, 139, 0.15)',
        color: isTier1 ? '#00f0ff' : isTier2 ? '#818cf8' : '#94a3b8',
        border: `1px solid ${isTier1 ? 'rgba(0, 240, 255, 0.35)' : isTier2 ? 'rgba(129, 140, 248, 0.35)' : 'rgba(100, 116, 139, 0.3)'}`,
        fontSize: '0.7rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
      }}
      title={`SAID Protocol Trust Tier: ${tier}`}
    >
      <Award size={10} />
      <span>{tier.replace('_', ' ')}</span>
    </span>
  );
}

export function SentinelScoreBadge({ score, state }: { score?: number | null; state?: string }) {
  if (state === 'INSUFFICIENT_DATA' || score === null || score === undefined) {
    return (
      <span
        className="badge font-mono"
        style={{
          background: 'var(--bg-surface-2)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.72rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
        title="Insufficient observation history to calculate Sentinel Reliability Score"
      >
        <span>SENTINEL: INSUFFICIENT DATA</span>
      </span>
    );
  }

  const color =
    score >= 90
      ? 'var(--status-success)'
      : score >= 75
      ? '#00f0ff'
      : score >= 50
      ? 'var(--status-warning)'
      : 'var(--status-failure)';

  const bg =
    score >= 90
      ? 'var(--status-success-bg)'
      : score >= 75
      ? 'rgba(0, 240, 255, 0.1)'
      : score >= 50
      ? 'var(--status-warning-bg)'
      : 'var(--status-failure-bg)';

  const border =
    score >= 90
      ? 'var(--status-success-border)'
      : score >= 75
      ? 'rgba(0, 240, 255, 0.3)'
      : score >= 50
      ? 'var(--status-warning-border)'
      : 'var(--status-failure-border)';

  return (
    <span
      className="badge font-mono"
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
        fontSize: '0.72rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
      }}
      title="Operational reliability measured by AgentProof Sentinel (0-100)"
    >
      <Activity size={11} />
      <span>SENTINEL SCORE: {score}/100</span>
    </span>
  );
}

export function SufficiencyBadge({ tier }: { tier: string }) {
  let bg = 'rgba(100, 116, 139, 0.15)';
  let color = '#94a3b8';
  let border = 'rgba(100, 116, 139, 0.3)';
  let label = tier;

  if (tier === 'STRONG') {
    bg = 'var(--status-strong-bg)';
    color = 'var(--status-strong)';
    border = 'var(--status-strong-border)';
    label = 'STRONG EVIDENCE';
  } else if (tier === 'MODERATE') {
    bg = 'var(--status-moderate-bg)';
    color = 'var(--status-moderate)';
    border = 'var(--status-moderate-border)';
    label = 'MODERATE EVIDENCE';
  } else if (tier === 'LIMITED') {
    bg = 'var(--status-limited-bg)';
    color = 'var(--status-limited)';
    border = 'var(--status-limited-border)';
    label = 'LIMITED EVIDENCE';
  } else if (tier === 'INSUFFICIENT') {
    bg = 'var(--status-warning-bg)';
    color = 'var(--status-warning)';
    border = 'var(--status-warning-border)';
    label = 'INSUFFICIENT EVIDENCE';
  }

  return (
    <span
      className="badge"
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
        fontSize: '0.7rem',
        letterSpacing: '0.04em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
      }}
      title={`Evidence coverage: ${tier}. Describes sample depth, not a trust or safety rating.`}
    >
      <ShieldCheck size={11} />
      <span>{label}</span>
    </span>
  );
}

export function OutcomeBadge({ outcome }: { outcome: string }) {
  let bg = 'rgba(100, 116, 139, 0.15)';
  let color = '#94a3b8';
  let border = 'rgba(100, 116, 139, 0.3)';
  let icon = <HelpCircle size={11} />;
  let label = outcome.replace(/_/g, ' ');

  if (outcome === 'SUCCESS' || outcome === 'REACHABLE') {
    bg = 'var(--status-success-bg)';
    color = 'var(--status-success)';
    border = 'var(--status-success-border)';
    icon = <CheckCircle2 size={11} />;
    label = 'ONLINE / REACHABLE';
  } else if (outcome === 'FAILURE' || outcome === 'AGENT_UNREACHABLE' || outcome === 'DNS_FAILURE') {
    bg = 'var(--status-failure-bg)';
    color = 'var(--status-failure)';
    border = 'var(--status-failure-border)';
    icon = <XCircle size={11} />;
    label = outcome === 'DNS_FAILURE' ? 'DNS FAILURE' : 'UNREACHABLE';
  } else if (outcome === 'PROTOCOL_INVALID') {
    bg = 'rgba(168, 85, 247, 0.12)';
    color = '#c084fc';
    border = 'rgba(168, 85, 247, 0.3)';
    icon = <AlertTriangle size={11} />;
    label = 'INVALID PROTOCOL';
  } else if (outcome === 'TIMEOUT') {
    bg = 'var(--status-warning-bg)';
    color = 'var(--status-warning)';
    border = 'var(--status-warning-border)';
    icon = <Clock size={11} />;
    label = 'TIMEOUT';
  } else if (outcome === 'BLOCKED_BY_SECURITY_POLICY') {
    bg = 'rgba(148, 163, 184, 0.12)';
    color = '#94a3b8';
    border = 'rgba(148, 163, 184, 0.3)';
    icon = <Lock size={11} />;
    label = 'POLICY BLOCKED (SSRF)';
  } else if (outcome === 'UPSTREAM_INDEXER_FAILURE' || outcome === 'AGENTPROOF_INTERNAL_ERROR') {
    bg = 'rgba(100, 116, 139, 0.1)';
    color = '#64748b';
    border = '1px dashed rgba(100, 116, 139, 0.4)';
    icon = <AlertTriangle size={11} />;
    label = 'PROBE ERROR';
  } else if (outcome === 'NOT_INGESTED') {
    bg = 'rgba(100, 116, 139, 0.1)';
    color = '#64748b';
    border = '1px dashed rgba(100, 116, 139, 0.4)';
    icon = <Clock size={11} />;
    label = 'PENDING';
  }

  return (
    <span
      className="badge font-mono"
      style={{
        background: bg,
        color,
        border: border.startsWith('1px') ? border : `1px solid ${border}`,
        fontSize: '0.7rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
      }}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

export function ProvenanceBadge({ source, origin }: { source: string; origin?: string }) {
  let bg = 'var(--bg-surface-2)';
  let color = 'var(--text-secondary)';
  let border = 'var(--border-subtle)';
  let label = source;

  if (source === 'AGENTPROOF_MEASUREMENT') {
    bg = 'rgba(20, 241, 149, 0.12)';
    color = 'var(--accent-solana)';
    border = 'var(--accent-solana-border)';
    label = 'SENTINEL TELEMETRY';
  } else if (source === 'ONCHAIN') {
    bg = 'rgba(0, 240, 255, 0.1)';
    color = '#00f0ff';
    border = 'rgba(0, 240, 255, 0.25)';
    label = 'SOLANA MAINNET';
  } else if (source === 'SAID_PROTOCOL') {
    bg = 'rgba(129, 140, 248, 0.1)';
    color = '#818cf8';
    border = 'rgba(129, 140, 248, 0.25)';
    label = `SAID PROTOCOL (${origin ?? '5dpw6K...'})`;
  }

  return (
    <span
      className="badge font-mono"
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
        fontSize: '0.68rem',
        textTransform: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
      }}
      title={`Data provenance: ${source}${origin ? ` via ${origin}` : ''}`}
    >
      <Database size={10} />
      <span>{label}</span>
    </span>
  );
}

export function ProtocolBadge({ protocol }: { protocol: string }) {
  const isMcp = protocol.toUpperCase() === 'MCP';
  const isA2a = protocol.toUpperCase() === 'A2A';

  return (
    <span
      className="badge font-mono"
      style={{
        background: isMcp
          ? 'rgba(0, 240, 255, 0.1)'
          : isA2a
          ? 'rgba(20, 241, 149, 0.1)'
          : 'var(--bg-surface-3)',
        color: isMcp ? '#00f0ff' : isA2a ? '#14f195' : 'var(--text-primary)',
        border: `1px solid ${isMcp ? 'rgba(0, 240, 255, 0.3)' : isA2a ? 'rgba(20, 241, 149, 0.3)' : 'var(--border-medium)'}`,
        fontSize: '0.7rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
      }}
    >
      <Link2 size={10} />
      <span>{protocol}</span>
    </span>
  );
}

export function MonitoringStatusBadge({ isMonitored }: { isMonitored: boolean }) {
  if (isMonitored) {
    return (
      <span
        className="badge font-mono"
        style={{
          background: 'var(--status-success-bg)',
          color: 'var(--status-success)',
          border: '1px solid var(--status-success-border)',
          fontSize: '0.7rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
        title="Included in Sentinel automated probing cycles."
      >
        <span className="live-pulse" style={{ width: 6, height: 6 }} />
        <span>ACTIVELY MONITORED</span>
      </span>
    );
  }

  return (
    <span
      className="badge font-mono"
      style={{
        background: 'var(--bg-surface-2)',
        color: 'var(--text-muted)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.7rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
      }}
      title="Discovered from SAID registry, pending active monitor schedule."
    >
      <Activity size={10} />
      <span>DISCOVERED (STANDBY)</span>
    </span>
  );
}

export function MetadataStatusBadge({ resolved }: { resolved: boolean }) {
  if (resolved) {
    return (
      <span
        className="badge font-mono"
        style={{
          background: 'rgba(20, 241, 149, 0.1)',
          color: '#14f195',
          border: '1px solid rgba(20, 241, 149, 0.25)',
          fontSize: '0.68rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
        }}
        title="Agent services and identity metadata resolved from SAID Protocol."
      >
        <FileCheck2 size={10} />
        <span>SAID SYNCED</span>
      </span>
    );
  }

  return (
    <span
      className="badge font-mono"
      style={{
        background: 'var(--bg-surface-2)',
        color: 'var(--text-muted)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.68rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
      }}
      title="Identity synchronization pending."
    >
      <Clock size={10} />
      <span>SYNC PENDING</span>
    </span>
  );
}
