/**
 * Data-source coverage matrix — the honesty centrepiece. Each signal the Hub
 * shows, mapped to its real Microsoft source, GA/preview/beta status, and how
 * complete the coverage actually is. Observability is NOT uniform: quality
 * signals require instrumentation + evaluation; SharePoint/declarative agents
 * and shadow agents are governance-metadata-only or nothing.
 */

import type { CollectionMethod, SignalCoverage } from '../types/domain';

/**
 * How the signals are actually collected — the real pipeline and its hard
 * limits. Grounds the demo in the team's actual tooling rather than implying a
 * magic feed.
 */
export const COLLECTION_METHODS: CollectionMethod[] = [
  {
    name: 'Functional / regression testing',
    tool: 'Agent CLI (Python)',
    purpose: 'Scripted prompts assert expected behaviour and answers.',
    feeds: 'Golden questions · smoke tests',
    status: 'in-use',
  },
  {
    name: 'Load / stress testing',
    tool: 'Apache JMeter (multi-thread)',
    purpose: 'Drives concurrency + throughput; surfaces failures under load.',
    feeds: 'Performance · runtime errors (captured in App Insights)',
    status: 'in-use',
  },
  {
    name: 'Quality scoring',
    tool: 'LLM-as-a-judge (Azure AI Foundry evaluators)',
    purpose: 'An LLM grades groundedness / relevance against reference answers.',
    feeds: 'Groundedness · golden-question pass/fail',
    status: 'in-use',
  },
  {
    name: 'Continuous evaluation',
    tool: 'Power Automate recurrence → Copilot Studio agent',
    purpose: 'Triggers the agent every 8 hours against the golden set; writes results to Dataverse. (Microsoft-recommended pattern.)',
    feeds: 'Eval-over-time · drift detection',
    status: 'in-use',
    constraint:
      'Hard limits: 1 test running at a time, 20 tests per day. That is precisely why cadence is ~8h, not real-time — it caps how often and how broadly you can re-evaluate.',
  },
  {
    name: 'Runtime observability',
    tool: 'Azure Application Insights + Azure Monitor Logs (KQL)',
    purpose:
      'KQL pulls all OpenTelemetry (requests / dependencies / exceptions / customEvents) into a table surfaced INSIDE the Power Platform solution — one location, no trip to Azure for business users.',
    feeds: 'Runtime telemetry · exceptions · dependency health · cost events',
    status: 'in-use',
    constraint:
      'Opt-in per agent; only what the runtime emits. Foundry agents via OpenTelemetry; SharePoint / declarative agents emit little to nothing.',
  },
  {
    name: 'AI gateway control + metrics',
    tool: 'Azure API Management (GenAI gateway)',
    purpose:
      'Fronts the model endpoints for Foundry / custom / MCP agents: emits per-consumer token metrics to App Insights (llm-emit-token-metric), logs prompts + completions to Azure Monitor, and enforces token quotas + inline Content Safety (llm-token-limit, llm-content-safety).',
    feeds: 'Token-level cost · prompt/completion logs · inline content safety · circuit-breaker health',
    status: 'recommended',
    constraint:
      "Only sees traffic routed through it — Foundry / custom-code / BYO-model / MCP agents. Copilot Studio + SharePoint agents call models via Microsoft's managed orchestrator, which does not traverse your gateway, so their internal model usage stays opaque. Foundry AI-gateway integration + unified model API are preview; capability set varies by APIM tier.",
  },
];

export const SIGNAL_COVERAGE: SignalCoverage[] = [
  {
    signal: 'Agent inventory',
    route: '/agents',
    source: 'Power Platform Inventory API / Azure Resource Graph',
    status: 'GA',
    coverage: 'full',
    caveat:
      'Excludes classic PVA v1 bots; not available in sovereign clouds. isManaged / isQuarantined fields are preview.',
  },
  {
    signal: 'Accuracy & groundedness',
    route: '/assurance',
    source: 'Copilot Studio Agent Evaluation API',
    status: 'preview',
    coverage: 'requires-instrumentation',
    caveat:
      'Only for agents with a configured golden set + scheduled eval runs. Not emitted passively. Classic-NLU agents are out of scope.',
  },
  {
    signal: 'Confidence',
    route: '/assurance',
    source: 'App Insights custom events (generative) / recognition score (classic NLU)',
    status: 'preview',
    coverage: 'requires-instrumentation',
    caveat:
      'Generative confidence is NOT a native Copilot Studio API — it is derived from instrumented events. Classic NLU exposes recognition confidence directly.',
  },
  {
    signal: 'Drift detection',
    route: '/assurance',
    source: 'Agent Evaluation runs compared over time',
    status: 'preview',
    coverage: 'requires-instrumentation',
    caveat: 'Requires repeated evals against a stable golden set. Same coverage as accuracy.',
  },
  {
    signal: 'Runtime telemetry',
    route: '/assurance',
    source: 'Application Insights requests / customEvents via Log Analytics KQL',
    status: 'GA',
    coverage: 'requires-instrumentation',
    caveat:
      'Opt-in per agent; only what the runtime emits. Foundry agents via OpenTelemetry; SharePoint / declarative agents are a black box here.',
  },
  {
    signal: 'Conversation content',
    route: '/safety',
    source: 'Dataverse conversationtranscript / eDiscovery',
    status: 'GA',
    coverage: 'partial',
    caveat:
      '30-day default retention; JSON content only; not all agent types. Raw prompt text is an eDiscovery-only path.',
  },
  {
    signal: 'Safety & data-leak',
    route: '/safety',
    source: 'Purview audit (Office 365 Management Activity API)',
    status: 'GA',
    coverage: 'metadata-only',
    caveat:
      'Metadata + sensitivity labels + Jailbreak / XPIA flags — NOT raw text. Non-Microsoft-channel agents need Purview pay-as-you-go to be captured.',
  },
  {
    signal: 'Inline content safety',
    route: '/safety',
    source: 'APIM AI gateway — llm-content-safety (Azure AI Content Safety)',
    status: 'GA',
    coverage: 'requires-instrumentation',
    caveat:
      'Moderates prompts BEFORE the model call — prevention, not just Purview detection after the fact. Gateway-routed agents only (Foundry / custom / MCP); Copilot Studio relies on its built-in moderation + Purview audit.',
  },
  {
    signal: 'Cost & credits',
    route: '/cost',
    source: 'PPAC Copilot credit reports + Azure Cost Management',
    status: 'GA',
    coverage: 'partial',
    caveat:
      'PPAC is per-agent / per-environment but daily-aggregated; Azure Cost Management is coarse with no per-agent breakdown.',
  },
  {
    signal: 'Token-level cost telemetry',
    route: '/cost',
    source: 'APIM AI gateway — llm-emit-token-metric → App Insights / Azure Monitor',
    status: 'GA',
    coverage: 'requires-instrumentation',
    caveat:
      'Per-consumer prompt/completion token metrics, but only for agents whose model calls route through the gateway (Foundry / custom / BYO-model). Copilot Studio managed calls are not gateway-visible — PPAC credit reports remain the only source there.',
  },
  {
    signal: 'Multi-environment ALM',
    route: '/lifecycle',
    source: 'Inventory API + Power Platform Pipelines (Dataverse)',
    status: 'GA',
    coverage: 'full',
    caveat:
      'Target environments must be Managed Environments. There is no native version-history field — it is inferred from lastPublishedAt.',
  },
  {
    signal: 'Approval gate',
    route: '/lifecycle',
    source: 'M365 admin center + Agent 365 approval flow',
    status: 'preview',
    coverage: 'partial',
    caveat: 'Admin-center publish / reject is GA; the Agent 365 approval APIs are preview.',
  },
  {
    signal: 'Registry & risk',
    route: '/agent365',
    source: 'Agent 365 Graph packages + Entra ID Protection riskyAgents',
    status: 'preview',
    coverage: 'preview',
    caveat:
      'Agent 365 Graph registration is preview; Entra Agent ID + riskyAgents are beta; shadow discovery (Defender / Intune) is preview.',
  },
];
