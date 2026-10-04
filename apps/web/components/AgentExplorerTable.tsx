'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { CopyButton } from './CopyButton';
import {
  ProtocolBadge,
  ProvenanceBadge,
  MonitoringStatusBadge,
  MetadataStatusBadge,
  SaidVerificationBadge,
  TrustTierBadge,
  SentinelScoreBadge,
} from './Badges';
import type { AgentIdentity, SaidVerificationStatus } from '@agentproof/core';

export interface AgentListItem {
  id: string;
  chain: string;
  onchainId?: string;
  registryAddress?: string;
  walletAddress?: string;
  name?: string | null;
  description?: string | null;
  metadataResolved?: boolean;
  serviceCount?: number;
  services?: { id: string; protocol: string; url: string }[];
  lastIngestedAt?: string | Date;
  isMonitored?: boolean;
  observationCount?: number;
  availabilityPct?: number | null;
  latestOutcome?: string;
  latestLatencyMs?: number;
  saidVerificationStatus?: SaidVerificationStatus | string;
  saidTrustTier?: string | null;
  sentinelScore?: number | null;
  mcpEndpoint?: string;
  a2aEndpoint?: string;
  skills?: string[];
  serviceTypes?: string[];
  provenance?: {
    source: string;
    origin?: string;
    observedAt: string;
  };
}

const PAGE_SIZE = 25;

export function AgentExplorerTable({ agents, totalCount }: { agents: AgentListItem[]; totalCount?: number }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'VERIFIED' | 'WITH_SERVICES' | 'MONITORED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      // Search filter
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        agent.id.toLowerCase().includes(term) ||
        (agent.walletAddress && agent.walletAddress.toLowerCase().includes(term)) ||
        (agent.onchainId && agent.onchainId.toLowerCase().includes(term)) ||
        (agent.name && agent.name.toLowerCase().includes(term)) ||
        (agent.description && agent.description.toLowerCase().includes(term)) ||
        (agent.skills && agent.skills.some((s) => s.toLowerCase().includes(term)));

      if (!matchesSearch) return false;

      // Mode filter
      if (filterMode === 'MONITORED') {
        return agent.isMonitored === true || (agent.observationCount ?? 0) > 0;
      }
      if (filterMode === 'VERIFIED') {
        return agent.saidVerificationStatus === 'VERIFIED';
      }
      if (filterMode === 'WITH_SERVICES') {
        return (agent.serviceCount ?? 0) > 0 || (agent.services && agent.services.length > 0) || agent.mcpEndpoint || agent.a2aEndpoint;
      }
      return true;
    });
  }, [agents, searchTerm, filterMode]);

  // Reset to page 1 whenever filters change
  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedAgents = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return filteredAgents.slice(start, start + PAGE_SIZE);
  }, [filteredAgents, activePage]);

  const monitoredCount = useMemo(() => {
    return agents.filter((a) => a.isMonitored || (a.observationCount ?? 0) > 0).length;
  }, [agents]);

  const verifiedCount = useMemo(() => {
    return agents.filter((a) => a.saidVerificationStatus === 'VERIFIED').length;
  }, [agents]);

  const truncateSolanaKey = (key: string) => {
    if (!key || key.length < 12) return key;
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  return (
    <div>
      {/* Search & Filter Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 300px',
              maxWidth: 480,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            >
              <Search size={15} />
            </div>
            <input
              type="text"
              placeholder="Search by Solana address, name, or skill..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.4rem',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-medium)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setFilterMode('ALL');
                setCurrentPage(1);
              }}
              className={`btn btn-sm ${filterMode === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Agents ({totalCount ?? agents.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('VERIFIED');
                setCurrentPage(1);
              }}
              className={`btn btn-sm ${filterMode === 'VERIFIED' ? 'btn-primary' : 'btn-secondary'}`}
            >
              SAID Verified ({verifiedCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('MONITORED');
                setCurrentPage(1);
              }}
              className={`btn btn-sm ${filterMode === 'MONITORED' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Actively Monitored ({monitoredCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('WITH_SERVICES');
                setCurrentPage(1);
              }}
              className={`btn btn-sm ${filterMode === 'WITH_SERVICES' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Has Endpoints (MCP/A2A)
            </button>
          </div>
        </div>
      </div>

      {/* Results Count & Subheader */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>
          Showing {filteredAgents.length === 0 ? 0 : (activePage - 1) * PAGE_SIZE + 1}–
          {Math.min(activePage * PAGE_SIZE, filteredAgents.length)} of {filteredAgents.length} agents
          {totalCount && totalCount > agents.length && filterMode === 'ALL' && !searchTerm
            ? ` (${totalCount.toLocaleString()} total registered)`
            : null}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="live-pulse" style={{ width: 6, height: 6 }} />
          <span>Solana Mainnet • SAID Program (5dpw6K...)</span>
        </span>
      </div>

      {/* Empty State */}
      {filteredAgents.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>No agents match your filter criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterMode('ALL');
              setCurrentPage(1);
            }}
            className="btn btn-secondary btn-sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-container desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent & Solana Identity</th>
                  <th>SAID Verification</th>
                  <th>Reliability Evidence</th>
                  <th>Declared Endpoints</th>
                  <th>Sentinel Score</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAgents.map((agent) => {
                  const avail = agent.availabilityPct;
                  const solAddress = agent.onchainId || agent.id;

                  return (
                    <tr key={agent.id}>
                      {/* Agent Identity */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <Link
                              href={`/agents/solana/${agent.id}`}
                              style={{
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              <span className="font-mono">{agent.name ?? truncateSolanaKey(solAddress)}</span>
                            </Link>
                            <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {truncateSolanaKey(solAddress)}
                            </span>
                            <CopyButton text={solAddress} label="Copy" />
                          </div>
                          {agent.description && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                maxWidth: 280,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={agent.description}
                            >
                              {agent.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* SAID Verification */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                          <SaidVerificationBadge status={agent.saidVerificationStatus} />
                          {agent.saidTrustTier && <TrustTierBadge tier={agent.saidTrustTier} />}
                        </div>
                      </td>

                      {/* Reliability Evidence */}
                      <td>
                        {avail !== undefined && avail !== null ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span
                                className="font-mono"
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  color: avail >= 95 ? 'var(--status-success)' : avail >= 80 ? 'var(--status-warning)' : 'var(--status-failure)',
                                }}
                              >
                                {avail === 0 ? '0.0% (OFFLINE)' : `${avail.toFixed(1)}% Uptime`}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {agent.latestLatencyMs
                                ? `${agent.latestLatencyMs}ms · ${agent.observationCount} check${agent.observationCount === 1 ? '' : 's'}`
                                : `${agent.observationCount} checks completed`}
                            </span>
                          </div>
                        ) : (!agent.services || agent.services.length === 0) && !agent.mcpEndpoint && !agent.a2aEndpoint ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            NO ENDPOINTS PUBLISHED
                          </span>
                        ) : agent.isMonitored ? (
                          <span className="badge font-mono" style={{ background: 'var(--status-success-bg)', color: 'var(--status-success)', border: '1px solid var(--status-success-border)' }}>
                            <span className="live-pulse" style={{ width: 6, height: 6 }} />
                            <span>MONITORED</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            PENDING FIRST CHECK
                          </span>
                        )}
                      </td>

                      {/* Declared Endpoints */}
                      <td>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {agent.mcpEndpoint && <ProtocolBadge protocol="MCP" />}
                          {agent.a2aEndpoint && <ProtocolBadge protocol="A2A" />}
                          {agent.services &&
                            agent.services
                              .filter((s) => s.protocol !== 'MCP' && s.protocol !== 'A2A')
                              .map((s) => <ProtocolBadge key={s.id} protocol={s.protocol} />)}
                          {!agent.mcpEndpoint && !agent.a2aEndpoint && (!agent.services || agent.services.length === 0) && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>None declared</span>
                          )}
                        </div>
                      </td>

                      {/* Sentinel Score */}
                      <td>
                        <SentinelScoreBadge score={agent.sentinelScore} />
                      </td>

                      {/* Action Links */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <a
                            href={`https://solscan.io/account/${solAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.5rem' }}
                            title="View on Solscan"
                          >
                            <ExternalLink size={12} />
                          </a>
                          <Link
                            href={`/agents/solana/${agent.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.65rem' }}
                          >
                            <span>Inspect</span>
                            <ArrowUpRight size={12} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-only" style={{ flexDirection: 'column', gap: '0.75rem' }}>
            {paginatedAgents.map((agent) => {
              const avail = agent.availabilityPct;
              const solAddress = agent.onchainId || agent.id;

              return (
                <div
                  key={agent.id}
                  className="card"
                  style={{
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <Link
                        href={`/agents/solana/${agent.id}`}
                        style={{
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {agent.name ?? truncateSolanaKey(solAddress)}
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {truncateSolanaKey(solAddress)}
                        </span>
                        <CopyButton text={solAddress} label="Copy" />
                      </div>
                    </div>

                    <SaidVerificationBadge status={agent.saidVerificationStatus} />
                  </div>

                  {agent.description && (
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.4,
                        margin: 0,
                      }}
                    >
                      {agent.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {agent.mcpEndpoint && <ProtocolBadge protocol="MCP" />}
                    {agent.a2aEndpoint && <ProtocolBadge protocol="A2A" />}
                    {avail !== undefined && avail !== null && (
                      <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--status-success)' }}>
                        {avail.toFixed(1)}% Uptime
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/agents/solana/${agent.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <span>View Reliability Passport</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                disabled={activePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary btn-sm"
                style={{ opacity: activePage === 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Page {activePage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary btn-sm"
                style={{ opacity: activePage === totalPages ? 0.5 : 1 }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
