import { agentRepository, incidentRepository, observationRepository } from '@/lib/api/repositories';
import { apiError, apiOk } from '@/lib/api/response';
import { parseAgentParams } from '@/lib/api/agent-params';
import {
  computeAllWindows,
  computeSentinelReliabilityScore,
} from '@agentproof/reliability';

const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chain: string; id: string }> },
) {
  const parsed = parseAgentParams(await params);
  if (!parsed.ok) {
    return apiError('VALIDATION_ERROR', parsed.error);
  }

  const agent = await agentRepository.getAgent(parsed.value.id);
  if (!agent) {
    return apiError('NOT_FOUND', `No agent found for wallet ${parsed.value.id} on Solana`);
  }

  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_MS).toISOString();

  const [page, activeIncidents] = await Promise.all([
    observationRepository.listObservations({
      agentId: agent.id,
      since,
      until: now.toISOString(),
      limit: 5000,
    }),
    incidentRepository.listIncidents(agent.id, 5),
  ]);

  const windows = computeAllWindows({
    agentId: agent.id,
    observations: page.items,
    now,
  });

  const activeIncCount = activeIncidents.filter((i) => i.status === 'OPEN').length;

  const sentinelScore = computeSentinelReliabilityScore({
    window24h: windows['24h'],
    window7d: windows['7d'],
    activeIncidentsCount: activeIncCount,
    now,
  });

  return apiOk(
    {
      agentId: agent.id,
      walletAddress: agent.walletAddress,
      network: 'Solana Mainnet',
      sentinelScore,
      windows,
      activeIncidents,
      observationCount: page.items.length,
      computedAt: now.toISOString(),
    },
    { cacheSeconds: 15 },
  );
}
