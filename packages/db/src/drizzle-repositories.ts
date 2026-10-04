/**
 * Drizzle-backed repositories for AgentProof Sentinel on Solana Mainnet.
 */

import { and, desc, eq, gte, ilike, lt, lte, or } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type {
  AgentIdentity,
  AgentMetadata,
  AgentRepository,
  AgentService,
  ChainId,
  Incident,
  IncidentRepository,
  ObservationRepository,
  Page,
  ProbeObservation,
  ProbeType,
  SaidVerificationStatus,
  SyncRun,
  SyncRunRepository,
} from '@agentproof/core';
import { isValidSolanaAddress } from '@agentproof/core';
import * as schema from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = PgDatabase<any, typeof schema, any>;

function normalizeSolanaWallet(rawWallet: string): string {
  try {
    const decoded = decodeURIComponent(rawWallet).trim();
    if (decoded.startsWith('solana:')) {
      return decoded.replace('solana:', '').trim();
    }
    return decoded;
  } catch {
    return rawWallet.trim();
  }
}

export class DrizzleAgentRepository implements AgentRepository {
  constructor(private readonly db: AnyDb) {}

  async listAgents(opts: {
    chain?: ChainId;
    limit: number;
    cursor?: string;
    verifiedOnly?: boolean;
    searchQuery?: string;
  }): Promise<Page<AgentIdentity>> {
    const conditions = [
      opts.chain ? eq(schema.agents.chain, opts.chain) : undefined,
      opts.cursor ? lt(schema.agents.id, opts.cursor) : undefined,
      opts.verifiedOnly ? eq(schema.agents.verificationStatus, 'VERIFIED') : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    if (opts.searchQuery && opts.searchQuery.trim().length > 0) {
      const q = `%${opts.searchQuery.trim()}%`;
      conditions.push(
        or(
          ilike(schema.agents.name, q),
          ilike(schema.agents.walletAddress, q),
          ilike(schema.agents.description, q),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(schema.agents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.agents.lastSyncedAt))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    const page = rows.slice(0, opts.limit);
    const lastId = page[page.length - 1]?.id;

    const items: AgentIdentity[] = page.map((r) => {
      let skills: string[] = [];
      let serviceTypes: string[] = [];
      try {
        if (r.skills) skills = JSON.parse(r.skills);
        if (r.serviceTypes) serviceTypes = JSON.parse(r.serviceTypes);
      } catch {
        // ignore parse error
      }

      return {
        id: r.id,
        chain: r.chain as ChainId,
        walletAddress: r.walletAddress,
        name: r.name ?? `Agent ${r.walletAddress.slice(0, 4)}..${r.walletAddress.slice(-4)}`,
        description: r.description ?? undefined,
        verificationStatus: r.verificationStatus as SaidVerificationStatus,
        trustTier: r.trustTier ?? undefined,
        saidReputationScore: r.saidReputationScore ?? undefined,
        skills,
        serviceTypes,
        website: r.website ?? undefined,
        mcpEndpoint: r.mcpEndpoint ?? undefined,
        a2aEndpoint: r.a2aEndpoint ?? undefined,
        firstSeenAt: r.firstSeenAt ? new Date(r.firstSeenAt).toISOString() : new Date().toISOString(),
        lastSyncedAt: r.lastSyncedAt ? new Date(r.lastSyncedAt).toISOString() : new Date().toISOString(),
        isMonitored: r.isMonitored ?? false,
        provenance: {
          source: r.provenanceSource as AgentIdentity['provenance']['source'],
          origin: r.provenanceOrigin,
          observedAt: r.lastSyncedAt ? new Date(r.lastSyncedAt).toISOString() : new Date().toISOString(),
        },
      };
    });

    return {
      items,
      ...(hasMore && lastId ? { nextCursor: lastId } : {}),
    };
  }

  async getAgent(walletAddress: string): Promise<AgentIdentity | null> {
    const cleanWallet = normalizeSolanaWallet(walletAddress);
    const agentId = `solana:${cleanWallet}`;

    const [row] = await this.db
      .select()
      .from(schema.agents)
      .where(
        or(
          eq(schema.agents.walletAddress, cleanWallet),
          eq(schema.agents.id, agentId),
          eq(schema.agents.id, walletAddress),
        ),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    let skills: string[] = [];
    let serviceTypes: string[] = [];
    try {
      if (row.skills) skills = JSON.parse(row.skills);
      if (row.serviceTypes) serviceTypes = JSON.parse(row.serviceTypes);
    } catch {
      // ignore
    }

    return {
      id: row.id,
      chain: row.chain as ChainId,
      walletAddress: row.walletAddress,
      name: row.name ?? `Agent ${row.walletAddress.slice(0, 4)}..${row.walletAddress.slice(-4)}`,
      description: row.description ?? undefined,
      verificationStatus: row.verificationStatus as SaidVerificationStatus,
      trustTier: row.trustTier ?? undefined,
      saidReputationScore: row.saidReputationScore ?? undefined,
      skills,
      serviceTypes,
      website: row.website ?? undefined,
      mcpEndpoint: row.mcpEndpoint ?? undefined,
      a2aEndpoint: row.a2aEndpoint ?? undefined,
      firstSeenAt: row.firstSeenAt ? new Date(row.firstSeenAt).toISOString() : new Date().toISOString(),
      lastSyncedAt: row.lastSyncedAt ? new Date(row.lastSyncedAt).toISOString() : new Date().toISOString(),
      isMonitored: row.isMonitored ?? false,
      provenance: {
        source: row.provenanceSource as AgentIdentity['provenance']['source'],
        origin: row.provenanceOrigin,
        observedAt: row.lastSyncedAt ? new Date(row.lastSyncedAt).toISOString() : new Date().toISOString(),
      },
    };
  }

  async getAgentById(id: string): Promise<AgentIdentity | null> {
    const [row] = await this.db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.id, id))
      .limit(1);

    if (!row) return null;
    return this.getAgent(row.walletAddress);
  }

  async getMetadata(agentId: string): Promise<AgentMetadata | null> {
    const agent = await this.getAgentById(agentId);
    if (!agent) return null;

    return {
      agentId: agent.id,
      name: agent.name,
      description: agent.description,
      website: agent.website,
      skills: agent.skills,
      serviceTypes: agent.serviceTypes,
      mcpEndpoint: agent.mcpEndpoint,
      a2aEndpoint: agent.a2aEndpoint,
      metadataResolved: true,
      provenance: agent.provenance,
    };
  }

  async getServices(agentId: string): Promise<AgentService[]> {
    const rows = await this.db
      .select()
      .from(schema.services)
      .where(eq(schema.services.agentId, agentId));

    return rows.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      chain: r.chain as ChainId,
      endpointType: r.endpointType as AgentService['endpointType'],
      protocol: r.protocol as AgentService['protocol'],
      url: r.url,
      enabled: r.enabled ?? true,
      firstMonitoredAt: r.firstMonitoredAt ? new Date(r.firstMonitoredAt).toISOString() : undefined,
      lastMonitoredAt: r.lastMonitoredAt ? new Date(r.lastMonitoredAt).toISOString() : undefined,
      failureCount: r.failureCount ?? 0,
      lastSuccessAt: r.lastSuccessAt ? new Date(r.lastSuccessAt).toISOString() : undefined,
      provenance: {
        source: r.provenanceSource as AgentService['provenance']['source'],
        origin: r.provenanceOrigin,
        observedAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      },
    }));
  }

  async upsertAgent(
    agent: AgentIdentity,
    metadata?: AgentMetadata,
    servicesList?: AgentService[],
  ): Promise<void> {
    const now = new Date();
    const skillsJson = JSON.stringify(agent.skills ?? []);
    const serviceTypesJson = JSON.stringify(agent.serviceTypes ?? []);

    const existing = await this.db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.id, agent.id))
      .limit(1);

    if (existing.length === 0) {
      await this.db.insert(schema.agents).values({
        id: agent.id,
        chain: agent.chain,
        walletAddress: agent.walletAddress,
        name: agent.name,
        description: agent.description ?? null,
        verificationStatus: agent.verificationStatus,
        trustTier: agent.trustTier ?? null,
        saidReputationScore: agent.saidReputationScore ?? null,
        skills: skillsJson,
        serviceTypes: serviceTypesJson,
        website: agent.website ?? null,
        mcpEndpoint: agent.mcpEndpoint ?? null,
        a2aEndpoint: agent.a2aEndpoint ?? null,
        metadataResolved: metadata?.metadataResolved ?? false,
        isMonitored: agent.isMonitored,
        provenanceSource: agent.provenance.source,
        provenanceOrigin: agent.provenance.origin,
        firstSeenAt: new Date(agent.firstSeenAt),
        lastSyncedAt: now,
      });
    } else {
      await this.db
        .update(schema.agents)
        .set({
          name: agent.name,
          description: agent.description ?? null,
          verificationStatus: agent.verificationStatus,
          trustTier: agent.trustTier ?? null,
          saidReputationScore: agent.saidReputationScore ?? null,
          skills: skillsJson,
          serviceTypes: serviceTypesJson,
          website: agent.website ?? null,
          mcpEndpoint: agent.mcpEndpoint ?? null,
          a2aEndpoint: agent.a2aEndpoint ?? null,
          metadataResolved: metadata?.metadataResolved ?? existing[0]?.metadataResolved ?? false,
          isMonitored: agent.isMonitored,
          provenanceSource: agent.provenance.source,
          provenanceOrigin: agent.provenance.origin,
          lastSyncedAt: now,
        })
        .where(eq(schema.agents.id, agent.id));
    }

    if (servicesList && servicesList.length > 0) {
      for (const svc of servicesList) {
        const existingSvc = await this.db
          .select()
          .from(schema.services)
          .where(eq(schema.services.id, svc.id))
          .limit(1);

        if (existingSvc.length === 0) {
          await this.db.insert(schema.services).values({
            id: svc.id,
            agentId: svc.agentId,
            chain: svc.chain,
            endpointType: svc.endpointType,
            protocol: svc.protocol,
            url: svc.url,
            enabled: svc.enabled,
            failureCount: svc.failureCount,
            provenanceSource: svc.provenance.source,
            provenanceOrigin: svc.provenance.origin,
            createdAt: now,
          });
        } else {
          await this.db
            .update(schema.services)
            .set({
              url: svc.url,
              protocol: svc.protocol,
              endpointType: svc.endpointType,
              enabled: svc.enabled,
            })
            .where(eq(schema.services.id, svc.id));
        }
      }
    }
  }

  async updateMonitoringStatus(agentId: string, isMonitored: boolean): Promise<void> {
    await this.db
      .update(schema.agents)
      .set({ isMonitored })
      .where(eq(schema.agents.id, agentId));
  }
}

export class DrizzleObservationRepository implements ObservationRepository {
  constructor(private readonly db: AnyDb) {}

  async recordObservation(obs: ProbeObservation): Promise<void> {
    await this.db.insert(schema.observations).values({
      id: obs.id,
      agentId: obs.agentId,
      chain: obs.chain,
      serviceId: obs.serviceId ?? null,
      probeType: obs.probeType,
      timestamp: new Date(obs.timestamp),
      outcome: obs.outcome,
      latencyMs: obs.latencyMs ?? null,
      httpStatus: obs.httpStatus ?? null,
      failureReason: obs.failureReason ?? null,
      provenanceSource: obs.provenance.source,
      provenanceOrigin: obs.provenance.origin,
      probeVersion: obs.probeVersion,
      methodologyVersion: obs.methodologyVersion,
    });
  }

  async recordBatchObservations(observationsList: ProbeObservation[]): Promise<void> {
    if (observationsList.length === 0) return;
    await this.db.insert(schema.observations).values(
      observationsList.map((obs) => ({
        id: obs.id,
        agentId: obs.agentId,
        chain: obs.chain,
        serviceId: obs.serviceId ?? null,
        probeType: obs.probeType,
        timestamp: new Date(obs.timestamp),
        outcome: obs.outcome,
        latencyMs: obs.latencyMs ?? null,
        httpStatus: obs.httpStatus ?? null,
        failureReason: obs.failureReason ?? null,
        provenanceSource: obs.provenance.source,
        provenanceOrigin: obs.provenance.origin,
        probeVersion: obs.probeVersion,
        methodologyVersion: obs.methodologyVersion,
      })),
    );
  }

  async listObservations(opts: {
    agentId: string;
    serviceId?: string;
    since: string;
    until: string;
    limit: number;
    cursor?: string;
  }): Promise<Page<ProbeObservation>> {
    const sinceDate = new Date(opts.since);
    const untilDate = new Date(opts.until);

    const conditions = [
      eq(schema.observations.agentId, opts.agentId),
      opts.serviceId ? eq(schema.observations.serviceId, opts.serviceId) : undefined,
      gte(schema.observations.timestamp, sinceDate),
      lte(schema.observations.timestamp, untilDate),
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const rows = await this.db
      .select()
      .from(schema.observations)
      .where(and(...conditions))
      .orderBy(desc(schema.observations.timestamp))
      .limit(opts.limit);

    const items: ProbeObservation[] = rows.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      chain: r.chain as ChainId,
      serviceId: r.serviceId ?? undefined,
      probeType: r.probeType as ProbeType,
      timestamp: new Date(r.timestamp).toISOString(),
      outcome: r.outcome as ProbeObservation['outcome'],
      latencyMs: r.latencyMs ?? undefined,
      httpStatus: r.httpStatus ?? undefined,
      failureReason: r.failureReason ?? undefined,
      provenance: {
        source: r.provenanceSource as ProbeObservation['provenance']['source'],
        origin: r.provenanceOrigin,
        observedAt: new Date(r.timestamp).toISOString(),
      },
      probeVersion: r.probeVersion,
      methodologyVersion: r.methodologyVersion,
    }));

    return { items };
  }

  async getLatestObservation(agentId: string): Promise<ProbeObservation | null> {
    const [row] = await this.db
      .select()
      .from(schema.observations)
      .where(eq(schema.observations.agentId, agentId))
      .orderBy(desc(schema.observations.timestamp))
      .limit(1);

    if (!row) return null;
    return {
      id: row.id,
      agentId: row.agentId,
      chain: row.chain as ChainId,
      serviceId: row.serviceId ?? undefined,
      probeType: row.probeType as ProbeType,
      timestamp: new Date(row.timestamp).toISOString(),
      outcome: row.outcome as ProbeObservation['outcome'],
      latencyMs: row.latencyMs ?? undefined,
      httpStatus: row.httpStatus ?? undefined,
      failureReason: row.failureReason ?? undefined,
      provenance: {
        source: row.provenanceSource as ProbeObservation['provenance']['source'],
        origin: row.provenanceOrigin,
        observedAt: new Date(row.timestamp).toISOString(),
      },
      probeVersion: row.probeVersion,
      methodologyVersion: row.methodologyVersion,
    };
  }
}

export class DrizzleIncidentRepository implements IncidentRepository {
  constructor(private readonly db: AnyDb) {}

  async recordIncident(inc: Incident): Promise<void> {
    await this.db.insert(schema.incidents).values({
      id: inc.id,
      agentId: inc.agentId,
      serviceId: inc.serviceId ?? null,
      status: inc.status,
      startedAt: new Date(inc.startedAt),
      resolvedAt: inc.resolvedAt ? new Date(inc.resolvedAt) : null,
      durationSeconds: inc.durationSeconds ?? null,
      failureReason: inc.failureReason,
      consecutiveFailures: inc.consecutiveFailures,
      recoveryObservedAt: inc.recoveryObservedAt ? new Date(inc.recoveryObservedAt) : null,
    });
  }

  async getActiveIncident(agentId: string, serviceId?: string): Promise<Incident | null> {
    const conditions = [
      eq(schema.incidents.agentId, agentId),
      eq(schema.incidents.status, 'OPEN'),
      serviceId ? eq(schema.incidents.serviceId, serviceId) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const [row] = await this.db
      .select()
      .from(schema.incidents)
      .where(and(...conditions))
      .orderBy(desc(schema.incidents.startedAt))
      .limit(1);

    if (!row) return null;
    return {
      id: row.id,
      agentId: row.agentId,
      serviceId: row.serviceId ?? undefined,
      status: row.status as Incident['status'],
      startedAt: new Date(row.startedAt).toISOString(),
      resolvedAt: row.resolvedAt ? new Date(row.resolvedAt).toISOString() : undefined,
      durationSeconds: row.durationSeconds ?? undefined,
      failureReason: row.failureReason,
      consecutiveFailures: row.consecutiveFailures,
      recoveryObservedAt: row.recoveryObservedAt ? new Date(row.recoveryObservedAt).toISOString() : undefined,
    };
  }

  async resolveIncident(incidentId: string, resolvedAt: string, recoveryObservedAt?: string): Promise<void> {
    const [inc] = await this.db
      .select()
      .from(schema.incidents)
      .where(eq(schema.incidents.id, incidentId))
      .limit(1);

    if (inc) {
      const durSec = Math.max(
        0,
        Math.floor((new Date(resolvedAt).getTime() - new Date(inc.startedAt).getTime()) / 1000),
      );

      await this.db
        .update(schema.incidents)
        .set({
          status: 'RESOLVED',
          resolvedAt: new Date(resolvedAt),
          recoveryObservedAt: recoveryObservedAt ? new Date(recoveryObservedAt) : new Date(resolvedAt),
          durationSeconds: durSec,
        })
        .where(eq(schema.incidents.id, incidentId));
    }
  }

  async listIncidents(agentId: string, limit = 20): Promise<Incident[]> {
    const rows = await this.db
      .select()
      .from(schema.incidents)
      .where(eq(schema.incidents.agentId, agentId))
      .orderBy(desc(schema.incidents.startedAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      serviceId: r.serviceId ?? undefined,
      status: r.status as Incident['status'],
      startedAt: new Date(r.startedAt).toISOString(),
      resolvedAt: r.resolvedAt ? new Date(r.resolvedAt).toISOString() : undefined,
      durationSeconds: r.durationSeconds ?? undefined,
      failureReason: r.failureReason,
      consecutiveFailures: r.consecutiveFailures,
      recoveryObservedAt: r.recoveryObservedAt ? new Date(r.recoveryObservedAt).toISOString() : undefined,
    }));
  }

  async countActiveIncidents(): Promise<number> {
    const rows = await this.db
      .select()
      .from(schema.incidents)
      .where(eq(schema.incidents.status, 'OPEN'));

    return rows.length;
  }
}

export class DrizzleSyncRunRepository implements SyncRunRepository {
  constructor(private readonly db: AnyDb) {}

  async startSyncRun(runId: string): Promise<void> {
    await this.db.insert(schema.syncRuns).values({
      id: runId,
      startedAt: new Date(),
      status: 'RUNNING',
    });
  }

  async finishSyncRun(run: SyncRun): Promise<void> {
    await this.db
      .update(schema.syncRuns)
      .set({
        finishedAt: run.finishedAt ? new Date(run.finishedAt) : new Date(),
        agentsDiscovered: run.agentsDiscovered,
        agentsUpdated: run.agentsUpdated,
        servicesRegistered: run.servicesRegistered,
        status: run.status,
        errorMessage: run.errorMessage ?? null,
      })
      .where(eq(schema.syncRuns.id, run.id));
  }

  async getLatestSyncRun(): Promise<SyncRun | null> {
    const [row] = await this.db
      .select()
      .from(schema.syncRuns)
      .orderBy(desc(schema.syncRuns.startedAt))
      .limit(1);

    if (!row) return null;
    return {
      id: row.id,
      startedAt: new Date(row.startedAt).toISOString(),
      finishedAt: row.finishedAt ? new Date(row.finishedAt).toISOString() : undefined,
      agentsDiscovered: row.agentsDiscovered,
      agentsUpdated: row.agentsUpdated,
      servicesRegistered: row.servicesRegistered,
      status: row.status as SyncRun['status'],
      errorMessage: row.errorMessage ?? undefined,
    };
  }
}
