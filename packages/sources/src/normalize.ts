/**
 * Normalizes SAID Protocol agent metadata and declared endpoints into AgentService[] models.
 */

import { randomUUID } from 'node:crypto';
import type {
  AgentService,
  ChainId,
  EndpointType,
  Provenance,
  RawSaidAgent,
  ServiceProtocol,
} from '@agentproof/core';

export function normalizeSaidServices(
  agentId: string,
  chain: ChainId,
  raw: RawSaidAgent,
  provenance: Provenance,
): AgentService[] {
  const services: AgentService[] = [];

  // 1. MCP Endpoint
  if (raw.mcpEndpoint && typeof raw.mcpEndpoint === 'string' && raw.mcpEndpoint.trim().length > 0) {
    const url = raw.mcpEndpoint.trim();
    services.push({
      id: `${agentId}:mcp`,
      agentId,
      chain,
      endpointType: 'MCP',
      protocol: 'MCP',
      url,
      enabled: true,
      failureCount: 0,
      provenance,
    });
  }

  // 2. A2A Endpoint
  if (raw.a2aEndpoint && typeof raw.a2aEndpoint === 'string' && raw.a2aEndpoint.trim().length > 0) {
    const url = raw.a2aEndpoint.trim();
    services.push({
      id: `${agentId}:a2a`,
      agentId,
      chain,
      endpointType: 'A2A',
      protocol: 'A2A',
      url,
      enabled: true,
      failureCount: 0,
      provenance,
    });
  }

  // 3. Website or HTTP service
  if (raw.website && typeof raw.website === 'string' && raw.website.trim().length > 0) {
    const url = raw.website.trim();
    services.push({
      id: `${agentId}:web`,
      agentId,
      chain,
      endpointType: 'HTTP',
      protocol: 'HTTP',
      url,
      enabled: true,
      failureCount: 0,
      provenance,
    });
  }

  // 4. Custom key-value endpoints dictionary if present
  if (raw.endpoints && typeof raw.endpoints === 'object') {
    for (const [key, value] of Object.entries(raw.endpoints)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        const upperKey = key.toUpperCase();
        let protocol: ServiceProtocol = 'HTTP';
        let endpointType: EndpointType = 'SERVICE';

        if (upperKey.includes('MCP')) {
          protocol = 'MCP';
          endpointType = 'MCP';
        } else if (upperKey.includes('A2A')) {
          protocol = 'A2A';
          endpointType = 'A2A';
        }

        // Avoid duplicate IDs
        const svcId = `${agentId}:${key.toLowerCase()}`;
        if (!services.some((s) => s.id === svcId)) {
          services.push({
            id: svcId,
            agentId,
            chain,
            endpointType,
            protocol,
            url: value.trim(),
            enabled: true,
            failureCount: 0,
            provenance,
          });
        }
      }
    }
  }

  return services;
}
