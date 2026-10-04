import { describe, expect, it } from 'vitest';
import {
  isValidSolanaAddress,
  parseExternal,
  parseExternalJsonText,
  rawSaidAgentSchema,
  rawSaidAgentsListResponseSchema,
  rawSaidTrustScreenResponseSchema,
  rawSaidVerifyResponseSchema,
} from './validation';

describe('isValidSolanaAddress', () => {
  it('accepts valid Solana mainnet public keys', () => {
    // Official SAID Program ID
    expect(isValidSolanaAddress('5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G')).toBe(true);
    // System Program
    expect(isValidSolanaAddress('11111111111111111111111111111111')).toBe(true);
    // Known Solana addresses
    expect(isValidSolanaAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')).toBe(true);
  });

  it('rejects EVM 0x addresses', () => {
    expect(isValidSolanaAddress('0x8004a169fb4a3325136eb29fa0ceb6d2e539a432')).toBe(false);
    expect(isValidSolanaAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(false);
  });

  it('rejects malformed, empty, or non-base58 strings', () => {
    expect(isValidSolanaAddress('')).toBe(false);
    expect(isValidSolanaAddress('   ')).toBe(false);
    expect(isValidSolanaAddress('not-a-solana-key')).toBe(false);
    expect(isValidSolanaAddress('00000000000000000000000000000000000000000000000000')).toBe(false);
    expect(isValidSolanaAddress(null)).toBe(false);
    expect(isValidSolanaAddress(12345)).toBe(false);
  });
});

describe('SAID Protocol Schemas', () => {
  it('validates a valid SAID agent object', () => {
    const raw = {
      wallet: '5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G',
      name: 'Sentinel Alpha',
      description: 'Autonomous reliability monitor on Solana',
      isVerified: true,
      trustTier: 'TIER_1',
      reputationScore: 94,
      skills: ['uptime-monitoring', 'mcp-probing'],
      serviceTypes: ['MCP', 'A2A'],
      mcpEndpoint: 'https://sentinel.agent/mcp',
      a2aEndpoint: 'https://sentinel.agent/a2a',
    };

    const res = parseExternal(rawSaidAgentSchema, raw);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.name).toBe('Sentinel Alpha');
      expect(res.data.isVerified).toBe(true);
    }
  });

  it('validates SAID verify endpoint response', () => {
    const raw = {
      verified: true,
      wallet: '5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G',
      tier: 'TIER_1',
      registeredAt: '2026-02-15T00:00:00Z',
    };
    const res = parseExternal(rawSaidVerifyResponseSchema, raw);
    expect(res.ok).toBe(true);
  });

  it('validates SAID Trust Screen verdict and dimensions', () => {
    const raw = {
      wallet: '5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G',
      verdict: 'allow',
      score: 96,
      dimensions: {
        reliability: 98,
        transactionCount: 1540,
        disputeRate: 0,
        tenureDays: 120,
      },
    };
    const res = parseExternal(rawSaidTrustScreenResponseSchema, raw);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.verdict).toBe('allow');
      expect(res.data.score).toBe(96);
    }
  });
});
