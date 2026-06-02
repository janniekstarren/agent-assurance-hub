/**
 * Tool (function-calling) schemas — the bridge between the assistant and the
 * estate telemetry. Each tool maps to a real query in the production path:
 *
 *   query_inventory   -> Power Platform Inventory API / Azure Resource Graph
 *   query_evaluation  -> Copilot Studio Agent Evaluation API + App Insights KQL
 *   query_safety      -> Purview audit (Office 365 Management Activity API)
 *   query_cost        -> PPAC Copilot credit reports + Azure Cost Management
 *   query_budgets     -> PPAC per-agent budget limits
 *   query_lifecycle   -> Power Platform Pipelines + admin publish gate
 *   query_agent365    -> Agent 365 Graph packages + Entra ID Protection
 *
 * Structured tool-calling over this relational telemetry is preferred to vector
 * RAG: the data is relational (agents x environments x metrics x meters), so a
 * function call with typed arguments returns exact rows, not fuzzy passages.
 * The MockChatProvider simulates this loop locally; the AzureOpenAIChatProvider
 * sends these same schemas to Azure OpenAI / Azure AI Foundry.
 */

export interface ChatTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required?: string[];
    };
  };
}

export const CHAT_TOOLS: ChatTool[] = [
  {
    type: 'function',
    function: {
      name: 'query_inventory',
      description: 'List agents across environments with type, zone, lifecycle and registry state.',
      parameters: {
        type: 'object',
        properties: {
          environment: { type: 'string', description: 'dev | test | prod', enum: ['dev', 'test', 'prod'] },
          lifecycleState: { type: 'string', description: 'draft | in-review | published | retiring' },
          registryStatus: { type: 'string', description: 'registered | shadow | pending-approval' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_evaluation',
      description: 'Groundedness, relevance, confidence and drift events for agents.',
      parameters: {
        type: 'object',
        properties: {
          schemaName: { type: 'string', description: 'Agent lineage key' },
          metric: { type: 'string', description: 'groundedness | confidence | drift' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_safety',
      description: 'Purview safety alerts: oversharing, sensitivity-label-exposed, jailbreak, XPIA.',
      parameters: {
        type: 'object',
        properties: {
          schemaName: { type: 'string', description: 'Agent lineage key' },
          type: { type: 'string', description: 'oversharing | sensitivity-label-exposed | jailbreak-detected | XPIA' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_cost',
      description: 'Copilot credit consumption by agent, feature meter and caller type (billed vs zero-rated).',
      parameters: {
        type: 'object',
        properties: {
          schemaName: { type: 'string', description: 'Agent lineage key' },
          window: { type: 'string', description: 'mtd | 90d' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_budgets',
      description: 'Per-agent monthly caps and run-rate vs cap, with enforcement behaviour.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_lifecycle',
      description: 'Pipeline runs and publish-approval state across environments.',
      parameters: {
        type: 'object',
        properties: {
          state: { type: 'string', description: 'requested | published | rejected' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_agent365',
      description: 'Agent 365 registry, Entra Agent IDs and Entra ID Protection risk signals.',
      parameters: { type: 'object', properties: {} },
    },
  },
];
