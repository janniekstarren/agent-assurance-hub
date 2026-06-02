/**
 * Safety alert stream.
 *
 * Mirrors Purview audit `CopilotInteraction` / `AIAppInteraction` events pulled
 * via the Office 365 Management Activity API. Critically, these records carry
 * METADATA + sensitivity labels + JailbreakDetected / XPIADetected flags — NOT
 * raw prompt text (raw content is a separate eDiscovery path). The UI states
 * this explicitly so the demo is technically honest.
 */

import type { Environment, SafetyAlert } from '../types/domain';
import { AGENTS } from './agents';
import { DEMO_NOW } from './seed';

function findAgent(schemaName: string, env: Environment) {
  return AGENTS.find((a) => a.schemaName === schemaName && a.environment === env);
}

function tsAgo(hours: number): string {
  return new Date(DEMO_NOW.getTime() - hours * 3600_000).toISOString();
}

let seq = 0;
function alert(
  schemaName: string,
  env: Environment,
  partial: Omit<
    SafetyAlert,
    'id' | 'schemaName' | 'agentId' | 'agentName' | 'environment'
  >,
): SafetyAlert {
  const a = findAgent(schemaName, env);
  seq += 1;
  return {
    id: `alert-${String(seq).padStart(3, '0')}`,
    schemaName,
    agentId: a?.id ?? `${schemaName}-${env}`,
    agentName: a?.displayName ?? schemaName,
    environment: env,
    ...partial,
  };
}

export const ALERTS: SafetyAlert[] = [
  // --- Snowflake Data Agent (Prod) — the data-leak headline ---------------
  alert('syd_snowflakeDataAgent', 'prod', {
    type: 'jailbreak-detected',
    severity: 'critical',
    status: 'escalated',
    timestamp: tsAgo(6),
    accessedResource: 'Snowflake FINANCE.LEASE_ACCOUNTS',
    sensitivityLabel: 'Confidential',
    jailbreakDetected: true,
    callerType: 'Non-licensed user',
    summary:
      'Prompt-injection attempt to bypass row-level security and return all tenant lease balances. Classifier flagged JailbreakDetected; response was blocked.',
    metadata: {
      classifier: 'JailbreakDetected',
      action: 'blocked',
      channel: 'web',
      rowsRequested: '> 5000',
      policy: 'RLS-FINANCE',
    },
  }),
  alert('syd_snowflakeDataAgent', 'prod', {
    type: 'oversharing',
    severity: 'high',
    status: 'new',
    timestamp: tsAgo(20),
    accessedResource: 'Snowflake FINANCE.LEASE_ACCOUNTS (top 10)',
    sensitivityLabel: 'Confidential',
    callerType: 'User',
    summary:
      'Returned Confidential-labelled FINANCE rows (tenant names + outstanding balances) to a broad audience that should only see aggregates.',
    metadata: {
      classifier: 'Oversharing',
      labelExposed: 'Confidential',
      audience: 'All staff',
      recommended: 'Aggregate-only',
    },
  }),
  alert('syd_snowflakeDataAgent', 'prod', {
    type: 'sensitivity-label-exposed',
    severity: 'high',
    status: 'acknowledged',
    timestamp: tsAgo(33),
    accessedResource: 'Commercial SharePoint / Lease Schedule.xlsx',
    sensitivityLabel: 'Confidential',
    callerType: 'User',
    summary:
      'A Confidential-labelled commercial workbook was surfaced in a response without honouring the label’s access scope.',
    metadata: { classifier: 'SensitivityLabelExposed', labelExposed: 'Confidential' },
  }),
  alert('syd_snowflakeDataAgent', 'prod', {
    type: 'oversharing',
    severity: 'medium',
    status: 'new',
    timestamp: tsAgo(54),
    accessedResource: 'Snowflake ANALYTICS.RETAIL_REVENUE',
    sensitivityLabel: 'General',
    callerType: 'User',
    summary: 'Response included outlet-level detail beyond the requested aggregate.',
    metadata: { classifier: 'Oversharing', audience: 'Commercial team' },
  }),

  // --- Invoice Reconciliation (Prod, shadow) — XPIA via document ----------
  alert('syd_invoiceReconciliation', 'prod', {
    type: 'XPIA',
    severity: 'high',
    status: 'new',
    timestamp: tsAgo(11),
    accessedResource: 'AP Documents / invoice_88241.pdf',
    sensitivityLabel: 'General',
    xpiaDetected: true,
    callerType: 'Application',
    summary:
      'Cross-prompt injection (XPIA) embedded in a supplier invoice attempted to redirect the autonomous agent to approve a payment. Flagged XPIADetected.',
    metadata: {
      classifier: 'XPIADetected',
      vector: 'document',
      autonomous: 'true',
      registry: 'shadow',
    },
  }),
  alert('syd_invoiceReconciliation', 'prod', {
    type: 'oversharing',
    severity: 'medium',
    status: 'new',
    timestamp: tsAgo(40),
    accessedResource: 'Finance (Dataverse) / supplier_master',
    sensitivityLabel: 'Confidential',
    callerType: 'Application',
    summary:
      'Unmonitored shadow agent accessed Confidential supplier banking fields during reconciliation.',
    metadata: { classifier: 'Oversharing', registry: 'shadow', governance: 'none' },
  }),

  // --- Contract Checker (Prod) -------------------------------------------
  alert('syd_contractChecker', 'prod', {
    type: 'sensitivity-label-exposed',
    severity: 'medium',
    status: 'acknowledged',
    timestamp: tsAgo(72),
    accessedResource: 'Capital Works / D&C Contract — Pier B.docx',
    sensitivityLabel: 'Commercial-in-Confidence',
    callerType: 'User',
    summary:
      'A Commercial-in-Confidence contract clause was quoted in a Teams channel beyond the contract’s reader group.',
    metadata: { classifier: 'SensitivityLabelExposed', labelExposed: 'Commercial-in-Confidence' },
  }),

  // --- Baggage Enquiry Bot (Dev) — attempted jailbreak, blocked ----------
  alert('syd_baggageEnquiryBot', 'dev', {
    type: 'jailbreak-detected',
    severity: 'low',
    status: 'suppressed',
    timestamp: tsAgo(96),
    accessedResource: 'Baggage Policies (SharePoint)',
    sensitivityLabel: 'General',
    jailbreakDetected: true,
    callerType: 'Non-licensed user',
    summary:
      'Public tester attempted to coax the bot into ignoring its instructions. Detected and blocked; no sensitive data in scope.',
    metadata: { classifier: 'JailbreakDetected', action: 'blocked', environment: 'dev' },
  }),

  // --- Snowflake (Test) — minor -------------------------------------------
  alert('syd_snowflakeDataAgent', 'test', {
    type: 'oversharing',
    severity: 'low',
    status: 'resolved',
    timestamp: tsAgo(120),
    accessedResource: 'Snowflake ANALYTICS.RETAIL_REVENUE',
    sensitivityLabel: 'General',
    callerType: 'User',
    summary: 'Test-environment oversharing of outlet detail; fixed by tightening the system prompt.',
    metadata: { classifier: 'Oversharing', environment: 'test', resolution: 'prompt-hardening' },
  }),

  // --- A couple more for heatmap density ----------------------------------
  alert('syd_airportOpsCopilot', 'prod', {
    type: 'XPIA',
    severity: 'medium',
    status: 'acknowledged',
    timestamp: tsAgo(150),
    accessedResource: 'Ops Runbooks (Azure AI Search)',
    sensitivityLabel: 'General',
    xpiaDetected: true,
    callerType: 'Application',
    summary:
      'Injected instruction in an ingested NOTAM attempted to alter a reallocation flow; detected and ignored.',
    metadata: { classifier: 'XPIADetected', vector: 'document', action: 'ignored' },
  }),
  alert('syd_invoiceReconciliation', 'prod', {
    type: 'sensitivity-label-exposed',
    severity: 'medium',
    status: 'new',
    timestamp: tsAgo(165),
    accessedResource: 'AP Documents / remittance_advice.pdf',
    sensitivityLabel: 'Confidential',
    callerType: 'Application',
    summary: 'Confidential remittance detail surfaced to an unscoped finance distribution list.',
    metadata: { classifier: 'SensitivityLabelExposed', registry: 'shadow' },
  }),
  alert('syd_snowflakeDataAgent', 'prod', {
    type: 'oversharing',
    severity: 'medium',
    status: 'acknowledged',
    timestamp: tsAgo(200),
    accessedResource: 'Snowflake FINANCE.TENANT_ARREARS',
    sensitivityLabel: 'Confidential',
    callerType: 'User',
    summary: 'Arrears detail shared with a user outside the finance reader group.',
    metadata: { classifier: 'Oversharing', labelExposed: 'Confidential' },
  }),
];

export const ALERT_TYPES_ORDER = [
  'jailbreak-detected',
  'XPIA',
  'oversharing',
  'sensitivity-label-exposed',
] as const;
