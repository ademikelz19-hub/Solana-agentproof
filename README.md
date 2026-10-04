# AgentProof Sentinel 🛡️

**Reliability intelligence for AI agents on Solana.**

> *"Identity tells you who an agent is. Sentinel shows whether it is actually delivering."*

[![Solana Mainnet](https://img.shields.io/badge/Network-Solana%20Mainnet-14F195?logo=solana&logoColor=black)](https://solana.com)
[![SAID Protocol](https://img.shields.io/badge/SAID%20Protocol-5dpw6K...-00F0FF)](https://saidprotocol.com)
[![Unit Tests](https://img.shields.io/badge/Tests-121%20Passing-brightgreen)](https://github.com/ademikelz19-hub/agentproof)
[![Build Status](https://img.shields.io/badge/Next.js%2015-Passing-14F195)](https://nextjs.org)
[![CORS Enabled](https://img.shields.io/badge/CORS-Enabled%20(*)-10b981.svg)](/developers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 Executive Overview

**AgentProof Sentinel** is an autonomous operational reliability layer built specifically for the **SAID Protocol** ecosystem on Solana.

As autonomous AI agents proliferate across Solana to execute swaps, rebalance portfolios, provide liquidity, and orchestrate complex tasks, knowing *who* an agent is becomes necessary—which **SAID Protocol** establishes through cryptographic identity and community trust tiering.

However, before an autonomous orchestrator or user routes capital to an agent, they need continuous empirical evidence:
- *Is this verified agent's endpoint reachable right now?*
- *Does its declared Model Context Protocol (MCP) tool respond within latency SLA?*
- *Is its Agent-to-Agent (A2A) communication interface healthy, or is it experiencing downtime?*
- *What is its 24-hour, 7-day, and 30-day factual uptime percentage?*

**Sentinel answers these questions without black-box scores, social-media vanity metrics, or fake reviews.**

---

## 🔍 SAID Protocol Integration: Identity vs. Operational Telemetry

Sentinel integrates directly with official SAID Protocol documentation, SDK, and Solana Mainnet program:

- **Official Program ID:** `5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G`
- **SDK:** `@said-protocol/agent`, `@solana/web3.js`
- **Supported SAID Endpoints:**
  - `GET /api/agents`: Paginated discovery of registered Solana agents
  - `GET /api/agents/:wallet`: Full metadata, skills, and declared service endpoints
  - `GET /api/verify/:wallet`: Official identity verification status (`VERIFIED`, `UNVERIFIED`, `VERIFICATION_PENDING`)
  - `GET /api/trust/:wallet`: Official trust tier (`TIER_1`, `TIER_2`, `TIER_3`, `UNRANKED`) and reputation metrics
  - `GET /api/screen?wallet=WALLET_ADDRESS`: Pre-flight evaluation for autonomous orchestrators

### Strict Decoupling Guarantee
Sentinel enforces strict semantic separation:
1. **SAID Protocol Authority:** Official agent identity, trust tier, and community reputation belong strictly to SAID Protocol.
2. **Sentinel Telemetry:** Factual operational uptime, latency percentiles, and incident history are measured independently by Sentinel.
3. **Zero Reputation Manipulation:** Sentinel never writes synthetic positive reviews or auto-submits feedback merely because an agent's endpoint answers a ping.

---

## 🏗️ Architecture Overview

```
                      +-----------------------------+
                      |     SAID Protocol (Solana)   |
                      |   Program: 5dpw6KEQPn...    |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   SAID Discovery Adapter     |
                      |   - GET /api/agents         |
                      |   - GET /api/verify/:wallet |
                      |   - GET /api/trust/:wallet  |
                      +--------------+--------------+
                                     |
                                     v
+-----------------------+     +-----------------------------+     +-----------------------+
|  Published MCP Tools  | <-- |   SSRF-Hardened Prober      | --> | Published A2A Endpoints|
|  - Reachability       |     |   - DNS Pinning / RFC1918   |     | - Protocol Handshake  |
|  - JSON-RPC Ping      |     |   - 5-Min Intervals / 8s TO |     | - Handshake Latency   |
+-----------------------+     +--------------+--------------+     +-----------------------+
                                             |
                                             v
                              +-----------------------------+
                              |   Append-Only DB Ledger     |
                              |   - PostgreSQL Telemetry    |
                              |   - Incidents & Snapshots   |
                              +--------------+--------------+
                                             |
                                             v
                              +-----------------------------+
                              |   Sentinel Reliability      |
                              |   Score Engine (0-100)      |
                              +--------------+--------------+
                                     |               |
             +-----------------------+               +-----------------------+
             |                                                               |
             v                                                               v
+-----------------------------+                             +-----------------------------+
|    Sentinel Web Dashboard   |                             | Machine-Payable REST API    |
| - Real-time Passports       |                             | - GET /api/v1/screen        |
| - 24h / 7d / 30d Uptime     |                             | - GET /api/v1/reliability   |
| - Incident History & Charts |                             | - x402 Micro-Payment Header |
+-----------------------------+                             +-----------------------------+
```

---

## 📐 Explainable Sentinel Reliability Score (0–100)

Unlike opaque or subjective reputation systems, the **Sentinel Reliability Score** is computed deterministically from empirical measurements:

$$\text{Sentinel Score} = (\text{Availability} \times 50\%) + (\text{Latency} \times 25\%) + (\text{Coverage} \times 15\%) + (\text{Stability} \times 10\%)$$

| Component | Weight | Calculation Basis |
|---|---|---|
| **Availability** | 50% | Sliding-window uptime: $(24\text{h Uptime} \times 0.7) + (7\text{d Uptime} \times 0.3)$ |
| **Latency** | 25% | Median response speed: Full marks for $<300\text{ms}$; linear degradation to 0 at $>3,000\text{ms}$ |
| **Coverage** | 15% | Statistical sample depth: 20+ checks over sliding window unlock maximum coverage points |
| **Stability** | 10% | Deductions applied for active unresolved downtime incidents or consecutive probe failures |

*Display designation: "Operational reliability measured by AgentProof Sentinel." Never displayed as "Official SAID score."*

---

## 🔒 Security & Key Management

1. **Zero Client-Side Key Exposure:**
   - Sentinel operates strictly non-custodially in the browser.
   - Any server-side signing material (e.g. for x402 or on-chain attestation) uses private, non-public environment variables that are never exposed via `NEXT_PUBLIC_` prefixes.
2. **SSRF & DNS Rebinding Hardening:**
   - Dedicated probe transports enforce pre-connection DNS resolution pinning.
   - Immediate rejection of RFC1918 private IPs (`10.x`, `172.16.x`, `192.168.x`), loopback addresses (`127.0.0.1`), and cloud metadata services (`169.254.169.254`).
   - Strict 1MB response size limits to prevent Denial-of-Service attacks.
3. **Respectful Monitoring:**
   - Default monitoring cycle: 5 minutes. Default timeout: 8 seconds.
   - Bounded global and per-host concurrency with exponential backoff on consecutive failures.

---

## 💳 Machine-Payable Trust Screening (`/api/v1/screen`)

Sentinel provides an autonomous pre-flight screening endpoint designed for agent-to-agent routing:

```bash
# Query the live screening endpoint
curl "http://localhost:3000/api/v1/screen?wallet=5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G"
```

### Example JSON Response:
```json
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
}
```

*When `ENABLE_X402=true` is configured, callers without payment credentials receive an `HTTP 402 Payment Required` challenge, enabling programmatic micro-payment monetization on Solana.*

---

## 📦 Monorepo Workspace Structure

```
solana agentproof/
├── apps/
│   └── web/                   # Next.js 15 dashboard, explorer table, badges & REST API
├── packages/
│   ├── core/                  # Solana domain entities, Zod schemas & public key validation
│   ├── db/                    # Drizzle ORM schema, SQL migrations & PostgreSQL repositories
│   ├── probes/                # SSRF-hardened probe engine (MCP, A2A, HTTP status, latency)
│   ├── reliability/           # Factual sliding-window uptime & Sentinel Reliability Score
│   ├── reputation/            # Reviewer distribution & statistical concentration analytics
│   └── sources/               # SAID Protocol adapter & autonomous cycle execution engine
├── scripts/
│   ├── run-monitoring.ts      # Standalone CLI monitoring runner
│   └── sync-said-agents.ts    # CLI synchronization script for SAID agents
├── MIGRATION_AUDIT.md         # Full architectural audit of BNB-to-Solana migration
├── PROGRESS.md                # Milestone completion log
├── GRANT_ROADMAP.md           # Multi-milestone execution and budget plan
└── GRANT_READINESS.md         # Grant submission verification matrix
```

---

## 🚀 Quickstart & Development

### 1. Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **PostgreSQL**: Local database or Neon Serverless instance (optional for read-only inspection)

### 2. Installation
```bash
git clone https://github.com/ademikelz19-hub/agentproof
cd "solana agentproof"
npm install
```

### 3. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env.local
```

### 4. Run Automated Test Suite
```bash
# Run 121 unit tests across all monorepo packages
npm test
```

### 5. Build for Production
```bash
# Build all dependency packages and Next.js production bundle
npm run build
```

### 6. Launch the Local Development Server
```bash
npm run dev
```

Open your browser to:
- **Grant Evaluation Tour (60 seconds):** `http://localhost:3000/grant-demo`
- **Dashboard & Search:** `http://localhost:3000`
- **Agent Directory:** `http://localhost:3000/agents`
- **Developer API Documentation:** `http://localhost:3000/developers`
- **Methodology & Mathematical Formulas:** `http://localhost:3000/methodology`

---

## 📡 Public REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health, Solana network, and SAID program status |
| `GET` | `/api/v1/network-stats` | Aggregated network uptime, total probes, and active incidents |
| `GET` | `/api/v1/screen?wallet=:address` | SAID Trust Screen (combined identity & operational SLA) |
| `GET` | `/api/v1/agents` | Paginated list of discovered Solana AI agents |
| `GET` | `/api/v1/agents/solana/:wallet` | Single agent SAID identity & metadata details |
| `GET` | `/api/v1/agents/solana/:wallet/reliability` | 24h / 7d / 30d uptime, latency percentiles & Sentinel Score |
| `GET` | `/api/v1/agents/solana/:wallet/services` | Declared MCP and A2A service endpoints |
| `GET` | `/api/v1/agents/solana/:wallet/observations` | Forensic probe observation audit trail |
| `GET` | `/api/v1/agents/solana/:wallet/badge.svg` | Dynamic SVG uptime badge for GitHub READMEs |
| `POST`| `/api/cron/monitor` | Trigger autonomous monitoring cycle (Secured via `CRON_SECRET`) |

---

## 🏷️ Embed Live Status Badges

Add a live, auto-updating uptime badge to any GitHub repository or documentation page:

```markdown
[![Sentinel Uptime](https://your-domain.com/api/v1/agents/solana/5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G/badge.svg)](https://your-domain.com/agents/solana/5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G)
```

---

## 📜 Grant Submission Documents

- [Migration Audit (`MIGRATION_AUDIT.md`)](file:///c:/Users/USER/Downloads/solana%20agentproof/MIGRATION_AUDIT.md): Technical audit of what existed, what was removed, and what became Solana-native.
- [Progress Log (`PROGRESS.md`)](file:///c:/Users/USER/Downloads/solana%20agentproof/PROGRESS.md): Detailed milestone-by-milestone implementation tracker.
- [Grant Roadmap (`GRANT_ROADMAP.md`)](file:///c:/Users/USER/Downloads/solana%20agentproof/GRANT_ROADMAP.md): Phased deliverables, multi-region probes, on-chain attestations, and budget.
- [Grant Readiness (`GRANT_READINESS.md`)](file:///c:/Users/USER/Downloads/solana%20agentproof/GRANT_READINESS.md): Submission verification matrix and test proofs.

---

## License

This project is licensed under the [MIT License](LICENSE).
