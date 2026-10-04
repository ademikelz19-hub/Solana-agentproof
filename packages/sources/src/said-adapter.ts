/**
 * SAID Protocol Adapter for Solana Mainnet.
 *
 * Programmatic integration with the official SAID Protocol API and SDK:
 * - Program ID: 5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G
 * - Endpoints:
 *     GET /api/agents
 *     GET /api/agents/:wallet
 *     GET /api/verify/:wallet
 *     GET /api/trust/:wallet
 *     GET /api/screen?wallet=WALLET_ADDRESS
 */

import {
  SOLANA_MAINNET,
  isValidSolanaAddress,
  parseExternal,
  rawSaidAgentSchema,
  rawSaidAgentsListResponseSchema,
  rawSaidTrustResponseSchema,
  rawSaidTrustScreenResponseSchema,
  rawSaidVerifyResponseSchema,
  type AgentIdentity,
  type AgentMetadata,
  type AgentService,
  type ChainId,
  type Ingested,
  type Provenance,
  type SaidAgentIndexer,
  type SaidVerificationStatus,
  type TrustScreenResult,
} from '@agentproof/core';
import { normalizeSaidServices } from './normalize';

export const DEFAULT_SAID_API_BASE_URL = 'https://api.saidprotocol.com';

export interface SaidAdapterOptions {
  baseUrl?: string;
  timeoutMs?: number;
  apiKey?: string;
}

export class SaidProtocolAdapter implements SaidAgentIndexer {
  readonly chain: ChainId = SOLANA_MAINNET.id;
  readonly sourceLabel = 'said-protocol';
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly apiKey?: string | undefined;

  constructor(options: SaidAdapterOptions = {}) {
    this.baseUrl = (
      options.baseUrl ??
      process.env.SAID_API_BASE_URL ??
      DEFAULT_SAID_API_BASE_URL
    ).replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? Number(process.env.MONITOR_TIMEOUT_MS ?? 8000);
    this.apiKey = options.apiKey ?? process.env.SAID_API_KEY;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'AgentProof-Sentinel/0.2.0 (Solana AI-agent reliability layer)',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, {
        ...init,
        headers: {
          ...this.getHeaders(),
          ...(init?.headers ?? {}),
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * List agents registered on SAID Protocol.
   */
  async listAgents(opts?: { limit?: number; cursor?: string }): Promise<Ingested<AgentIdentity[]>> {
    const limit = opts?.limit ?? 20;
    const page = opts?.cursor ? Number(opts.cursor) || 1 : 1;
    const url = new URL(`${this.baseUrl}/api/agents`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page', String(page));

    try {
      const response = await this.fetchWithTimeout(url.toString());
      if (!response.ok) {
        return {
          ok: false,
          reason: 'UPSTREAM_INDEXER_FAILURE',
          detail: `SAID Protocol responded with HTTP ${response.status} (${response.statusText})`,
        };
      }

      const rawJson = await response.json();
      const parsed = parseExternal(rawSaidAgentsListResponseSchema, rawJson);

      if (!parsed.ok) {
        return {
          ok: false,
          reason: 'UPSTREAM_INDEXER_FAILURE',
          detail: `Failed to validate SAID agents list response: ${parsed.error}`,
        };
      }

      const rawList = parsed.data.data ?? parsed.data.agents ?? (Array.isArray(rawJson) ? rawJson : []);
      const provenance: Provenance = {
        source: 'SAID_PROTOCOL',
        origin: `${this.sourceLabel}:/api/agents`,
        observedAt: new Date().toISOString(),
      };

      const identities: AgentIdentity[] = [];
      for (const item of rawList) {
        const wallet = item.wallet ?? item.walletAddress ?? item.address;
        if (!wallet || !isValidSolanaAddress(wallet)) {
          continue; // Skip invalid or non-Solana wallets
        }

        const verificationStatus: SaidVerificationStatus = item.isVerified || item.verified
          ? 'VERIFIED'
          : 'UNVERIFIED';

        identities.push({
          id: `solana:${wallet}`,
          chain: this.chain,
          walletAddress: wallet,
          name: item.name ?? `Agent ${wallet.slice(0, 4)}..${wallet.slice(-4)}`,
          description: item.description ?? undefined,
          verificationStatus,
          trustTier: item.trustTier ?? undefined,
          saidReputationScore: item.reputationScore ?? undefined,
          skills: Array.isArray(item.skills) ? item.skills : [],
          serviceTypes: Array.isArray(item.serviceTypes) ? item.serviceTypes : [],
          website: item.website ?? undefined,
          mcpEndpoint: item.mcpEndpoint ?? undefined,
          a2aEndpoint: item.a2aEndpoint ?? undefined,
          firstSeenAt: item.createdAt ?? provenance.observedAt,
          lastSyncedAt: provenance.observedAt,
          isMonitored: Boolean(item.mcpEndpoint || item.a2aEndpoint || (item.endpoints && Object.keys(item.endpoints).length > 0)),
          provenance,
        });
      }

      return { ok: true, data: identities };
    } catch (err: unknown) {
      return {
        ok: false,
        reason: 'UPSTREAM_INDEXER_FAILURE',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Fetch specific agent details, verification status, and declared endpoints from SAID.
   */
  async getAgentDetails(walletAddress: string): Promise<
    Ingested<{
      identity: AgentIdentity;
      metadata: AgentMetadata;
      services: AgentService[];
    }>
  > {
    if (!isValidSolanaAddress(walletAddress)) {
      return {
        ok: false,
        reason: 'AGENTPROOF_INTERNAL_ERROR',
        detail: `Invalid Solana wallet address: ${walletAddress}`,
      };
    }

    const agentId = `solana:${walletAddress}`;
    const provenance: Provenance = {
      source: 'SAID_PROTOCOL',
      origin: `${this.sourceLabel}:/api/agents/${walletAddress}`,
      observedAt: new Date().toISOString(),
    };

    try {
      // 1. Fetch agent record
      const agentRes = await this.fetchWithTimeout(`${this.baseUrl}/api/agents/${walletAddress}`);
      let rawAgent: Record<string, unknown> = {};
      if (agentRes.ok) {
        rawAgent = (await agentRes.json()) as Record<string, unknown>;
      }

      // 2. Fetch verification status (free identity endpoint)
      let isVerified = false;
      let verificationStatus: SaidVerificationStatus = 'UNVERIFIED';
      try {
        const verifyRes = await this.fetchWithTimeout(`${this.baseUrl}/api/verify/${walletAddress}`);
        if (verifyRes.ok) {
          const verifyJson = await verifyRes.json();
          const parsedVerify = parseExternal(rawSaidVerifyResponseSchema, verifyJson);
          if (parsedVerify.ok) {
            isVerified = Boolean(parsedVerify.data.verified || parsedVerify.data.isVerified);
            if (isVerified) {
              verificationStatus = 'VERIFIED';
            } else if (parsedVerify.data.status === 'pending') {
              verificationStatus = 'VERIFICATION_PENDING';
            }
          }
        }
      } catch {
        // Continue if verification endpoint is temporarily unreachable
      }

      // 3. Fetch trust tier / reputation score (free trust endpoint)
      let trustTier: string | undefined;
      let reputationScore: number | undefined;
      try {
        const trustRes = await this.fetchWithTimeout(`${this.baseUrl}/api/trust/${walletAddress}`);
        if (trustRes.ok) {
          const trustJson = await trustRes.json();
          const parsedTrust = parseExternal(rawSaidTrustResponseSchema, trustJson);
          if (parsedTrust.ok) {
            trustTier = parsedTrust.data.tier ?? parsedTrust.data.trustTier;
            reputationScore = parsedTrust.data.reputationScore ?? parsedTrust.data.score;
          }
        }
      } catch {
        // Continue if trust endpoint is unreachable
      }

      const parsedAgent = parseExternal(rawSaidAgentSchema, rawAgent);
      const agentData = parsedAgent.ok ? parsedAgent.data : {};

      const name = agentData.name ?? `Agent ${walletAddress.slice(0, 4)}..${walletAddress.slice(-4)}`;
      const services = normalizeSaidServices(agentId, this.chain, agentData, provenance);

      const identity: AgentIdentity = {
        id: agentId,
        chain: this.chain,
        walletAddress,
        name,
        description: agentData.description ?? undefined,
        verificationStatus,
        trustTier: trustTier ?? agentData.trustTier ?? undefined,
        saidReputationScore: reputationScore ?? agentData.reputationScore ?? undefined,
        skills: Array.isArray(agentData.skills) ? agentData.skills : [],
        serviceTypes: Array.isArray(agentData.serviceTypes) ? agentData.serviceTypes : [],
        website: agentData.website ?? undefined,
        mcpEndpoint: agentData.mcpEndpoint ?? undefined,
        a2aEndpoint: agentData.a2aEndpoint ?? undefined,
        firstSeenAt: agentData.createdAt ?? provenance.observedAt,
        lastSyncedAt: provenance.observedAt,
        isMonitored: services.length > 0,
        provenance,
      };

      const metadata: AgentMetadata = {
        agentId,
        name,
        description: agentData.description ?? undefined,
        website: agentData.website ?? undefined,
        skills: identity.skills,
        serviceTypes: identity.serviceTypes,
        mcpEndpoint: identity.mcpEndpoint,
        a2aEndpoint: identity.a2aEndpoint,
        metadataResolved: parsedAgent.ok && Object.keys(agentData).length > 0,
        provenance,
      };

      return {
        ok: true,
        data: {
          identity,
          metadata,
          services,
        },
      };
    } catch (err: unknown) {
      return {
        ok: false,
        reason: 'UPSTREAM_INDEXER_FAILURE',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Run SAID Trust Screen (documented GET /api/screen?wallet=WALLET_ADDRESS).
   * Supports both free data evaluation and paid machine-payable x402 flow.
   */
  async runTrustScreen(walletAddress: string): Promise<Ingested<TrustScreenResult>> {
    if (!isValidSolanaAddress(walletAddress)) {
      return {
        ok: false,
        reason: 'AGENTPROOF_INTERNAL_ERROR',
        detail: `Invalid Solana wallet: ${walletAddress}`,
      };
    }

    const url = `${this.baseUrl}/api/screen?wallet=${encodeURIComponent(walletAddress)}`;
    try {
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        return {
          ok: false,
          reason: 'UPSTREAM_INDEXER_FAILURE',
          detail: `SAID Trust Screen responded with HTTP ${response.status}`,
        };
      }

      const json = await response.json();
      const parsed = parseExternal(rawSaidTrustScreenResponseSchema, json);

      if (!parsed.ok) {
        return {
          ok: false,
          reason: 'UPSTREAM_INDEXER_FAILURE',
          detail: `Failed to validate SAID Trust Screen response: ${parsed.error}`,
        };
      }

      const verdict = (parsed.data.verdict ?? 'review') as 'allow' | 'review' | 'caution';
      return {
        ok: true,
        data: {
          wallet: walletAddress,
          verdict,
          trustScore: parsed.data.score,
          reputationDimensions: parsed.data.dimensions as any,
          checkedAt: new Date().toISOString(),
          paymentMode: 'FREE_DATA',
          rawResponse: typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : undefined,
        },
      };
    } catch (err: unknown) {
      return {
        ok: false,
        reason: 'UPSTREAM_INDEXER_FAILURE',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
