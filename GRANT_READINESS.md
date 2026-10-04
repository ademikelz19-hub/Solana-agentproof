# AgentProof Sentinel: SAID Protocol Streaming Grant Readiness

**Product Name:** AGENTPROOF SENTINEL  
**Tagline:** Reliability intelligence for AI agents on Solana.  
**Secondary Positioning:** *Identity tells you who an agent is. Sentinel shows whether it is actually delivering.*  
**Target Network:** Solana Mainnet  
**Target Program ID:** `5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G` (SAID Protocol)  
**SDK Dependencies:** `@said-protocol/agent`, `@solana/web3.js`

---

## 1. Grant Submission Verification Matrix

| Requirement | Evaluation Criteria | Status | Implementation Reference |
|---|---|---|---|
| **Authentic Re-Engineering** | Not a cosmetic rebrand; genuine technical migration from BNB to Solana | **VERIFIED** | Full audit in `MIGRATION_AUDIT.md`; all EVM code removed |
| **Solana Blockchain Primitives** | Base58 public keys, `@solana/web3.js`, Solscan links, zero 0x assumptions | **VERIFIED** | `packages/core/src/validation.ts`, `apps/web/components/AgentExplorerTable.tsx` |
| **SAID Protocol Integration** | Real integration with official SAID endpoints and program ID | **VERIFIED** | `packages/sources/src/said-adapter.ts`, `packages/sources/src/monitoring-runner.ts` |
| **Decoupled Reputation** | Zero manipulation of SAID reputation; no synthetic positive feedback | **VERIFIED** | Strict decoupling in `packages/reliability` and API layer |
| **Security & Key Management** | Zero private keys exposed client-side; server-only payment keys | **VERIFIED** | Hardened `.gitignore`, `.env.example`, zero secrets committed |
| **SSRF-Hardened Probing** | DNS pinning, private IP blocklist, cloud metadata blocking (169.254.169.254) | **VERIFIED** | 36 adversarial tests passing in `packages/probes` |
| **Deterministic Scoring** | Transparent, explainable Sentinel Reliability Score (0–100) | **VERIFIED** | Complete formula in `packages/reliability/src/reliability-engine.ts` |
| **Database Architecture** | Clean models for agents, services, observations, incidents, and runs | **VERIFIED** | Drizzle schema & SQL migration in `packages/db` |
| **Machine-Payable Trust Screen** | `/api/v1/screen` endpoint ready for automated routing & x402 headers | **VERIFIED** | `apps/web/app/api/v1/screen/route.ts` |
| **Automated Test Coverage** | Unit test suite passing across all packages | **VERIFIED** | **121 / 121 tests passing** |
| **Production Build** | Next.js production build succeeds with clean typechecking | **VERIFIED** | `npm run build` exits code 0 |

---

## 2. Real SAID Protocol Integration Proofs

Sentinel integrates directly with the documented official SAID Protocol program and endpoints:

- **Official Program ID:** `5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G`
- **Supported SAID Endpoints:**
  - `GET /api/agents`: Paginated discovery of registered Solana agents.
  - `GET /api/agents/:wallet`: Deep inspection of agent metadata, advertised skills, and MCP/A2A endpoints.
  - `GET /api/verify/:wallet`: Ingestion of official SAID verification status (`VERIFIED`, `UNVERIFIED`, `VERIFICATION_PENDING`).
  - `GET /api/trust/:wallet`: Ingestion of official SAID trust tier (`TIER_1`, `TIER_2`, `TIER_3`, `UNRANKED`) and reputation metrics.
  - `GET /api/screen?wallet=WALLET_ADDRESS`: Pre-flight evaluation for autonomous orchestrators.

### Decoupling Guarantee:
Sentinel distinguishes between:
1. **Official SAID Reputation & Trust Tier:** Authority resides entirely with SAID Protocol on Solana.
2. **Sentinel Reliability Score:** Factual operational telemetry (uptime, latency percentiles, incident history) measured independently by Sentinel.

Sentinel **never submits automated positive feedback** or manipulates reputation merely because an agent is reachable.

---

## 3. Security & Operational Safety

1. **Zero Client-Side Key Leakage:**
   - The browser frontend contains zero private keys, wallet secrets, or signing material.
   - Any payment transaction signing for x402 or on-chain attestations occurs strictly server-side using non-public environment variables.
2. **SSRF & DNS Rebinding Hardening:**
   - Every outbound probe request passes through `packages/probes/src/transport.ts`.
   - Hostnames are resolved to IP addresses *before* connecting.
   - Probes targeting RFC1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), local loopbacks (`127.0.0.1`), or cloud instance metadata (`169.254.169.254`) are aborted before socket creation.
   - Tested by 36 unit tests in `packages/probes/src/ip-policy.test.ts`.
3. **Respectful Probing:**
   - Probing cadence defaults to 5 minutes with an 8-second timeout.
   - Global concurrency is bounded (default 10) with per-host throttling (maximum 2 concurrent).
   - Repeated failures trigger exponential backoff.

---

## 4. Test Suite & Build Verification Results

### Unit Test Execution (`npm test`):
```
 RUN  v2.1.9

 ✓ @agentproof/core (15 tests)
   - src/in-memory-repositories-reputation.test.ts (5 tests)
   - src/in-memory-repositories.test.ts (4 tests)
   - src/validation.test.ts (6 tests)

 ✓ @agentproof/probes (72 tests)
   - src/ip-policy.test.ts (36 tests)
   - src/rate-limit.test.ts (6 tests)
   - src/transport.test.ts (17 tests)
   - src/probe-runner.test.ts (13 tests)

 ✓ @agentproof/reliability (12 tests)
   - src/canonical-consistency.test.ts (6 tests)
   - src/reliability-engine.test.ts (6 tests)

 ✓ @agentproof/reputation (14 tests)
   - src/reputation-engine.test.ts (14 tests)

 ✓ @agentproof/sources (8 tests)
   - src/normalize.test.ts (3 tests)
   - src/said-adapter.test.ts (5 tests)

 Test Files  12 passed (12)
      Tests  121 passed (121)
   Duration  7.5s
```

### Full Monorepo Build Execution (`npm run build`):
```
> agentproof@0.1.0 build
> npm run build:packages && npm run build --workspace=@agentproof/web

> @agentproof/core@0.1.0 build (tsc -p .) -> EXIT 0
> @agentproof/db@0.1.0 build (tsc -p .) -> EXIT 0
> @agentproof/probes@0.1.0 build (tsc -p .) -> EXIT 0
> @agentproof/reliability@0.1.0 build (tsc -p .) -> EXIT 0
> @agentproof/reputation@0.1.0 build (tsc -p .) -> EXIT 0
> @agentproof/sources@0.1.0 build (tsc -p .) -> EXIT 0
> @agentproof/web@0.1.0 build (next build) -> EXIT 0

Route (app)                                              Size  First Load JS
┌ ƒ /                                                 4.14 kB         194 kB
├ ○ /_not-found                                         158 B         103 kB
├ ƒ /agents                                           4.25 kB         117 kB
├ ƒ /agents/[chain]/[id]                              4.04 kB         199 kB
├ ƒ /api/cron/monitor                                   158 B         103 kB
├ ƒ /api/health                                         158 B         103 kB
├ ƒ /api/v1/agents                                      158 B         103 kB
├ ƒ /api/v1/agents/[chain]/[id]                         158 B         103 kB
├ ƒ /api/v1/agents/[chain]/[id]/badge.svg               158 B         103 kB
├ ƒ /api/v1/agents/[chain]/[id]/observations            158 B         103 kB
├ ƒ /api/v1/agents/[chain]/[id]/reliability             158 B         103 kB
├ ƒ /api/v1/agents/[chain]/[id]/reputation-integrity    158 B         103 kB
├ ƒ /api/v1/agents/[chain]/[id]/services                158 B         103 kB
├ ƒ /api/v1/health                                      158 B         103 kB
├ ƒ /api/v1/methodology                                 158 B         103 kB
├ ƒ /api/v1/network-stats                               158 B         103 kB
├ ƒ /api/v1/public/agents                               158 B         103 kB
├ ƒ /api/v1/screen                                      158 B         103 kB
├ ƒ /developers                                         187 B         113 kB
├ ○ /docs                                               158 B         103 kB
├ ƒ /grant-demo                                       2.18 kB         115 kB
└ ƒ /methodology                                       2.1 kB         112 kB
```

---

## 5. Reviewer Quick-Start Instructions

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/ademikelz19-hub/agentproof
cd "solana agentproof"
npm install
```

### Step 2: Configure Environment
Copy the placeholder environment file:
```bash
cp .env.example .env.local
```
*(No real credentials needed to inspect or run with mock/in-memory fallbacks).*

### Step 3: Run the Verification Suite
```bash
# Run 121 automated unit tests
npm test

# Run full TypeScript compilation and Next.js production build
npm run build
```

### Step 4: Launch the Local Dashboard
```bash
npm run dev
```
Open your browser to:
- **Grant Evaluation Tour (60 seconds):** `http://localhost:3000/grant-demo`
- **Homepage & Search:** `http://localhost:3000`
- **Monitored Agent Directory:** `http://localhost:3000/agents`
- **Agent Reliability Passport:** `http://localhost:3000/agents/solana/5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G`
- **Developer API Reference:** `http://localhost:3000/developers`
- **Technical Methodology:** `http://localhost:3000/methodology`

### Step 5: Test the Machine-Payable Trust Screen
Execute a test query directly from your terminal:
```bash
curl http://localhost:3000/api/v1/screen?wallet=5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G
```

---

## 6. Grant Contact & Repository Metadata

- **Project Name:** AgentProof Sentinel
- **Target Grant:** SAID Protocol Streaming Grant
- **Repository URL:** `https://github.com/ademikelz19-hub/agentproof`
- **Primary Deliverables:**
  - `MIGRATION_AUDIT.md`: Complete audit of architecture migration
  - `PROGRESS.md`: Phased milestone delivery log
  - `GRANT_ROADMAP.md`: Multi-milestone execution and budget plan
  - `GRANT_READINESS.md`: This verification document
  - `README.md`: Developer guide and product documentation
