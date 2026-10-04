/**
 * AgentProof Sentinel Domain Model
 *
 * Autonomous operational reliability layer for AI agents registered on SAID Protocol (Solana Mainnet).
 * Network: Solana Mainnet
 * SAID Program ID: 5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G
 */

// ---------------------------------------------------------------------------
// Chain & Network Definitions
// ---------------------------------------------------------------------------

export type ChainId = 'solana';

export interface Chain {
  id: ChainId;
  cluster: 'mainnet-beta' | 'devnet';
  name: string;
  programId: string;
}

export const SAID_PROGRAM_ID = '5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G';

export const SOLANA_MAINNET: Chain = {
  id: 'solana',
  cluster: 'mainnet-beta',
  name: 'Solana Mainnet',
  programId: SAID_PROGRAM_ID,
};

export const SUPPORTED_CHAINS: readonly Chain[] = [SOLANA_MAINNET];

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export type ProvenanceSource =
  | 'SOLANA_MAINNET'
  | 'SAID_PROTOCOL'
  | 'SAID_METADATA'
  | 'INDEXER'
  | 'ONCHAIN'
  | 'AGENTPROOF_MEASUREMENT'
  | 'AGENTPROOF_SENTINEL_MEASUREMENT';

export interface Provenance {
  source: ProvenanceSource;
  /** Free-text identifier of concrete origin, e.g. "said-protocol:api" or "sentinel-probe:reachability" */
  origin: string;
  /** ISO 8601 timestamp when Sentinel observed or ingested this fact */
  observedAt: string;
}

// ---------------------------------------------------------------------------
// SAID Agent Identity & Verification Status
// ---------------------------------------------------------------------------

export type SaidVerificationStatus =
  | 'VERIFIED'
  | 'UNVERIFIED'
  | 'REGISTRATION_PENDING'
  | 'VERIFICATION_PENDING';

export type SaidTrustTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'UNRANKED' | string;

export interface AgentIdentity {
  /** Internal stable identifier: `solana:${walletAddress}` */
  id: string;
  chain: ChainId;
  /** Base58-encoded 32-byte Solana public key */
  walletAddress: string;
  name: string;
  description?: string;
  verificationStatus: SaidVerificationStatus;
  trustTier?: SaidTrustTier;
  saidReputationScore?: number;
  skills: string[];
  serviceTypes: string[];
  website?: string;
  mcpEndpoint?: string;
  a2aEndpoint?: string;
  firstSeenAt: string;
  lastSyncedAt: string;
  isMonitored: boolean;
  provenance: Provenance;
}

export interface AgentMetadata {
  agentId: string;
  name: string;
  description?: string;
  website?: string;
  skills: string[];
  serviceTypes: string[];
  mcpEndpoint?: string;
  a2aEndpoint?: string;
  metadataResolved: boolean;
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Services & Published Endpoints
// ---------------------------------------------------------------------------

export type ServiceProtocol = 'HTTP' | 'A2A' | 'MCP' | 'UNKNOWN';
export type EndpointType = 'MCP' | 'A2A' | 'HTTP' | 'SERVICE';

export interface AgentService {
  id: string;
  agentId: string;
  chain: ChainId;
  endpointType: EndpointType;
  protocol: ServiceProtocol;
  url: string;
  enabled: boolean;
  firstMonitoredAt?: string;
  lastMonitoredAt?: string;
  failureCount: number;
  lastSuccessAt?: string;
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Probes & Observations
// ---------------------------------------------------------------------------

export interface ProbeTarget {
  agentId: string;
  chain: ChainId;
  serviceId?: string;
  url: string;
  protocol: ServiceProtocol;
}

export type ProbeType =
  | 'SERVICE_REACHABILITY'
  | 'HTTP_STATUS'
  | 'RESPONSE_LATENCY'
  | 'PROTOCOL_RESPONSE_VALIDITY'
  | 'MCP_HEALTH'
  | 'A2A_HEALTH';

export type ProbeOutcome =
  | 'SUCCESS'
  | 'AGENT_UNREACHABLE'
  | 'DNS_FAILURE'
  | 'TIMEOUT'
  | 'PROTOCOL_INVALID'
  | 'UPSTREAM_INDEXER_FAILURE'
  | 'AGENTPROOF_INTERNAL_ERROR'
  | 'BLOCKED_BY_SECURITY_POLICY';

export interface ProbeObservation {
  id: string;
  agentId: string;
  chain: ChainId;
  serviceId?: string;
  probeType: ProbeType;
  timestamp: string; // ISO 8601
  outcome: ProbeOutcome;
  latencyMs?: number;
  failureReason?: string;
  httpStatus?: number;
  provenance: Provenance;
  probeVersion: string;
  methodologyVersion: string;
}

// ---------------------------------------------------------------------------
// Reliability Calculations & Windows
// ---------------------------------------------------------------------------

export type ReliabilityWindowSize = '24h' | '7d' | '30d';

export type EvidenceSufficiency = 'INSUFFICIENT' | 'LIMITED' | 'MODERATE' | 'STRONG';

export interface ReliabilityWindow {
  agentId: string;
  serviceId?: string;
  window: ReliabilityWindowSize;
  sufficientData: boolean;
  dataSufficiency: EvidenceSufficiency;
  observationCount: number;
  successCount: number;
  failureCount: number;
  availabilityPct?: number;
  medianLatencyMs?: number;
  averageLatencyMs?: number;
  p95LatencyMs?: number;
  lastSuccessfulProbeAt?: string;
  lastProbeAt?: string;
  consecutiveFailures: number;
  methodologyVersion: string;
  computedAt: string;
}

// ---------------------------------------------------------------------------
// Sentinel Reliability Score (0-100)
//
// Factual, transparent operational score calculated purely from:
// - Measured availability (50%)
// - Latency speed and consistency (25%)
// - Historical coverage and sample depth (15%)
// - Incident frequency and recovery stability (10%)
// ---------------------------------------------------------------------------

export interface SentinelReliabilityScore {
  score: number; // 0 to 100
  tier: 'OPTIMAL' | 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNMEASURED';
  availabilityScore: number;
  latencyScore: number;
  coverageScore: number;
  stabilityScore: number;
  formulaDescription: string;
  computedAt: string;
}

// ---------------------------------------------------------------------------
// Incidents & Service Health
// ---------------------------------------------------------------------------

export type IncidentStatus = 'OPEN' | 'RESOLVED';

export interface Incident {
  id: string;
  agentId: string;
  serviceId?: string;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt?: string;
  durationSeconds?: number;
  failureReason: string;
  failedChecksCount?: number;
  consecutiveFailures?: number;
  recoveryObservedAt?: string;
}

// ---------------------------------------------------------------------------
// SAID Trust Screen (Machine-Payable / x402)
// ---------------------------------------------------------------------------

export type TrustScreenVerdict = 'allow' | 'review' | 'caution';

export interface TrustScreenResult {
  wallet: string;
  verdict: TrustScreenVerdict;
  trustScore?: number;
  eigenTrustScore?: number;
  reputationDimensions?: {
    reliability?: number;
    transactionCount?: number;
    disputeRate?: number;
    tenureDays?: number;
  };
  checkedAt: string;
  paymentMode: 'FREE_DATA' | 'X402_PAID';
  rawResponse?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Synchronization Runs & Telemetry
// ---------------------------------------------------------------------------

export interface SyncRun {
  id: string;
  startedAt: string;
  finishedAt?: string;
  agentsDiscovered: number;
  agentsUpdated: number;
  servicesRegistered: number;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Agent Passport (Aggregated Read Model)
// ---------------------------------------------------------------------------

export interface AgentPassport {
  identity: AgentIdentity;
  metadata: AgentMetadata;
  services: AgentService[];
  reliability: Record<ReliabilityWindowSize, ReliabilityWindow>;
  sentinelScore: SentinelReliabilityScore;
  activeIncident?: Incident;
  recentIncidents: Incident[];
  recentObservations: ProbeObservation[];
  trustScreen?: TrustScreenResult;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Methodology Versions
// ---------------------------------------------------------------------------

export const METHODOLOGY_VERSIONS = {
  probe: '0.2.0-solana',
  reliability: '0.2.0-sentinel',
  reputationIntegrity: '0.2.0-said',
} as const;

// ---------------------------------------------------------------------------
// Feedback & Reputation Evidence
// ---------------------------------------------------------------------------

export interface FeedbackRecord {
  id: string;
  agentId: string;
  reviewerId: string;
  timestamp: string;
  score?: number;
  tags?: string[];
  submittedAt?: string;
}

export type FeedbackAvailability = 'AVAILABLE' | 'NOT_INGESTED' | 'NOT_APPLICABLE' | 'UPSTREAM_INDEXER_FAILURE';

export interface FeedbackQueryResult {
  status: FeedbackAvailability;
  records: FeedbackRecord[];
}

export interface IntegritySignal {
  id: string;
  agentId: string;
  signalType: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string;
  detectedAt: string;
  methodologyVersion: string;
  provenance: Provenance;
  metadata?: Record<string, unknown>;
}

export interface ReputationEvidence {
  agentId: string;
  feedbackAvailability: FeedbackAvailability;
  feedbackCount?: number;
  uniqueReviewerCount?: number;
  dataSufficiency?: EvidenceSufficiency;
  integritySignals: IntegritySignal[];
  hhiIndex?: number;
  reviewerConcentration?: number;
  repeatReviewConcentration?: number;
  methodologyVersion: string;
  computedAt: string;
  provenance: Provenance;
}

