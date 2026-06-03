/**
 * Data-source coverage matrix — the honesty centrepiece. Each signal the Hub
 * shows, mapped to its real Microsoft source, GA/preview/beta status, and how
 * complete the coverage actually is. Observability is NOT uniform: quality
 * signals require instrumentation + evaluation; SharePoint/declarative agents
 * and shadow agents are governance-metadata-only or nothing.
 */

import type { SignalCoverage } from '../types/domain';

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
    signal: 'Cost & credits',
    route: '/cost',
    source: 'PPAC Copilot credit reports + Azure Cost Management',
    status: 'GA',
    coverage: 'partial',
    caveat:
      'PPAC is per-agent / per-environment but daily-aggregated; Azure Cost Management is coarse with no per-agent breakdown.',
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
