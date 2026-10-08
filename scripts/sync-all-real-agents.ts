import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'node:https';
import * as http from 'node:http';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { db, agents, services } from '@agentproof/db';
import { eq } from 'drizzle-orm';
import { executeMonitoringCycle } from '@agentproof/sources';

function customLookup(hostname: string, options: any, cb: any) {
  if (hostname === 'api.saidprotocol.com') {
    if (options && options.all) {
      return cb(null, [{ address: '69.46.46.124', family: 4 }]);
    }
    return cb(null, '69.46.46.124', 4);
  }
  const dns = require('node:dns');
  return dns.lookup(hostname, options, cb);
}

function fetchJson<T = any>(urlStr: string, timeoutMs = 30000): Promise<T> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const client = parsed.protocol === 'http:' ? http : https;
    const req = client.get(
      urlStr,
      {
        headers: {
          'User-Agent': 'AgentProof-Sentinel/0.2.0',
          Accept: 'application/json',
        },
        lookup: customLookup,
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(buf) as T);
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${urlStr}: ${buf.slice(0, 100)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout fetching ${urlStr}`));
    });
  });
}

async function syncAllRealAgents() {
  console.log('========================================================');
  console.log('   AGENTPROOF SENTINEL: REAL AGENT DISCOVERY & PROBE   ');
  console.log('   Protocol: SAID Protocol (Solana Mainnet)            ');
  console.log('========================================================\n');

  console.log('[1/4] Fetching live agents from SAID Protocol registry...');
  const data = await fetchJson('https://api.saidprotocol.com/api/agents?limit=50');
  const rawList = data.agents || [];
  console.log(`Found ${rawList.length} registered agents on SAID.`);

  console.log('\n[2/4] Resolving metadata cards, skills, and advertised endpoints...');
  const resolvedAgents: any[] = [];
  for (const raw of rawList) {
    const wallet = raw.wallet;
    if (!wallet) continue;
    const agentId = `solana:${wallet}`;

    let name = raw.name || `Agent ${wallet.slice(0, 4)}..${wallet.slice(-4)}`;
    let description = raw.description || null;
    let website = raw.website || null;
    let skills: string[] = Array.isArray(raw.skills) ? raw.skills : [];
    let serviceTypes: string[] = Array.isArray(raw.serviceTypes) ? raw.serviceTypes : [];
    let mcpEndpoint = raw.mcpEndpoint || null;
    let a2aEndpoint = raw.a2aEndpoint || null;
    let metadataResolved = false;

    if (raw.metadataUri) {
      try {
        const card = await fetchJson(raw.metadataUri, 3500);
        if (card) {
          if (card.name) name = card.name;
          if (card.description) description = card.description;
          if (card.website) website = card.website;
          if (card.mcpEndpoint) mcpEndpoint = card.mcpEndpoint;
          if (card.a2aEndpoint) a2aEndpoint = card.a2aEndpoint;

          const cardSkills = card.skills || card.capabilities;
          if (Array.isArray(cardSkills) && cardSkills.length > 0) {
            skills = Array.from(new Set([...skills, ...cardSkills]));
          }
          if (Array.isArray(card.serviceTypes) && card.serviceTypes.length > 0) {
            serviceTypes = Array.from(new Set([...serviceTypes, ...card.serviceTypes]));
          }
          metadataResolved = true;
        }
      } catch {
        // Fallback to base on-chain metadata
      }
    }

    const verificationStatus = raw.isVerified ? 'VERIFIED' : 'UNVERIFIED';
    const trustTier =
      raw.trustScore?.tier ||
      (raw.reputation?.tier ? raw.reputation.tier : raw.isVerified ? 'bronze' : null);
    const reputationScore = raw.trustScore?.score ?? raw.reputationScore ?? null;

    resolvedAgents.push({
      agentId,
      wallet,
      name,
      description,
      verificationStatus,
      trustTier,
      reputationScore,
      skills,
      serviceTypes: serviceTypes.length > 0 ? serviceTypes : (website ? ['WEB'] : []),
      website,
      mcpEndpoint,
      a2aEndpoint,
      metadataResolved,
      metadataUri: raw.metadataUri,
      createdAt: raw.createdAt,
    });
  }

  console.log(`Persisting ${resolvedAgents.length} agents into database...`);
  const now = new Date();
  let servicesCreated = 0;

  for (const item of resolvedAgents) {
    const existing = await db.select().from(agents).where(eq(agents.id, item.agentId)).limit(1);
    if (existing.length === 0) {
      await db.insert(agents).values({
        id: item.agentId,
        chain: 'solana',
        walletAddress: item.wallet,
        name: item.name,
        description: item.description,
        verificationStatus: item.verificationStatus,
        trustTier: item.trustTier,
        saidReputationScore: item.reputationScore,
        skills: JSON.stringify(item.skills),
        serviceTypes: JSON.stringify(item.serviceTypes),
        website: item.website,
        mcpEndpoint: item.mcpEndpoint,
        a2aEndpoint: item.a2aEndpoint,
        metadataResolved: item.metadataResolved,
        isMonitored: Boolean(item.website || item.mcpEndpoint || item.a2aEndpoint),
        provenanceSource: 'SAID_PROTOCOL',
        provenanceOrigin: `said-protocol:${item.metadataUri || `/api/agents/${item.wallet}`}`,
        firstSeenAt: item.createdAt ? new Date(item.createdAt) : now,
        lastSyncedAt: now,
      });
    } else {
      await db
        .update(agents)
        .set({
          name: item.name,
          description: item.description,
          verificationStatus: item.verificationStatus,
          trustTier: item.trustTier,
          saidReputationScore: item.reputationScore,
          skills: JSON.stringify(item.skills),
          serviceTypes: JSON.stringify(item.serviceTypes),
          website: item.website,
          mcpEndpoint: item.mcpEndpoint,
          a2aEndpoint: item.a2aEndpoint,
          metadataResolved: item.metadataResolved,
          isMonitored: Boolean(item.website || item.mcpEndpoint || item.a2aEndpoint),
          lastSyncedAt: now,
        })
        .where(eq(agents.id, item.agentId));
    }

    const endpointsToRegister: { type: string; protocol: string; url: string; id: string }[] = [];
    if (item.mcpEndpoint) {
      endpointsToRegister.push({
        id: `${item.agentId}:mcp`,
        type: 'MCP',
        protocol: 'MCP',
        url: item.mcpEndpoint,
      });
    }
    if (item.a2aEndpoint) {
      endpointsToRegister.push({
        id: `${item.agentId}:a2a`,
        type: 'A2A',
        protocol: 'A2A',
        url: item.a2aEndpoint,
      });
    }
    if (item.website && (item.website.startsWith('http://') || item.website.startsWith('https://'))) {
      endpointsToRegister.push({
        id: `${item.agentId}:web`,
        type: 'HTTP',
        protocol: 'HTTP',
        url: item.website,
      });
    }

    for (const ep of endpointsToRegister) {
      const existingSvc = await db.select().from(services).where(eq(services.id, ep.id)).limit(1);
      if (existingSvc.length === 0) {
        await db.insert(services).values({
          id: ep.id,
          agentId: item.agentId,
          chain: 'solana',
          endpointType: ep.type,
          protocol: ep.protocol,
          url: ep.url,
          enabled: true,
          provenanceSource: 'SAID_PROTOCOL',
          provenanceOrigin: `said-protocol:${item.wallet}`,
          createdAt: now,
        });
        servicesCreated++;
      } else {
        await db
          .update(services)
          .set({
            url: ep.url,
            enabled: true,
          })
          .where(eq(services.id, ep.id));
      }
    }
  }

  console.log(`Persisted ${resolvedAgents.length} agents and registered ${servicesCreated} endpoints.`);

  console.log('\n[3/4] Running autonomous probe monitoring cycle across live endpoints...');
  const cycleResult = await executeMonitoringCycle({
    maxAgentsToDiscover: 50,
    concurrency: 10,
    timeoutMs: 6000,
  });

  console.log('\n[4/4] Monitoring Summary:');
  console.log(`  Run ID:                ${cycleResult.runId}`);
  console.log(`  Agents Discovered:     ${cycleResult.agentsDiscovered}`);
  console.log(`  Services Probed:       ${cycleResult.servicesProbed}`);
  console.log(`  Observations Written:  ${cycleResult.observationsRecorded}`);
  console.log(`  Successful Checks:     ${cycleResult.successfulProbes}`);
  console.log(`  Failed Checks:         ${cycleResult.failedProbes}`);
  console.log(`  Incidents Opened:      ${cycleResult.incidentsOpened}`);
  console.log(`  Cycle Duration:        ${(cycleResult.durationMs / 1000).toFixed(2)}s`);
  console.log('\nAll agents are now loaded with 100% real SAID data and live probe telemetry!');
}

syncAllRealAgents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal sync error:', err);
    process.exit(1);
  });
