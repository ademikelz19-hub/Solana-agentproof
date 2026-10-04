/**
 * Runtime validation boundary for AgentProof Sentinel.
 *
 * Enforces Solana public key validation and SAID Protocol API schema validation.
 */

import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; raw: unknown };

/**
 * Validates whether a given string is a valid Solana public key on-curve.
 * Rejects EVM (0x) addresses, non-base58 strings, and malformed public keys.
 */
export function isValidSolanaAddress(address: unknown): address is string {
  if (typeof address !== 'string' || address.trim().length === 0) {
    return false;
  }
  const clean = address.trim();
  // Explicitly reject EVM 0x addresses
  if (clean.startsWith('0x') || clean.startsWith('0X')) {
    return false;
  }
  // Solana Base58 public keys are between 32 and 44 characters
  if (clean.length < 32 || clean.length > 44) {
    return false;
  }
  try {
    const pubkey = new PublicKey(clean);
    return PublicKey.isOnCurve(pubkey.toBuffer());
  } catch {
    return false;
  }
}

/**
 * Zod schema for a validated Solana public key.
 */
export const solanaAddressSchema = z
  .string()
  .trim()
  .refine(isValidSolanaAddress, {
    message: 'Invalid Solana public key (must be valid on-curve Base58 address)',
  });

/**
 * Parse `raw` against `schema`. Never throws — external data parsing failures
 * become safe validation results.
 */
export function parseExternal<T>(schema: z.ZodType<T>, raw: unknown): ValidationResult<T> {
  const result = schema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    error: result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; '),
    raw,
  };
}

/**
 * Parse a raw JSON string safely.
 */
export function parseExternalJsonText<T>(
  schema: z.ZodType<T>,
  text: string,
): ValidationResult<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      error: `invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      raw: text,
    };
  }
  return parseExternal(schema, raw);
}

// ---------------------------------------------------------------------------
// SAID Protocol API Schemas
// Documented endpoints:
// - GET /api/agents
// - GET /api/agents/:wallet
// - GET /api/verify/:wallet
// - GET /api/trust/:wallet
// - GET /api/screen?wallet=WALLET_ADDRESS
// ---------------------------------------------------------------------------

export const rawSaidAgentSchema = z
  .object({
    wallet: z.string().optional(),
    walletAddress: z.string().optional(),
    address: z.string().optional(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    isVerified: z.boolean().optional(),
    verified: z.boolean().optional(),
    verificationStatus: z.string().optional(),
    trustTier: z.string().optional(),
    reputationScore: z.number().optional(),
    skills: z.array(z.string()).optional(),
    serviceTypes: z.array(z.string()).optional(),
    website: z.string().nullable().optional(),
    mcpEndpoint: z.string().nullable().optional(),
    a2aEndpoint: z.string().nullable().optional(),
    endpoints: z.record(z.string(), z.string()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type RawSaidAgent = z.infer<typeof rawSaidAgentSchema>;

export const rawSaidAgentsListResponseSchema = z
  .object({
    success: z.boolean().optional(),
    data: z.array(rawSaidAgentSchema).optional(),
    agents: z.array(rawSaidAgentSchema).optional(),
    pagination: z
      .object({
        page: z.number().optional(),
        limit: z.number().optional(),
        total: z.number().optional(),
        hasMore: z.boolean().optional(),
        nextCursor: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

export const rawSaidVerifyResponseSchema = z
  .object({
    verified: z.boolean().optional(),
    isVerified: z.boolean().optional(),
    status: z.string().optional(),
    wallet: z.string().optional(),
    tier: z.string().optional(),
    registeredAt: z.string().optional(),
    badgeUrl: z.string().optional(),
  })
  .passthrough();

export const rawSaidTrustResponseSchema = z
  .object({
    wallet: z.string().optional(),
    tier: z.string().optional(),
    trustTier: z.string().optional(),
    reputationScore: z.number().optional(),
    score: z.number().optional(),
    eigenTrust: z.number().optional(),
    reviewCount: z.number().optional(),
    positivePercentage: z.number().optional(),
  })
  .passthrough();

export const rawSaidTrustScreenResponseSchema = z
  .object({
    wallet: z.string().optional(),
    verdict: z.enum(['allow', 'review', 'caution']).or(z.string()).optional(),
    score: z.number().optional(),
    dimensions: z
      .object({
        reliability: z.number().optional(),
        transactionCount: z.number().optional(),
        disputeRate: z.number().optional(),
        tenureDays: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
