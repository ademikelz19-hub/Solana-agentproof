import { agentRepository, saidAdapter } from '@/lib/api/repositories';
import { apiError, apiOk } from '@/lib/api/response';
import { parseAgentParams } from '@/lib/api/agent-params';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chain: string; id: string }> },
) {
  const parsed = parseAgentParams(await params);
  if (!parsed.ok) {
    return apiError('VALIDATION_ERROR', parsed.error);
  }

  let agent = await agentRepository.getAgent(parsed.value.id);

  // If not found in DB, try on-demand live lookup from SAID Protocol
  if (!agent) {
    const liveLookup = await saidAdapter.getAgentDetails(parsed.value.id);
    if (liveLookup.ok) {
      await agentRepository.upsertAgent(
        liveLookup.data.identity,
        liveLookup.data.metadata,
        liveLookup.data.services,
      );
      agent = liveLookup.data.identity;
    }
  }

  if (!agent) {
    return apiError('NOT_FOUND', `No SAID agent found for wallet ${parsed.value.id} on Solana Mainnet`);
  }

  const [metadata, services] = await Promise.all([
    agentRepository.getMetadata(agent.id),
    agentRepository.getServices(agent.id),
  ]);

  return apiOk({ identity: agent, metadata, services }, { cacheSeconds: 30 });
}
