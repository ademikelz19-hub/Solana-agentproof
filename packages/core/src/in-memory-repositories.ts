/**
 * In-memory repository implementations for testing and local execution.
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
import type {
  AgentRepository,
  IncidentRepository,
  ObservationRepository,
  Page,
  SyncRunRepository,
} from './repositories';

function paginate<T>(items: T[], limit: number, cursor: string | undefined, keyOf: (t: T) => string): Page<T> {
  const startIndex = cursor ? items.findIndex((i) => keyOf(i) === cursor) + 1 : 0;
  const slice = items.slice(startIndex, startIndex + limit);
  const nextCursor =
    startIndex + limit < items.length ? keyOf(items[startIndex + limit - 1] as T) : undefined;
  return { items: slice, ...(nextCursor ? { nextCursor } : {}), total: items.length };
}

export class InMemoryAgentRepository implements AgentRepository {
  private readonly agents: Map<string, AgentIdentity> = new Map();
  private readonly metadata: Map<string, AgentMetadata> = new Map();
  private readonly services: Map<string, AgentService[]> = new Map();

  constructor(
    initialAgents: AgentIdentity[] = [],
    initialMetadata: Map<string, AgentMetadata> = new Map(),
    initialServices: Map<string, AgentService[]> = new Map(),
  ) {
    for (const a of initialAgents) {
      this.agents.set(a.walletAddress, a);
    }
    this.metadata = new Map(initialMetadata);
    this.services = new Map(initialServices);
  }

  async listAgents(opts: {
    chain?: ChainId;
    limit: number;
    cursor?: string;
    verifiedOnly?: boolean;
    searchQuery?: string;
  }): Promise<Page<AgentIdentity>> {
    let list = Array.from(this.agents.values());
    if (opts.chain) {
      list = list.filter((a) => a.chain === opts.chain);
    }
    if (opts.verifiedOnly) {
      list = list.filter((a) => a.verificationStatus === 'VERIFIED');
    }
    if (opts.searchQuery) {
      const q = opts.searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.walletAddress.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q)),
      );
    }
    return paginate(list, opts.limit, opts.cursor, (a) => a.walletAddress);
  }

  async getAgent(walletAddress: string): Promise<AgentIdentity | null> {
    return this.agents.get(walletAddress) ?? null;
  }

  async getAgentById(id: string): Promise<AgentIdentity | null> {
    for (const a of this.agents.values()) {
      if (a.id === id) return a;
    }
    return null;
  }

  async getMetadata(agentId: string): Promise<AgentMetadata | null> {
    return this.metadata.get(agentId) ?? null;
  }

  async getServices(agentId: string): Promise<AgentService[]> {
    return this.services.get(agentId) ?? [];
  }

  async upsertAgent(agent: AgentIdentity, metadata?: AgentMetadata, services?: AgentService[]): Promise<void> {
    this.agents.set(agent.walletAddress, agent);
    if (metadata) {
      this.metadata.set(agent.id, metadata);
    }
    if (services) {
      this.services.set(agent.id, services);
    }
  }

  async updateMonitoringStatus(agentId: string, isMonitored: boolean): Promise<void> {
    for (const a of this.agents.values()) {
      if (a.id === agentId) {
        a.isMonitored = isMonitored;
        break;
      }
    }
  }
}

export class InMemoryObservationRepository implements ObservationRepository {
  private readonly observations: ProbeObservation[] = [];

  constructor(seed: ProbeObservation[] = []) {
    this.observations.push(...seed);
  }

  async recordObservation(observation: ProbeObservation): Promise<void> {
    this.observations.push(observation);
  }

  async recordBatchObservations(observations: ProbeObservation[]): Promise<void> {
    this.observations.push(...observations);
  }

  async listObservations(opts: {
    agentId: string;
    serviceId?: string;
    since: string;
    until: string;
    limit: number;
    cursor?: string;
  }): Promise<Page<ProbeObservation>> {
    const sinceMs = new Date(opts.since).getTime();
    const untilMs = new Date(opts.until).getTime();
    const filtered = this.observations
      .filter((o) => o.agentId === opts.agentId)
      .filter((o) => !opts.serviceId || o.serviceId === opts.serviceId)
      .filter((o) => {
        const t = new Date(o.timestamp).getTime();
        return t >= sinceMs && t <= untilMs;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return paginate(filtered, opts.limit, opts.cursor, (o) => o.id);
  }

  async getLatestObservation(agentId: string): Promise<ProbeObservation | null> {
    const matching = this.observations
      .filter((o) => o.agentId === agentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return matching[0] ?? null;
  }
}

export class InMemoryIncidentRepository implements IncidentRepository {
  private readonly incidents: Map<string, Incident> = new Map();

  async recordIncident(incident: Incident): Promise<void> {
    this.incidents.set(incident.id, incident);
  }

  async getActiveIncident(agentId: string, serviceId?: string): Promise<Incident | null> {
    for (const inc of this.incidents.values()) {
      if (inc.agentId === agentId && inc.status === 'OPEN') {
        if (!serviceId || inc.serviceId === serviceId) {
          return inc;
        }
      }
    }
    return null;
  }

  async resolveIncident(incidentId: string, resolvedAt: string, recoveryObservedAt?: string): Promise<void> {
    const inc = this.incidents.get(incidentId);
    if (inc) {
      inc.status = 'RESOLVED';
      inc.resolvedAt = resolvedAt;
      inc.recoveryObservedAt = recoveryObservedAt;
      inc.durationSeconds = Math.max(
        0,
        Math.floor((new Date(resolvedAt).getTime() - new Date(inc.startedAt).getTime()) / 1000),
      );
    }
  }

  async listIncidents(agentId: string, limit = 20): Promise<Incident[]> {
    return Array.from(this.incidents.values())
      .filter((inc) => inc.agentId === agentId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }

  async countActiveIncidents(): Promise<number> {
    let count = 0;
    for (const inc of this.incidents.values()) {
      if (inc.status === 'OPEN') count++;
    }
    return count;
  }
}

export class InMemorySyncRunRepository implements SyncRunRepository {
  private runs: Map<string, SyncRun> = new Map();
  private latestRunId: string | null = null;

  async startSyncRun(runId: string): Promise<void> {
    const run: SyncRun = {
      id: runId,
      startedAt: new Date().toISOString(),
      agentsDiscovered: 0,
      agentsUpdated: 0,
      servicesRegistered: 0,
      status: 'RUNNING',
    };
    this.runs.set(runId, run);
    this.latestRunId = runId;
  }

  async finishSyncRun(run: SyncRun): Promise<void> {
    this.runs.set(run.id, run);
    this.latestRunId = run.id;
  }

  async getLatestSyncRun(): Promise<SyncRun | null> {
    if (!this.latestRunId) return null;
    return this.runs.get(this.latestRunId) ?? null;
  }
}

export class InMemoryReputationRepository {
  private readonly feedback: Array<{ agentId: string; reviewerId: string; timestamp: string; provenance: any }> = [];
  private readonly availability: 'NOT_INGESTED' | 'AVAILABLE' | 'UPSTREAM_UNAVAILABLE' | 'UNSUPPORTED';

  constructor(
    seedFeedback: Array<{ agentId: string; reviewerId: string; timestamp: string; provenance: any }> = [],
    availability: 'NOT_INGESTED' | 'AVAILABLE' | 'UPSTREAM_UNAVAILABLE' | 'UNSUPPORTED' = 'NOT_INGESTED',
  ) {
    this.feedback.push(...seedFeedback);
    this.availability = availability;
  }

  async listFeedback(agentId: string) {
    if (this.availability !== 'AVAILABLE') {
      return { status: this.availability, records: [] };
    }
    return { status: 'AVAILABLE', records: this.feedback.filter((f) => f.agentId === agentId) };
  }

  async recordReputationEvidence(_evidence: unknown): Promise<void> {}
  async recordIntegritySignals(_signals: unknown[]): Promise<void> {}
}

