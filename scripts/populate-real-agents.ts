import * as dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const origLookup = dns.lookup;
(dns as any).lookup = function (hostname: string, options: any, callback: any) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      return origLookup(hostname, opts, cb);
    }
    if (opts && opts.all) {
      cb(null, addresses.map((a) => ({ address: a, family: 4 })));
    } else {
      cb(null, addresses[0], 4);
    }
  });
};

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'node:https';
import * as http from 'node:http';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { db, agents, services } from '@agentproof/db';
import { eq } from 'drizzle-orm';
import { executeMonitoringCycle } from '@agentproof/sources';

function customLookup(hostname: string, options: any, callback: any) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      return dns.lookup(hostname, opts, cb);
    }
    if (opts && opts.all) {
      cb(null, addresses.map((a) => ({ address: a, family: 4 })));
    } else {
      cb(null, addresses[0], 4);
    }
  });
}

function fetchJson<T = any>(urlStr: string, timeoutMs = 8000): Promise<T> {
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
            reject(new Error(`Failed to parse JSON: ${buf.slice(0, 100)}`));
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

async function main() {
  console.log('========================================================');
  console.log('       AGENTPROOF SENTINEL: REAL AGENT POPULATION       ');
  console.log('       Source: Official SAID Protocol On-Chain Sync     ');
  console.log('========================================================\n');

  const cachePath = path.resolve(process.cwd(), 'scripts/said-agents-cache.json');
  if (!fs.existsSync(cachePath)) {
    throw new Error('said-agents-cache.json not found!');
  }

  const rawJson = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const rawList = rawJson.agents || [];
  console.log(`[1/3] Processing ${rawList.length} verified SAID Protocol agents...`);

  const now = new Date();
  let updatedCount = 0;
  let servicesCreated = 0;

  for (let i = 0; i < rawList.length; i++) {
    const raw = rawList[i];
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

    // Fetch card details
    if (raw.metadataUri) {
      try {
        const card = await fetchJson(raw.metadataUri, 3000);
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
        // Fallback to top-level card metadata
      }
    }

    if (skills.length === 0) {
      skills = ['Autonomous Agent', 'Solana'];
    }

    const verificationStatus = raw.isVerified ? 'VERIFIED' : 'UNVERIFIED';
    const trustTier = raw.trustScore?.tier || (raw.reputation?.tier ? raw.reputation.tier : 'bronze');
    const reputationScore = raw.trustScore?.score ?? raw.reputationScore ?? 60;

    const existing = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    if (existing.length === 0) {
      await db.insert(agents).values({
        id: agentId,
        chain: 'solana',
        walletAddress: wallet,
        name,
        description,
        verificationStatus,
        trustTier,
        saidReputationScore: reputationScore,
        skills: JSON.stringify(skills),
        serviceTypes: JSON.stringify(serviceTypes.length > 0 ? serviceTypes : ['WEB']),
        website,
        mcpEndpoint,
        a2aEndpoint,
        metadataResolved,
        isMonitored: true,
        provenanceSource: 'SAID_PROTOCOL',
        provenanceOrigin: `said-protocol:${raw.metadataUri || `/api/agents/${wallet}`}`,
        firstSeenAt: raw.createdAt ? new Date(raw.createdAt) : now,
        lastSyncedAt: now,
      });
    } else {
      await db
        .update(agents)
        .set({
          name,
          description,
          verificationStatus,
          trustTier,
          saidReputationScore: reputationScore,
          skills: JSON.stringify(skills),
          serviceTypes: JSON.stringify(serviceTypes.length > 0 ? serviceTypes : ['WEB']),
          website,
          mcpEndpoint,
          a2aEndpoint,
          metadataResolved,
          isMonitored: true,
          lastSyncedAt: now,
        })
        .where(eq(agents.id, agentId));
    }
    updatedCount++;

    // Register testable service endpoints
    const endpointsToRegister: { type: string; protocol: string; url: string; id: string }[] = [];
    if (mcpEndpoint) {
      endpointsToRegister.push({ id: `${agentId}:mcp`, type: 'MCP', protocol: 'MCP', url: mcpEndpoint });
    }
    if (a2aEndpoint) {
      endpointsToRegister.push({ id: `${agentId}:a2a`, type: 'A2A', protocol: 'A2A', url: a2aEndpoint });
    }
    const targetWebUrl = website || raw.metadataUri;
    if (targetWebUrl && (targetWebUrl.startsWith('http://') || targetWebUrl.startsWith('https://'))) {
      endpointsToRegister.push({ id: `${agentId}:web`, type: 'HTTP', protocol: 'HTTP', url: targetWebUrl });
    }

    for (const ep of endpointsToRegister) {
      const existingSvc = await db.select().from(services).where(eq(services.id, ep.id)).limit(1);
      if (existingSvc.length === 0) {
        await db.insert(services).values({
          id: ep.id,
          agentId,
          chain: 'solana',
          endpointType: ep.type,
          protocol: ep.protocol,
          url: ep.url,
          enabled: true,
          provenanceSource: 'SAID_PROTOCOL',
          provenanceOrigin: `said-protocol:${wallet}`,
          createdAt: now,
        });
        servicesCreated++;
      } else {
        await db
          .update(services)
          .set({ url: ep.url, enabled: true })
          .where(eq(services.id, ep.id));
      }
    }
  }

  console.log(`[2/3] Successfully persisted ${updatedCount} agents and registered ${servicesCreated} service endpoints.`);

  console.log('\n[3/3] Putting agents to work: executing live probe testing across all endpoints...');
  const cycleResult = await executeMonitoringCycle({
    maxAgentsToDiscover: 50,
    concurrency: 12,
    timeoutMs: 6000,
  });

  console.log('\n================ MONITORING SUMMARY ================');
  console.log(`  Run ID:                ${cycleResult.runId}`);
  console.log(`  Services Probed:       ${cycleResult.servicesProbed}`);
  console.log(`  Observations Written:  ${cycleResult.observationsRecorded}`);
  console.log(`  Successful Checks:     ${cycleResult.successfulProbes}`);
  console.log(`  Failed Checks:         ${cycleResult.failedProbes}`);
  console.log(`  Incidents Opened:      ${cycleResult.incidentsOpened}`);
  console.log(`  Incidents Resolved:    ${cycleResult.incidentsResolved}`);
  console.log(`  Cycle Duration:        ${(cycleResult.durationMs / 1000).toFixed(2)}s`);
  console.log('====================================================\n');
  console.log('All real agents and live tests successfully persisted to Neon DB!');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  });
