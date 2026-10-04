/**
 * Repository abstractions for AgentProof Sentinel.
 *
 * Provides storage-agnostic interfaces for:
 * - SAID Agents & Services
 * - Observations (strictly append-only)
 * - Incidents (failure detection & recovery)
 * - Sync Runs (discovery execution history)
 */

import type {
  AgentIdentity,
  AgentMetadata,
  AgentService,
  ChainId,
  Incident,
  ProbeObservation,
  SyncRun,
} from './domain';

export interface Page<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
}

export interface AgentRepository {
  listAgents(opts: {
    chain?: ChainId;
    limit: number;
    cursor?: string;
    verifiedOnly?: boolean;
    searchQuery?: string;
  }): Promise<Page<AgentIdentity>>;

  getAgent(walletAddress: string): Promise<AgentIdentity | null>;
  getAgentById(id: string): Promise<AgentIdentity | null>;
  getMetadata(agentId: string): Promise<AgentMetadata | null>;
  getServices(agentId: string): Promise<AgentService[]>;
  upsertAgent(agent: AgentIdentity, metadata?: AgentMetadata, services?: AgentService[]): Promise<void>;
  updateMonitoringStatus(agentId: string, isMonitored: boolean): Promise<void>;
}

export interface ObservationRepository {
  /** Append-only trusted observation insertion */
  recordObservation(observation: ProbeObservation): Promise<void>;
  recordBatchObservations(observations: ProbeObservation[]): Promise<void>;

  /** List observations for an agent within [since, until] */
  listObservations(opts: {
    agentId: string;
    serviceId?: string;
    since: string;
    until: string;
    limit: number;
    cursor?: string;
  }): Promise<Page<ProbeObservation>>;

  /** Get latest observation for an agent */
  getLatestObservation(agentId: string): Promise<ProbeObservation | null>;
}

export interface IncidentRepository {
  recordIncident(incident: Incident): Promise<void>;
  getActiveIncident(agentId: string, serviceId?: string): Promise<Incident | null>;
  resolveIncident(incidentId: string, resolvedAt: string, recoveryObservedAt?: string): Promise<void>;
  listIncidents(agentId: string, limit?: number): Promise<Incident[]>;
  countActiveIncidents(): Promise<number>;
}

export interface SyncRunRepository {
  startSyncRun(runId: string): Promise<void>;
  finishSyncRun(run: SyncRun): Promise<void>;
  getLatestSyncRun(): Promise<SyncRun | null>;
}
