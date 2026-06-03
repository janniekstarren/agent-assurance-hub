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
import { AGENTS } from '../../mock/agents';
import { pulseSeries } from '../../mock/telemetry';
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
// The rest of the surface — same pattern, wired identically when going live.
// ---------------------------------------------------------------------------

export const managementActivity = {
  /** LIVE: GET .../api/v1.0/{tenant}/activity/feed/subscriptions/content?contentType=Audit.AI */
  async feed(): Promise<{ contentType: string; records: typeof ALERTS }> {
    return { contentType: 'Audit.AI', records: ALERTS };
  },
};

export const dataverse = {
  /** LIVE: GET https://{org}.crm.dynamics.com/api/data/v9.2/{entitySet}?$filter=... (OData). */
  async list<T>(entitySet: string, value: T[]): Promise<ODataCollection<T>> {
    return { '@odata.context': `https://org.crm.dynamics.com/api/data/v9.2/$metadata#${entitySet}`, value };
  },
};

export const costManagement = {
  /** LIVE: POST https://management.azure.com/.../providers/Microsoft.CostManagement/query?api-version=2023-11-01 */
  async query(columns: { name: string; type: string }[], rows: (string | number)[][]): Promise<CostManagementResponse> {
    return { properties: { columns, rows } };
  },
};
