import { PageShell } from '@/components/PageShell';
import { AgentExplorerTable, type AgentListItem } from '@/components/AgentExplorerTable';
import { db } from '@agentproof/db';
import { sql } from 'drizzle-orm';
import { Activity, ShieldCheck } from 'lucide-react';
import { SAID_PROGRAM_ID } from '@agentproof/core';

export const dynamic = 'force-dynamic';
export const maxDuration = 25;

export default async function AgentsPage() {
  let agentItems: AgentListItem[] = [];
  let fetchError: string | null = null;
  let totalAgentCount: number | undefined;

  try {
    const [countResult, rows] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS total FROM agents`),
      db.execute(sql`
      SELECT
        a.id,
        a.chain,
        a.wallet_address            AS "onchainId",
        a.wallet_address            AS "walletAddress",
        a.name,
        a.description,
        a.metadata_resolved         AS "metadataResolved",
        a.verification_status       AS "saidVerificationStatus",
        a.trust_tier                AS "saidTrustTier",
        a.mcp_endpoint              AS "mcpEndpoint",
        a.a2a_endpoint              AS "a2aEndpoint",
        a.skills,
        a.service_types             AS "serviceTypes",
        a.provenance_source         AS "provenanceSource",
        a.provenance_origin         AS "provenanceOrigin",
        a.last_synced_at            AS "lastSyncedAt",
        COALESCE(
          (SELECT json_agg(json_build_object('id', s.id, 'protocol', s.protocol, 'url', s.url))
           FROM services s WHERE s.agent_id = a.id),
          '[]'
        ) AS services,
        COALESCE(os.total_count, 0)::int   AS "totalCount",
        COALESCE(os.success_count, 0)::int AS "successCount",
        os.latest_outcome                   AS "latestOutcome",
        os.latest_latency                   AS "latestLatencyMs",
        rs.sentinel_score                   AS "sentinelScore"
      FROM agents a
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int                                                     AS total_count,
          COUNT(*) FILTER (WHERE outcome = 'SUCCESS')::int                  AS success_count,
          (ARRAY_AGG(outcome    ORDER BY timestamp DESC))[1]                AS latest_outcome,
          (ARRAY_AGG(latency_ms ORDER BY timestamp DESC NULLS LAST)
             FILTER (WHERE latency_ms IS NOT NULL))[1]                      AS latest_latency
        FROM observations o
        WHERE o.agent_id = a.id
      ) os ON true
      LEFT JOIN LATERAL (
        SELECT sentinel_score
        FROM reliability_snapshots r
        WHERE r.agent_id = a.id
        ORDER BY r.computed_at DESC
        LIMIT 1
      ) rs ON true
      ORDER BY a.last_synced_at DESC
    `),
    ]);

    totalAgentCount = Number((countResult.rows[0] as Record<string, unknown>)?.total ?? 0);

    agentItems = (rows.rows as Record<string, unknown>[]).map((row) => {
      const totalCount = Number(row.totalCount ?? 0);
      const successCount = Number(row.successCount ?? 0);
      const availPct = totalCount > 0 ? (successCount / totalCount) * 100 : null;

      let skills: string[] = [];
      if (Array.isArray(row.skills)) {
        skills = row.skills as string[];
      } else if (typeof row.skills === 'string') {
        try { skills = JSON.parse(row.skills); } catch {}
      }

      let serviceTypes: string[] = [];
      if (Array.isArray(row.serviceTypes)) {
        serviceTypes = row.serviceTypes as string[];
      } else if (typeof row.serviceTypes === 'string') {
        try { serviceTypes = JSON.parse(row.serviceTypes); } catch {}
      }

      return {
        id: String(row.id),
        chain: 'solana',
        onchainId: String(row.onchainId || row.id),
        registryAddress: SAID_PROGRAM_ID,
        walletAddress: row.walletAddress ? String(row.walletAddress) : String(row.onchainId || row.id),
        name: row.name ? String(row.name) : undefined,
        description: row.description ? String(row.description) : undefined,
        metadataResolved: Boolean(row.metadataResolved),
        saidVerificationStatus: (row.saidVerificationStatus as any) ?? 'PENDING',
        saidTrustTier: row.saidTrustTier ? String(row.saidTrustTier) : null,
        mcpEndpoint: row.mcpEndpoint ? String(row.mcpEndpoint) : undefined,
        a2aEndpoint: row.a2aEndpoint ? String(row.a2aEndpoint) : undefined,
        skills,
        serviceTypes,
        services: (Array.isArray(row.services) ? row.services : []) as { id: string; protocol: string; url: string }[],
        isMonitored: totalCount > 0,
        observationCount: totalCount,
        availabilityPct: availPct,
        latestOutcome: row.latestOutcome ? String(row.latestOutcome) : undefined,
        latestLatencyMs: row.latestLatencyMs ? Number(row.latestLatencyMs) : undefined,
        sentinelScore: row.sentinelScore !== null && row.sentinelScore !== undefined ? Number(row.sentinelScore) : null,
        provenance: {
          source: (String(row.provenanceSource || 'SAID_PROTOCOL') as any),
          origin: String(row.provenanceOrigin || SAID_PROGRAM_ID),
          observedAt: row.lastSyncedAt
            ? new Date(String(row.lastSyncedAt)).toISOString()
            : new Date().toISOString(),
        },
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AgentsPage] DB query warning:', message);
    fetchError = message;
  }

  return (
    <PageShell>
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.2rem 0.65rem',
            background: 'var(--accent-solana-subtle)',
            border: '1px solid var(--accent-solana-border)',
            borderRadius: 4,
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-solana)',
            marginBottom: '0.75rem',
          }}
        >
          <Activity size={12} />
          <span>DIRECTORY • SOLANA MAINNET ({totalAgentCount ?? agentItems.length} AGENTS)</span>
        </div>
        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '0.5rem',
            color: 'var(--text-primary)',
          }}
        >
          Solana AI Agents Directory
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: 740, lineHeight: 1.6 }}>
          Explore registered AI agents discovered from the SAID Protocol program (<code className="font-mono" style={{ fontSize: '0.75rem' }}>{SAID_PROGRAM_ID.slice(0, 8)}...</code>).
          View real-world availability, response latency percentiles, SAID verification status, and Sentinel Reliability Scores.
        </p>
      </div>

      {fetchError && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: '#1e293b',
            border: '1px solid var(--border-medium)',
            borderRadius: 6,
            color: 'var(--text-secondary)',
            fontSize: '0.825rem',
            fontFamily: 'var(--font-mono)',
            marginBottom: '1.5rem',
          }}
        >
          ℹ️ Direct database telemetry query pending. Live discovery service ready.
        </div>
      )}

      <AgentExplorerTable agents={agentItems} totalCount={totalAgentCount} />
    </PageShell>
  );
}
