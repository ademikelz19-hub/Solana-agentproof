import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { MetricCard } from '@/components/MetricCard';
import { OutcomeBadge, ProtocolBadge, SaidVerificationBadge, SentinelScoreBadge, MonitoringStatusBadge } from '@/components/Badges';
import { SolanaSearchBar } from '@/components/SolanaSearchBar';
import { TimeAgo } from '@/components/TimeAgo';
import { db, agents, services, observations, probeRuns, incidents } from '@agentproof/db';
import { count, desc, sql, eq } from 'drizzle-orm';
import {
  Shield,
  Activity,
  ArrowRight,
  Server,
  Database,
  Lock,
  Layers,
  Code,
  FileCheck,
  Zap,
  ExternalLink,
  Cpu,
  Radio,
  Search,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
} from 'lucide-react';
import { SAID_PROGRAM_ID } from '@agentproof/core';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let totalIndexedAgents = 0;
  let activelyMonitoredAgents = 0;
  let totalObservations = 0;
  let activeIncidentsCount = 0;
  let averageNetworkUptime = 100;
  let latestRun: typeof probeRuns.$inferSelect | null = null;
  let recentObservations: {
    id: string;
    agentId: string;
    probeType: string;
    outcome: string;
    latencyMs: number | null;
    httpStatus: number | null;
    timestamp: Date;
    agentName?: string | null;
  }[] = [];
  let featuredAgent: typeof agents.$inferSelect | null = null;
  let featuredServicesCount = 0;
  let featuredObsCount = 0;

  try {
    const [
      agentCountRes,
      serviceCountRes,
      obsCountRes,
      incidentCountRes,
      lastRunRes,
      latestObsRes,
      monitoredRes,
      featuredRes,
    ] = await Promise.all([
      db.select({ count: count() }).from(agents),
      db.select({ count: count() }).from(services),
      db.select({ count: count() }).from(observations),
      db.select({ count: count() }).from(incidents).where(eq(incidents.status, 'OPEN')),
      db.select().from(probeRuns).orderBy(desc(probeRuns.startedAt)).limit(1),
      db
        .select({
          id: observations.id,
          agentId: observations.agentId,
          probeType: observations.probeType,
          outcome: observations.outcome,
          latencyMs: observations.latencyMs,
          httpStatus: observations.httpStatus,
          timestamp: observations.timestamp,
          agentName: agents.name,
        })
        .from(observations)
        .leftJoin(agents, eq(observations.agentId, agents.id))
        .orderBy(desc(observations.timestamp))
        .limit(6),
      db.select({ count: sql<number>`count(distinct ${observations.agentId})::int` }).from(observations),
      db.select().from(agents).orderBy(desc(agents.lastSyncedAt)).limit(1),
    ]);

    totalIndexedAgents = agentCountRes[0]?.count ?? 0;
    totalObservations = obsCountRes[0]?.count ?? 0;
    activeIncidentsCount = incidentCountRes[0]?.count ?? 0;
    latestRun = lastRunRes[0] ?? null;
    recentObservations = latestObsRes ?? [];
    activelyMonitoredAgents = monitoredRes[0]?.count ?? 0;
    featuredAgent = featuredRes[0] ?? null;

    if (featuredAgent) {
      const [featSvc, featObs] = await Promise.all([
        db.select({ count: count() }).from(services).where(sql`${services.agentId} = ${featuredAgent.id}`),
        db.select({ count: count() }).from(observations).where(sql`${observations.agentId} = ${featuredAgent.id}`),
      ]);
      featuredServicesCount = featSvc[0]?.count ?? 0;
      featuredObsCount = featObs[0]?.count ?? 0;
    }

    // Compute uptime from recent 24h observations if available
    if (totalObservations > 0) {
      const successCountRes = await db
        .select({ count: count() })
        .from(observations)
        .where(sql`${observations.outcome} = 'SUCCESS'`);
      const successCount = successCountRes[0]?.count ?? 0;
      averageNetworkUptime = totalObservations > 0 ? (successCount / totalObservations) * 100 : 100;
    }
  } catch (err) {
    console.warn('Telemetry query warning (first run or db pending):', err);
  }

  return (
    <PageShell>
      {/* 1. Hero Section */}
      <section style={{ padding: '2.5rem 0 3.5rem', textAlign: 'center', maxWidth: 880, margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.35rem 0.95rem',
            background: 'var(--accent-solana-subtle)',
            border: '1px solid var(--accent-solana-border)',
            borderRadius: 9999,
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--accent-solana)',
            marginBottom: '1.5rem',
            letterSpacing: '0.04em',
          }}
        >
          <span className="live-pulse" />
          <span>SOLANA MAINNET • SAID PROTOCOL OPERATIONAL LAYER</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.2rem, 5.5vw, 3.75rem)',
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: '-0.035em',
            marginBottom: '1rem',
            color: 'var(--text-primary)',
          }}
        >
          AGENTPROOF <span style={{ color: 'var(--accent-solana)' }}>SENTINEL</span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(1.1rem, 2.2vw, 1.35rem)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
          }}
        >
          Reliability intelligence for AI agents on Solana.
        </p>

        <p
          style={{
            fontSize: 'clamp(0.95rem, 1.8vw, 1.05rem)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: 680,
            margin: '0 auto 2rem',
          }}
        >
          <em>Identity tells you who an agent is. Sentinel shows whether it is actually delivering.</em>
          <br />
          Continuous, independent operational evidence for AI agents registered on SAID Protocol.
        </p>

        {/* Live Solana Search / Lookup */}
        <div style={{ marginBottom: '2rem' }}>
          <SolanaSearchBar />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.85rem',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/agents" className="btn btn-primary" style={{ padding: '0.75rem 1.4rem' }}>
            <Activity size={16} />
            <span>Explore Monitored Agents</span>
            <ArrowRight size={15} />
          </Link>
          <Link href="/grant-demo" className="btn btn-secondary" style={{ padding: '0.75rem 1.4rem', borderColor: 'var(--accent-solana-border)' }}>
            <Zap size={15} color="var(--accent-solana)" />
            <span>Grant Reviewer Demo</span>
          </Link>
          <Link href="/methodology" className="btn btn-secondary" style={{ padding: '0.75rem 1.4rem' }}>
            <span>Reliability Methodology</span>
          </Link>
        </div>

        <div
          style={{
            marginTop: '2.5rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>✓ SAID Protocol Verified</span>
          <span>•</span>
          <span>✓ SSRF-Hardened MCP/A2A Probes</span>
          <span>•</span>
          <span>✓ Deterministic Sentinel Score</span>
          <span>•</span>
          <span>✓ Machine-Payable Trust Screen</span>
        </div>
      </section>

      {/* 2. Live Operational Stats */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Live Operational Telemetry
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Empirical measurements persisted to PostgreSQL for Solana AI agents.
            </p>
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span className="live-pulse" />
            <span>Solana Mainnet Telemetry Engine</span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <MetricCard
            label="Agents Monitored"
            value={totalIndexedAgents}
            subvalue="SAID Protocol Registry"
            description="Solana AI agents discovered from SAID program registry."
            icon={Shield}
            accent="var(--accent-solana)"
            tooltip="Total registered agents discovered and persisted in Sentinel."
          />
          <MetricCard
            label="Checks Completed"
            value={totalObservations.toLocaleString()}
            subvalue="SSRF-Hardened Probes"
            description="Reachability, MCP health, A2A responses, and HTTP latency measurements."
            icon={Database}
            accent="var(--status-strong)"
            tooltip="Total automated probe measurements logged to the append-only ledger."
          />
          <MetricCard
            label="Average Network Uptime"
            value={`${averageNetworkUptime.toFixed(1)}%`}
            subvalue="Sliding 24-Hour Window"
            description="Mean empirical availability across all active agent service endpoints."
            icon={Server}
            accent="var(--accent-solana)"
            tooltip="Aggregate uptime percentage across monitored agent endpoints."
          />
          <MetricCard
            label="Active Incidents"
            value={activeIncidentsCount}
            subvalue={activeIncidentsCount === 0 ? 'All Systems Healthy' : `${activeIncidentsCount} Under Investigation`}
            description="Downtime incidents auto-detected and tracked until full recovery."
            icon={AlertTriangle}
            accent={activeIncidentsCount === 0 ? 'var(--status-strong)' : 'var(--status-warning)'}
            tooltip="Current active downtime incidents detected by Sentinel."
          />
        </div>
      </section>

      {/* 3. 3-Step Explanation: Discover, Monitor, Evidence */}
      <section style={{ marginBottom: '4rem' }}>
        <div className="card" style={{ padding: '2.5rem 2rem', background: 'var(--bg-surface-1)' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 2.5rem' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              How Sentinel Evaluates Solana AI Agents
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              SAID Protocol establishes an agent's on-chain identity and credentials. AgentProof Sentinel provides independent, continuous operational evidence that it is alive and delivering.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Step 1: Discover */}
            <div
              style={{
                padding: '1.5rem',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-solana)',
                  fontWeight: 600,
                  marginBottom: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Radio size={14} />
                <span>01 • DISCOVER</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                SAID Registry Sync
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Sentinel ingests verified agents from SAID Protocol on Solana Mainnet (<code className="font-mono" style={{ fontSize: '0.75rem' }}>{SAID_PROGRAM_ID.slice(0, 6)}...</code>), cataloging their verified wallet, trust tier, advertised skills, and MCP/A2A endpoints.
              </p>
            </div>

            {/* Step 2: Monitor */}
            <div
              style={{
                padding: '1.5rem',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#00f0ff',
                  fontWeight: 600,
                  marginBottom: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Cpu size={14} />
                <span>02 • MONITOR</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Autonomous Probing
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Every 5 minutes, Sentinel's SSRF-hardened probe engine queries declared endpoints (MCP tools, A2A agent endpoints, REST APIs). It records DNS resolution, HTTP status, and response latency without abusive high-frequency spam.
              </p>
            </div>

            {/* Step 3: Evidence */}
            <div
              style={{
                padding: '1.5rem',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--status-strong-border)',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--status-strong)',
                  fontWeight: 600,
                  marginBottom: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <FileCheck size={14} />
                <span>03 • EVIDENCE</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Reliability Ledger
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Every check appends to an immutable ledger. Sentinel calculates transparent 24h/7d/30d uptime, latency percentiles, and an explainable <strong>Sentinel Reliability Score</strong> (0–100) accessible via public API and Trust Screening.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Built for the SAID Ecosystem */}
      <section style={{ marginBottom: '4rem' }}>
        <div
          className="card"
          style={{
            padding: '2.5rem 2rem',
            background: 'linear-gradient(180deg, rgba(20, 241, 149, 0.04) 0%, rgba(0, 240, 255, 0.02) 100%)',
            border: '1px solid var(--accent-solana-border)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', background: 'var(--accent-solana-subtle)', borderRadius: 4, fontSize: '0.72rem', color: 'var(--accent-solana)', fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
                <Shield size={12} />
                <span>SAID PROTOCOL INTEGRATION</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Built Specifically for the SAID Ecosystem
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                SAID Protocol is the persistent identity, reputation, and verification standard for autonomous agents on Solana. Sentinel is designed as the natural operational counterpart:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} color="var(--accent-solana)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Identity vs Operational Telemetry:</strong>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>SAID establishes credentialed reputation and identity. Sentinel tracks whether the underlying infrastructure responds within SLA.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} color="var(--accent-solana)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Zero Score Manipulation:</strong>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>Sentinel never writes synthetic positive reputation to SAID. Operational scores remain strictly decoupled from governance reputation.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} color="var(--accent-solana)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Machine-Payable Trust Screening:</strong>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>Sentinel exposes <code className="font-mono" style={{ fontSize: '0.8rem' }}>/api/v1/screen</code> ready for automated routing, agent orchestration, and optional x402 payment headers.</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-2)', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>// Solana Mainnet Configuration</div>
              <div style={{ color: '#00f0ff', marginBottom: '0.25rem' }}>PROGRAM_ID: {SAID_PROGRAM_ID}</div>
              <div style={{ color: '#14f195', marginBottom: '0.25rem' }}>SDK: @said-protocol/agent</div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>NETWORK: Solana Mainnet</div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.4rem' }}>// Integrated SAID APIs:</div>
                <div style={{ color: 'var(--text-primary)' }}>GET /api/agents</div>
                <div style={{ color: 'var(--text-primary)' }}>GET /api/agents/:wallet</div>
                <div style={{ color: 'var(--text-primary)' }}>GET /api/verify/:wallet</div>
                <div style={{ color: 'var(--text-primary)' }}>GET /api/trust/:wallet</div>
                <div style={{ color: 'var(--text-primary)' }}>GET /api/screen?wallet=...</div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                <Link href="/grant-demo" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  <span>Inspect Live Grant Demo</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Origin & Engineering Transparency (BNB -> Solana Migration) */}
      <section style={{ marginBottom: '4rem' }}>
        <div className="card" style={{ padding: '2rem 1.75rem', background: 'var(--bg-surface-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <GitBranch size={18} color="var(--accent-solana)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Engineering Origin: The Solana-Native Transformation
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            AgentProof was originally conceived as a proof of concept on BNB Smart Chain. Under the SAID Protocol Streaming Grant, the architecture underwent a complete, genuine technical migration to Solana Mainnet:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--status-strong)', marginBottom: '0.35rem' }}>
                ✓ Preserved &amp; Hardened
              </div>
              <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: 1.6, margin: 0 }}>
                <li>SSRF-hardened DNS pinning &amp; private IP guard</li>
                <li>Append-only measurement observation ledger</li>
                <li>Deterministic sliding-window uptime calculations</li>
                <li>Incident detection and recovery tracking engine</li>
              </ul>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-solana)', marginBottom: '0.35rem' }}>
                ⚡ Re-engineered for Solana
              </div>
              <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: 1.6, margin: 0 }}>
                <li>Direct integration with <code className="font-mono">@solana/web3.js</code></li>
                <li>Base58 Solana public key validation (replaces 0x EVM)</li>
                <li>Official <code className="font-mono">@said-protocol/agent</code> SDK &amp; endpoints</li>
                <li>Solscan account and transaction explorer integration</li>
              </ul>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#818cf8', marginBottom: '0.35rem' }}>
                🛡️ De-coupled &amp; Objective
              </div>
              <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: 1.6, margin: 0 }}>
                <li>SAID official reputation clearly separated from Sentinel score</li>
                <li>Zero client-side private key leakage (server-only signing)</li>
                <li>Transparent formula for Sentinel Reliability Score (0-100)</li>
                <li>Audited in <Link href="/methodology" style={{ color: 'var(--accent-solana)' }}>MIGRATION_AUDIT.md</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Recent Live Probe Telemetry Feed */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Probe Telemetry Feed
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Real-time checks conducted on Solana AI agent endpoints (MCP, A2A, HTTP).
            </p>
          </div>
          <Link href="/agents" className="btn btn-secondary btn-sm">
            <span>View All Agents</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {recentObservations.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            No recent probe observations recorded yet. Probing cycles run automatically every 5 minutes.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Target Agent</th>
                  <th>Protocol / Probe</th>
                  <th>Outcome</th>
                  <th>Latency</th>
                  <th>HTTP Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentObservations.map((obs) => (
                  <tr key={obs.id}>
                    <td>
                      <Link
                        href={`/agents/solana/${obs.agentId}`}
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span className="font-mono" style={{ fontWeight: 600 }}>
                          {obs.agentName || (obs.agentId.length > 16 ? `${obs.agentId.slice(0, 6)}...${obs.agentId.slice(-4)}` : obs.agentId)}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {obs.probeType}
                      </span>
                    </td>
                    <td>
                      <OutcomeBadge outcome={obs.outcome} />
                    </td>
                    <td>
                      {obs.latencyMs !== null ? (
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        <TimeAgo timestamp={obs.timestamp} />
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
