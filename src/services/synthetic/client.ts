/**
 * Synthetic API — THE single swap point.
 *
 * Each method mirrors a real Microsoft endpoint and returns the REAL response
 * ENVELOPE shape, backed by the local mock fixtures. The services parse these
 * envelopes exactly as they would parse a live response, so swapping to real
 * data is a contained change: replace a method body with a real `fetch()` to
 * the documented URL (auth via the SWA managed function / Entra). The services
 * and UI never change.
 *
 * Why this helps with "fake or impossible" data: the envelope enforces the real
 * field names and shapes, so the UI can only render what a real endpoint could
 * actually return. A signal that has no real source (e.g. groundedness for an
 * un-instrumented agent) comes back empty/absent here too — the gap is
 * structural, not hand-waved.
 *
 * Worked examples wired through this client: Azure Resource Graph (inventory)
 * and Log Analytics KQL (the live pulse). The remaining methods expose the same
 * surface and are wired identically.
 */

import type { Channel, KnowledgeSource } from '../../types/domain';
import { AGENTS, observabilityFor } from '../../mock/agents';
import { pulseSeries } from '../../mock/telemetry';
import { latestEvalRun } from '../../mock/evalRuns';
import { costRecords } from '../../mock/costLedger';
import { ALERTS } from '../../mock/alerts';

// ---------------------------------------------------------------------------
// Real response envelope shapes
// ---------------------------------------------------------------------------

/** Azure Resource Graph — POST /providers/Microsoft.ResourceGraph/resources. */
export interface ResourceGraphResponse<T> {
  totalRecords: number;
  count: number;
  resultTruncated: 'true' | 'false';
  data: T[];
}

/** Azure Monitor Logs / Application Insights query — { tables: [{columns,rows}] }. */
export interface LogAnalyticsColumn {
  name: string;
  type: string;
}
export interface LogAnalyticsTable {
  name: string;
  columns: LogAnalyticsColumn[];
  rows: (string | number | boolean | null)[][];
}
export interface LogAnalyticsResponse {
  tables: LogAnalyticsTable[];
}

/** Dataverse Web API / Microsoft Graph — OData collection. */
export interface ODataCollection<T> {
  '@odata.context'?: string;
  value: T[];
  '@odata.nextLink'?: string;
}

/** Azure Cost Management query — { properties: { columns, rows } }. */
export interface CostManagementResponse {
  properties: {
    columns: { name: string; type: string }[];
    rows: (string | number)[][];
  };
}

/** Inventory API row (Resource Graph projection of microsoft.copilotstudio/agents). */
export interface InventoryAgentRow {
  id: string;
  name: string;
  type: string;
  properties: {
    botId: string;
    schemaName: string;
    displayName: string;
    environmentId: string;
    environmentName: 'dev' | 'test' | 'prod';
    ownerId: string;
    ownerDisplayName: string;
    ownerEmail: string;
    lastPublishedAt: string | null;
    createdOn: string;
    entraAgentId: string;
    orchestration: string;
    model: string;
    channels: Channel[];
    knowledgeSources: KnowledgeSource[];
    isManaged: boolean;
    isQuarantined: boolean;
    registryStatus: string;
    governanceZone: string;
    agentType: string;
    description: string;
    assuranceScore: number;
    mtdCredits: number;
    lifecycleState: string;
    tags: string[];
  };
}

// ---------------------------------------------------------------------------
// Azure Resource Graph — agent inventory
// ---------------------------------------------------------------------------

export const resourceGraph = {
  /**
   * LIVE: POST https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2022-10-01
   * body: { query: "PowerPlatformResources | where type == 'microsoft.copilotstudio/agents'
   *                 | join kind=inner (PowerPlatformResources | where type == 'microsoft.powerplatform/environments') on ..." }
   */
  async queryAgents(): Promise<ResourceGraphResponse<InventoryAgentRow>> {
    const data = AGENTS.map(
      (a): InventoryAgentRow => ({
        id: `/providers/Microsoft.PowerPlatform/environments/env-${a.environment}/agents/${a.id}`,
        name: a.id,
        type:
          a.type === 'copilot-studio'
            ? 'microsoft.copilotstudio/agents'
            : 'microsoft.azureaifoundry/agents',
        properties: {
          botId: a.id,
          schemaName: a.schemaName,
          displayName: a.displayName,
          environmentId: `env-${a.environment}`,
          environmentName: a.environment,
          ownerId: a.owner.id,
          ownerDisplayName: a.owner.displayName,
          ownerEmail: a.owner.email,
          lastPublishedAt: a.lastPublishedAt,
          createdOn: a.createdAt,
          entraAgentId: a.entraAgentId,
          orchestration: a.orchestration,
          model: a.model,
          channels: a.channels,
          knowledgeSources: a.knowledgeSources,
          isManaged: a.isManaged,
          isQuarantined: a.isQuarantined,
          registryStatus: a.registryStatus,
          governanceZone: a.zone,
          agentType: a.type,
          description: a.description,
          assuranceScore: a.assuranceScore,
          mtdCredits: a.mtdCredits,
          lifecycleState: a.lifecycleState,
          tags: a.tags,
        },
      }),
    );
    return { totalRecords: data.length, count: data.length, resultTruncated: 'false', data };
  },
};

// ---------------------------------------------------------------------------
// Azure Monitor Logs / Application Insights — KQL
// ---------------------------------------------------------------------------

export const logAnalytics = {
  /**
   * LIVE: POST https://api.loganalytics.io/v1/workspaces/{id}/query  (body: { query })
   * or the App Insights query API. Returns { tables: [{ columns, rows }] }.
   * The synthetic client recognises a few canonical queries used by the app.
   */
  async query(kql: string): Promise<LogAnalyticsResponse> {
    if (/requests|customEvents/.test(kql) && /bin\(/.test(kql)) {
      // estate "pulse" — interactions per interval
      const rows = pulseSeries().map((p) => [p.date, p.value] as (string | number)[]);
      return {
        tables: [
          {
            name: 'PrimaryResult',
            columns: [
              { name: 'timestamp', type: 'datetime' },
              { name: 'count_', type: 'long' },
            ],
            rows,
          },
        ],
      };
    }
    return { tables: [{ name: 'PrimaryResult', columns: [], rows: [] }] };
  },
};

// ---------------------------------------------------------------------------
// Office 365 Management Activity API — Purview audit (safety)
// ---------------------------------------------------------------------------

/** Management Activity audit record (Audit.AI content type). Metadata only —
 *  never raw prompt text (that is a separate eDiscovery path). */
export interface ManagementActivityRecord {
  Id: string;
  CreationTime: string;
  Operation: string;
  Workload: string;
  RecordType: number;
  AppId: string;
  AppName: string;
  EnvironmentName: string;
  AlertType: string;
  Severity: string;
  Status: string;
  AccessedResource: string;
  SensitivityLabel?: string;
  JailbreakDetected?: boolean;
  XPIADetected?: boolean;
  CallerType: string;
  Summary: string;
  ExtendedProperties: Record<string, string>;
}

export const managementActivity = {
  /**
   * LIVE: GET .../api/v1.0/{tenant}/activity/feed/subscriptions/content?contentType=Audit.AI
   * then GET each content blob URI. Surfaces CopilotInteraction / AIAppInteraction
   * audit records — metadata, sensitivity labels and Jailbreak/XPIA flags only.
   */
  async feed(): Promise<{ contentType: string; records: ManagementActivityRecord[] }> {
    const records = ALERTS.map(
      (a): ManagementActivityRecord => ({
        Id: a.id,
        CreationTime: a.timestamp,
        Operation: a.callerType === 'Microsoft' ? 'AIAppInteraction' : 'AICopilotInteraction',
        Workload: 'CopilotStudio',
        RecordType: 261,
        AppId: a.agentId,
        AppName: a.agentName,
        EnvironmentName: a.environment,
        AlertType: a.type,
        Severity: a.severity,
        Status: a.status,
        AccessedResource: a.accessedResource,
        SensitivityLabel: a.sensitivityLabel,
        JailbreakDetected: a.jailbreakDetected,
        XPIADetected: a.xpiaDetected,
        CallerType: a.callerType,
        Summary: a.summary,
        // ExtendedProperties is a free-form bag; schemaName lets the reader
        // resolve the logical agent without a separate inventory join.
        ExtendedProperties: { ...a.metadata, schemaName: a.schemaName },
      }),
    );
    return { contentType: 'Audit.AI', records };
  },
};

// ---------------------------------------------------------------------------
// Dataverse Web API — evaluation runs (written by the continuous-eval flow)
// ---------------------------------------------------------------------------

/** Dataverse row for the cr_evaluationrun table. The Power Automate
 *  continuous-eval flow writes one row per run; test-case detail is a JSON
 *  column (a common flow pattern), deserialised on read. */
export interface EvaluationRunRow {
  cr_evaluationrunid: string;
  cr_schemaname: string;
  cr_environment: string;
  cr_ranat: string;
  cr_baselinerunid: string | null;
  cr_gatestatus: string;
  cr_groundedness: number;
  cr_relevance: number;
  cr_completeness: number;
  cr_abstention: number;
  cr_regression_passed: number | null;
  cr_regression_failed: number | null;
  cr_regression_total: number | null;
  cr_regression_vsbaseline: number | null;
  cr_testcasesjson: string;
}

export const dataverse = {
  /**
   * LIVE: GET https://{org}.crm.dynamics.com/api/data/v9.2/cr_evaluationruns
   *       ?$orderby=cr_ranat desc&$filter=...  (OData; one row per latest run).
   * Only agents with App Insights + a configured eval suite emit runs.
   */
  async listEvaluationRuns(): Promise<ODataCollection<EvaluationRunRow>> {
    const value: EvaluationRunRow[] = [];
    for (const a of AGENTS) {
      if (!observabilityFor(a.schemaName).evaluation) continue;
      const run = latestEvalRun(a.schemaName, a.environment);
      value.push({
        cr_evaluationrunid: run.id,
        cr_schemaname: run.schemaName,
        cr_environment: run.environment,
        cr_ranat: run.ranAt,
        cr_baselinerunid: run.baselineRunId ?? null,
        cr_gatestatus: run.gateStatus,
        cr_groundedness: run.metrics.groundedness,
        cr_relevance: run.metrics.relevance,
        cr_completeness: run.metrics.completeness,
        cr_abstention: run.metrics.abstention,
        cr_regression_passed: run.regression?.passed ?? null,
        cr_regression_failed: run.regression?.failed ?? null,
        cr_regression_total: run.regression?.total ?? null,
        cr_regression_vsbaseline: run.regression?.vsBaseline ?? null,
        cr_testcasesjson: JSON.stringify(run.testCases),
      });
    }
    return {
      '@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#cr_evaluationruns',
      value,
    };
  },
};

// ---------------------------------------------------------------------------
// Azure Cost Management + PPAC — credit ledger
// ---------------------------------------------------------------------------

export const costManagement = {
  /**
   * LIVE: POST https://management.azure.com/.../providers/Microsoft.CostManagement/query?api-version=2023-11-01
   * for billed $, plus the Power Platform admin center Copilot credit report
   * (per environment / agent / caller type, daily). Returned as a columns+rows table.
   */
  async queryCreditLedger(): Promise<CostManagementResponse> {
    const columns = [
      { name: 'UsageDate', type: 'String' },
      { name: 'AgentSchema', type: 'String' },
      { name: 'AgentId', type: 'String' },
      { name: 'Environment', type: 'String' },
      { name: 'Feature', type: 'String' },
      { name: 'CallerType', type: 'String' },
      { name: 'Units', type: 'Number' },
      { name: 'Credits', type: 'Number' },
      { name: 'Billed', type: 'Number' },
    ];
    const rows: (string | number)[][] = costRecords().map((r) => [
      r.date,
      r.schemaName,
      r.agentId,
      r.environment,
      r.feature,
      r.callerType,
      r.units,
      r.credits,
      r.billed ? 1 : 0,
    ]);
    return { properties: { columns, rows } };
  },
};
