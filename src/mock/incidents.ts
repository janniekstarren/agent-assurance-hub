/**
 * Live incidents — the "when an agent breaks, how do we actually know what
 * broke?" story. Each incident carries a correlated evidence chain that
 * distinguishes the failure mode:
 *   - runtime-error      → App Insights exceptions / failing dependencies (it is erroring)
 *   - quality-degradation→ continuous-eval LLM-as-judge groundedness drop (it is answering wrong)
 *   - cost-spike         → App Insights customEvents + PPAC credit run-rate
 * …and correlates each with the change that caused it. Evidence cites the REAL
 * collection methods (Azure Monitor KQL over App Insights; the Power Automate
 * continuous-eval flow scored by an LLM judge in Foundry).
 */

import type { Incident } from '../types/domain';

export const INCIDENTS: Incident[] = [
  {
    id: 'inc-cc-drift',
    schemaName: 'syd_contractChecker',
    agentName: 'Construction Contract Checker',
    environment: 'prod',
    kind: 'quality-degradation',
    status: 'active',
    detectedAt: '2026-05-14T14:05:00+10:00',
    symptom:
      'Contract checks confidently cite the superseded v3 WHS thresholds. The agent is not erroring — it is answering wrong.',
    evidence: [
      {
        source: 'continuous-eval',
        method: 'Continuous evaluation (Power Automate, every 8h) — LLM-as-judge in Azure AI Foundry',
        at: '2026-05-14T14:05:00+10:00',
        finding: 'Groundedness scored 76% (was 92%). 2 of 4 golden questions now fail.',
        detail:
          'The LLM judge flags: "Answer grounds on Compliance Checklists v3; the v4 revision changed the WHS threshold 1.2×→1.5×."',
      },
      {
        source: 'app-insights',
        method: 'Azure Monitor KQL over Application Insights — requests',
        at: '2026-05-14T14:00:00+10:00',
        finding: 'Requests succeed (HTTP 200), p95 latency normal, ZERO exceptions — confirming this is a grounding regression, not a runtime fault.',
        query:
          'requests\n| where cloud_RoleName == "ContractChecker"\n| summarize p95=percentile(duration,95), failRate=avgif(1.0, success=="False") by bin(timestamp,1h)',
      },
      {
        source: 'app-insights',
        method: 'Azure Monitor KQL over Application Insights — dependencies / customEvents',
        at: '2026-05-14T14:00:00+10:00',
        finding: 'Retrieval trace shows the grounding document is now "Compliance Checklists v4", but answers still echo v3 thresholds.',
        query:
          'dependencies\n| where cloud_RoleName == "ContractChecker" and type == "KnowledgeRetrieval"\n| project timestamp, data, resultCode',
      },
      {
        source: 'inventory',
        method: 'Power Platform Inventory API — knowledge-source change',
        at: '2026-05-14T13:45:00+10:00',
        finding: 'Knowledge source "Compliance Checklists" lastChangedAt 13:45 — 20 minutes before the regression. Correlates.',
      },
    ],
    change: 'Compliance Checklists v3 → v4 (14 May 13:45)',
    rootCause:
      'Knowledge-source drift. The Compliance Checklists source was revised to v4; the agent still grounds on the cached v3 thresholds. The runtime is healthy — this is a grounding regression, caught by continuous eval, not by App Insights errors.',
    recommendedAction:
      'Re-index the knowledge source, re-run the golden set, and hold promotion until groundedness recovers to baseline.',
    runbook: [
      'Freeze promotion — block the pipeline gate (already blocked by the regression gate).',
      'Re-index / refresh the Compliance Checklists knowledge source to v4.',
      'Re-run the continuous-eval golden set; confirm groundedness ≥ baseline.',
      'Notify the owner (Liam O’Connor) and close the drift review.',
    ],
  },
  {
    id: 'inc-sn-dependency',
    schemaName: 'syd_snowflakeDataAgent',
    agentName: 'Snowflake Data Agent',
    environment: 'prod',
    kind: 'runtime-error',
    status: 'active',
    detectedAt: '2026-05-24T09:12:00+10:00',
    symptom: 'Intermittent “unable to retrieve data” — ~23% of data questions have failed since 09:10.',
    evidence: [
      {
        source: 'app-insights',
        method: 'Azure Monitor KQL over Application Insights — exceptions',
        at: '2026-05-24T09:11:00+10:00',
        finding: 'Spike of SnowflakeConnectionTimeout exceptions beginning 09:10.',
        query:
          'exceptions\n| where cloud_RoleName == "SnowflakeDataAgent"\n| summarize count() by type, bin(timestamp, 5m)\n| where type == "SnowflakeConnectionTimeout"',
      },
      {
        source: 'app-insights',
        method: 'Azure Monitor KQL over Application Insights — dependencies',
        at: '2026-05-24T09:11:00+10:00',
        finding: 'The dependency call to Snowflake (ANALYTICS) is failing: success=false, duration ~30s (timeout).',
        query:
          'dependencies\n| where target contains "snowflake"\n| where success == false\n| summarize failures=count(), avgDuration=avg(duration) by bin(timestamp,5m)',
      },
      {
        source: 'app-insights',
        method: 'Azure Monitor KQL over Application Insights — requests',
        at: '2026-05-24T09:12:00+10:00',
        finding: 'Failed requests correlate 1:1 with the dependency failures — the agent is not throwing; the downstream is.',
        query:
          'requests\n| where cloud_RoleName == "SnowflakeDataAgent" and success == "False"\n| join kind=inner (dependencies | where success==false) on operation_Id',
      },
      {
        source: 'inventory',
        method: 'Snowflake warehouse state (operational telemetry)',
        at: '2026-05-24T09:08:00+10:00',
        finding: 'The ANALYTICS warehouse auto-suspended at 09:08 (cost-saving) — 2 minutes before the timeouts.',
      },
    ],
    change: 'Snowflake ANALYTICS warehouse auto-suspended (09:08)',
    rootCause:
      'Downstream dependency failure. The Snowflake connector is timing out because the warehouse auto-suspended. The agent itself is healthy — App Insights pinpoints the failing dependency, not the agent.',
    recommendedAction:
      'Resume the warehouse / set a min-cluster, add a connector retry + circuit-breaker, and surface a graceful “data temporarily unavailable” fallback. The agent needs no change.',
    runbook: [
      'Resume the Snowflake ANALYTICS warehouse; set auto-suspend ≥ 10 min or a min-cluster.',
      'Verify the connector service-principal credentials have not expired.',
      'Add retry-with-backoff + circuit-breaker on the Snowflake dependency.',
      'Confirm exception rate returns to zero in App Insights.',
    ],
  },
  {
    id: 'inc-ops-cost',
    schemaName: 'syd_airportOpsCopilot',
    agentName: 'Airport Ops Copilot',
    environment: 'prod',
    kind: 'cost-spike',
    status: 'active',
    detectedAt: '2026-05-23T18:00:00+10:00',
    symptom: 'Credit run-rate jumped ~3× overnight; projected to breach the 40,000-credit cap.',
    evidence: [
      {
        source: 'app-insights',
        method: 'Azure Monitor KQL over Application Insights — customEvents',
        at: '2026-05-23T23:00:00+10:00',
        finding: 'Reasoning-model surcharge events up 3.1× and agent-action volume up 2.4× since 23:00.',
        query:
          'customEvents\n| where cloud_RoleName == "AirportOpsCopilot"\n| where name in ("ReasoningStep","AgentAction","GraphGrounding")\n| summarize count() by name, bin(timestamp,1h)',
      },
      {
        source: 'ppac',
        method: 'Power Platform admin center — Copilot credit report',
        at: '2026-05-24T06:00:00+10:00',
        finding: 'MTD credits at ~129% of the 40,000 cap; reasoning surcharge + Graph grounding are ~64% of spend.',
      },
      {
        source: 'inventory',
        method: 'Trigger / flow telemetry',
        at: '2026-05-23T22:40:00+10:00',
        finding: 'An overnight ops event tripled NOTAM ingestion; the autonomous agent processed each one.',
      },
    ],
    change: 'NOTAM ingestion volume +210% (overnight ops event)',
    rootCause:
      'Autonomous volume × reasoning-model surcharge. An ops event tripled the NOTAM workload; each run invokes the reasoning model + Graph grounding, which dominate credit cost. Nothing is broken — it is working as designed, expensively.',
    recommendedAction:
      'Throttle / batch the NOTAM trigger, move non-critical steps off the reasoning model, and set a per-agent hard stop at the cap.',
    runbook: [
      'Confirm the NOTAM trigger volume in flow telemetry; batch or throttle it.',
      'Route non-critical reasoning steps to a cheaper model tier.',
      'Set a per-agent monthly cap with a hard stop in PPAC.',
      'Notify the owner (Marcus Webb) of the projected overage.',
    ],
  },
];

export const INCIDENT_BY_SCHEMA: Record<string, Incident> = INCIDENTS.reduce(
  (acc, i) => {
    acc[i.schemaName] = i;
    return acc;
  },
  {} as Record<string, Incident>,
);
