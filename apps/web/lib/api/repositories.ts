/**
 * Central repository singleton instances for AgentProof Sentinel web app and API routes.
 */

import { db } from '@agentproof/db';
import {
  DrizzleAgentRepository,
  DrizzleIncidentRepository,
  DrizzleObservationRepository,
  DrizzleSyncRunRepository,
} from '@agentproof/db';
import { SaidProtocolAdapter } from '@agentproof/sources';

export const agentRepository = new DrizzleAgentRepository(db);
export const observationRepository = new DrizzleObservationRepository(db);
export const incidentRepository = new DrizzleIncidentRepository(db);
export const syncRunRepository = new DrizzleSyncRunRepository(db);
export const saidAdapter = new SaidProtocolAdapter();
