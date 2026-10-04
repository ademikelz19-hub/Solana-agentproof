/**
 * Drizzle schema for AgentProof Sentinel.
 *
 * Target: Solana Mainnet
 * Target Protocol: SAID Protocol (5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G)
 *
 * Architecture:
 * - Append-only evidence ledger for observations / monitor checks.
 * - Normalized SAID agents, declared monitor endpoints, and incident tracking.
 * - Indexed for fast dashboard and time-window queries.
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const methodologyVersions = pgTable('methodology_versions', {
  id: text('id').primaryKey(), // e.g. "probe:0.2.0-solana"
  kind: text('kind').notNull(), // "probe" | "reliability" | "said_trust"
  version: text('version').notNull(),
  description: text('description'),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
});

export const agents = pgTable(
  'agents',
  {
    id: text('id').primaryKey(), // Internal id: e.g. "solana:<walletAddress>"
    chain: text('chain').notNull().default('solana'),
    walletAddress: text('wallet_address').notNull(),
    name: text('name'),
    description: text('description'),
    verificationStatus: text('verification_status').notNull().default('UNVERIFIED'),
    trustTier: text('trust_tier'),
    saidReputationScore: real('said_reputation_score'),
    skills: text('skills'), // JSON stringified array of string skills
    serviceTypes: text('service_types'), // JSON stringified array
    website: text('website'),
    mcpEndpoint: text('mcp_endpoint'),
    a2aEndpoint: text('a2a_endpoint'),
    metadataResolved: boolean('metadata_resolved').notNull().default(false),
    isMonitored: boolean('is_monitored').notNull().default(false),
    provenanceSource: text('provenance_source').notNull(),
    provenanceOrigin: text('provenance_origin').notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    walletIdx: uniqueIndex('agents_wallet_unique').on(table.walletAddress),
    chainIdx: index('agents_chain_idx').on(table.chain),
    verifiedIdx: index('agents_verified_idx').on(table.verificationStatus),
  }),
);

export const services = pgTable(
  'services',
  {
    id: text('id').primaryKey(), // e.g. "solana:<wallet>:mcp"
    agentId: text('agent_id').notNull(),
    chain: text('chain').notNull().default('solana'),
    endpointType: text('endpoint_type').notNull(), // MCP | A2A | HTTP | SERVICE
    protocol: text('protocol').notNull(), // MCP | A2A | HTTP | UNKNOWN
    url: text('url').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    firstMonitoredAt: timestamp('first_monitored_at', { withTimezone: true }),
    lastMonitoredAt: timestamp('last_monitored_at', { withTimezone: true }),
    failureCount: integer('failure_count').notNull().default(0),
    lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
    provenanceSource: text('provenance_source').notNull(),
    provenanceOrigin: text('provenance_origin').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    agentIdx: index('services_agent_idx').on(table.agentId),
    enabledIdx: index('services_enabled_idx').on(table.enabled),
  }),
);

export const probeRuns = pgTable('probe_runs', {
  id: text('id').primaryKey(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  targetAgentCount: integer('target_agent_count').notNull(),
  probeVersion: text('probe_version').notNull(),
});

/**
 * Append-only observation ledger.
 * The application layer only ever INSERTs here — updates are prohibited.
 */
export const observations = pgTable(
  'observations',
  {
    id: text('id').primaryKey(),
    probeRunId: text('probe_run_id'),
    agentId: text('agent_id').notNull(),
    chain: text('chain').notNull().default('solana'),
    serviceId: text('service_id'),
    probeType: text('probe_type').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    outcome: text('outcome').notNull(),
    latencyMs: integer('latency_ms'),
    httpStatus: integer('http_status'),
    failureReason: text('failure_reason'),
    provenanceSource: text('provenance_source').notNull(),
    provenanceOrigin: text('provenance_origin').notNull(),
    probeVersion: text('probe_version').notNull(),
    methodologyVersion: text('methodology_version').notNull(),
  },
  (table) => ({
    agentTimeIdx: index('observations_agent_time_idx').on(table.agentId, table.timestamp),
    serviceTimeIdx: index('observations_service_time_idx').on(table.serviceId, table.timestamp),
    timeIdx: index('observations_time_idx').on(table.timestamp),
    outcomeIdx: index('observations_outcome_idx').on(table.outcome),
  }),
);

export const incidents = pgTable(
  'incidents',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id').notNull(),
    serviceId: text('service_id'),
    status: text('status').notNull().default('OPEN'), // OPEN | RESOLVED
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds'),
    failureReason: text('failure_reason').notNull(),
    consecutiveFailures: integer('consecutive_failures').notNull().default(1),
    recoveryObservedAt: timestamp('recovery_observed_at', { withTimezone: true }),
  },
  (table) => ({
    agentIdx: index('incidents_agent_idx').on(table.agentId),
    statusIdx: index('incidents_status_idx').on(table.status),
  }),
);

export const syncRuns = pgTable('sync_runs', {
  id: text('id').primaryKey(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  agentsDiscovered: integer('agents_discovered').notNull().default(0),
  agentsUpdated: integer('agents_updated').notNull().default(0),
  servicesRegistered: integer('services_registered').notNull().default(0),
  status: text('status').notNull(), // RUNNING | COMPLETED | FAILED
  errorMessage: text('error_message'),
});

export const reliabilitySnapshots = pgTable(
  'reliability_snapshots',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id').notNull(),
    window: text('window').notNull(), // 24h | 7d | 30d
    sentinelScore: real('sentinel_score'),
    availabilityPct: real('availability_pct'),
    medianLatencyMs: integer('median_latency_ms'),
    averageLatencyMs: integer('average_latency_ms'),
    p95LatencyMs: integer('p95_latency_ms'),
    observationCount: integer('observation_count').notNull(),
    successCount: integer('success_count').notNull(),
    failureCount: integer('failure_count').notNull(),
    consecutiveFailures: integer('consecutive_failures').notNull(),
    dataSufficiency: text('data_sufficiency').notNull(),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull(),
    methodologyVersion: text('methodology_version').notNull(),
  },
  (table) => ({
    agentTimeIdx: index('reliability_snapshots_agent_time_idx').on(table.agentId, table.computedAt),
  }),
);

export const trustScreenSnapshots = pgTable(
  'trust_screen_snapshots',
  {
    id: text('id').primaryKey(),
    wallet: text('wallet').notNull(),
    verdict: text('verdict').notNull(), // allow | review | caution
    trustScore: real('trust_score'),
    eigenTrustScore: real('eigen_trust_score'),
    dimensions: text('dimensions'), // JSON string
    paymentMode: text('payment_mode').notNull(), // FREE_DATA | X402_PAID
    checkedAt: timestamp('checked_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    walletIdx: index('trust_screen_wallet_idx').on(table.wallet),
  }),
);
