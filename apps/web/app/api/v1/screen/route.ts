import { NextRequest, NextResponse } from 'next/server';
import { isValidSolanaAddress } from '@agentproof/core';
import { saidAdapter } from '@/lib/api/repositories';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')?.trim();

  if (!wallet) {
    return NextResponse.json(
      { error: 'Missing required "wallet" parameter' },
      { status: 400 },
    );
  }

  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json(
      { error: `Invalid Solana public key: ${wallet}` },
      { status: 400 },
    );
  }

  const isX402Enabled = process.env.ENABLE_X402 === 'true';
  const hasServerPaymentKey = Boolean(process.env.SENTINEL_SERVER_PAYMENT_KEY);

  // Default mode: x402 disabled or baseline trust evaluation
  try {
    const screenResult = await saidAdapter.runTrustScreen(wallet);

    if (!screenResult.ok) {
      return NextResponse.json(
        {
          error: 'SAID Trust Screen lookup failed',
          detail: screenResult.detail,
          x402Status: isX402Enabled ? 'ENABLED' : 'DISABLED',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      wallet,
      network: 'Solana Mainnet',
      result: screenResult.data,
      x402: {
        enabled: isX402Enabled,
        configured: isX402Enabled && hasServerPaymentKey,
        mode: isX402Enabled && hasServerPaymentKey ? 'X402_SVM' : 'FREE_DATA',
        notice: isX402Enabled
          ? hasServerPaymentKey
            ? 'Server-side x402 SVM payment wallet active.'
            : 'ENABLE_X402 is true, but SENTINEL_SERVER_PAYMENT_KEY is not configured with USDC funds.'
          : 'Machine-payable x402 SVM settlement is disabled (ENABLE_X402=false). Routine verification uses free identity and trust endpoints.',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: 'Unexpected error running SAID Trust Screen',
        detail: message,
      },
      { status: 500 },
    );
  }
}
