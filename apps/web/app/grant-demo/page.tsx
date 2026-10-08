import { PageShell } from '@/components/PageShell';
import { SAID_PROGRAM_ID } from '@agentproof/core';
import { TrustScreenButton } from '@/components/TrustScreenButton';
import {
  ShieldCheck,
  Zap,
  Activity,
  Server,
  Code,
  CheckCircle2,
  Lock,
  Cpu,
  ArrowRight,
  ExternalLink,
  GitBranch,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function GrantDemoPage() {
  const demoWallet = '6cQkUCsQHJGJZhnJHYYUic5FUCgd64HChe8APYYDLS4i'; // MEME Factory (Verified SAID Agent)

  return (
    <PageShell>
      {/* 1. Header Banner */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.25rem 0.75rem',
            background: 'var(--accent-solana-subtle)',
            border: '1px solid var(--accent-solana-border)',
            borderRadius: 9999,
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-solana)',
            marginBottom: '0.75rem',
          }}
        >
          <Zap size={13} />
          <span>SAID PROTOCOL STREAMING GRANT • 60-SECOND EVALUATION DEMO</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            marginBottom: '0.75rem',
            color: 'var(--text-primary)',
          }}
        >
          AgentProof Sentinel: Grant Reviewer Tour
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 780, lineHeight: 1.6 }}>
          A working, deployable, Solana-native reliability layer built specifically to operationalize identity and trust in the SAID Protocol ecosystem.
        </p>
      </div>

      {/* 2. Core Value Proposition in 60 Seconds */}
      <section style={{ marginBottom: '3rem' }}>
        <div
          className="card"
          style={{
            padding: '2rem',
            background: 'linear-gradient(135deg, rgba(20, 241, 149, 0.05) 0%, rgba(0, 240, 255, 0.03) 100%)',
            border: '1px solid var(--accent-solana-border)',
          }}
        >
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            The Core Hypothesis
          </h2>
          <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--accent-solana)', marginBottom: '1rem' }}>
            "Identity tells you who an agent is. Sentinel shows whether it is actually delivering."
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            As autonomous agents proliferate on Solana, knowing an agent's persistent identity is essential—which SAID Protocol provides. However, before an orchestrator routes a real-money transaction or delegates a critical task, it also needs continuous empirical proof: <em>Is this agent’s endpoint up right now? Does it respond within latency bounds? Does it have an active incident?</em> Sentinel bridges this critical operational gap.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SAID PROTOCOL</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#00f0ff', marginTop: '0.2rem' }}>Persistent Identity &amp; Reputation</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.4rem 0 0', lineHeight: 1.5 }}>
                Establishes who owns the agent, its verified Solana address, trust tier, advertised skills, and MCP tools.
              </p>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>AGENTPROOF SENTINEL</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#14f195', marginTop: '0.2rem' }}>Continuous Operational Telemetry</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.4rem 0 0', lineHeight: 1.5 }}>
                Independently probes advertised MCP/A2A endpoints every 5 mins. Records immutable uptime, latency, and incident history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Interactive Trust Screen Demo */}
      <section style={{ marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '2rem', background: 'var(--bg-surface-1)', border: '1px solid var(--border-medium)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--accent-solana)', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
                <Zap size={13} />
                <span>INTERACTIVE REVIEWER ACTION</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Test the Machine-Payable Trust Screen
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Click below to trigger a live trust screening combining SAID Protocol identity data with Sentinel operational metrics.
              </p>
            </div>

            <TrustScreenButton wallet={demoWallet} />
          </div>

          <div style={{ background: 'var(--bg-surface-2)', padding: '1rem 1.25rem', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--text-muted)' }}>// REST Endpoint:</span>
            <br />
            <span style={{ color: '#00f0ff' }}>GET</span> /api/v1/screen?wallet={demoWallet}
            <br />
            <span style={{ color: 'var(--text-muted)' }}>// Supports HTTP 402 Payment Required monetization when ENABLE_X402=true.</span>
          </div>
        </div>
      </section>

      {/* 4. Technical Architecture Details */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Real Engineering: What We Built
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--accent-solana)' }}>
              <Server size={18} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>SAID Discovery Service</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Custom TypeScript adapter built with <code className="font-mono">@said-protocol/agent</code> and typed REST clients querying SAID's Solana Mainnet program (<code className="font-mono" style={{ fontSize: '0.75rem' }}>{SAID_PROGRAM_ID.slice(0, 6)}...</code>). Syncs verified wallets, trust tiers, MCP endpoints, and skills.
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#00f0ff' }}>
              <Lock size={18} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>SSRF-Hardened Probing</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Dedicated probe runners with strict DNS resolution pinning. Blocks RFC1918 private subnets, cloud metadata (169.254.169.254), and loopback attacks. 100% safe probing of untrusted third-party agent URLs.
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#818cf8' }}>
              <Cpu size={18} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Deterministic Score Engine</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Transparent mathematical formula: 50% availability + 25% latency consistency + 15% coverage depth + 10% incident stability. Zero black-box AI hallucinations. Clear semantic separation from SAID's official reputation.
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--status-strong)' }}>
              <Code size={18} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>x402 Agent Monetization</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Engineered for machine-to-machine micro-payments. Autonomous Solana agents can query <code className="font-mono">/api/v1/screen</code> paying per-request over the x402 standard, creating a sustainable operational business model.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Clean Migration from BNB to Solana */}
      <section style={{ marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '2rem', background: 'var(--bg-surface-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <GitBranch size={18} color="var(--accent-solana)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Audit Transparency: What Was Changed
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            We did not simply do a cosmetic search-and-replace. We executed a thorough architectural migration:
          </p>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Architecture Dimension</th>
                  <th>Legacy BNB Implementation</th>
                  <th>Migrated Solana Sentinel Native</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Blockchain &amp; Address</strong></td>
                  <td>EVM 0x hex addresses, Chain ID 56</td>
                  <td style={{ color: 'var(--accent-solana)' }}>Base58 Solana public keys, Solana Mainnet</td>
                </tr>
                <tr>
                  <td><strong>Identity Standard</strong></td>
                  <td>ERC-8004 tokens on BSC</td>
                  <td style={{ color: 'var(--accent-solana)' }}>SAID Protocol (Program: 5dpw6K...)</td>
                </tr>
                <tr>
                  <td><strong>Block Explorer</strong></td>
                  <td>BscScan API &amp; links</td>
                  <td style={{ color: 'var(--accent-solana)' }}>Solscan direct account inspection</td>
                </tr>
                <tr>
                  <td><strong>Core Libraries</strong></td>
                  <td>ethers / viem / wagmi EVM dependencies</td>
                  <td style={{ color: 'var(--accent-solana)' }}>@solana/web3.js, @said-protocol/agent, bs58</td>
                </tr>
                <tr>
                  <td><strong>Monetization</strong></td>
                  <td>None</td>
                  <td style={{ color: 'var(--accent-solana)' }}>x402 machine-payable Trust Screen header</td>
                </tr>
                <tr>
                  <td><strong>Test Suite</strong></td>
                  <td>BSC adapter unit tests</td>
                  <td style={{ color: 'var(--accent-solana)' }}>107 automated unit tests across all packages</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. Ready for Grant Funding */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.5rem 2rem', background: 'var(--bg-surface-2)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Ready to submit for SAID Protocol Streaming Grant
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
              Functional code, real tests, clean architecture, and audited security.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/agents" className="btn btn-primary btn-sm">
              <span>View Live Directory</span>
              <ArrowRight size={13} />
            </Link>
            <Link href="/methodology" className="btn btn-secondary btn-sm">
              <span>Read Methodology</span>
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
