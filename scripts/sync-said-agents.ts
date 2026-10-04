/**
 * SAID Protocol Agent Discovery & Synchronization CLI.
 *
 * Fetches verified and registered agents from SAID Protocol on Solana Mainnet,
 * ingests identity, skills, service endpoints (A2A, MCP), and verification status.
 *
 * Usage:
 *   npx tsx scripts/sync-said-agents.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { SaidProtocolAdapter } from '@agentproof/sources';
import { db, agents, services } from '@agentproof/db';
import { eq } from 'drizzle-orm';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function sync() {
  console.log('--- Starting SAID Protocol Agent Discovery & Sync ---');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to persist discovered SAID agents.');
  }

  const adapter = new SaidProtocolAdapter();
  console.log(`Connecting to SAID Protocol at: ${process.env.SAID_API_BASE_URL || 'https://api.saidprotocol.com'}`);

  const listRes = await adapter.listAgents({ limit: 50 });
  if (!listRes.ok) {
    console.error('Failed to list agents from SAID:', listRes.detail);
    process.exit(1);
  }

  const discovered = listRes.data;
  console.log(`Discovered ${discovered.length} agents on Solana.`);

  let syncedCount = 0;
  for (const item of discovered) {
    console.log(`Syncing details for ${item.walletAddress} (${item.name})...`);
    const detailsRes = await adapter.getAgentDetails(item.walletAddress);
    if (!detailsRes.ok) {
      console.warn(`  Warning: Could not fetch full details for ${item.walletAddress}: ${detailsRes.detail}`);
      continue;
    }

    const { identity, metadata, services: serviceList } = detailsRes.data;
    const now = new Date();

    const existing = await db.select().from(agents).where(eq(agents.id, identity.id)).limit(1);

    if (existing.length === 0) {
      await db.insert(agents).values({
        id: identity.id,
        chain: identity.chain,
        walletAddress: identity.walletAddress,
        name: identity.name,
        description: identity.description ?? null,
        verificationStatus: identity.verificationStatus,
        trustTier: identity.trustTier ?? null,
        saidReputationScore: identity.saidReputationScore ?? null,
        skills: JSON.stringify(identity.skills ?? []),
        serviceTypes: JSON.stringify(identity.serviceTypes ?? []),
        website: identity.website ?? null,
        mcpEndpoint: identity.mcpEndpoint ?? null,
        a2aEndpoint: identity.a2aEndpoint ?? null,
        metadataResolved: metadata.metadataResolved,
        isMonitored: serviceList.length > 0,
        provenanceSource: identity.provenance.source,
        provenanceOrigin: identity.provenance.origin,
        firstSeenAt: new Date(identity.firstSeenAt),
        lastSyncedAt: now,
      });
    } else {
      await db
        .update(agents)
        .set({
          name: identity.name,
          description: identity.description ?? null,
          verificationStatus: identity.verificationStatus,
          trustTier: identity.trustTier ?? null,
          saidReputationScore: identity.saidReputationScore ?? null,
          skills: JSON.stringify(identity.skills ?? []),
          serviceTypes: JSON.stringify(identity.serviceTypes ?? []),
          website: identity.website ?? null,
          mcpEndpoint: identity.mcpEndpoint ?? null,
          a2aEndpoint: identity.a2aEndpoint ?? null,
          isMonitored: serviceList.length > 0,
          lastSyncedAt: now,
        })
        .where(eq(agents.id, identity.id));
    }

    for (const svc of serviceList) {
      const existingSvc = await db.select().from(services).where(eq(services.id, svc.id)).limit(1);
      if (existingSvc.length === 0) {
        await db.insert(services).values({
          id: svc.id,
          agentId: svc.agentId,
          chain: svc.chain,
          endpointType: svc.endpointType,
          protocol: svc.protocol,
          url: svc.url,
          enabled: true,
          provenanceSource: svc.provenance.source,
          provenanceOrigin: svc.provenance.origin,
          createdAt: now,
        });
      }
    }

    syncedCount++;
  }

  console.log(`Successfully synchronized ${syncedCount} SAID agents to database.`);
}

sync().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
