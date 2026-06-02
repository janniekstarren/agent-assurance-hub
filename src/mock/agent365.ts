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

const MICROSOFT_RECORDS: Agent365Record[] = AGENTS.map((a) => {
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

/**
 * Third-party / non-Microsoft agents surfaced via Agent 365. "External
 * partner-built agents" is a first-class GA registry type; Entra Agent ID works
 * cross-platform. Integration paths mirror the documented mechanisms:
 *  - Auto-discovery of agents on Amazon Bedrock / Google Vertex AI (GA)
 *  - Agent factories (n8n) that auto-provision an Entra Agent ID (GA)
 *  - The Agent 365 SDK wrapping OpenAI / Claude / LangChain agents (GA)
 *  - Shadow discovery of unsanctioned local agents via Defender / Intune (preview)
 *  - Announced identity provisioning for ServiceNow / Workday (roadmap)
 * Honesty: visibility != enforcement (governance needs the agent to auth via
 * Entra Agent ID); Salesforce Agentforce is NOT a Microsoft-documented partner.
 */
const EXTERNAL_RECORDS: Agent365Record[] = [
  {
    schemaName: 'ext_bedrockCustomerService',
    agentId: 'ext-bedrock-001',
    displayName: 'Customer Service Assistant',
    entraAgentId: 'b7e3f201-9c4a-4e7d-8a11-2f6c9d0e4471',
    registryStatus: 'registered',
    discoveredVia: 'agent-365',
    riskLevel: 'low',
    riskDetections: [],
    approvalState: 'published',
    owner: 'Daniel Foster',
    governedControls: ['Entra Agent ID', 'Conditional Access', 'Purview DLP'],
    conditionalAccess: true,
    lastSeen: '2026-05-24T15:10:00Z',
    external: true,
    platform: 'Amazon Bedrock (Claude)',
    integrationPath: 'Auto-discovered via the Amazon Bedrock API — no code change',
    statusTag: 'GA',
  },
  {
    schemaName: 'ext_n8nProcurement',
    agentId: 'ext-n8n-002',
    displayName: 'Procurement Automation',
    entraAgentId: '4a91c8d2-1f63-49b0-bb2e-7d5a0c918e34',
    registryStatus: 'registered',
    discoveredVia: 'agent-365',
    riskLevel: 'medium',
    riskDetections: ['Purview DLP: accessed Confidential supplier data'],
    approvalState: 'published',
    owner: 'Hannah Zhou',
    governedControls: ['Entra Agent ID (auto-provisioned)', 'Purview DLP', 'Approval workflow'],
    conditionalAccess: true,
    lastSeen: '2026-05-24T13:40:00Z',
    external: true,
    platform: 'n8n (agent factory)',
    integrationPath: 'Auto-provisioned an Entra Agent ID via the n8n agent factory',
    statusTag: 'GA',
  },
  {
    schemaName: 'ext_langchainKnowledge',
    agentId: 'ext-langchain-003',
    displayName: 'Knowledge Assistant',
    entraAgentId: 'e22d7740-6a8c-4c19-9f3b-1aa4b8c2d590',
    registryStatus: 'registered',
    discoveredVia: 'agent-365',
    riskLevel: 'medium',
    riskDetections: ['Defender: prompt-injection attempt blocked'],
    approvalState: 'published',
    owner: 'Priya Nair',
    governedControls: ['Entra Agent ID', 'OpenTelemetry observability', 'Conditional Access'],
    conditionalAccess: true,
    lastSeen: '2026-05-24T16:05:00Z',
    external: true,
    platform: 'LangChain + Agent 365 SDK',
    integrationPath: 'Wrapped with the Agent 365 SDK for Entra identity + observability',
    statusTag: 'GA',
  },
  {
    schemaName: 'ext_vertexForecasting',
    agentId: 'ext-vertex-004',
    displayName: 'Demand Forecasting Agent',
    entraAgentId: '9c1f3a85-2b47-4e6a-8d72-5f0e9b3c1a26',
    registryStatus: 'registered',
    discoveredVia: 'agent-365',
    riskLevel: 'low',
    riskDetections: [],
    approvalState: 'published',
    owner: 'Hannah Zhou',
    governedControls: ['Entra Agent ID', 'Visible in registry'],
    conditionalAccess: true,
    lastSeen: '2026-05-24T11:20:00Z',
    external: true,
    platform: 'Google Vertex AI',
    integrationPath: 'Auto-discovered via the Google Vertex AI API; observability layered via SDK',
    statusTag: 'GA',
  },
  {
    schemaName: 'ext_openclawShadow',
    agentId: 'ext-openclaw-005',
    displayName: 'OpenClaw (local agent)',
    entraAgentId: '—',
    registryStatus: 'shadow',
    discoveredVia: 'defender',
    riskLevel: 'high',
    riskDetections: [
      'No registry entry, no owner, no Entra Agent ID',
      'Detected on 3 Intune-managed Windows devices; blocked via Intune policy “A365 - Block OpenClaw”',
    ],
    approvalState: 'n/a',
    owner: 'Unknown',
    governedControls: ['Unmanaged — blocked via Intune policy'],
    conditionalAccess: false,
    lastSeen: '2026-05-24T08:55:00Z',
    external: true,
    platform: 'OpenClaw (unsanctioned)',
    integrationPath: 'Discovered by Defender + Intune (Shadow AI)',
    statusTag: 'preview',
  },
  {
    schemaName: 'ext_servicenowItsm',
    agentId: 'ext-servicenow-006',
    displayName: 'IT Service Desk Agent',
    entraAgentId: 'pending',
    registryStatus: 'pending-approval',
    discoveredVia: 'agent-365',
    riskLevel: 'none',
    riskDetections: [],
    approvalState: 'requested',
    owner: 'Sofia Marchetti',
    governedControls: ['Entra Agent ID (announced)'],
    conditionalAccess: false,
    lastSeen: '2026-05-22T09:30:00Z',
    external: true,
    platform: 'ServiceNow AI Platform',
    integrationPath: 'Entra Agent ID provisioning — announced partnership, not yet GA',
    statusTag: 'announced',
  },
];

export const AGENT365_RECORDS: Agent365Record[] = [...MICROSOFT_RECORDS, ...EXTERNAL_RECORDS];

export const REGISTRY_SUMMARY = {
  total: AGENT365_RECORDS.length,
  registered: AGENT365_RECORDS.filter((r) => r.registryStatus === 'registered').length,
  shadow: AGENT365_RECORDS.filter((r) => r.registryStatus === 'shadow').length,
  pendingApproval: AGENT365_RECORDS.filter((r) => r.registryStatus === 'pending-approval').length,
  riskyAgents: AGENT365_RECORDS.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'medium')
    .length,
  external: AGENT365_RECORDS.filter((r) => r.external).length,
};
