import { NextRequest, NextResponse } from 'next/server';
import { executeMonitoringCycle } from '@agentproof/sources';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max duration for monitoring cycle

export async function GET(req: NextRequest) {
  return handleMonitor(req);
}

export async function POST(req: NextRequest) {
  return handleMonitor(req);
}

async function handleMonitor(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // Protect route if CRON_SECRET is configured
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    const urlSecret = req.nextUrl.searchParams.get('secret');
    const bearerSecret = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (bearerSecret !== cronSecret && urlSecret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing CRON_SECRET' },
        { status: 401 },
      );
    }
  }

  try {
    const result = await executeMonitoringCycle({
      maxAgentsToDiscover: 20,
      concurrency: 10,
    });

    return NextResponse.json({
      status: 'success',
      service: 'agentproof-sentinel',
      network: 'Solana Mainnet',
      result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API /cron/monitor] Execution error:', message);
    return NextResponse.json(
      {
        status: 'error',
        error: message,
      },
      { status: 500 },
    );
  }
}
