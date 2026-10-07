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

  let agent = null;
  try {
    agent = await agentRepository.getAgent(parsed.value.id);
  } catch (err) {
    console.warn('[API /agents/:id] DB lookup error:', err);
  }

  // If not found in DB or DB down, try on-demand live lookup from SAID Protocol
  let liveServices: any[] = [];
  let liveMetadata: any = null;
  if (!agent) {
    const liveLookup = await saidAdapter.getAgentDetails(parsed.value.id);
    if (liveLookup.ok) {
      agent = liveLookup.data.identity;
      liveServices = liveLookup.data.services ?? [];
      liveMetadata = liveLookup.data.metadata ?? null;
      try {
        await agentRepository.upsertAgent(
          liveLookup.data.identity,
          liveLookup.data.metadata,
          liveLookup.data.services,
        );
      } catch (err) {
        console.warn('[API /agents/:id] Background upsert failed:', err);
      }
    }
  }

  if (!agent) {
    return apiError('NOT_FOUND', `No SAID agent found for wallet ${parsed.value.id} on Solana Mainnet`);
  }

  let metadata = liveMetadata;
  let services = liveServices;
  try {
    const [metaRes, servRes] = await Promise.all([
      agentRepository.getMetadata(agent.id),
      agentRepository.getServices(agent.id),
    ]);
    if (metaRes) metadata = metaRes;
    if (servRes && servRes.length > 0) services = servRes;
  } catch (err) {
    console.warn('[API /agents/:id] Services/metadata DB query fallback:', err);
  }

  return apiOk({ identity: agent, metadata, services }, { cacheSeconds: 30 });
}
