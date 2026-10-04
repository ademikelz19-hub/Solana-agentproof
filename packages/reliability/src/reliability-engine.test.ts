import { describe, expect, it } from 'vitest';
import type { ProbeObservation, ProbeOutcome } from '@agentproof/core';
import {
  computeReliabilityWindow,
  computeSentinelReliabilityScore,
} from './reliability-engine';

const AGENT = 'solana:5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G';
const SERVICE = 'svc-mcp-1';

function obs(
  hoursAgo: number,
  outcome: ProbeOutcome,
  overrides: Partial<ProbeObservation> = {},
): ProbeObservation {
  const now = new Date('2026-08-28T12:00:00.000Z');
  return {
    id: `obs-${hoursAgo}-${Math.random()}`,
    agentId: AGENT,
    chain: 'solana',
    serviceId: SERVICE,
    probeType: 'SERVICE_REACHABILITY',
    timestamp: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString(),
    outcome,
    provenance: { source: 'AGENTPROOF_SENTINEL_MEASUREMENT', origin: 'test', observedAt: now.toISOString() },
    probeVersion: '0.2.0-solana',
    methodologyVersion: '0.2.0-sentinel',
    ...overrides,
  };
}

const NOW = new Date('2026-08-28T12:00:00.000Z');

describe('computeReliabilityWindow — availability & latency', () => {
  it('computes availability as successCount / attributable observation count', () => {
    const observations = [
      obs(1, 'SUCCESS', { latencyMs: 120 }),
      obs(2, 'SUCCESS', { latencyMs: 180 }),
      obs(3, 'SUCCESS', { latencyMs: 150 }),
      obs(4, 'AGENT_UNREACHABLE'),
    ];
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    expect(result.observationCount).toBe(4);
    expect(result.successCount).toBe(3);
    expect(result.failureCount).toBe(1);
    expect(result.availabilityPct).toBe(75);
    expect(result.medianLatencyMs).toBe(150);
    expect(result.averageLatencyMs).toBe(150);
  });

  it('leaves availabilityPct undefined when there are zero attributable observations', () => {
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations: [], now: NOW });
    expect(result.availabilityPct).toBeUndefined();
    expect(result.dataSufficiency).toBe('INSUFFICIENT');
  });

  it('never counts tooling or security policy blocks against the agent', () => {
    const observations = [
      obs(1, 'SUCCESS'),
      obs(2, 'UPSTREAM_INDEXER_FAILURE'),
      obs(3, 'AGENTPROOF_INTERNAL_ERROR'),
      obs(4, 'BLOCKED_BY_SECURITY_POLICY'),
    ];
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    expect(result.observationCount).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
  });
});

describe('computeSentinelReliabilityScore', () => {
  it('returns UNMEASURED when insufficient data exists', () => {
    const w24 = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations: [], now: NOW });
    const w7 = computeReliabilityWindow({ agentId: AGENT, window: '7d', observations: [], now: NOW });
    const score = computeSentinelReliabilityScore({ window24h: w24, window7d: w7, now: NOW });

    expect(score.tier).toBe('UNMEASURED');
    expect(score.score).toBe(0);
  });

  it('computes high score for consistent low latency and 100% uptime', () => {
    // Generate 35 successful observations over 20 hours
    const observations: ProbeObservation[] = [];
    for (let i = 1; i <= 35; i++) {
      observations.push(obs(i * 0.5, 'SUCCESS', { latencyMs: 120 }));
    }

    const w24 = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    const w7 = computeReliabilityWindow({ agentId: AGENT, window: '7d', observations, now: NOW });
    const score = computeSentinelReliabilityScore({ window24h: w24, window7d: w7, now: NOW });

    expect(score.tier).toBe('OPTIMAL');
    expect(score.score).toBeGreaterThanOrEqual(90);
    expect(score.availabilityScore).toBe(100);
    expect(score.latencyScore).toBe(100);
  });

  it('penalizes consecutive failures and active incidents', () => {
    const observations: ProbeObservation[] = [
      obs(0.1, 'TIMEOUT'),
      obs(0.2, 'TIMEOUT'),
      obs(0.3, 'TIMEOUT'),
      obs(1, 'SUCCESS', { latencyMs: 200 }),
      obs(2, 'SUCCESS', { latencyMs: 200 }),
      obs(3, 'SUCCESS', { latencyMs: 200 }),
    ];

    const w24 = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    const w7 = computeReliabilityWindow({ agentId: AGENT, window: '7d', observations, now: NOW });
    const score = computeSentinelReliabilityScore({
      window24h: w24,
      window7d: w7,
      activeIncidentsCount: 1,
      now: NOW,
    });

    expect(w24.consecutiveFailures).toBe(3);
    expect(score.stabilityScore).toBeLessThan(40);
    expect(score.tier).toBe('DEGRADED');
  });
});
