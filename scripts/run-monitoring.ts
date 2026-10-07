/**
 * Autonomous Monitoring CLI Runner for AgentProof Sentinel.
 *
 * Runs a complete monitoring cycle on Solana Mainnet:
 * - SAID Protocol agent discovery
 * - Service & endpoint probing (MCP, A2A, HTTP)
 * - Threshold-based incident tracking
 * - Reliability snapshot & Sentinel Reliability Score generation
 *
 * Usage:
 *   npx tsx scripts/run-monitoring.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { executeMonitoringCycle } from '@agentproof/sources';

// Load environment configuration from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  console.log('====================================================');
  console.log('       AGENTPROOF SENTINEL: AUTONOMOUS MONITOR      ');
  console.log('       Network: Solana Mainnet                     ');
  console.log('       Protocol: SAID Protocol                     ');
  console.log('====================================================');

  if (!process.env.DATABASE_URL) {
    console.warn('[Sentinel Monitor] ⚠️ DATABASE_URL is not set in environment or GitHub Secrets.');
    console.warn('To enable autonomous monitoring via GitHub Actions or locally, configure DATABASE_URL:');
    console.warn('  - On GitHub: Settings -> Secrets and variables -> Actions -> New repository secret -> DATABASE_URL');
    console.warn('  - Locally: Add DATABASE_URL to your .env.local file');
    process.exit(0);
  }

  const result = await executeMonitoringCycle({
    maxAgentsToDiscover: 25,
    concurrency: 10,
    timeoutMs: Number(process.env.MONITOR_TIMEOUT_MS ?? 8000),
  });

  console.log('\n================ MONITORING SUMMARY ================');
  console.log(`  Run ID:                ${result.runId}`);
  console.log(`  Agents Discovered:     ${result.agentsDiscovered}`);
  console.log(`  Services Probed:       ${result.servicesProbed}`);
  console.log(`  Observations Written:  ${result.observationsRecorded}`);
  console.log(`  Successful Checks:     ${result.successfulProbes}`);
  console.log(`  Failed Checks:         ${result.failedProbes}`);
  console.log(`  Incidents Opened:      ${result.incidentsOpened}`);
  console.log(`  Incidents Resolved:    ${result.incidentsResolved}`);
  console.log(`  Cycle Duration:        ${(result.durationMs / 1000).toFixed(2)}s`);
  console.log(`  Finished At:           ${result.finishedAt}`);
  console.log('====================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('[Sentinel Monitor] Fatal execution error:', err);
  process.exit(1);
});
