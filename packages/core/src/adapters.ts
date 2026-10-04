/**
 * Adapter boundary for SAID Protocol discovery and synchronization.
 */

import type { AgentIdentity, AgentMetadata, AgentService, ChainId } from './domain';

export interface IngestionResult<T> {
  ok: true;
  data: T;
}

export interface IngestionFailure {
  ok: false;
  reason: 'UPSTREAM_INDEXER_FAILURE' | 'AGENTPROOF_INTERNAL_ERROR' | 'BLOCKED_LIVE_NETWORK';
  detail: string;
}

export type Ingested<T> = IngestionResult<T> | IngestionFailure;

export interface SaidAgentIndexer {
  readonly chain: ChainId;
  readonly sourceLabel: string;

  /** List registered agents from SAID Protocol */
  listAgents(opts?: { limit?: number; cursor?: string }): Promise<Ingested<AgentIdentity[]>>;

  /** Fetch complete details, metadata, and endpoints for a specific Solana agent wallet */
  getAgentDetails(walletAddress: string): Promise<
    Ingested<{
      identity: AgentIdentity;
      metadata: AgentMetadata;
      services: AgentService[];
    }>
  >;
}
