import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'AgentProof Sentinel — Reliability Intelligence for AI Agents on Solana',
  description:
    'Identity tells you who an agent is. Sentinel shows whether it is actually delivering. Autonomous operational reliability layer for SAID Protocol AI agents on Solana.',
  keywords:
    'AgentProof Sentinel, SAID Protocol, Solana, AI Agents, Autonomous Agents, Solana AI, Reliability Intelligence, MCP, A2A, Uptime',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport = {
  themeColor: '#060911',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
