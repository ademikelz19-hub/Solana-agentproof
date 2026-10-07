'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Activity, Code, BookOpen, Award, Menu, X } from 'lucide-react';
import { GithubIcon } from './Icons';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/agents', label: 'Explore Agents', icon: Activity },
    { href: '/grant-demo', label: 'Grant Demo', icon: Award },
    { href: '/methodology', label: 'Methodology', icon: BookOpen },
    { href: '/developers', label: 'Developers & API', icon: Code },
  ];

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(7, 9, 14, 0.88)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand & Network Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontWeight: 800,
              fontSize: '1.15rem',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #14f195 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#050811',
                boxShadow: '0 0 16px rgba(20, 241, 149, 0.35)',
              }}
            >
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ lineHeight: 1.1 }}>AgentProof <span style={{ color: '#14f195' }}>Sentinel</span></span>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>
                FOR SAID PROTOCOL
              </span>
            </div>
          </Link>

          <div
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.65rem',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 9999,
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
            }}
            className="network-tag"
          >
            <span className="live-pulse-solana" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Solana Mainnet</span>
            <span style={{ color: 'var(--text-muted)' }}>• Active Probing</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-surface-2)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--border-medium)' : 'transparent'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} color={isActive ? 'var(--accent-solana)' : 'var(--text-muted)'} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 0.5rem' }} />

          <a
            href="https://github.com/ademikelz19-hub/Solana-agentproof"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.75rem',
              borderRadius: 6,
              fontSize: '0.825rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
            }}
            title="View Source on GitHub"
          >
            <GithubIcon size={14} />
            <span>GitHub</span>
          </a>
        </nav>

        {/* Mobile Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
          className="mobile-toggle"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface-1)',
            padding: '1rem 1.5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: 'var(--bg-surface-2)',
              borderRadius: 6,
              fontSize: '0.8rem',
              marginBottom: '0.5rem',
            }}
          >
            <span className="live-pulse-solana" />
            <span>Solana Mainnet (SAID Protocol) • Active Probing</span>
          </div>

          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem',
                  borderRadius: 6,
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-surface-2)' : 'transparent',
                }}
              >
                <Icon size={16} color={isActive ? 'var(--accent-solana)' : 'var(--text-muted)'} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .network-tag {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
