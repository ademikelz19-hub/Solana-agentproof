import { describe, expect, it, vi } from 'vitest';
import type { ProbeTarget } from '@agentproof/core';
import type { SafeRequestResult } from './transport';

vi.mock('./transport.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./transport.js')>();
  return { ...actual, safeRequest: vi.fn() };
});

const { safeRequest } = await import('./transport.js');
const {
  probeServiceReachability,
  probeHttpStatus,
  probeResponseLatency,
  probeMetadataResolution,
  probeProtocolResponseValidity,
  probeMcpHealth,
  probeA2aHealth,
} = await import('./probe-runner.js');

const mockedSafeRequest = safeRequest as unknown as ReturnType<typeof vi.fn>;

const target: ProbeTarget = {
  agentId: 'solana:5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G',
  chain: 'solana',
  serviceId: 'svc-1',
  url: 'https://agent.example.test/api',
  protocol: 'HTTP',
};

function ok(overrides: Partial<Extract<SafeRequestResult, { ok: true }>> = {}): SafeRequestResult {
  return {
    ok: true,
    status: 200,
    headers: {},
    body: Buffer.from(''),
    finalUrl: target.url,
    redirectCount: 0,
    latencyMs: 42,
    ...overrides,
  };
}

function failure(reason: string, detail: string): SafeRequestResult {
  return {
    ok: false,
    reason: reason as never,
    detail,
    latencyMs: 12,
  };
}

describe('probeServiceReachability', () => {
  it('reports SUCCESS when transport succeeds', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 200 }));
    const obs = await probeServiceReachability(target);
    expect(obs.outcome).toBe('SUCCESS');
    expect(obs.httpStatus).toBe(200);
    expect(obs.latencyMs).toBe(42);
  });

  it('maps DNS_FAILURE to DNS_FAILURE outcome', async () => {
    mockedSafeRequest.mockResolvedValueOnce(failure('DNS_FAILURE', 'NXDOMAIN'));
    const obs = await probeServiceReachability(target);
    expect(obs.outcome).toBe('DNS_FAILURE');
  });

  it('maps TIMEOUT to TIMEOUT outcome', async () => {
    mockedSafeRequest.mockResolvedValueOnce(failure('TIMEOUT', 'timed out'));
    const obs = await probeServiceReachability(target);
    expect(obs.outcome).toBe('TIMEOUT');
  });

  it('maps BLOCKED_IP to BLOCKED_BY_SECURITY_POLICY outcome', async () => {
    mockedSafeRequest.mockResolvedValueOnce(failure('BLOCKED_IP', 'private IP'));
    const obs = await probeServiceReachability(target);
    expect(obs.outcome).toBe('BLOCKED_BY_SECURITY_POLICY');
  });
});

describe('probeHttpStatus', () => {
  it('records status on non-200 responses as successful observation', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 503 }));
    const obs = await probeHttpStatus(target);
    expect(obs.outcome).toBe('SUCCESS');
    expect(obs.httpStatus).toBe(503);
  });
});

describe('probeResponseLatency', () => {
  it('only reports latency on success', async () => {
    mockedSafeRequest.mockResolvedValueOnce(failure('AGENT_UNREACHABLE', 'connection refused'));
    const obs = await probeResponseLatency(target);
    expect(obs.outcome).toBe('AGENT_UNREACHABLE');
    expect(obs.latencyMs).toBeUndefined();
  });
});

describe('probeMetadataResolution', () => {
  it('treats a 404 on the metadata URI as unreachable', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 404 }));
    const obs = await probeMetadataResolution(target, 'https://agent.example.test/metadata.json');
    expect(obs.outcome).toBe('AGENT_UNREACHABLE');
    expect(obs.httpStatus).toBe(404);
  });

  it('reports SUCCESS when the metadata URI is fetchable', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 200 }));
    const obs = await probeMetadataResolution(target, 'https://agent.example.test/metadata.json');
    expect(obs.outcome).toBe('SUCCESS');
  });
});

describe('probeProtocolResponseValidity', () => {
  it('never claims HTTP 200 means "protocol correct" for protocols without an implemented validator', async () => {
    const customTarget: ProbeTarget = { ...target, protocol: 'UNKNOWN' };
    const callsBefore = mockedSafeRequest.mock.calls.length;
    const obs = await probeProtocolResponseValidity(customTarget);
    expect(obs.outcome).toBe('PROTOCOL_INVALID');
    expect(mockedSafeRequest.mock.calls.length).toBe(callsBefore);
    expect(obs.failureReason).toMatch(/no validator implemented/);
  });

  it('validates a plain HTTP target and treats 5xx as PROTOCOL_INVALID', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 503 }));
    const obs = await probeProtocolResponseValidity(target);
    expect(obs.outcome).toBe('PROTOCOL_INVALID');
  });

  it('validates a plain HTTP target and treats 200 as SUCCESS', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 200 }));
    const obs = await probeProtocolResponseValidity(target);
    expect(obs.outcome).toBe('SUCCESS');
  });
});

describe('probeMcpHealth & probeA2aHealth', () => {
  it('successfully probes an MCP endpoint', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 200 }));
    const mcpTarget: ProbeTarget = { ...target, protocol: 'MCP', url: 'https://agent.io/mcp' };
    const obs = await probeMcpHealth(mcpTarget);
    expect(obs.outcome).toBe('SUCCESS');
    expect(obs.probeType).toBe('MCP_HEALTH');
  });

  it('successfully probes an A2A endpoint', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 200 }));
    const a2aTarget: ProbeTarget = { ...target, protocol: 'A2A', url: 'https://agent.io/a2a' };
    const obs = await probeA2aHealth(a2aTarget);
    expect(obs.outcome).toBe('SUCCESS');
    expect(obs.probeType).toBe('A2A_HEALTH');
  });
});
