import { PageShell } from '@/components/PageShell';
import { SufficiencyBadge, OutcomeBadge, ProvenanceBadge } from '@/components/Badges';
import {
  Shield,
  BookOpen,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Database,
  Layers,
  FileText,
  Clock,
  Zap,
  Radio,
  Cpu,
} from 'lucide-react';
import { SAID_PROGRAM_ID } from '@agentproof/core';

export const dynamic = 'force-dynamic';

export default function MethodologyPage() {
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
          <BookOpen size={12} />
          <span>TECHNICAL SPECIFICATION • SENTINEL METHODOLOGY V1.0</span>
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
          Sentinel Reliability Methodology &amp; Mathematical Specification
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          AgentProof Sentinel evaluates autonomous AI agents on Solana using deterministic, explainable mathematical formulas and SSRF-hardened network probes. Every metric displayed in our Passports and API traces directly back to the mechanisms documented below.
        </p>
      </div>

      {/* 1. Identity vs. Operability */}
      <section id="identity-vs-operability" className="card" style={{ padding: '1.75rem', marginBottom: '2rem', scrollMarginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Shield size={20} color="var(--accent-solana)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            1. SAID Identity vs. Sentinel Operational Reliability
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          On Solana, <strong>SAID Protocol</strong> (<code className="font-mono">{SAID_PROGRAM_ID}</code>) establishes an agent’s persistent identity, verified ownership wallet, protocol trust tier, and credentialed skills. However, identity alone cannot guarantee runtime availability:
        </p>

        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-surface-2)',
            borderRadius: 6,
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            borderLeft: '3px solid var(--accent-solana)',
            lineHeight: 1.6,
          }}
        >
          <strong>The Decoupling Rule:</strong> Sentinel never creates arbitrary "trust" or "reputation" scores that could be confused with SAID's official reputation. SAID tells you <em>who</em> an agent is and its community trust tier. Sentinel provides continuous, independent operational evidence showing whether the agent's published service endpoints (MCP tools, A2A endpoints, HTTP APIs) are actually alive and responsive.
        </div>
      </section>

      {/* 2. The 3 Monitored Service Endpoints */}
      <section id="deterministic-probes" className="card" style={{ padding: '1.75rem', marginBottom: '2rem', scrollMarginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Activity size={20} color="var(--status-strong)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            2. Monitored Service Protocols &amp; Probes
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Sentinel monitors <strong>only explicitly published service endpoints</strong> declared in the agent's SAID record. Sentinel never probes arbitrary third-party websites:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              <span className="font-mono" style={{ color: '#00f0ff', fontSize: '0.8rem' }}>01</span>
              <span>MCP_HEALTH (Model Context Protocol)</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Tests declared MCP tool endpoints using lightweight ping/health JSON-RPC queries. Measures tool reachability, valid schema responses, and round-trip execution latency.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              <span className="font-mono" style={{ color: 'var(--accent-solana)', fontSize: '0.8rem' }}>02</span>
              <span>A2A_HEALTH (Agent-to-Agent Endpoint)</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Evaluates agent-to-agent communication interfaces. Verifies handshake availability, protocol spec compliance, and response timing.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              <span className="font-mono" style={{ color: '#818cf8', fontSize: '0.8rem' }}>03</span>
              <span>HTTP_REACHABILITY (Service APIs)</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Monitors public HTTP/REST endpoints advertised by the agent. Enforces strict 8-second timeouts and logs HTTP response codes (2xx/3xx/405/422).
            </p>
          </div>
        </div>

        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-surface-3)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <strong>Probing Cadence &amp; Ethics:</strong> Default monitoring interval is <strong>5 minutes</strong> with an <strong>8-second timeout</strong>. Concurrency is limited to prevent server overload, and exponential backoff is triggered upon repeated consecutive failures.
        </div>
      </section>

      {/* 3. Sentinel Reliability Score Formula */}
      <section id="sentinel-score" className="card" style={{ padding: '1.75rem', marginBottom: '2rem', scrollMarginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Zap size={20} color="var(--accent-solana)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            3. The Sentinel Reliability Score (0–100) Formula
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The Sentinel Reliability Score is an explainable, deterministic operational index. It is never hidden behind an unexplainable neural net or arbitrary marketing score:
        </p>

        <div
          style={{
            padding: '1.25rem',
            background: 'var(--bg-surface-2)',
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
            marginBottom: '1.25rem',
            overflowX: 'auto',
            border: '1px solid var(--border-medium)',
          }}
        >
          Sentinel Score = (Availability × 50%) + (Latency × 25%) + (Coverage × 15%) + (Stability × 10%)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ padding: '0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
            <strong style={{ color: 'var(--status-success)', display: 'block', fontSize: '0.85rem' }}>Availability (50%)</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Combination of 24-hour uptime (weight 0.6) and 7-day uptime (weight 0.4). High uptime directly secures base points.
            </span>
          </div>

          <div style={{ padding: '0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
            <strong style={{ color: '#00f0ff', display: 'block', fontSize: '0.85rem' }}>Latency (25%)</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Normalized median latency score. &lt;300ms receives full points; degrades linearly to 0 at &gt;3,000ms.
            </span>
          </div>

          <div style={{ padding: '0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
            <strong style={{ color: '#818cf8', display: 'block', fontSize: '0.85rem' }}>Coverage (15%)</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Observation sample depth. 20+ checks over sliding window unlock maximum coverage points.
            </span>
          </div>

          <div style={{ padding: '0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
            <strong style={{ color: 'var(--status-strong)', display: 'block', fontSize: '0.85rem' }}>Stability (10%)</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Penalty deducted for consecutive failures or active unresolved downtime incidents.
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
          Display designation: "Operational reliability measured by AgentProof Sentinel." Never displayed as "Official SAID score."
        </p>
      </section>

      {/* 4. Availability Windows & Sufficiency */}
      <section id="measured-availability" className="card" style={{ padding: '1.75rem', marginBottom: '2rem', scrollMarginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Clock size={20} color="var(--status-limited)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            4. Measured Availability &amp; Sufficiency Tiers
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          Measured Availability % is computed strictly from attributable service probes over sliding windows (24h, 7d, 30d):
        </p>

        <div
          style={{
            padding: '1rem',
            background: 'var(--bg-surface-2)',
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          Availability % = ( Successful Attributable Checks / Total Attributable Checks ) × 100
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.65rem 0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
            <SufficiencyBadge tier="STRONG" />
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              30+ observations spanning at least 75% of the window duration. Statistically robust sample.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.65rem 0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
            <SufficiencyBadge tier="MODERATE" />
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              10–29 observations with regular temporal spread. Representative operational profile.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.65rem 0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
            <SufficiencyBadge tier="LIMITED" />
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              3–9 observations. Early measurement history; displayed with preliminary sample notice.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.65rem 0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
            <SufficiencyBadge tier="INSUFFICIENT" />
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Fewer than 3 observations. Availability percentage is withheld ("Insufficient history") to prevent misleading metrics.
            </span>
          </div>
        </div>
      </section>

      {/* 5. Security & SSRF Protections */}
      <section id="probe-policy" className="card" style={{ padding: '1.75rem', marginBottom: '2rem', scrollMarginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Lock size={20} color="var(--status-strong)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            5. Security &amp; Adversarial IP Policy
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          Probing arbitrary agent-provided URLs presents serious SSRF risks. Sentinel implements strict transport safety layers tested against 36 adversarial test vectors:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>DNS Pinning</strong>
            Resolves hostname prior to connection and binds to the resolved public IP, preventing DNS rebinding.
          </div>
          <div style={{ padding: '0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>Private IP Blocklist</strong>
            Terminates probes targeting RFC1918 (10.x, 172.16.x, 192.168.x), localhost (127.0.0.1), and cloud metadata (169.254.169.254).
          </div>
          <div style={{ padding: '0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>Response Safety Caps</strong>
            Enforces 1MB maximum payload limits and disables dangerous protocol schemes (e.g. file://, gopher://).
          </div>
        </div>
      </section>

      {/* 6. Explicit Boundaries */}
      <section id="limitations" className="card" style={{ padding: '1.75rem', scrollMarginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          6. Explicit Boundaries &amp; Non-Assumptions
        </h2>
        <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>
            <strong>Reachability is not semantic correctness:</strong> A 200 OK proves the agent server is alive and responding, not that its trade execution or reasoning is financially sound.
          </li>
          <li>
            <strong>No fake reputation or feedback:</strong> Sentinel never auto-submits feedback or manipulates SAID reputation.
          </li>
          <li>
            <strong>Server-side only signing:</strong> Sentinel wallets never expose private keys to client browsers.
          </li>
        </ul>
      </section>
    </PageShell>
  );
}
