import { agentRepository } from '@/lib/api/repositories';
import { apiError, apiOk } from '@/lib/api/response';
import { parseAgentParams } from '@/lib/api/agent-params';
import { SaidProtocolAdapter } from '@agentproof/sources';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chain: string; id: string }> },
) {
  const parsed = parseAgentParams(await params);
  if (!parsed.ok) {
    return apiError('VALIDATION_ERROR', parsed.error);
  }

  const agent = await agentRepository.getAgent(parsed.value.id);
  const wallet = agent?.walletAddress || parsed.value.id;

  try {
    const adapter = new SaidProtocolAdapter();
    const trustResult = await adapter.runTrustScreen(wallet);
    return apiOk(
      {
        wallet,
        saidVerificationStatus: agent?.verificationStatus || 'UNVERIFIED',
        saidTrustTier: agent?.trustTier || 'UNRANKED',
        saidTrustScore: trustResult.ok ? trustResult.data?.trustScore : null,
        verdict: trustResult.ok ? trustResult.data?.verdict : 'review',
        protocol: 'SAID Protocol on Solana Mainnet',
        notice:
          'Official SAID Protocol reputation and trust tiering. AgentProof Sentinel does not manipulate or generate synthetic feedback.',
      },
      { cacheSeconds: 60 },
    );
  } catch (_err) {
    return apiOk(
      {
        wallet,
        saidVerificationStatus: agent?.verificationStatus || 'UNVERIFIED',
        saidTrustTier: agent?.trustTier || 'UNRANKED',
        protocol: 'SAID Protocol on Solana Mainnet',
        notice: 'Official SAID Protocol reputation and trust tiering.',
      },
      { cacheSeconds: 60 },
    );
  }
}
