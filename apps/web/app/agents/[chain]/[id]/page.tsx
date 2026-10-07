import { agentRepository, observationRepository, incidentRepository } from '@/lib/api/repositories';
import { computeAllWindows, computeSentinelReliabilityScore } from '@agentproof/reliability';
import { PageShell } from '@/components/PageShell';
import { SafeExternalLink } from '@/components/SafeExternalLink';
import { CopyButton } from '@/components/CopyButton';
import {
  SufficiencyBadge,
  OutcomeBadge,
  ProtocolBadge,
  ProvenanceBadge,
  MonitoringStatusBadge,
  MetadataStatusBadge,
  SaidVerificationBadge,
  TrustTierBadge,
  SentinelScoreBadge,
} from '@/components/Badges';
import { ReliabilityTimeline } from '@/components/ReliabilityTimeline';
import { UptimeHistoryGraph } from '@/components/UptimeHistoryGraph';
import { TrustScreenButton } from '@/components/TrustScreenButton';
import type { ChainId, ReliabilityWindow } from '@agentproof/core';
import { SAID_PROGRAM_ID, SOLANA_MAINNET } from '@agentproof/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, ShieldCheck, Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { SaidProtocolAdapter } from '@agentproof/sources';

export const dynamic = 'force-dynamic';

function WindowCard({ window }: { window: ReliabilityWindow }) {
  const isSufficient = window.sufficientData && (window.observationCount ?? 0) > 0;
  const avail = window.availabilityPct ?? 0;

  return (
    <div
      className="card"
      style={{
        flex: '1 1 200px',
        padding: '1.25rem',
        background: 'var(--bg-surface-1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {window.window.toUpperCase()} Window
          </span>
          <Link href="/methodology#evidence-coverage" title="How evidence sufficiency is classified">
            <SufficiencyBadge tier={window.dataSufficiency} />
          </Link>
        </div>

        {isSufficient ? (
          <div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: avail >= 95 ? 'var(--status-success)' : avail >= 80 ? 'var(--status-warning)' : 'var(--status-failure)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              {avail.toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              <Link href="/methodology#measured-availability" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>
                Measured Availability
              </Link>
            </div>

            <div
              style={{
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Passed Probes:</span>
                <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {window.successCount} / {window.observationCount}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Failures:</span>
                <span className="font-mono" style={{ color: window.failureCount > 0 ? 'var(--status-failure)' : 'var(--text-secondary)' }}>
                  {window.failureCount}
                </span>
              </div>
              {window.medianLatencyMs !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Median Latency:</span>
                  <span className="font-mono">{window.medianLatencyMs}ms</span>
                </div>
              )}
              {window.p95LatencyMs !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>P95 Latency:</span>
                  <span className="font-mono">{window.p95LatencyMs}ms</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '1rem 0' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Early sample ({window.observationCount} probe{window.observationCount === 1 ? '' : 's'}).
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Requires at least 3 attributable service probes to publish an empirical availability ratio.
            </p>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: '1rem',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Methodology v{window.methodologyVersion}</span>
        <Link href="/methodology#measured-availability" style={{ color: 'var(--accent-solana)', textDecoration: 'underline' }}>
          Formula
        </Link>
      </div>
    </div>
  );
}

export default async function AgentPassportPage({
  params,
}: {
  params: Promise<{ chain: string; id: string }>;
}) {
  const { chain, id } = await params;
  const decodedId = decodeURIComponent(id);

  // Normalize chain - Sentinel default is Solana
  const effectiveChain = (chain === 'solana' ? chain : 'solana') as ChainId;
  let agent = null;
  try {
    agent = await agentRepository.getAgent(decodedId);
  } catch (err) {
    console.warn('Agent DB lookup warning:', err);
  }

  // If not found in database, attempt live SAID Protocol lookup fallback
  let liveServicesList: any[] = [];
  let liveMetadata = null;
  if (!agent) {
    try {
      const saidAdapter = new SaidProtocolAdapter();
      const liveRes = await saidAdapter.getAgentDetails(decodedId);
      if (liveRes.ok && liveRes.data?.identity) {
        agent = liveRes.data.identity;
        liveServicesList = liveRes.data.services ?? [];
        liveMetadata = liveRes.data.metadata ?? null;
      }
    } catch (err) {
      console.warn('Live SAID fallback error:', err);
    }
  }

  if (!agent) {
    notFound();
  }

  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Load all agent data in parallel with fallback
  let metadata = liveMetadata;
  let servicesList = liveServicesList;
  let observationsPage: { items: any[]; nextCursor?: string } = { items: [] };
  let incidentsList: any[] = [];

  try {
    const [metaRes, servRes, obsRes, incRes] = await Promise.all([
      agentRepository.getMetadata(agent.id),
      agentRepository.getServices(agent.id),
      observationRepository.listObservations({
        agentId: agent.id,
        since,
        until: now.toISOString(),
        limit: 100,
      }),
      incidentRepository.listIncidents(agent.id, 20),
    ]);
    if (metaRes) metadata = metaRes;
    if (servRes && servRes.length > 0) servicesList = servRes;
    if (obsRes) observationsPage = obsRes;
    if (incRes) incidentsList = incRes;
  } catch (err) {
    console.warn('Agent telemetry DB query warning:', err);
  }

  const windows = computeAllWindows({ agentId: agent.id, observations: observationsPage.items, now });
  const openIncidents = incidentsList.filter((i) => i.status === 'OPEN').length;
  const sentinelScore = computeSentinelReliabilityScore({
    window24h: windows['24h'],
    window7d: windows['7d'],
    activeIncidentsCount: openIncidents,
    now,
  });

  const isActivelyMonitored = observationsPage.items.length > 0;
  const walletAddress = agent.walletAddress || agent.id.replace('solana:', '');

  return (
    <PageShell>
      {/* Back Button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/agents"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Agents Directory</span>
        </Link>
      </div>

      {/* 1. Header Passport Card */}
      <section className="card" style={{ padding: '2rem', marginBottom: '2rem', background: 'var(--bg-surface-1)', border: '1px solid var(--border-medium)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span
                className="badge font-mono"
                style={{
                  background: 'var(--accent-solana-subtle)',
                  color: 'var(--accent-solana)',
                  border: '1px solid var(--accent-solana-border)',
                }}
              >
                NETWORK: SOLANA MAINNET
              </span>
              <SaidVerificationBadge status={agent.verificationStatus} />
              {agent.trustTier && <TrustTierBadge tier={agent.trustTier} />}
              <MonitoringStatusBadge isMonitored={isActivelyMonitored} />
              <MetadataStatusBadge resolved={metadata?.metadataResolved ?? true} />
              <ProvenanceBadge source={agent.provenance?.source ?? 'SAID_PROTOCOL'} origin={agent.provenance?.origin} />
            </div>

            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '0.35rem',
              }}
            >
              {metadata?.name ?? agent.name ?? agent.id}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {walletAddress}
              </span>
              <CopyButton text={walletAddress} label="Copy Wallet" />
              <a
                href={`https://solscan.io/account/${walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                title="View Account on Solscan"
              >
                <span>Solscan</span>
                <ExternalLink size={11} />
              </a>
              <CopyButton
                text={`/api/v1/agents/solana/${agent.id}/reliability`}
                label="API URL"
              />
              <CopyButton
                text={`[![Sentinel Uptime](/api/v1/agents/solana/${agent.id}/badge.svg)](/agents/solana/${agent.id})`}
                label="Copy Markdown Badge"
              />
            </div>
          </div>

          <div
            style={{
              padding: '0.85rem 1.25rem',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              textAlign: 'right',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sentinel Reliability Score
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.2rem' }}>
                <SentinelScoreBadge score={sentinelScore.score} state={sentinelScore.tier} />
              </div>
            </div>

            <TrustScreenButton wallet={walletAddress} />
          </div>
        </div>

        {/* Description & Skills */}
        {(metadata?.description || agent.description) && (
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {metadata?.description || agent.description}
            </p>
          </div>
        )}

        {/* Skills & Services Badges */}
        {agent.skills && agent.skills.length > 0 && (
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.2rem' }}>Published Skills:</span>
            {agent.skills.map((skill) => (
              <span
                key={skill}
                className="badge"
                style={{
                  background: 'var(--bg-surface-3)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.7rem',
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Metadata Details strip */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.85rem 1rem',
            background: 'var(--bg-surface-2)',
            borderRadius: 6,
            fontSize: '0.8rem',
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>SAID Program: </span>
            <span className="font-mono" style={{ color: 'var(--accent-solana)' }}>
              {SAID_PROGRAM_ID}
            </span>
          </div>
          {agent.mcpEndpoint && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>MCP Endpoint: </span>
              <SafeExternalLink url={agent.mcpEndpoint} maxLength={32} />
              <CopyButton text={agent.mcpEndpoint} label="Copy" />
            </div>
          )}
          {agent.a2aEndpoint && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>A2A Endpoint: </span>
              <SafeExternalLink url={agent.a2aEndpoint} maxLength={32} />
              <CopyButton text={agent.a2aEndpoint} label="Copy" />
            </div>
          )}
          <div>
            <span style={{ color: 'var(--text-muted)' }}>First Tracked: </span>
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
              {agent.provenance?.observedAt && !isNaN(new Date(agent.provenance.observedAt).getTime())
                ? new Date(agent.provenance.observedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                : 'Active Cycle'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Sentinel Reliability Score Explanation */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-surface-1)', border: '1px solid var(--border-medium)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Sentinel Reliability Score Formula &amp; Factors
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Operational reliability measured by AgentProof Sentinel (0–100).
              </p>
            </div>
            <Link href="/methodology#sentinel-score" style={{ fontSize: '0.8rem', color: 'var(--accent-solana)', textDecoration: 'underline' }}>
              Full Formula Documentation →
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Availability (50%)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-success)', marginTop: '0.2rem' }}>
                {sentinelScore.availabilityScore.toFixed(1)} / 50
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Based on 24h &amp; 7d uptime
              </span>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Latency Performance (25%)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#00f0ff', marginTop: '0.2rem' }}>
                {sentinelScore.latencyScore.toFixed(1)} / 25
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Response time consistency
              </span>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Evidence Coverage (15%)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#818cf8', marginTop: '0.2rem' }}>
                {sentinelScore.coverageScore.toFixed(1)} / 15
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Observation count depth
              </span>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Stability &amp; Recovery (10%)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-strong)', marginTop: '0.2rem' }}>
                {sentinelScore.stabilityScore.toFixed(1)} / 10
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Penalty for active outages
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Reliability Windows (24h, 7d, 30d) */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Empirical Service Availability (24h, 7d, 30d)
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Deterministic availability ratios computed strictly from attributable service probes.
            </p>
          </div>
          <Link href="/methodology#measured-availability" style={{ fontSize: '0.8rem', color: 'var(--accent-solana)', textDecoration: 'underline' }}>
            Methodology &amp; Formulas →
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          {Object.values(windows).map((w) => (
            <WindowCard key={w.window} window={w} />
          ))}
        </div>
      </section>

      {/* 4. Probe Observation Timeline & Graph */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Scheduled Cycle Telemetry &amp; Latency
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Audit trail of automated probe runs tracking service response speeds in milliseconds.
          </p>
        </div>

        <UptimeHistoryGraph observations={observationsPage.items} />

        <ReliabilityTimeline
          observations={observationsPage.items}
          windowLabel="Observed Response Latency &amp; Status"
        />
      </section>

      {/* 5. Declared Services & Endpoints */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Declared Endpoints &amp; Tools
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Official MCP and A2A service endpoints declared by this agent on SAID Protocol.
          </p>
        </div>

        {servicesList.length === 0 && !agent.mcpEndpoint && !agent.a2aEndpoint ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No external services or endpoints declared for this agent.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Protocol</th>
                  <th>Endpoint URL</th>
                  <th>Form</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {agent.mcpEndpoint && (
                  <tr>
                    <td>
                      <ProtocolBadge protocol="MCP" />
                    </td>
                    <td>
                      <SafeExternalLink url={agent.mcpEndpoint} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Declared MCP Tool</span>
                    </td>
                    <td>
                      <CopyButton text={agent.mcpEndpoint} label="Copy URL" />
                    </td>
                  </tr>
                )}
                {agent.a2aEndpoint && (
                  <tr>
                    <td>
                      <ProtocolBadge protocol="A2A" />
                    </td>
                    <td>
                      <SafeExternalLink url={agent.a2aEndpoint} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Declared Agent-to-Agent</span>
                    </td>
                    <td>
                      <CopyButton text={agent.a2aEndpoint} label="Copy URL" />
                    </td>
                  </tr>
                )}
                {servicesList.map((svc) => (
                  <tr key={svc.id}>
                    <td>
                      <ProtocolBadge protocol={svc.protocol} />
                    </td>
                    <td>
                      <SafeExternalLink url={svc.url} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {svc.endpointType || 'Published Service'}
                      </span>
                    </td>
                    <td>
                      <CopyButton text={svc.url} label="Copy URL" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 6. Incident History */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Incident &amp; Outage History ({incidentsList.length})
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Automated tracking of detected downtime periods, consecutive failures, and recovery timestamps.
          </p>
        </div>

        {incidentsList.length === 0 ? (
          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-surface-1)', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--status-success)' }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: '0.875rem' }}>Zero downtime incidents recorded in observation history.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Started At</th>
                  <th>Resolved At</th>
                  <th>Duration</th>
                  <th>Failures</th>
                  <th>Root Cause</th>
                </tr>
              </thead>
              <tbody>
                {incidentsList.map((inc) => {
                  const durationMins = inc.resolvedAt
                    ? Math.round((new Date(inc.resolvedAt).getTime() - new Date(inc.startedAt).getTime()) / 60000)
                    : Math.round((now.getTime() - new Date(inc.startedAt).getTime()) / 60000);

                  return (
                    <tr key={inc.id}>
                      <td>
                        {inc.status === 'RESOLVED' ? (
                          <span className="badge font-mono" style={{ background: 'var(--status-success-bg)', color: 'var(--status-success)', border: '1px solid var(--status-success-border)' }}>
                            RESOLVED
                          </span>
                        ) : (
                          <span className="badge font-mono" style={{ background: 'var(--status-failure-bg)', color: 'var(--status-failure)', border: '1px solid var(--status-failure-border)' }}>
                            <span className="live-pulse" style={{ width: 6, height: 6 }} />
                            <span>ONGOING</span>
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.8rem' }}>
                          {new Date(inc.startedAt).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString() : 'Active'}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.8rem' }}>
                          {durationMins}m
                        </span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.8rem' }}>
                          {inc.consecutiveFailures ?? inc.failedChecksCount ?? 1} checks
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {inc.failureReason || 'Service Unreachable'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 7. Forensic Observation Ledger */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Forensic Observation Ledger
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Complete, timestamped audit trail of every automated probe recorded for this agent.
          </p>
        </div>

        {observationsPage.items.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No probe observations recorded for this agent yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Probe Type</th>
                  <th>Result</th>
                  <th>Latency</th>
                  <th>HTTP Status</th>
                  <th>Methodology</th>
                </tr>
              </thead>
              <tbody>
                {observationsPage.items.slice(0, 30).map((obs) => (
                  <tr key={obs.id}>
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(obs.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {obs.probeType}
                      </span>
                    </td>
                    <td>
                      <OutcomeBadge outcome={obs.outcome} />
                    </td>
                    <td>
                      {obs.latencyMs !== undefined && obs.latencyMs !== null ? (
                        <span className="font-mono" style={{ fontWeight: 600 }}>
                          {obs.latencyMs} ms
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {obs.httpStatus ? (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '0.75rem',
                            color: obs.httpStatus >= 200 && obs.httpStatus < 300 ? 'var(--status-success)' : 'var(--status-warning)',
                          }}
                        >
                          HTTP {obs.httpStatus}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        v{obs.methodologyVersion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
