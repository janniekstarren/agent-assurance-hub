/**
 * Overview service.
 *
 * Assembles the estate-health view from the same sources the other modules use:
 * Inventory (agents), Purview audit (alerts), the credit ledger (spend vs
 * budget) and the approval gate. The "needs attention" list is the ranked set
 * of agents driving each story.
 */

import type {
  AttentionItem,
  EstateOverview,
  Environment,
  GovernanceZone,
} from '../types/domain';
import { AGENTS, primaryRecord } from '../mock/agents';
import { ALERTS } from '../mock/alerts';
import { mtdCreditsFor } from '../mock/costLedger';
import { APPROVALS } from '../mock/pipelines';
import { pulseSeries } from '../mock/telemetry';
import { respond } from './mockApi';

function idFor(schemaName: string): string {
  return primaryRecord(schemaName)?.id ?? schemaName;
}

const SEV_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export async function getEstateOverview(): Promise<EstateOverview> {
  const agentsByZone: Record<GovernanceZone, number> = { Z1: 0, Z2: 0, Z3: 0 };
  const agentsByEnvironment: Record<Environment, number> = { dev: 0, test: 0, prod: 0 };
  let weighted = 0;
  let weight = 0;
  let mtdCredits = 0;

  for (const a of AGENTS) {
    agentsByZone[a.zone] += 1;
    agentsByEnvironment[a.environment] += 1;
    const mtd = mtdCreditsFor(a.schemaName, a.environment);
    mtdCredits += mtd;
    const w = mtd + 50;
    weighted += a.assuranceScore * w;
    weight += w;
  }

  const openAlerts = ALERTS.filter(
    (a) => a.status === 'new' || a.status === 'escalated' || a.status === 'acknowledged',
  ).length;

  const pendingApprovals = new Set([
    ...AGENTS.filter((a) => a.registryStatus === 'pending-approval').map((a) => a.schemaName),
    ...APPROVALS.filter((a) => a.state === 'requested').map((a) => a.schemaName),
  ]).size;

  const attention: AttentionItem[] = ([
    {
      schemaName: 'syd_airportOpsCopilot',
      agentId: idFor('syd_airportOpsCopilot'),
      agentName: 'Airport Ops Copilot',
      environment: 'prod',
      reason: 'over-budget',
      detail: '~120% of monthly cap — reasoning surcharge + Graph grounding dominate.',
      severity: 'critical',
      route: '/cost?agent=syd_airportOpsCopilot',
    },
    {
      schemaName: 'syd_snowflakeDataAgent',
      agentId: idFor('syd_snowflakeDataAgent'),
      agentName: 'Snowflake Data Agent',
      environment: 'prod',
      reason: 'leak',
      detail: 'Oversharing of Confidential FINANCE rows + a jailbreak attempt blocked.',
      severity: 'critical',
      route: '/safety?agent=syd_snowflakeDataAgent',
    },
    {
      schemaName: 'syd_contractChecker',
      agentId: idFor('syd_contractChecker'),
      agentName: 'Construction Contract Checker',
      environment: 'prod',
      reason: 'drift',
      detail: 'Groundedness −16 pts after Compliance Checklists v4 (14 May). Regression gate failed.',
      severity: 'high',
      route: '/assurance?agent=syd_contractChecker',
    },
    {
      schemaName: 'syd_invoiceReconciliation',
      agentId: idFor('syd_invoiceReconciliation'),
      agentName: 'Invoice Reconciliation Agent',
      environment: 'prod',
      reason: 'leak',
      detail: 'Shadow agent — unmonitored, autonomous, accessing Confidential financial data.',
      severity: 'high',
      route: '/agent365?agent=syd_invoiceReconciliation',
    },
    {
      schemaName: 'syd_baggageEnquiryBot',
      agentId: idFor('syd_baggageEnquiryBot'),
      agentName: 'Baggage Enquiry Bot',
      environment: 'dev',
      reason: 'pending-approval',
      detail: 'Pending publish approval; confidence-driven handover validated.',
      severity: 'medium',
      route: '/lifecycle?agent=syd_baggageEnquiryBot',
    },
    {
      schemaName: 'syd_securityIncidentTriage',
      agentId: idFor('syd_securityIncidentTriage'),
      agentName: 'Security Incident Triage',
      environment: 'prod',
      reason: 'stale',
      detail: 'Retiring — last published 14 Feb. Plan decommission and reassign volume.',
      severity: 'low',
      route: '/lifecycle?agent=syd_securityIncidentTriage',
    },
  ] as AttentionItem[]).sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);

  return respond(
    {
      totalAgents: AGENTS.length,
      agentsByZone,
      agentsByEnvironment,
      assuranceScore: Math.round(weighted / weight),
      openAlerts,
      pendingApprovals,
      mtdCredits: Math.round(mtdCredits),
      budgetCredits: 85000,
      pulse: pulseSeries(),
      attention,
    },
    { label: 'overview' },
  );
}
