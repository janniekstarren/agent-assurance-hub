/**
 * Agent 365 service.
 *
 * Mirrors the Agent 365 Graph "List packages" / "Get package details" APIs
 * (preview), Entra Agent ID, and Entra ID Protection riskyAgents /
 * agentRiskDetections (beta); shadow-agent discovery via Defender / Intune
 * (preview). This is the registry + security context the Hub pulls in:
 * Agent 365 governs, the Assurance Hub measures.
 */

import type { Agent365Record } from '../types/domain';
import { AGENT365_RECORDS, REGISTRY_SUMMARY } from '../mock/agent365';
import { respond } from './mockApi';

export async function getRegistry(): Promise<Agent365Record[]> {
  return respond(AGENT365_RECORDS, { label: 'agent365.registry' });
}

export async function getRegistrySummary(): Promise<typeof REGISTRY_SUMMARY> {
  return respond(REGISTRY_SUMMARY, { label: 'agent365.summary' });
}
