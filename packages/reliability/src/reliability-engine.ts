/**
 * Reliability engine for AgentProof Sentinel.
 *
 * Pure functions: `(ProbeObservation[]) -> ReliabilityWindow`.
 * No network I/O — deterministic, reproducible, and verifiable.
 *
 * Calculates factual operational metrics:
 * - 24h, 7d, 30d uptime availability %
 * - Median, average, and P95 latency
 * - Consecutive failure tracking
 * - Evidence sufficiency classifications
 * - Transparent Sentinel Reliability Score (0-100)
 */

import {
  METHODOLOGY_VERSIONS,
  type EvidenceSufficiency,
  type ProbeObservation,
  type ProbeOutcome,
  type ReliabilityWindow,
  type ReliabilityWindowSize,
  type SentinelReliabilityScore,
} from '@agentproof/core';

export const AGENT_ATTRIBUTABLE_OUTCOMES: ReadonlySet<ProbeOutcome> = new Set([
  'SUCCESS',
  'AGENT_UNREACHABLE',
  'DNS_FAILURE',
  'TIMEOUT',
  'PROTOCOL_INVALID',
]);

export const EXCLUDED_OUTCOMES: ReadonlySet<ProbeOutcome> = new Set([
  'UPSTREAM_INDEXER_FAILURE',
  'AGENTPROOF_INTERNAL_ERROR',
  'BLOCKED_BY_SECURITY_POLICY',
]);

export function isAttributableOutcome(outcome: ProbeOutcome): boolean {
  return AGENT_ATTRIBUTABLE_OUTCOMES.has(outcome);
}

export function isExcludedOutcome(outcome: ProbeOutcome): boolean {
  return EXCLUDED_OUTCOMES.has(outcome);
}

export function filterAttributableObservations(observations: ProbeObservation[]): ProbeObservation[] {
  return observations.filter((o) => isAttributableOutcome(o.outcome));
}

const WINDOW_MS: Record<ReliabilityWindowSize, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const MIN_OBSERVATIONS_FOR_ANY_DISPLAY = 3;
const MIN_OBSERVATIONS_FOR_MODERATE = 10;
const MIN_OBSERVATIONS_FOR_STRONG = 30;
const MIN_SPAN_RATIO_FOR_MODERATE = 0.25;
const MIN_SPAN_RATIO_FOR_STRONG = 0.75;
const MAX_STALENESS_RATIO = 0.5;

function median(sorted: number[]): number | undefined {
  if (sorted.length === 0) return undefined;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const a = sorted[mid - 1];
    const b = sorted[mid];
    return a !== undefined && b !== undefined ? Math.round((a + b) / 2) : undefined;
  }
  return sorted[mid];
}

function average(numbers: number[]): number | undefined {
  if (numbers.length === 0) return undefined;
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / numbers.length);
}

function p95(sorted: number[]): number | undefined {
  if (sorted.length === 0) return undefined;
  const rank = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.min(rank, sorted.length - 1)];
}

function classifySufficiency(
  observationCount: number,
  spanRatio: number,
  stalenessRatio: number,
): EvidenceSufficiency {
  if (observationCount < MIN_OBSERVATIONS_FOR_ANY_DISPLAY) return 'INSUFFICIENT';
  if (stalenessRatio > MAX_STALENESS_RATIO) return 'INSUFFICIENT';

  let tier: EvidenceSufficiency;
  if (observationCount >= MIN_OBSERVATIONS_FOR_STRONG) tier = 'STRONG';
  else if (observationCount >= MIN_OBSERVATIONS_FOR_MODERATE) tier = 'MODERATE';
  else tier = 'LIMITED';

  if (tier === 'STRONG' && spanRatio < MIN_SPAN_RATIO_FOR_STRONG) tier = 'MODERATE';
  if (tier === 'MODERATE' && spanRatio < MIN_SPAN_RATIO_FOR_MODERATE) tier = 'LIMITED';
  return tier;
}

export interface ComputeReliabilityWindowParams {
  agentId: string;
  serviceId?: string;
  window: ReliabilityWindowSize;
  observations: ProbeObservation[];
  now: Date;
  methodologyVersion?: string;
}

export function computeReliabilityWindow(params: ComputeReliabilityWindowParams): ReliabilityWindow {
  const { agentId, serviceId, window, now } = params;
  const methodologyVersion = params.methodologyVersion ?? METHODOLOGY_VERSIONS.reliability;
  const windowMs = WINDOW_MS[window];
  const windowStart = now.getTime() - windowMs;

  const inWindow = params.observations.filter((o) => {
    if (o.agentId !== agentId) return false;
    if (serviceId && o.serviceId !== serviceId) return false;
    const t = new Date(o.timestamp).getTime();
    return t >= windowStart && t <= now.getTime();
  });

  const attributable = inWindow.filter((o) => AGENT_ATTRIBUTABLE_OUTCOMES.has(o.outcome));
  const successes = attributable.filter((o) => o.outcome === 'SUCCESS');
  const failures = attributable.filter((o) => o.outcome !== 'SUCCESS');

  const observationCount = attributable.length;
  const successCount = successes.length;
  const failureCount = failures.length;

  const availabilityPct =
    observationCount > 0 ? (successCount / observationCount) * 100 : undefined;

  const successLatencies = successes
    .map((o) => o.latencyMs)
    .filter((v): v is number => typeof v === 'number')
    .sort((a, b) => a - b);

  const medianLatencyMs = median(successLatencies);
  const averageLatencyMs = average(successLatencies);
  const p95LatencyMs = p95(successLatencies);

  const sortedByTimeDesc = [...attributable].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  let consecutiveFailures = 0;
  for (const o of sortedByTimeDesc) {
    if (o.outcome === 'SUCCESS') break;
    consecutiveFailures += 1;
  }

  const lastProbeAt = sortedByTimeDesc[0]?.timestamp;
  const lastSuccessfulProbeAt = successes
    .map((o) => o.timestamp)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  const earliestTimestamp = attributable.length
    ? Math.min(...attributable.map((o) => new Date(o.timestamp).getTime()))
    : undefined;
  const spanMs =
    earliestTimestamp !== undefined && lastProbeAt
      ? new Date(lastProbeAt).getTime() - earliestTimestamp
      : 0;
  const spanRatio = windowMs > 0 ? spanMs / windowMs : 0;

  const stalenessRatio = lastProbeAt
    ? (now.getTime() - new Date(lastProbeAt).getTime()) / windowMs
    : Number.POSITIVE_INFINITY;

  const dataSufficiency = classifySufficiency(observationCount, spanRatio, stalenessRatio);

  return {
    agentId,
    ...(serviceId ? { serviceId } : {}),
    window,
    sufficientData: dataSufficiency !== 'INSUFFICIENT',
    dataSufficiency,
    observationCount,
    successCount,
    failureCount,
    ...(availabilityPct !== undefined ? { availabilityPct } : {}),
    ...(medianLatencyMs !== undefined ? { medianLatencyMs } : {}),
    ...(averageLatencyMs !== undefined ? { averageLatencyMs } : {}),
    ...(p95LatencyMs !== undefined ? { p95LatencyMs } : {}),
    ...(lastSuccessfulProbeAt ? { lastSuccessfulProbeAt } : {}),
    ...(lastProbeAt ? { lastProbeAt } : {}),
    consecutiveFailures,
    methodologyVersion,
    computedAt: now.toISOString(),
  };
}

export function computeAllWindows(
  params: Omit<ComputeReliabilityWindowParams, 'window'>,
): Record<ReliabilityWindowSize, ReliabilityWindow> {
  return {
    '24h': computeReliabilityWindow({ ...params, window: '24h' }),
    '7d': computeReliabilityWindow({ ...params, window: '7d' }),
    '30d': computeReliabilityWindow({ ...params, window: '30d' }),
  };
}

/**
 * Calculates the explainable Sentinel Reliability Score (0-100).
 *
 * Weights:
 * - Availability (50%): Empirical uptime across active windows.
 * - Latency Performance (25%): Sub-300ms is full marks, scaling down for high/inconsistent latency.
 * - Evidence Depth (15%): Statistical confidence based on measurement coverage.
 * - Recovery Stability (10%): Penalty for active failures and unresolved incidents.
 */
export function computeSentinelReliabilityScore(params: {
  window24h: ReliabilityWindow;
  window7d: ReliabilityWindow;
  activeIncidentsCount?: number;
  now: Date;
}): SentinelReliabilityScore {
  const { window24h, window7d, activeIncidentsCount = 0, now } = params;

  if (!window24h.sufficientData && !window7d.sufficientData) {
    return {
      score: 0,
      tier: 'UNMEASURED',
      availabilityScore: 0,
      latencyScore: 0,
      coverageScore: 0,
      stabilityScore: 0,
      formulaDescription:
        'Insufficient empirical measurement history (< 3 attributable checks recorded).',
      computedAt: now.toISOString(),
    };
  }

  // 1. Availability Score (50%)
  const avail24 = window24h.availabilityPct ?? window7d.availabilityPct ?? 100;
  const avail7 = window7d.availabilityPct ?? avail24;
  const availabilityScore = Math.round(avail24 * 0.7 + avail7 * 0.3);

  // 2. Latency Score (25%)
  const latency = window24h.medianLatencyMs ?? window7d.medianLatencyMs ?? 500;
  let latencyScore = 100;
  if (latency <= 300) {
    latencyScore = 100;
  } else if (latency <= 1000) {
    latencyScore = Math.round(100 - ((latency - 300) / 700) * 30); // 100 down to 70
  } else if (latency <= 3000) {
    latencyScore = Math.round(70 - ((latency - 1000) / 2000) * 40); // 70 down to 30
  } else {
    latencyScore = 15;
  }

  // 3. Evidence Coverage Score (15%)
  let coverageScore = 0;
  if (window24h.dataSufficiency === 'STRONG' || window7d.dataSufficiency === 'STRONG') {
    coverageScore = 100;
  } else if (window24h.dataSufficiency === 'MODERATE' || window7d.dataSufficiency === 'MODERATE') {
    coverageScore = 75;
  } else if (window24h.dataSufficiency === 'LIMITED' || window7d.dataSufficiency === 'LIMITED') {
    coverageScore = 45;
  }

  // 4. Stability & Incident Score (10%)
  let stabilityScore = 100;
  const failures = window24h.consecutiveFailures;
  if (failures === 1) stabilityScore = 75;
  else if (failures === 2) stabilityScore = 40;
  else if (failures >= 3) stabilityScore = 10;

  if (activeIncidentsCount > 0) {
    stabilityScore = Math.max(0, stabilityScore - activeIncidentsCount * 30);
  }

  // Composite Weighted Score
  const rawScore =
    availabilityScore * 0.5 +
    latencyScore * 0.25 +
    coverageScore * 0.15 +
    stabilityScore * 0.1;

  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  let tier: SentinelReliabilityScore['tier'] = 'HEALTHY';
  if (score >= 90) tier = 'OPTIMAL';
  else if (score >= 75) tier = 'HEALTHY';
  else if (score >= 50) tier = 'DEGRADED';
  else tier = 'CRITICAL';

  return {
    score,
    tier,
    availabilityScore,
    latencyScore,
    coverageScore,
    stabilityScore,
    formulaDescription:
      'Calculated as: 50% Availability + 25% Latency Consistency + 15% Evidence Coverage + 10% Incident Stability.',
    computedAt: now.toISOString(),
  };
}
