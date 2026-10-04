/**
 * Probe framework for AgentProof Sentinel on Solana.
 *
 * Deterministic, modular: each probe type is a pure function of
 * (ProbeTarget) -> Promise<ProbeObservation>, built on top of `safeRequest`
 * (never raw fetch). Outbound requests are protected against SSRF, DNS rebinding,
 * private IP leakage, and high-frequency flooding.
 */

import { randomUUID } from 'node:crypto';
import {
  METHODOLOGY_VERSIONS,
  type ProbeObservation,
  type ProbeOutcome,
  type ProbeTarget,
  type ProbeType,
  type Provenance,
} from '@agentproof/core';
import { safeRequest, type SafeRequestResult } from './transport';

export const PROBE_VERSION = '0.2.0-solana';

function provenance(origin: string): Provenance {
  return {
    source: 'AGENTPROOF_SENTINEL_MEASUREMENT',
    origin,
    observedAt: new Date().toISOString(),
  };
}

function baseObservation(
  target: ProbeTarget,
  probeType: ProbeType,
  outcome: ProbeOutcome,
  extra: Partial<ProbeObservation> = {},
): ProbeObservation {
  return {
    id: randomUUID(),
    agentId: target.agentId,
    chain: target.chain,
    serviceId: target.serviceId,
    probeType,
    timestamp: new Date().toISOString(),
    outcome,
    provenance: provenance(`sentinel-probe:${probeType}`),
    probeVersion: PROBE_VERSION,
    methodologyVersion: METHODOLOGY_VERSIONS.probe,
    ...extra,
  };
}

/** Map transport failure to shared ProbeOutcome */
function outcomeFromTransportFailure(result: Extract<SafeRequestResult, { ok: false }>): ProbeOutcome {
  switch (result.reason) {
    case 'DNS_FAILURE':
      return 'DNS_FAILURE';
    case 'TIMEOUT':
      return 'TIMEOUT';
    case 'BLOCKED_IP':
    case 'DISALLOWED_SCHEME':
    case 'DISALLOWED_PORT':
    case 'USERINFO_NOT_ALLOWED':
    case 'MALFORMED_URL':
      return 'BLOCKED_BY_SECURITY_POLICY';
    case 'TOO_MANY_REDIRECTS':
    case 'RESPONSE_TOO_LARGE':
    case 'CONNECTION_ERROR':
    default:
      return 'AGENT_UNREACHABLE';
  }
}

/**
 * SERVICE_REACHABILITY: can Sentinel establish a connection and get any HTTP response?
 */
export async function probeServiceReachability(target: ProbeTarget): Promise<ProbeObservation> {
  const result = await safeRequest(target.url, { method: 'GET' });
  if (!result.ok) {
    return baseObservation(target, 'SERVICE_REACHABILITY', outcomeFromTransportFailure(result), {
      failureReason: result.detail,
    });
  }
  return baseObservation(target, 'SERVICE_REACHABILITY', 'SUCCESS', {
    latencyMs: result.latencyMs,
    httpStatus: result.status,
  });
}

/**
 * HTTP_STATUS: records status code as empirical observation.
 */
export async function probeHttpStatus(target: ProbeTarget): Promise<ProbeObservation> {
  const result = await safeRequest(target.url, { method: 'GET' });
  if (!result.ok) {
    return baseObservation(target, 'HTTP_STATUS', outcomeFromTransportFailure(result), {
      failureReason: result.detail,
    });
  }
  return baseObservation(target, 'HTTP_STATUS', 'SUCCESS', {
    httpStatus: result.status,
    latencyMs: result.latencyMs,
  });
}

/**
 * RESPONSE_LATENCY: measures connection and response time in milliseconds.
 */
export async function probeResponseLatency(target: ProbeTarget): Promise<ProbeObservation> {
  const result = await safeRequest(target.url, { method: 'GET' });
  if (!result.ok) {
    return baseObservation(target, 'RESPONSE_LATENCY', outcomeFromTransportFailure(result), {
      failureReason: result.detail,
    });
  }
  return baseObservation(target, 'RESPONSE_LATENCY', 'SUCCESS', {
    latencyMs: result.latencyMs,
    httpStatus: result.status,
  });
}

/**
 * METADATA_RESOLUTION: can Sentinel fetch declared metadata?
 */
export async function probeMetadataResolution(
  target: ProbeTarget,
  metadataUri: string,
): Promise<ProbeObservation> {
  const result = await safeRequest(metadataUri, { method: 'GET' });
  if (!result.ok) {
    return baseObservation(target, 'SERVICE_REACHABILITY', outcomeFromTransportFailure(result), {
      failureReason: result.detail,
    });
  }
  if (result.status >= 400) {
    return baseObservation(target, 'SERVICE_REACHABILITY', 'AGENT_UNREACHABLE', {
      httpStatus: result.status,
      latencyMs: result.latencyMs,
      failureReason: `metadata URI returned HTTP ${result.status}`,
    });
  }
  return baseObservation(target, 'SERVICE_REACHABILITY', 'SUCCESS', {
    httpStatus: result.status,
    latencyMs: result.latencyMs,
  });
}

/**
 * MCP_HEALTH: checks availability of a Model Context Protocol endpoint.
 */
export async function probeMcpHealth(target: ProbeTarget): Promise<ProbeObservation> {
  const result = await safeRequest(target.url, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream, application/json',
    },
  });

  if (!result.ok) {
    return baseObservation(target, 'MCP_HEALTH', outcomeFromTransportFailure(result), {
      failureReason: result.detail,
    });
  }

  const isValidMcpResponse = result.status < 500;
  return baseObservation(target, 'MCP_HEALTH', isValidMcpResponse ? 'SUCCESS' : 'PROTOCOL_INVALID', {
    httpStatus: result.status,
    latencyMs: result.latencyMs,
    failureReason: isValidMcpResponse ? undefined : `MCP endpoint returned server error HTTP ${result.status}`,
  });
}

/**
 * A2A_HEALTH: checks availability and responsiveness of an Agent-to-Agent endpoint.
 */
export async function probeA2aHealth(target: ProbeTarget): Promise<ProbeObservation> {
  const result = await safeRequest(target.url, {
    method: 'GET',
    headers: {
      Accept: 'application/json, text/plain',
    },
  });

  if (!result.ok) {
    return baseObservation(target, 'A2A_HEALTH', outcomeFromTransportFailure(result), {
      failureReason: result.detail,
    });
  }

  const isValidA2aResponse = result.status < 500;
  return baseObservation(target, 'A2A_HEALTH', isValidA2aResponse ? 'SUCCESS' : 'PROTOCOL_INVALID', {
    httpStatus: result.status,
    latencyMs: result.latencyMs,
    failureReason: isValidA2aResponse ? undefined : `A2A endpoint returned server error HTTP ${result.status}`,
  });
}

/**
 * PROTOCOL_RESPONSE_VALIDITY: evaluates whether response adheres to expected format.
 */
export async function probeProtocolResponseValidity(target: ProbeTarget): Promise<ProbeObservation> {
  if (target.protocol !== 'HTTP') {
    return baseObservation(target, 'PROTOCOL_RESPONSE_VALIDITY', 'PROTOCOL_INVALID', {
      failureReason: `no validator implemented yet for protocol ${target.protocol}`,
    });
  }

  const result = await safeRequest(target.url, { method: 'GET' });
  if (!result.ok) {
    return baseObservation(target, 'PROTOCOL_RESPONSE_VALIDITY', outcomeFromTransportFailure(result), {
      failureReason: result.detail,
    });
  }

  const valid = result.status < 500;
  return baseObservation(
    target,
    'PROTOCOL_RESPONSE_VALIDITY',
    valid ? 'SUCCESS' : 'PROTOCOL_INVALID',
    { httpStatus: result.status, latencyMs: result.latencyMs },
  );
}

export const PROBE_RUNNERS: Record<string, (t: ProbeTarget) => Promise<ProbeObservation>> = {
  SERVICE_REACHABILITY: probeServiceReachability,
  HTTP_STATUS: probeHttpStatus,
  RESPONSE_LATENCY: probeResponseLatency,
  PROTOCOL_RESPONSE_VALIDITY: probeProtocolResponseValidity,
  MCP_HEALTH: probeMcpHealth,
  A2A_HEALTH: probeA2aHealth,
};
