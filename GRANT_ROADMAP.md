# AgentProof Sentinel: SAID Protocol Streaming Grant Roadmap

**Product:** AGENTPROOF SENTINEL  
**Tagline:** Reliability intelligence for AI agents on Solana.  
**Secondary Positioning:** *Identity tells you who an agent is. Sentinel shows whether it is actually delivering.*  
**Network:** Solana Mainnet  
**SAID Program ID:** `5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G`  
**Official SDK:** `@said-protocol/agent`, `@solana/web3.js`

---

## Executive Summary

AgentProof Sentinel is the autonomous operational reliability layer designed specifically for the SAID Protocol ecosystem on Solana.

While SAID Protocol establishes persistent on-chain identity, cryptographic ownership, trust tiering, and community reputation, Sentinel continuously and independently monitors whether an agent's published service endpoints (Model Context Protocol tools, Agent-to-Agent communication interfaces, and REST APIs) are reachable, responsive, and operating within service level agreements.

This roadmap details the phased technical delivery for the **SAID Protocol Streaming Grant**, starting with the functional MVP delivered in this codebase through to decentralized, multi-region operational attestations.

---

## Phased Grant Milestones

```
+---------------------------------------------------------------------------------+
|                                GRANT TIMELINE                                   |
+---------------------+---------------------+---------------------+---------------+
|  MILESTONE 1 (MVP)  |     MILESTONE 2     |     MILESTONE 3     |  MILESTONE 4  |
|  [CURRENT STATUS]   |  Multi-Region Probes| On-Chain Attestation| Full x402 Pay |
|  - SAID Adapter     |  - 3 Geo Regions    | - Solana Program    | - Machine Pay |
|  - SSRF Probe Engine|  - Latency Variance | - Merkle Snapshots  | - Micro-SOL   |
|  - Sentinel Score   |  - Anomaly Alarms   | - Zero Manipulation| - Auto-SLA    |
|  - Web Dashboard    |  - A2A Handshake v2 | - Verification Proof| - Orchestration|
+---------------------+---------------------+---------------------+---------------+
```

---

### Milestone 1: Core Solana Migration & SAID Protocol Integration (CURRENT STATUS: COMPLETED)

**Objective:** Deliver a functional, deployable, and fully tested Solana-native reliability layer integrated with official SAID Protocol endpoints.

#### Deliverables Completed:
1. **Repository Audit & Architecture Migration:**
   - Completed full audit removing all BNB Smart Chain dependencies, ERC-8004 token assumptions, chain ID 56 references, and BscScan links.
   - Clean architectural replacement with `@solana/web3.js`, Base58 public key validation, and Solscan integration.
2. **SAID Protocol Discovery Adapter (`@agentproof/sources`):**
   - Implemented `SaidProtocolAdapter` interfacing with SAID's Solana Mainnet program (`5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G`).
   - Discovers registered agents, verification status (`VERIFIED`, `UNVERIFIED`, `VERIFICATION_PENDING`), trust tier (`TIER_1`, `TIER_2`, `TIER_3`, `UNRANKED`), declared skills, service types, MCP endpoints, and A2A endpoints.
3. **SSRF-Hardened Autonomous Probing (`@agentproof/probes`):**
   - Implemented specialized probes for `probeMcpHealth`, `probeA2aHealth`, `probeHttpStatus`, and `probeResponseLatency`.
   - Hardened with DNS pinning, private RFC1918 blocklists, cloud metadata blocking (169.254.169.254), and 1MB payload caps.
4. **Factual Reliability & Incident Engine (`@agentproof/reliability`):**
   - Mathematical sliding-window uptime (24h, 7d, 30d), median latency, P95 latency, and sufficiency tiering (`STRONG`, `MODERATE`, `LIMITED`, `INSUFFICIENT`).
   - Implemented the transparent **Sentinel Reliability Score (0–100)**:
     $$\text{Score} = (\text{Availability} \times 50\%) + (\text{Latency} \times 25\%) + (\text{Coverage} \times 15\%) + (\text{Stability} \times 10\%)$$
   - Automated incident lifecycle tracking: opens on 2+ consecutive failures, auto-resolves on verified recovery.
5. **Machine-Payable Trust Screen API (`/api/v1/screen`):**
   - Pre-screening endpoint combining SAID identity verification with Sentinel operational metrics.
   - Configurable `ENABLE_X402=false` default with machine monetization headers prepared.
6. **Full-Featured Web Dashboard (`@agentproof/web`):**
   - Live telemetry, interactive Solana wallet search bar, monitored directory, individual agent reliability passports, and dedicated `/grant-demo` 60-second tour.
   - 121 unit tests passing across all packages; 100% clean production build.

---

### Milestone 2: Multi-Region Probing & Advanced A2A Handshakes (Month 2)

**Objective:** Expand probing infrastructure to multi-region distributed nodes to eliminate geographic bias and enhance Agent-to-Agent (A2A) protocol verification.

#### Planned Deliverables:
- **Tri-Region Probing Nodes:**
  - Deploy probe runners across North America (US-East), Europe (Frankfurt), and Asia-Pacific (Tokyo).
  - Calculate geographically weighted median latency and detect regional network partitions.
- **Advanced Model Context Protocol (MCP) Verification:**
  - Execute schema introspection on advertised MCP tools (`tools/list`).
  - Validate tool schema correctness without executing side-effecting operations.
- **Agent-to-Agent (A2A) Handshake v2:**
  - Implement full mutual handshake verification for agents advertising standard A2A interfaces.
  - Measure round-trip negotiation latency and protocol compliance.
- **Webhook & Alert Dispatching:**
  - Enable agent operators to register webhook endpoints for immediate notification upon incident detection.

---

### Milestone 3: Solana On-Chain Attestation Program (Month 3)

**Objective:** Commit cryptographic proofs of Sentinel reliability snapshots to Solana Mainnet, establishing an immutable on-chain record for smart contracts and autonomous DeFi orchestrators.

#### Planned Deliverables:
- **Sentinel Anchor Program on Solana:**
  - Deploy custom Solana program storing periodic Merkle roots of operational reliability snapshots.
  - PDA (Program Derived Address) structure: `[b"sentinel_attestation", agent_wallet, epoch_timestamp]`.
- **Zero-Manipulation Attestations:**
  - Operational attestations strictly verify uptime and latency; never fabricate or manipulate SAID protocol reputation.
  - Smart contracts can read on-chain Sentinel attestations before executing atomic multi-agent transactions.
- **Solana Blinks & Actions Integration:**
  - Create Solana Actions and Blinks allowing users to share and inspect an agent's real-time reliability passport directly on Twitter/X or messaging platforms.

---

### Milestone 4: Full x402 Machine-Payable Monetization & Automated SLAs (Month 4)

**Objective:** Transition Sentinel into a self-sustaining machine-payable utility powering automated agent routing and service level agreement (SLA) enforcement on Solana.

#### Planned Deliverables:
- **x402 Micro-SOL Settlement Engine:**
  - Enable autonomous AI agents to query `/api/v1/screen` and high-frequency telemetry endpoints paying micro-SOL or USDC per call over HTTP 402 headers.
  - Non-custodial server-side payment verification using Solana Pay and x402 standards.
- **Automated Service Level Agreements (SLAs):**
  - Allow Solana protocols to define SLA thresholds (e.g. "Require >99.0% uptime and <250ms median latency").
  - Provide automated pass/fail verification for automated routing or escrow releases.
- **SDK for Solana AI Agent Frameworks:**
  - Release `@agentproof/sentinel-sdk` for Eliza, Rig, Solana Agent Kit, and LangChain agents.
  - Pre-flight screening helper: `await sentinel.screenAgent(targetWallet)`.

---

## Technical Architecture Overview

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

## Budget & Streaming Grant Allocation

| Allocation Area | Percentage | Core Focus |
|-----------------|------------|------------|
| **Solana Core Engineering** | 35% | On-chain Anchor program, Solana Pay integration, RPC node scaling |
| **Probing Infrastructure & DevOps** | 30% | Multi-region probe nodes (US, EU, APAC), egress bandwidth, database scaling |
| **SAID Protocol Integration** | 20% | Continuous alignment with SAID SDK updates, A2A/MCP protocol standards |
| **Security, Testing & Audits** | 15% | SSRF regression testing, adversarial penetration testing, external audit |

---

## Conclusion & Evaluation Readiness

AgentProof Sentinel is technically real, functionally complete for Milestone 1, fully verified by 121 unit tests, and production-built on Next.js 15. It is ready for evaluation by the SAID Protocol Streaming Grant committee.

To review the live demo:
- Run locally: `npm run dev` and visit `http://localhost:3000/grant-demo`
- Inspect code audit: `MIGRATION_AUDIT.md`
- Inspect grant readiness checklist: `GRANT_READINESS.md`
