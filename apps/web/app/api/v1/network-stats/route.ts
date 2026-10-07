import { NextResponse } from 'next/server';
import { db, agents, services, observations, incidents, probeRuns } from '@agentproof/db';
import { count, desc, eq, gte, sql } from 'drizzle-orm';
import { SAID_PROGRAM_ID } from '@agentproof/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    const [
      agentCountRes,
      monitoredCountRes,
      serviceCountRes,
      obs24hRes,
      success24hRes,
      activeIncidentsRes,
      latestRunRes,
    ] = await Promise.all([
      db.select({ count: count() }).from(agents),
      db.select({ count: count() }).from(agents).where(eq(agents.isMonitored, true)),
      db.select({ count: count() }).from(services).where(eq(services.enabled, true)),
      db.select({ count: count() }).from(observations).where(gte(observations.timestamp, oneDayAgo)),
      db
        .select({ count: count() })
        .from(observations)
        .where(
          sql`${observations.timestamp} >= ${oneDayAgo} AND ${observations.outcome} = 'SUCCESS'`,
        ),
      db.select({ count: count() }).from(incidents).where(eq(incidents.status, 'OPEN')),
      db.select().from(probeRuns).orderBy(desc(probeRuns.startedAt)).limit(1),
    ]);

    const totalAgents = agentCountRes[0]?.count ?? 0;
    const monitoredAgents = monitoredCountRes[0]?.count ?? 0;
    const activeServices = serviceCountRes[0]?.count ?? 0;
    const checks24h = obs24hRes[0]?.count ?? 0;
    const success24h = success24hRes[0]?.count ?? 0;
    const activeIncidents = activeIncidentsRes[0]?.count ?? 0;
    const latestRun = latestRunRes[0] ?? null;

    const networkUptimePct = checks24h > 0 ? (success24h / checks24h) * 100 : null;

    return NextResponse.json(
      {
        network: 'Solana Mainnet',
        saidProgramId: SAID_PROGRAM_ID,
        stats: {
          totalSaidAgents: totalAgents,
          activelyMonitoredAgents: monitoredAgents,
          activeServices,
          checksCompleted24h: checks24h,
          averageNetworkUptimePct: networkUptimePct !== null ? Number(networkUptimePct.toFixed(1)) : null,
          activeIncidents,
          latestRunAt: latestRun?.finishedAt ?? latestRun?.startedAt ?? null,
        },
        timestamp: now.toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[API /network-stats] Database query fallback:', message);
    return NextResponse.json(
      {
        network: 'Solana Mainnet',
        saidProgramId: SAID_PROGRAM_ID,
        stats: {
          totalSaidAgents: 0,
          activelyMonitoredAgents: 0,
          activeServices: 0,
          checksCompleted24h: 0,
          averageNetworkUptimePct: null,
          activeIncidents: 0,
          latestRunAt: null,
        },
        notice: 'Database telemetry pending connection or initial sync.',
        timestamp: now.toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
}
