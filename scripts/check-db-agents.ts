import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { db, agents, services, observations } from '@agentproof/db';

async function main() {
  const allAgents = await db.select().from(agents).limit(10);
  console.log('Current DB agents count limit 10:');
  for (const a of allAgents) {
    console.log({
      id: a.id,
      name: a.name,
      wallet: a.walletAddress,
      skills: a.skills,
      mcp: a.mcpEndpoint,
      a2a: a.a2aEndpoint,
      website: a.website,
      isMonitored: a.isMonitored,
    });
  }

  const allServices = await db.select().from(services);
  console.log('\nServices count:', allServices.length);
  for (const s of allServices.slice(0, 10)) {
    console.log(s);
  }

  const allObs = await db.select().from(observations).limit(5);
  console.log('\nObservations count (limit 5):', allObs.length);
  for (const o of allObs) {
    console.log({
      id: o.id,
      agentId: o.agentId,
      probeType: o.probeType,
      outcome: o.outcome,
      latencyMs: o.latencyMs,
      timestamp: o.timestamp,
    });
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
