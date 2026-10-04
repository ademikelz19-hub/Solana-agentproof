'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { isValidSolanaAddress } from '@agentproof/core';

export function SolanaSearchBar({ placeholder = 'Paste Solana agent wallet address (e.g. 7xKXtg2CW87...)...' }: { placeholder?: string }) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;

    // Check if it starts with 0x (EVM address)
    if (query.startsWith('0x')) {
      setError('Sentinel operates on Solana Mainnet. EVM (0x) addresses are not supported. Please enter a base58 Solana public key.');
      return;
    }

    // If it's a valid Solana address or starts with alphanumeric, navigate to the agent profile
    if (isValidSolanaAddress(query)) {
      setError(null);
      setLoading(true);
      router.push(`/agents/solana/${query}`);
      return;
    }

    // If it's a search term, navigate to directory with query
    router.push(`/agents?search=${encodeURIComponent(query)}`);
  };

  return (
    <div style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
      <form
        onSubmit={handleSearch}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-surface-2)',
          border: error ? '1px solid var(--status-failure-border)' : '1px solid var(--border-medium)',
          borderRadius: 8,
          padding: '0.4rem 0.5rem 0.4rem 1rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        <Search size={18} style={{ color: 'var(--text-muted)', marginRight: '0.75rem', flexShrink: 0 }} />
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn btn-primary"
          style={{
            padding: '0.6rem 1.1rem',
            borderRadius: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 600,
            fontSize: '0.85rem',
            opacity: !input.trim() ? 0.6 : 1,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={15} className="spin" />
              <span>Checking...</span>
            </>
          ) : (
            <>
              <span>Verify &amp; Inspect</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginTop: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            color: 'var(--status-failure)',
            textAlign: 'left',
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Suggested Quick Lookups */}
      <div
        style={{
          marginTop: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
        }}
      >
        <span>Try searching:</span>
        <button
          type="button"
          onClick={() => {
            setInput('5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G');
            setError(null);
          }}
          style={{
            background: 'var(--bg-surface-3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 4,
            padding: '0.2rem 0.5rem',
            color: 'var(--accent-solana)',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            fontSize: '0.72rem',
          }}
        >
          SAID Program Authority
        </button>
        <button
          type="button"
          onClick={() => {
            setInput('Solana');
            setError(null);
          }}
          style={{
            background: 'var(--bg-surface-3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 4,
            padding: '0.2rem 0.5rem',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            fontSize: '0.72rem',
          }}
        >
          Filter by "Solana"
        </button>
      </div>
    </div>
  );
}
