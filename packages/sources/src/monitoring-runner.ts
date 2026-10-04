/**
 * Autonomous Monitoring Execution Engine for AgentProof Sentinel.
 *
 * Runs scheduled cycles:
 * 1. Synchronizes registered agents from SAID Protocol
 * 2. Ingests and normalizes declared endpoints (MCP, A2A, HTTP)
 * 3. Probes services safely with SSRF protection and concurrency limiting
 * 4. Tracks incidents (threshold-based opening on 2+ consecutive failures, auto-resolution on recovery)
 * 5. Updates reliability snapshots and Sentinel Reliability Scores
 */

import { randomUUID } from 'node:crypto';
import {
  computeAllWindows,
  computeSentinelReliabilityScore,
} from '@agentproof/reliability';
import {
  ProbeRateLimiter,
  probeHttpStatus,
  probeMcpHealth,
  probeA2aHealth,
  probeResponseLatency,
  probeServiceReachability,
} from '@agentproof/probes';
import {
  SOLANA_MAINNET,
  type AgentIdentity,
  type AgentService,
  type ChainId,
  type Incident,
  type ProbeObservation,
  type ProbeTarget,
  type ServiceProtocol,
  type SyncRun,
} from '@agentproof/core';
import {
  db,
  agents,
  services,
  probeRuns,
  observations,
  incidents,
  syncRuns,
  reliabilitySnapshots,
} from '@agentproof/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import { SaidProtocolAdapter } from './said-adapter';

export interface MonitoringRunResult {
  runId: string;
  agentsDiscovered: number;
  servicesProbed: number;
  observationsRecorded: number;
  successfulProbes: number;
  failedProbes: number;
  incidentsOpened: number;
  incidentsResolved: number;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
}

export async function executeMonitoringCycle(opts: {
  maxAgentsToDiscover?: number;
  concurrency?: number;
  timeoutMs?: number;
} = {}): Promise<MonitoringRunResult> {
  const startTime = Date.now();
  const runId = randomUUID();
  const startedAt = new Date();

  console.log(`[Sentinel Monitor] Starting cycle ${runId} on Solana Mainnet...`);

  // 1. Record sync run & probe run in DB
  try {
    await db.insert(probeRuns).values({
      id: runId,
      startedAt,
      targetAgentCount: 0,
      probeVersion: '0.2.0-solana',
    });
  } catch (err) {
    console.warn('[Sentinel Monitor] Could not record initial probe run row:', err);
  }

  // 2. Discover agents from SAID Protocol
  const adapter = new SaidProtocolAdapter({
    timeoutMs: opts.timeoutMs ?? Number(process.env.MONITOR_TIMEOUT_MS ?? 8000),
  });

  let discoveredAgents: AgentIdentity[] = [];
  try {
    const listResult = await adapter.listAgents({ limit: opts.maxAgentsToDiscover ?? 25 });
    if (listResult.ok) {
      discoveredAgents = listResult.data;
      console.log(`[Sentinel Monitor] Discovered ${discoveredAgents.length} agents from SAID Protocol.`);
    } else {
      console.warn(`[Sentinel Monitor] SAID discovery notice: ${listResult.detail}`);
    }
  } catch (err: any) {
    console.warn('[Sentinel Monitor] Upstream SAID API call error:', err.message);
  }

  // 3. Upsert discovered agents and their endpoints
  let agentsUpdated = 0;
  let servicesRegistered = 0;

  for (const agent of discoveredAgents) {
    try {
      const detailsResult = await adapter.getAgentDetails(agent.walletAddress);
      if (!detailsResult.ok) continue;

      const { identity, metadata, services: serviceList } = detailsResult.data;
      const now = new Date();

      const existingAgent = await db
        .select()
        .from(agents)
        .where(eq(agents.id, identity.id))
        .limit(1);

      if (existingAgent.length === 0) {
        await db.insert(agents).values({
          id: identity.id,
          chain: identity.chain,
          walletAddress: identity.walletAddress,
          name: identity.name,
          description: identity.description ?? null,
          verificationStatus: identity.verificationStatus,
          trustTier: identity.trustTier ?? null,
          saidReputationScore: identity.saidReputationScore ?? null,
          skills: JSON.stringify(identity.skills ?? []),
          serviceTypes: JSON.stringify(identity.serviceTypes ?? []),
          website: identity.website ?? null,
          mcpEndpoint: identity.mcpEndpoint ?? null,
          a2aEndpoint: identity.a2aEndpoint ?? null,
          metadataResolved: metadata.metadataResolved,
          isMonitored: serviceList.length > 0,
          provenanceSource: identity.provenance.source,
          provenanceOrigin: identity.provenance.origin,
          firstSeenAt: new Date(identity.firstSeenAt),
          lastSyncedAt: now,
        });
      } else {
        await db
          .update(agents)
          .set({
            name: identity.name,
            description: identity.description ?? null,
            verificationStatus: identity.verificationStatus,
            trustTier: identity.trustTier ?? null,
            saidReputationScore: identity.saidReputationScore ?? null,
            skills: JSON.stringify(identity.skills ?? []),
            serviceTypes: JSON.stringify(identity.serviceTypes ?? []),
            website: identity.website ?? null,
            mcpEndpoint: identity.mcpEndpoint ?? null,
            a2aEndpoint: identity.a2aEndpoint ?? null,
            isMonitored: serviceList.length > 0,
            lastSyncedAt: now,
          })
          .where(eq(agents.id, identity.id));
      }
      agentsUpdated++;

      for (const svc of serviceList) {
        const existingSvc = await db
          .select()
          .from(services)
          .where(eq(services.id, svc.id))
          .limit(1);

        if (existingSvc.length === 0) {
          await db.insert(services).values({
            id: svc.id,
            agentId: svc.agentId,
            chain: svc.chain,
            endpointType: svc.endpointType,
            protocol: svc.protocol,
            url: svc.url,
            enabled: true,
            provenanceSource: svc.provenance.source,
            provenanceOrigin: svc.provenance.origin,
            createdAt: now,
          });
          servicesRegistered++;
        }
      }
    } catch (err: any) {
      console.warn(`[Sentinel Monitor] Error ingesting agent ${agent.id}:`, err.message);
    }
  }

  // Record sync run
  try {
    await db.insert(syncRuns).values({
      id: randomUUID(),
      startedAt,
      finishedAt: new Date(),
      agentsDiscovered: discoveredAgents.length,
      agentsUpdated,
      servicesRegistered,
      status: 'COMPLETED',
    });
  } catch (err) {
    // Ignore sync run log failure
  }

  // 4. Retrieve all enabled targets to monitor
  const activeTargets = await db
    .select({
      serviceId: services.id,
      agentId: services.agentId,
      chain: services.chain,
      endpointType: services.endpointType,
      protocol: services.protocol,
      url: services.url,
      failureCount: services.failureCount,
    })
    .from(services)
    .where(eq(services.enabled, true))
    .limit(50);

  console.log(`[Sentinel Monitor] Probing ${activeTargets.length} active service endpoints...`);

  // Update target count in probe run
  try {
    await db
      .update(probeRuns)
      .set({ targetAgentCount: activeTargets.length })
      .where(eq(probeRuns.id, runId));
  } catch {
    // Ignore
  }

  const rateLimiter = new ProbeRateLimiter({
    globalConcurrency: opts.concurrency ?? 10,
    perHostConcurrency: 2,
    minIntervalMsPerHost: 3000,
  });

  let observationsRecorded = 0;
  let successfulProbes = 0;
  let failedProbes = 0;
  let incidentsOpened = 0;
  let incidentsResolved = 0;

  const probeTasks = activeTargets.map(async (target) => {
    let host = 'unknown';
    try {
      host = new URL(target.url).hostname;
    } catch {
      return;
    }

    if (rateLimiter.isInCooldown(host)) {
      console.log(`[Sentinel Monitor] Target ${target.serviceId} skipped (host in cooldown)`);
      return;
    }

    const release = await rateLimiter.acquire(host);
    try {
      const probeTarget: ProbeTarget = {
        agentId: target.agentId,
        chain: target.chain as ChainId,
        serviceId: target.serviceId,
        url: target.url,
        protocol: target.protocol as ServiceProtocol,
      };

      // Run reachability and protocol checks
      const reachability = await probeServiceReachability(probeTarget);
      const latency = await probeResponseLatency(probeTarget);
      const status = await probeHttpStatus(probeTarget);

      let protocolCheck: ProbeObservation;
      if (target.protocol === 'MCP') {
        protocolCheck = await probeMcpHealth(probeTarget);
      } else if (target.protocol === 'A2A') {
        protocolCheck = await probeA2aHealth(probeTarget);
      } else {
        protocolCheck = reachability;
      }

      const checks = [reachability, latency, status];
      if (target.protocol === 'MCP' || target.protocol === 'A2A') {
        checks.push(protocolCheck);
      }

      // Record observations to append-only table
      for (const check of checks) {
        await db.insert(observations).values({
          id: check.id,
          probeRunId: runId,
          agentId: check.agentId,
          chain: check.chain,
          serviceId: check.serviceId ?? null,
          probeType: check.probeType,
          timestamp: new Date(check.timestamp),
          outcome: check.outcome,
          latencyMs: check.latencyMs ?? null,
          httpStatus: check.httpStatus ?? null,
          failureReason: check.failureReason ?? null,
          provenanceSource: check.provenance.source,
          provenanceOrigin: check.provenance.origin,
          probeVersion: check.probeVersion,
          methodologyVersion: check.methodologyVersion,
        });
        observationsRecorded++;
      }

      const isSuccess = reachability.outcome === 'SUCCESS';
      const now = new Date();

      if (isSuccess) {
        successfulProbes++;
        rateLimiter.recordSuccess(host);

        // Update service record
        await db
          .update(services)
          .set({
            lastMonitoredAt: now,
            lastSuccessAt: now,
            failureCount: 0,
          })
          .where(eq(services.id, target.serviceId));

        // Check if there was an open incident to auto-resolve
        const openIncidents = await db
          .select()
          .from(incidents)
          .where(
            and(
              eq(incidents.agentId, target.agentId),
              eq(incidents.status, 'OPEN'),
            ),
          );

        for (const inc of openIncidents) {
          const durSec = Math.max(
            0,
            Math.floor((now.getTime() - new Date(inc.startedAt).getTime()) / 1000),
          );
          await db
            .update(incidents)
            .set({
              status: 'RESOLVED',
              resolvedAt: now,
              recoveryObservedAt: now,
              durationSeconds: durSec,
            })
            .where(eq(incidents.id, inc.id));
          incidentsResolved++;
          console.log(`[Sentinel Incident] Resolved incident ${inc.id} for agent ${target.agentId}`);
        }
      } else {
        failedProbes++;
        rateLimiter.recordFailure(host);

        const newFailureCount = (target.failureCount ?? 0) + 1;
        await db
          .update(services)
          .set({
            lastMonitoredAt: now,
            failureCount: newFailureCount,
          })
          .where(eq(services.id, target.serviceId));

        // Threshold-based Incident Opening (consecutive failures >= 2)
        if (newFailureCount >= 2) {
          const existingOpen = await db
            .select()
            .from(incidents)
            .where(
              and(
                eq(incidents.agentId, target.agentId),
                eq(incidents.status, 'OPEN'),
              ),
            )
            .limit(1);

          if (existingOpen.length === 0) {
            const incId = randomUUID();
            await db.insert(incidents).values({
              id: incId,
              agentId: target.agentId,
              serviceId: target.serviceId,
              status: 'OPEN',
              startedAt: now,
              failureReason: reachability.failureReason ?? 'Endpoint unreachable or unresponsive',
              consecutiveFailures: newFailureCount,
            });
            incidentsOpened++;
            console.log(`[Sentinel Incident] Opened incident ${incId} for agent ${target.agentId} (${newFailureCount} failures)`);
          } else {
            await db
              .update(incidents)
              .set({ consecutiveFailures: newFailureCount })
              .where(eq(incidents.id, existingOpen[0]!.id));
          }
        }
      }

      // Compute and update reliability snapshot for this agent
      try {
        const agentObsRows = await db
          .select()
          .from(observations)
          .where(eq(observations.agentId, target.agentId))
          .orderBy(desc(observations.timestamp))
          .limit(100);

        const agentObs: ProbeObservation[] = agentObsRows.map((r) => ({
          id: r.id,
          agentId: r.agentId,
          chain: r.chain as ChainId,
          serviceId: r.serviceId ?? undefined,
          probeType: r.probeType as any,
          timestamp: new Date(r.timestamp).toISOString(),
          outcome: r.outcome as any,
          latencyMs: r.latencyMs ?? undefined,
          httpStatus: r.httpStatus ?? undefined,
          failureReason: r.failureReason ?? undefined,
          provenance: {
            source: r.provenanceSource as any,
            origin: r.provenanceOrigin,
            observedAt: new Date(r.timestamp).toISOString(),
          },
          probeVersion: r.probeVersion,
          methodologyVersion: r.methodologyVersion,
        }));

        const windows = computeAllWindows({
          agentId: target.agentId,
          observations: agentObs,
          now,
        });

        const activeIncCount = (
          await db
            .select()
            .from(incidents)
            .where(
              and(
                eq(incidents.agentId, target.agentId),
                eq(incidents.status, 'OPEN'),
              ),
            )
        ).length;

        const sentinelScore = computeSentinelReliabilityScore({
          window24h: windows['24h'],
          window7d: windows['7d'],
          activeIncidentsCount: activeIncCount,
          now,
        });

        for (const [wSize, wData] of Object.entries(windows)) {
          await db.insert(reliabilitySnapshots).values({
            id: randomUUID(),
            agentId: target.agentId,
            window: wSize,
            sentinelScore: sentinelScore.score,
            availabilityPct: wData.availabilityPct ?? null,
            medianLatencyMs: wData.medianLatencyMs ?? null,
            averageLatencyMs: wData.averageLatencyMs ?? null,
            p95LatencyMs: wData.p95LatencyMs ?? null,
            observationCount: wData.observationCount,
            successCount: wData.successCount,
            failureCount: wData.failureCount,
            consecutiveFailures: wData.consecutiveFailures,
            dataSufficiency: wData.dataSufficiency,
            computedAt: now,
            methodologyVersion: wData.methodologyVersion,
          });
        }
      } catch (err: any) {
        console.warn(`[Sentinel Monitor] Snapshot calculation notice for ${target.agentId}:`, err.message);
      }
    } catch (err: any) {
      console.error(`[Sentinel Monitor] Unexpected error probing ${target.serviceId}:`, err.message);
    } finally {
      release();
    }
  });

  await Promise.all(probeTasks);

  const finishedAt = new Date();
  const durationMs = Date.now() - startTime;

  try {
    await db
      .update(probeRuns)
      .set({ finishedAt })
      .where(eq(probeRuns.id, runId));
  } catch {
    // Ignore
  }

  console.log(`[Sentinel Monitor] Cycle ${runId} completed in ${(durationMs / 1000).toFixed(2)}s.`);

  return {
    runId,
    agentsDiscovered: discoveredAgents.length,
    servicesProbed: activeTargets.length,
    observationsRecorded,
    successfulProbes,
    failedProbes,
    incidentsOpened,
    incidentsResolved,
    durationMs,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
  };
}
