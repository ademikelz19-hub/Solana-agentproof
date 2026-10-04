# AgentProof Sentinel: Migration & Technical Audit

**Project:** AgentProof Sentinel  
**Target Chain:** Solana Mainnet  
**Target Identity/Protocol Ecosystem:** SAID Protocol (`5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G`)  
**Audit Date:** 2026-10-03  
**Auditor / Lead Engineer:** Senior Full-Stack, Solana & AI-Agent Infrastructure Lead  

---

## 1. Executive Summary

This audit assesses the existing `agentproof` codebase—originally designed as an open reliability monitoring system for ERC-8004 autonomous agents on BNB Smart Chain (BSC)—and details the comprehensive technical migration to **AgentProof Sentinel**: an autonomous operational reliability layer built specifically for the **SAID Protocol** ecosystem on **Solana Mainnet**.

Rather than performing a cosmetic rebrand or simple text search-and-replace, this migration replaces EVM/BSC dependencies, data models, registry integrations, address validation, and explorer links with genuine Solana-native primitives, `@solana/web3.js`, official SAID Protocol SDK (`@said-protocol/agent`), resilient discovery services, factual reliability scoring, incident tracking, and SSRF-hardened endpoint monitoring.

---

## 2. Existing Repository Architecture Audit

### 2.1 Monorepo Structure & Frameworks
- **Repository Architecture:** npm workspaces monorepo with 6 packages and 1 application:
  - `apps/web`: Next.js 15.2.0 (App Router), React 18.3.1, Lucide React icons, Tailwind-free custom CSS with CSS variables (`globals.css`).
  - `packages/core`: Domain types (`domain.ts`), validation boundary using Zod 3.23.8 (`validation.ts`), repository interfaces (`repositories.ts`), adapter abstractions (`adapters.ts`), in-memory fixtures.
  - `packages/db`: Drizzle ORM 0.45.2, PostgreSQL client (`pg` 8.23.0), migration configs (`drizzle.config.ts`), repository implementations (`drizzle-repositories.ts`).
  - `packages/probes`: Transport engine with SSRF defense (DNS pinning, private IP filtering with `ipaddr.js`), probe runners for HTTP reachability, latency, status, and protocol validity, concurrency/rate limiter (`rate-limit.ts`).
  - `packages/reliability`: Pure mathematical engine computing 24h, 7d, 30d availability windows, median and P95 latencies, consecutive failure counts, and data sufficiency classifications.
  - `packages/reputation`: Herfindahl-Hirschman index (HHI) concentration calculations and reviewer diversity signals.
  - `packages/sources`: 8004scan API adapter for fetching BSC agent lists, metadata, and services.
- **Backend Framework:** Next.js Route Handlers (`apps/web/app/api/...`), Node.js scripts (`scripts/run-monitoring.ts`, `scripts/ingest-feedbacks.ts`).
- **Database:** PostgreSQL via Drizzle ORM (`drizzle-orm/pg-core`).
- **Authentication:** None currently required for public reads; scheduler protected via environment configuration / secret headers.
- **Monitoring Engine:** `packages/probes` executing safe outbound requests with rate limiting and timeout management.
- **Scheduled Jobs:** CLI script (`scripts/run-monitoring.ts`) previously triggered on schedule or ad-hoc.
- **Deployment Configuration:** Vercel (`vercel.json`), Next.js server configuration.

---

## 3. Inventory of What Currently Exists

| Component / Subsystem | Current State in Cloned Repo | Assessment |
|-----------------------|------------------------------|------------|
| **Chain Configuration** | Hardcoded to `bsc` (`chainId: 56`, `BSC` constant in `domain.ts`) | **Must be replaced** with Solana Mainnet (`solana`, Genesis/Cluster ID). |
| **Address / Key Formats** | EVM 20-byte hex addresses (`0x8004a1...`, `0x...`) | **Must be replaced** with base58-encoded 32-byte Solana `PublicKey`. |
| **Agent Identity Source** | `8004scan.io` API adapter (`EightOFourScanAdapter`) for ERC-8004 | **Must be replaced** with native SAID Protocol Discovery & SDK (`@said-protocol/agent`, SAID REST API). |
| **Explorer Links** | BscScan links (`https://bscscan.com/address/...`) | **Must be replaced** with Solscan (`https://solscan.io/account/...`). |
| **EVM Dependencies** | References to ERC-8004, EVM contracts, chain ID 56 | **Remove** all dead EVM assumptions. |
| **Reliability Calculations** | Pure statistical functions in `packages/reliability` (uptime, latency, P95, sufficiency) | **Retain & Extend** into the formal *Sentinel Reliability Score* with explainable formulas. |
| **Probes & Transport** | SSRF-safe HTTP client (`safeRequest`), DNS pin, IP policy, rate limiter | **Retain & Enhance** for monitoring SAID agent endpoints (A2A, MCP, Webhook/HTTP). |
| **Database Schema** | Drizzle schema with tables: `agents`, `services`, `probe_runs`, `observations`, `reputation_snapshots`, `integrity_signals`, `methodology_versions` | **Retain & Migrate** to support SAID agents, monitor targets, incidents, trust snapshots, and sync runs. |
| **Frontend UI** | Next.js App Router with custom dark theme, tables, graphs, badges, and cards | **Retain & Modernize**: Replace BSC yellow accents (`#f0b90b`) with Solana developer aesthetic, rewrite hero, directory, profile, and navigation. |
| **Developer API** | `/api/v1/agents`, `/api/health`, `/api/v1/agents/[chain]/[id]/reliability`, `/badge.svg` | **Retain & Refactor** to serve Solana agents, network stats, and operational health. |

---

## 4. BNB / EVM Specific Elements Identified

1. **Chain definition & constants:**
   - `packages/core/src/domain.ts`: `export type ChainId = 'bsc'`, `BSC: Chain = { id: 'bsc', chainId: 56, name: 'BNB Smart Chain' }`.
   - `packages/core/src/in-memory-repositories.ts`: BSC test fixtures.
   - `packages/sources/src/eight-o-four-scan-adapter.ts`: 8004scan API endpoints (`chainId=56`).
   - `scripts/run-monitoring.ts`: Hardcoded priority BSC agent IDs (`bsc:2142`, `bsc:2518`, etc.) and BSC contract `0x8004a169fb4a3325136eb29fa0ceb6d2e539a432`.
   - `scripts/ingest-feedbacks.ts`: 8004scan feedback API for chain 56.
2. **UI & Styling:**
   - `apps/web/app/globals.css`: `--accent-bnb: #f0b90b`, `--accent-bnb-hover: #fcd535`, `--accent-bnb-subtle: rgba(240, 185, 11, 0.1)`, `--accent-bnb-border: rgba(240, 185, 11, 0.35)`.
   - `apps/web/components/Navbar.tsx`: "BNB Chain", "BNB Chain Mainnet (56)", BNB yellow badges.
   - `apps/web/app/page.tsx`: "BNB CHAIN AGENT RELIABILITY INFRASTRUCTURE", "Anyone can register an agent identity on BNB Chain."
   - `apps/web/app/agents/page.tsx` & `apps/web/app/agents/[chain]/[id]/page.tsx`: Route param `[chain]` expecting `'bsc'`, "BNB Registry", "TOKEN #...".
3. **Documentation:**
   - `README.md`, `docs/INITIAL_BSC_COHORT.md`, `docs/research/STATE_OF_BNB_AGENT_RELIABILITY_2026.md`, etc.

---

## 5. Migration Strategy & Technical Replacements

### 5.1 What Will Be Retained
- **SSRF Protection Engine (`packages/probes`):** Strict DNS pre-resolution, IP policy blocking (loopback, private ranges 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, link-local, multicast, cloud metadata 169.254.169.254), connection pinning, size caps, and non-redirect credential stripping.
- **Reliability Calculation Engine (`packages/reliability`):** Pure mathematical functions calculating 24h, 7d, 30d availability, median latency, p95 latency, and consecutive failures.
- **Rate Limiting & Concurrency Controls:** `ProbeRateLimiter` preventing endpoint flooding, domain cooldowns, and host-level concurrency limits.
- **Append-Only Evidence Architecture:** Retain strict append-only paradigm for probe observations and audit records.
- **Component Primitives:** TimeAgo, CopyButton, MetricCard, PageShell, SafeExternalLink, badges.

### 5.2 What Will Be Replaced
- **Chain Architecture:** Replace BSC (`id: 'bsc'`, `chainId: 56`) with Solana (`id: 'solana'`, `cluster: 'mainnet-beta'`).
- **Identity & Registry Source:** Replace 8004scan adapter with a robust **SAID Protocol Discovery & SDK Client** (`packages/sources/src/said-adapter.ts`).
- **Address Validation:** Replace EVM 0x hex validation with `@solana/web3.js` `PublicKey.isOnCurve(new PublicKey(address))` or base58 validation.
- **Explorer Links:** Replace BscScan with Solscan (`https://solscan.io/account/${wallet}`).
- **Scoring Nomenclature:** Formalize internal calculation as **Sentinel Reliability Score** (0-100 index derived purely from measured uptime, latency consistency, and recovery behavior).
- **Branding & Visual Design:** Transition from BSC yellow palette to Solana-native developer aesthetic (clean dark slate, emerald/cyan accents, crisp monospace telemetry).

### 5.3 What Will Be Added
- **SAID Protocol Integration:**
  - Official SDK integration: `@said-protocol/agent` (Program ID: `5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G`).
  - Discovery service querying `GET /api/agents`, `GET /api/agents/:wallet`, `GET /api/verify/:wallet`, `GET /api/trust/:wallet`.
  - Storage for SAID trust tier, verification status, reputation score, skills, service types, MCP endpoints, and A2A endpoints.
- **Incident Tracking Subsystem:** Automatic incident opening on consecutive failure threshold (e.g., 2 consecutive failures) and resolution on recovery, with duration and failure cause tracking.
- **Trust Screen Integration:** Optional machine-payable / x402 Trust Screen integration (`GET /api/screen?wallet=...`) with safe fallback when `ENABLE_X402=false` and server-side secret handling.
- **Automated Monitoring Route & Scheduler:** Protected endpoint (`/api/cron/monitor`) secured by `CRON_SECRET`, runnable via Vercel Cron or serverless triggers.
- **Reviewer-Friendly Grant Demo Page:** `/grant-demo` detailing live Solana mainnet operations, monitored agents, verifiable architecture, and streaming grant milestones.
- **Dedicated Grant Documentation:** `GRANT_ROADMAP.md` and `GRANT_READINESS.md`.

---

## 6. Migration Risks & Mitigations

1. **Risk:** SAID API rate limits, temporary downtime, or missing optional metadata fields.  
   **Mitigation:** Typed Zod validation boundaries, resilient fallback caching, exponential backoff, and graceful handling of missing MCP/A2A endpoints.
2. **Risk:** SSRF vulnerabilities through user-submitted or unvetted agent endpoints.  
   **Mitigation:** Retain and enforce the existing DNS-pinned, zero-private-IP socket connection engine in `packages/probes`.
3. **Risk:** Conflating official SAID reputation with Sentinel operational metrics.  
   **Mitigation:** Strict semantic separation in the UI, API, and database. SAID Reputation is labeled "SAID Official Identity & Reputation"; operational metrics are labeled "Sentinel Reliability Score".
4. **Risk:** Exposure of Solana signing keys or server secrets.  
   **Mitigation:** All operational or payment keypairs remain server-side only; `.gitignore` hardened against committing secret keys or environment credentials.
