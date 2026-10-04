import type { NextRequest } from 'next/server';
import { db, agents } from '@agentproof/db';
import { apiError } from '@/lib/api/response';
import { parsePagination } from '@/lib/api/pagination';
import { normalizeChain } from '@/lib/api/agent-params';
import { SAID_PROGRAM_ID } from '@agentproof/core';
import { and, desc, eq, ilike, lt, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pagination = parsePagination(searchParams);
  if (!pagination.ok) {
    return apiError('VALIDATION_ERROR', pagination.error);
  }

  const chainParam = searchParams.get('chain') ?? undefined;
  const normalizedChain = chainParam ? normalizeChain(chainParam) : undefined;
  if (chainParam && !normalizedChain) {
    return apiError('VALIDATION_ERROR', `Unsupported chain: ${chainParam}. Supported chains: solana (Solana Mainnet)`);
  }

  const verifiedOnly = searchParams.get('verifiedOnly') === 'true';
  const monitoredOnly = searchParams.get('monitoredOnly') === 'true';
  const searchQuery = searchParams.get('q') ?? searchParams.get('search');

  const conditions = [
    normalizedChain ? eq(agents.chain, normalizedChain) : undefined,
    verifiedOnly ? eq(agents.verificationStatus, 'VERIFIED') : undefined,
    monitoredOnly ? eq(agents.isMonitored, true) : undefined,
    pagination.value.cursor ? lt(agents.id, pagination.value.cursor) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  if (searchQuery && searchQuery.trim().length > 0) {
    const q = `%${searchQuery.trim()}%`;
    conditions.push(
      or(
        ilike(agents.name, q),
        ilike(agents.walletAddress, q),
        ilike(agents.description, q),
      )!,
    );
  }

  const limit = pagination.value.limit;
  const rows = await db
    .select()
    .from(agents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(agents.lastSyncedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id : undefined;

  const enrichedItems = pageRows.map((r) => {
    let skills: string[] = [];
    let serviceTypes: string[] = [];
    try {
      if (r.skills) skills = JSON.parse(r.skills);
      if (r.serviceTypes) serviceTypes = JSON.parse(r.serviceTypes);
    } catch {
      // ignore
    }

    return {
      id: r.id,
      chain: r.chain,
      walletAddress: r.walletAddress,
      saidProgramId: SAID_PROGRAM_ID,
      name: r.name ?? `Agent ${r.walletAddress.slice(0, 4)}..${r.walletAddress.slice(-4)}`,
      description: r.description ?? null,
      verificationStatus: r.verificationStatus,
      trustTier: r.trustTier ?? null,
      saidReputationScore: r.saidReputationScore ?? null,
      skills,
      serviceTypes,
      website: r.website ?? null,
      mcpEndpoint: r.mcpEndpoint ?? null,
      a2aEndpoint: r.a2aEndpoint ?? null,
      isMonitored: r.isMonitored,
      solscanUrl: `https://solscan.io/account/${r.walletAddress}`,
      firstSeenAt: r.firstSeenAt ? new Date(r.firstSeenAt).toISOString() : new Date().toISOString(),
      lastSyncedAt: r.lastSyncedAt ? new Date(r.lastSyncedAt).toISOString() : new Date().toISOString(),
      provenance: {
        source: r.provenanceSource,
        origin: r.provenanceOrigin,
        observedAt: r.lastSyncedAt ? new Date(r.lastSyncedAt).toISOString() : new Date().toISOString(),
      },
    };
  });

  const generatedAt = new Date().toISOString();

  return NextResponse.json(
    {
      success: true,
      network: 'Solana Mainnet',
      saidProgramId: SAID_PROGRAM_ID,
      data: enrichedItems,
      items: enrichedItems,
      pagination: {
        limit,
        nextCursor,
        hasMore,
      },
      generatedAt,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
        'Cache-Control': 'public, max-age=10, s-maxage=30, stale-while-revalidate=30',
      },
    },
  );
}
