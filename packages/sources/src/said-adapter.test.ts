import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SaidProtocolAdapter } from './said-adapter';

describe('SaidProtocolAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default Solana Mainnet configuration', () => {
    const adapter = new SaidProtocolAdapter();
    expect(adapter.chain).toBe('solana');
    expect(adapter.sourceLabel).toBe('said-protocol');
  });

  it('safely handles failed API requests without throwing', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));
    const adapter = new SaidProtocolAdapter();
    const result = await adapter.listAgents({ limit: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('UPSTREAM_INDEXER_FAILURE');
      expect(result.detail).toContain('Connection refused');
    }
  });

  it('parses valid SAID agent list and filters non-Solana wallets', async () => {
    const mockPayload = {
      success: true,
      data: [
        {
          wallet: '5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G',
          name: 'Sentinel Anchor Agent',
          isVerified: true,
          trustTier: 'TIER_1',
          mcpEndpoint: 'https://mcp.agent.io/sse',
        },
        {
          wallet: '0xInvalidEvmAddress', // should be excluded
          name: 'Invalid EVM Agent',
        },
      ],
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockPayload), { status: 200 }),
    );

    const adapter = new SaidProtocolAdapter();
    const result = await adapter.listAgents();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.walletAddress).toBe('5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G');
      expect(result.data[0]?.verificationStatus).toBe('VERIFIED');
      expect(result.data[0]?.isMonitored).toBe(true);
    }
  });

  it('runs SAID Trust Screen and parses verdict', async () => {
    const mockScreenPayload = {
      wallet: '5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G',
      verdict: 'allow',
      score: 95,
      dimensions: {
        reliability: 99,
        transactionCount: 240,
      },
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockScreenPayload), { status: 200 }),
    );

    const adapter = new SaidProtocolAdapter();
    const result = await adapter.runTrustScreen('5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.verdict).toBe('allow');
      expect(result.data.trustScore).toBe(95);
    }
  });

  it('rejects invalid Solana addresses passed to getAgentDetails', async () => {
    const adapter = new SaidProtocolAdapter();
    const result = await adapter.getAgentDetails('not-a-solana-address');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('AGENTPROOF_INTERNAL_ERROR');
    }
  });
});
