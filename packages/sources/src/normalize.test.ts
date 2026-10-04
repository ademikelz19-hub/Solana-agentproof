import { describe, expect, it } from 'vitest';
import type { Provenance, RawSaidAgent } from '@agentproof/core';
import { normalizeSaidServices } from './normalize';

const provenance: Provenance = {
  source: 'SAID_PROTOCOL',
  origin: 'test-fixture',
  observedAt: new Date().toISOString(),
};

const TEST_AGENT_ID = 'solana:5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G';

describe('normalizeSaidServices', () => {
  it('normalizes MCP and A2A endpoints from SAID agent record', () => {
    const raw: RawSaidAgent = {
      wallet: '5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G',
      name: 'Sentinel Prober',
      mcpEndpoint: 'https://agent.example.com/mcp',
      a2aEndpoint: 'https://agent.example.com/a2a',
    };

    const services = normalizeSaidServices(TEST_AGENT_ID, 'solana', raw, provenance);
    expect(services).toHaveLength(2);

    const mcp = services.find((s) => s.endpointType === 'MCP');
    expect(mcp).toBeDefined();
    expect(mcp?.url).toBe('https://agent.example.com/mcp');
    expect(mcp?.protocol).toBe('MCP');

    const a2a = services.find((s) => s.endpointType === 'A2A');
    expect(a2a).toBeDefined();
    expect(a2a?.url).toBe('https://agent.example.com/a2a');
    expect(a2a?.protocol).toBe('A2A');
  });

  it('normalizes website and dictionary endpoints', () => {
    const raw: RawSaidAgent = {
      wallet: '5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G',
      website: 'https://sentinel.agent',
      endpoints: {
        chat: 'https://sentinel.agent/chat',
      },
    };

    const services = normalizeSaidServices(TEST_AGENT_ID, 'solana', raw, provenance);
    expect(services.length).toBeGreaterThanOrEqual(2);
    expect(services.some((s) => s.endpointType === 'HTTP')).toBe(true);
  });

  it('handles empty endpoints gracefully without throwing or creating dummy entries', () => {
    const raw: RawSaidAgent = {
      wallet: '5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G',
      name: 'Endpointless Agent',
    };

    const services = normalizeSaidServices(TEST_AGENT_ID, 'solana', raw, provenance);
    expect(services).toHaveLength(0);
  });
});
