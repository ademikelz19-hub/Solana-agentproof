-- Migration: 0001_solana_sentinel_migration.sql
-- Upgrades AgentProof to AgentProof Sentinel for Solana Mainnet & SAID Protocol

-- 1. Alter agents table for Solana & SAID Protocol
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "wallet_address" text;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "trust_tier" text;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "said_reputation_score" real;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "skills" text;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "service_types" text;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "website" text;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "mcp_endpoint" text;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "a2a_endpoint" text;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "is_monitored" boolean NOT NULL DEFAULT false;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone DEFAULT now();

-- Allow existing onchain_id column to be nullable for pure Solana key rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'onchain_id'
  ) THEN
    ALTER TABLE "agents" ALTER COLUMN "onchain_id" DROP NOT NULL;
  END IF;
END $$;

-- Populate wallet_address from onchain_id or id if not populated
UPDATE "agents" SET "wallet_address" = REPLACE("id", 'solana:', '') WHERE "wallet_address" IS NULL;

-- Create indexes for Solana agent queries
CREATE UNIQUE INDEX IF NOT EXISTS "agents_wallet_unique" ON "agents" ("wallet_address");
CREATE INDEX IF NOT EXISTS "agents_verified_idx" ON "agents" ("verification_status");

-- 2. Alter services table for MCP, A2A, and endpoint monitoring
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "endpoint_type" text NOT NULL DEFAULT 'SERVICE';
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "enabled" boolean NOT NULL DEFAULT true;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "first_monitored_at" timestamp with time zone;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "last_monitored_at" timestamp with time zone;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "failure_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "last_success_at" timestamp with time zone;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'services' AND column_name = 'declaration_form'
  ) THEN
    ALTER TABLE "services" ALTER COLUMN "declaration_form" DROP NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "services_enabled_idx" ON "services" ("enabled");

-- 3. Create incidents table
CREATE TABLE IF NOT EXISTS "incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"service_id" text,
	"status" text NOT NULL DEFAULT 'OPEN',
	"started_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"duration_seconds" integer,
	"failure_reason" text NOT NULL,
	"consecutive_failures" integer NOT NULL DEFAULT 1,
	"recovery_observed_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "incidents_agent_idx" ON "incidents" ("agent_id");
CREATE INDEX IF NOT EXISTS "incidents_status_idx" ON "incidents" ("status");

-- 4. Create sync_runs table
CREATE TABLE IF NOT EXISTS "sync_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"agents_discovered" integer NOT NULL DEFAULT 0,
	"agents_updated" integer NOT NULL DEFAULT 0,
	"services_registered" integer NOT NULL DEFAULT 0,
	"status" text NOT NULL,
	"error_message" text
);

-- 5. Create trust_screen_snapshots table
CREATE TABLE IF NOT EXISTS "trust_screen_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"verdict" text NOT NULL,
	"trust_score" real,
	"eigen_trust_score" real,
	"dimensions" text,
	"payment_mode" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "trust_screen_wallet_idx" ON "trust_screen_snapshots" ("wallet");

-- 6. Add Sentinel score columns to reliability_snapshots
ALTER TABLE "reliability_snapshots" ADD COLUMN IF NOT EXISTS "sentinel_score" real;
ALTER TABLE "reliability_snapshots" ADD COLUMN IF NOT EXISTS "average_latency_ms" integer;
