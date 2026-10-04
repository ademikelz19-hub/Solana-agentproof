import { NextResponse } from 'next/server';
import { db, probeRuns, syncRuns } from '@agentproof/db';
import { SAID_PROGRAM_ID } from '@agentproof/core';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  let latestRunAt: string | null = null;
  let latestSyncAt: string | null = null;
  let freshness: 'FRESH' | 'STALE' | 'UNKNOWN' = 'UNKNOWN';

  try {
    const [latestRun] = await db
      .select({
        id: probeRuns.id,
        finishedAt: probeRuns.finishedAt,
        startedAt: probeRuns.startedAt,
        targetAgentCount: probeRuns.targetAgentCount,
      })
      .from(probeRuns)
      .orderBy(desc(probeRuns.startedAt))
      .limit(1);

    const [latestSync] = await db
      .select({
        id: syncRuns.id,
        finishedAt: syncRuns.finishedAt,
        startedAt: syncRuns.startedAt,
      })
      .from(syncRuns)
      .orderBy(desc(syncRuns.startedAt))
      .limit(1);

    if (latestRun) {
      const runTime = latestRun.finishedAt ?? latestRun.startedAt;
      latestRunAt = runTime.toISOString();
      const ageMs = Date.now() - runTime.getTime();
      freshness = ageMs <= 30 * 60 * 1000 ? 'FRESH' : 'STALE';
    }

    if (latestSync) {
      const syncTime = latestSync.finishedAt ?? latestSync.startedAt;
      latestSyncAt = syncTime.toISOString();
    }
  } catch (err) {
    freshness = 'UNKNOWN';
  }

  return NextResponse.json(
    {
      status: 'ok',
      service: 'agentproof-sentinel',
      network: 'Solana Mainnet',
      saidProgramId: SAID_PROGRAM_ID,
      timestamp,
      version: '0.2.0',
      monitoring: {
        status: 'active',
        latestRunAt,
        latestSyncAt,
        freshness,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
      },
    },
  );
}
