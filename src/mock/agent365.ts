/**
 * Agent 365 registry + security context.
 *
 * Mirrors the Agent 365 Graph "List packages" / "Get package details" APIs
 * (preview) joined to Entra Agent ID and Entra ID Protection riskyAgents /
 * agentRiskDetections (beta). Shadow agents are surfaced via Defender / Intune
 * discovery (preview). This is the context the Hub PULLS IN — Agent 365
 * governs; the Assurance Hub measures.
 */

import type { Agent365Record, RiskLevel } from '../types/domain';
import { AGENTS } from './agents';

const RISK: Record<string, { level: RiskLevel; detections: string[] }> = {
  syd_invoiceReconciliation: {
    level: 'high',
    detections: [
      'Shadow agent — running outside the registry on its own identity',
      'Anomalous sign-in pattern for the agent identity',
      'Accessed Confidential financial data without DLP scope',
    ],
  },
  syd_snowflakeDataAgent: {
    level: 'medium',
    detections: ['Oversharing of Confidential rows', 'Jailbreak attempt against the agent'],
  },
  syd_airportOpsCopilot: {
    level: 'medium',
    detections: ['Autonomous identity with broad action scope', 'XPIA attempt via ingested NOTAM'],
  },
  syd_baggageEnquiryBot: {
    level: 'low',
    detections: ['Public channel exposure pending approval'],
  },
};

function controlsFor(schemaName: string, registered: boolean): string[] {
  if (!registered) return ['Unmanaged — no Conditional Access, no DLP, no approval'];
  const base = ['Entra Agent ID', 'Conditional Access', 'Purview DLP', 'Approval workflow'];
  if (schemaName === 'syd_airportOpsCopilot' || schemaName === 'syd_groundCrewScheduler') {
    base.push('Agent action scoping');
  }
  return base;
}

export const AGENT365_RECORDS: Agent365Record[] = AGENTS.map((a) => {
  const registered = a.registryStatus !== 'shadow';
  const risk = RISK[a.schemaName];
  return {
    schemaName: a.schemaName,
    agentId: a.id,
    displayName: a.displayName,
    entraAgentId: a.entraAgentId,
    registryStatus: a.registryStatus,
    discoveredVia: a.registryStatus === 'shadow' ? 'defender' : 'agent-365',
    riskLevel: risk?.level ?? 'none',
    riskDetections: risk?.detections ?? [],
    approvalState:
      a.registryStatus === 'pending-approval'
        ? 'requested'
        : a.lifecycleState === 'published'
          ? 'published'
          : 'n/a',
    owner: a.owner.displayName,
    governedControls: controlsFor(a.schemaName, registered),
    conditionalAccess: registered,
    lastSeen: a.environment === 'prod' ? '2026-05-24T16:40:00Z' : '2026-05-23T10:00:00Z',
  };
});

export const REGISTRY_SUMMARY = {
  total: AGENT365_RECORDS.length,
  registered: AGENT365_RECORDS.filter((r) => r.registryStatus === 'registered').length,
  shadow: AGENT365_RECORDS.filter((r) => r.registryStatus === 'shadow').length,
  pendingApproval: AGENT365_RECORDS.filter((r) => r.registryStatus === 'pending-approval').length,
  riskyAgents: AGENT365_RECORDS.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'medium')
    .length,
};
