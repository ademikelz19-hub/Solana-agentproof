import { describe, expect, it } from 'vitest';
import type { AgentIdentity, ProbeObservation } from './domain';
import {
  InMemoryAgentRepository,
  InMemoryIncidentRepository,
  InMemoryObservationRepository,
} from './in-memory-repositories';

const TEST_WALLET = '5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G';
const TEST_AGENT_ID = `solana:${TEST_WALLET}`;

function makeObservation(id: string, timestamp: string): ProbeObservation {
  return {
    id,
    agentId: TEST_AGENT_ID,
    chain: 'solana',
    serviceId: 'svc-1',
    probeType: 'SERVICE_REACHABILITY',
    timestamp,
    outcome: 'SUCCESS',
    provenance: { source: 'AGENTPROOF_SENTINEL_MEASUREMENT', origin: 'test', observedAt: timestamp },
    probeVersion: '0.2.0-solana',
    methodologyVersion: '0.2.0-sentinel',
  };
}

describe('ObservationRepository — append-only enforcement on Solana', () => {
  it('has no update/delete method — recordObservation only appends', async () => {
    const repo = new InMemoryObservationRepository();
    await repo.recordObservation(makeObservation('o1', '2026-08-01T00:00:00.000Z'));
    await repo.recordObservation(makeObservation('o1', '2026-08-02T00:00:00.000Z'));

    const page = await repo.listObservations({
      agentId: TEST_AGENT_ID,
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-12-31T00:00:00.000Z',
      limit: 10,
    });

    expect(page.items).toHaveLength(2);
  });

  it('lists observations sorted newest first', async () => {
    const repo = new InMemoryObservationRepository();
    await repo.recordObservation(makeObservation('o1', '2026-08-01T00:00:00.000Z'));
    await repo.recordObservation(makeObservation('o2', '2026-08-03T00:00:00.000Z'));
    await repo.recordObservation(makeObservation('o3', '2026-08-02T00:00:00.000Z'));

    const page = await repo.listObservations({
      agentId: TEST_AGENT_ID,
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-12-31T00:00:00.000Z',
      limit: 10,
    });
    expect(page.items.map((o) => o.id)).toEqual(['o2', 'o3', 'o1']);
  });
});

describe('AgentRepository & IncidentRepository', () => {
  it('stores and retrieves SAID Solana agents', async () => {
    const repo = new InMemoryAgentRepository();
    const agent: AgentIdentity = {
      id: TEST_AGENT_ID,
      chain: 'solana',
      walletAddress: TEST_WALLET,
      name: 'Sentinel Agent',
      verificationStatus: 'VERIFIED',
      trustTier: 'TIER_1',
      skills: ['monitoring', 'reliability'],
      serviceTypes: ['A2A', 'MCP'],
      firstSeenAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      isMonitored: true,
      provenance: {
        source: 'SAID_PROTOCOL',
        origin: 'said-indexer',
        observedAt: new Date().toISOString(),
      },
    };

    await repo.upsertAgent(agent);
    const retrieved = await repo.getAgent(TEST_WALLET);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('Sentinel Agent');
    expect(retrieved?.verificationStatus).toBe('VERIFIED');
  });

  it('records and resolves incidents with duration tracking', async () => {
    const incidentRepo = new InMemoryIncidentRepository();
    const started = '2026-10-03T10:00:00.000Z';
    const resolved = '2026-10-03T10:15:00.000Z';

    await incidentRepo.recordIncident({
      id: 'inc-1',
      agentId: TEST_AGENT_ID,
      serviceId: 'svc-1',
      status: 'OPEN',
      startedAt: started,
      failureReason: 'Endpoint timed out (8000ms exceeded)',
      consecutiveFailures: 3,
      failedChecksCount: 3,
    });

    expect(await incidentRepo.countActiveIncidents()).toBe(1);
    const active = await incidentRepo.getActiveIncident(TEST_AGENT_ID);
    expect(active?.status).toBe('OPEN');

    await incidentRepo.resolveIncident('inc-1', resolved, resolved);
    expect(await incidentRepo.countActiveIncidents()).toBe(0);

    const incidents = await incidentRepo.listIncidents(TEST_AGENT_ID);
    expect(incidents[0]?.status).toBe('RESOLVED');
    expect(incidents[0]?.durationSeconds).toBe(900); // 15 minutes = 900 seconds
  });
});
