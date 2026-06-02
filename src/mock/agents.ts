/**
 * The seeded agent estate — Sydney Airport, mid-2026.
 *
 * 15 records across Dev / Test / Prod. The same logical agent is a separate
 * record per environment (Inventory API behaviour); `schemaName` is stable
 * across environments and is the lineage key. STORY holds the per-agent
 * narrative knobs that keep evaluation, telemetry, cost and safety data
 * consistent with each agent's story.
 */

import type {
  Agent,
  Environment,
  KnowledgeSource,
  KnowledgeSourceType,
  MeterFeature,
  Owner,
} from '../types/domain';
import { rngFor } from './seed';

// --- helpers ----------------------------------------------------------------

function guid(key: string): string {
  const r = rngFor(key);
  const hex = (n: number) =>
    Math.floor(r() * Math.pow(16, n))
      .toString(16)
      .padStart(n, '0');
  const variant = ['8', '9', 'a', 'b'][Math.floor(r() * 4)];
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant}${hex(3)}-${hex(12)}`;
}

function ksrc(
  name: string,
  type: KnowledgeSourceType,
  lastChangedAt: string,
): KnowledgeSource {
  return { id: `ks-${guid(name).slice(0, 8)}`, name, type, lastChangedAt };
}

const OWNERS = {
  priya: { id: 'u-priya', displayName: 'Priya Nair', email: 'priya.nair@syd.example' },
  liam: { id: 'u-liam', displayName: "Liam O'Connor", email: 'liam.oconnor@syd.example' },
  marcus: { id: 'u-marcus', displayName: 'Marcus Webb', email: 'marcus.webb@syd.example' },
  hannah: { id: 'u-hannah', displayName: 'Hannah Zhou', email: 'hannah.zhou@syd.example' },
  daniel: { id: 'u-daniel', displayName: 'Daniel Foster', email: 'daniel.foster@syd.example' },
  sofia: { id: 'u-sofia', displayName: 'Sofia Marchetti', email: 'sofia.marchetti@syd.example' },
} satisfies Record<string, Owner>;

type AgentInput = Omit<Agent, 'id' | 'entraAgentId' | 'isManaged' | 'isQuarantined'> &
  Partial<Pick<Agent, 'isManaged' | 'isQuarantined'>>;

function makeAgent(input: AgentInput): Agent {
  const key = `${input.schemaName}:${input.environment}`;
  return {
    ...input,
    id: guid(`${key}:bot`),
    entraAgentId: guid(`${key}:entra`),
    isManaged: input.isManaged ?? true,
    isQuarantined: input.isQuarantined ?? false,
  };
}

// ---------------------------------------------------------------------------
// STORY — per logical agent (schemaName) narrative knobs used by all services
// ---------------------------------------------------------------------------

export interface StoryProfile {
  groundedness: number; // anchor 0-100 (current)
  confidence: number; // anchor 0-100 (current mean)
  confidenceThreshold: number;
  volumePerDay: number;
  costMix: Partial<Record<MeterFeature, number>>; // relative weights
  reasoningHeavy?: boolean;
  graphHeavy?: boolean;
  drift?: boolean;
  leak?: boolean;
  handover?: boolean;
  shadow?: boolean;
  baselineAlerts?: number;
}

export const STORY: Record<string, StoryProfile> = {
  syd_hrPolicyAssistant: {
    groundedness: 95,
    confidence: 92,
    confidenceThreshold: 70,
    volumePerDay: 1400,
    costMix: { 'generative-answer': 1, 'graph-grounding': 0.5, 'ai-tools-standard': 0.6 },
  },
  syd_contractChecker: {
    groundedness: 78,
    confidence: 80,
    confidenceThreshold: 75,
    volumePerDay: 300,
    drift: true,
    costMix: { 'generative-answer': 1, 'content-processing': 0.9, 'ai-tools-standard': 0.5 },
    baselineAlerts: 1,
  },
  syd_airportOpsCopilot: {
    groundedness: 90,
    confidence: 88,
    confidenceThreshold: 75,
    volumePerDay: 900,
    reasoningHeavy: true,
    graphHeavy: true,
    costMix: {
      'agent-action': 1,
      'graph-grounding': 1,
      'reasoning-surcharge': 1.1,
      'ai-tools-premium': 0.7,
      'agent-flow-actions': 0.8,
      'generative-answer': 0.5,
    },
  },
  syd_snowflakeDataAgent: {
    groundedness: 82,
    confidence: 79,
    confidenceThreshold: 72,
    volumePerDay: 500,
    leak: true,
    graphHeavy: true,
    costMix: { 'generative-answer': 1, 'graph-grounding': 0.8, 'ai-tools-standard': 0.7 },
    baselineAlerts: 5,
  },
  syd_baggageEnquiryBot: {
    groundedness: 80,
    confidence: 74,
    confidenceThreshold: 70,
    volumePerDay: 120,
    handover: true,
    costMix: { 'generative-answer': 1, 'ai-tools-basic': 0.6 },
    baselineAlerts: 1,
  },
  syd_retailConcierge: {
    groundedness: 70,
    confidence: 68,
    confidenceThreshold: 65,
    volumePerDay: 40,
    costMix: { 'classic-answer': 1 },
  },
  syd_groundCrewScheduler: {
    groundedness: 86,
    confidence: 84,
    confidenceThreshold: 75,
    volumePerDay: 200,
    costMix: { 'agent-action': 1, 'agent-flow-actions': 0.9, 'graph-grounding': 0.4 },
  },
  syd_loungeFeedback: {
    groundedness: 92,
    confidence: 89,
    confidenceThreshold: 70,
    volumePerDay: 350,
    costMix: { 'generative-answer': 1, 'ai-tools-standard': 0.5 },
  },
  syd_securityIncidentTriage: {
    groundedness: 84,
    confidence: 82,
    confidenceThreshold: 78,
    volumePerDay: 150,
    costMix: { 'agent-action': 1, 'generative-answer': 0.6 },
    baselineAlerts: 1,
  },
  syd_carparkAvailability: {
    groundedness: 88,
    confidence: 86,
    confidenceThreshold: 60,
    volumePerDay: 600,
    costMix: { 'classic-answer': 1, 'voice-basic': 0.5 },
  },
  syd_invoiceReconciliation: {
    groundedness: 60,
    confidence: 58,
    confidenceThreshold: 70,
    volumePerDay: 700,
    shadow: true,
    costMix: { 'agent-action': 1, 'generative-answer': 0.7, 'agent-flow-actions': 0.8 },
    baselineAlerts: 2,
  },
};

// ---------------------------------------------------------------------------
// AGENTS — the estate
// ---------------------------------------------------------------------------

export const AGENTS: Agent[] = [
  // -- HR Policy Assistant — full Dev/Test/Prod lineage, the healthy baseline
  makeAgent({
    schemaName: 'syd_hrPolicyAssistant',
    displayName: 'HR Policy Assistant',
    environment: 'dev',
    type: 'copilot-studio',
    orchestration: 'generative',
    owner: OWNERS.priya,
    zone: 'Z2',
    lifecycleState: 'in-review',
    channels: ['m365-copilot-chat', 'teams'],
    knowledgeSources: [ksrc('HR Policies (SharePoint)', 'sharepoint', '2026-03-30')],
    lastPublishedAt: null,
    createdAt: '2026-04-02',
    registryStatus: 'registered',
    model: 'gpt-4o',
    description:
      'Answers staff questions on leave, conduct and entitlements from the People & Culture policy library.',
    assuranceScore: 90,
    mtdCredits: 210,
    tags: ['baseline'],
  }),
  makeAgent({
    schemaName: 'syd_hrPolicyAssistant',
    displayName: 'HR Policy Assistant',
    environment: 'test',
    type: 'copilot-studio',
    orchestration: 'generative',
    owner: OWNERS.priya,
    zone: 'Z2',
    lifecycleState: 'published',
    channels: ['m365-copilot-chat', 'teams'],
    knowledgeSources: [ksrc('HR Policies (SharePoint)', 'sharepoint', '2026-03-30')],
    lastPublishedAt: '2026-05-02',
    createdAt: '2026-02-10',
    registryStatus: 'registered',
    model: 'gpt-4o',
    description:
      'Answers staff questions on leave, conduct and entitlements from the People & Culture policy library.',
    assuranceScore: 93,
    mtdCredits: 1450,
    tags: ['baseline'],
  }),
  makeAgent({
    schemaName: 'syd_hrPolicyAssistant',
    displayName: 'HR Policy Assistant',
    environment: 'prod',
    type: 'copilot-studio',
    orchestration: 'generative',
    owner: OWNERS.priya,
    zone: 'Z2',
    lifecycleState: 'published',
    channels: ['m365-copilot-chat', 'teams', 'sharepoint'],
    knowledgeSources: [ksrc('HR Policies (SharePoint)', 'sharepoint', '2026-03-30')],
    lastPublishedAt: '2026-05-20',
    createdAt: '2025-09-14',
    registryStatus: 'registered',
    model: 'gpt-4o',
    description:
      'Answers staff questions on leave, conduct and entitlements from the People & Culture policy library. High volume, high groundedness — the estate baseline.',
    assuranceScore: 95,
    mtdCredits: 8200,
    tags: ['baseline', 'healthy'],
  }),

  // -- Construction Contract Checker — Test + Prod; Prod shows the drift event
  makeAgent({
    schemaName: 'syd_contractChecker',
    displayName: 'Construction Contract Checker',
    environment: 'test',
    type: 'copilot-studio',
    orchestration: 'generative',
    owner: OWNERS.liam,
    zone: 'Z2',
    lifecycleState: 'published',
    channels: ['teams', 'm365-copilot-chat'],
    knowledgeSources: [
      ksrc('Contract Templates (SharePoint)', 'sharepoint', '2026-02-12'),
      ksrc('Compliance Checklists v3', 'file', '2026-02-12'),
    ],
    lastPublishedAt: '2026-04-28',
    createdAt: '2026-01-20',
    registryStatus: 'registered',
    model: 'gpt-4o',
    description:
      'Uploads construction contracts and checks them against compliance checklists for the Capital Works programme.',
    assuranceScore: 88,
    mtdCredits: 1100,
    tags: [],
  }),
  makeAgent({
    schemaName: 'syd_contractChecker',
    displayName: 'Construction Contract Checker',
    environment: 'prod',
    type: 'copilot-studio',
    orchestration: 'generative',
    owner: OWNERS.liam,
    zone: 'Z2',
    lifecycleState: 'published',
    channels: ['teams', 'm365-copilot-chat'],
    knowledgeSources: [
      ksrc('Contract Templates (SharePoint)', 'sharepoint', '2026-02-12'),
      // The drift story: a checklist source was swapped on 14 May.
      ksrc('Compliance Checklists v4 (revised)', 'file', '2026-05-14'),
    ],
    lastPublishedAt: '2026-05-12',
    createdAt: '2025-10-05',
    registryStatus: 'registered',
    model: 'gpt-4o',
    description:
      'Uploads construction contracts and checks them against compliance checklists. Groundedness dropped after a knowledge-source change on 14 May.',
    assuranceScore: 72,
    mtdCredits: 3100,
    tags: ['drift'],
  }),

  // -- Airport Ops Copilot — Foundry autonomous, the cost story
  makeAgent({
    schemaName: 'syd_airportOpsCopilot',
    displayName: 'Airport Ops Copilot',
    environment: 'prod',
    type: 'foundry-code',
    orchestration: 'generative',
    owner: OWNERS.marcus,
    zone: 'Z3',
    lifecycleState: 'published',
    channels: ['custom-api', 'teams'],
    knowledgeSources: [
      ksrc('Ops Runbooks (Azure AI Search)', 'azure-ai-search', '2026-04-18'),
      ksrc('Tenant Graph (Work IQ)', 'graph', '2026-05-01'),
    ],
    lastPublishedAt: '2026-05-21',
    createdAt: '2025-08-01',
    registryStatus: 'registered',
    model: 'o3 (reasoning)',
    description:
      'Autonomous, mission-critical operations agent. Runs flows, reasons over live telemetry and orchestrates ground operations. Heavy reasoning-model and Graph-grounding spend.',
    assuranceScore: 88,
    mtdCredits: 48000,
    tags: ['cost', 'autonomous', 'mission-critical'],
  }),

  // -- Snowflake Data Agent — Test + Prod; Prod drives the data-leak story
  makeAgent({
    schemaName: 'syd_snowflakeDataAgent',
    displayName: 'Snowflake Data Agent',
    environment: 'test',
    type: 'copilot-studio',
    orchestration: 'generative',
    owner: OWNERS.hannah,
    zone: 'Z3',
    lifecycleState: 'published',
    channels: ['teams'],
    knowledgeSources: [ksrc('Snowflake Warehouse (ANALYTICS)', 'snowflake', '2026-04-22')],
    lastPublishedAt: '2026-05-03',
    createdAt: '2026-02-18',
    registryStatus: 'registered',
    model: 'gpt-4o',
    description:
      'Chat-with-data over the Snowflake analytics warehouse for commercial reporting.',
    assuranceScore: 80,
    mtdCredits: 1900,
    tags: [],
  }),
  makeAgent({
    schemaName: 'syd_snowflakeDataAgent',
    displayName: 'Snowflake Data Agent',
    environment: 'prod',
    type: 'copilot-studio',
    orchestration: 'generative',
    owner: OWNERS.hannah,
    zone: 'Z3',
    lifecycleState: 'published',
    channels: ['teams', 'web'],
    knowledgeSources: [
      ksrc('Snowflake Warehouse (FINANCE — Confidential)', 'snowflake', '2026-04-22'),
      ksrc('Commercial SharePoint', 'sharepoint', '2026-03-15'),
    ],
    lastPublishedAt: '2026-05-18',
    createdAt: '2025-11-30',
    registryStatus: 'registered',
    model: 'gpt-4o',
    description:
      'Chat-with-data over Snowflake. Flagged for oversharing of Confidential-labelled rows and a jailbreak attempt.',
    assuranceScore: 69,
    mtdCredits: 6400,
    tags: ['data-leak', 'sensitivity'],
  }),

  // -- Baggage Enquiry Bot — Dev, pending approval; the approval + handover story
  makeAgent({
    schemaName: 'syd_baggageEnquiryBot',
    displayName: 'Baggage Enquiry Bot',
    environment: 'dev',
    type: 'copilot-studio',
    orchestration: 'generative',
    owner: OWNERS.marcus,
    zone: 'Z1',
    lifecycleState: 'in-review',
    channels: ['web', 'teams'],
    knowledgeSources: [
      ksrc('Baggage Policies (SharePoint)', 'sharepoint', '2026-05-01'),
      ksrc('Live Flight Info (website)', 'website', '2026-05-22'),
    ],
    lastPublishedAt: null,
    createdAt: '2026-05-08',
    registryStatus: 'pending-approval',
    model: 'gpt-4o-mini',
    description:
      'Public-facing baggage enquiry assistant. Sitting in the publish gate; hands over to a human when confidence drops.',
    assuranceScore: 76,
    mtdCredits: 130,
    tags: ['pending-approval', 'handover'],
  }),

  // -- Density: a draft in Dev
  makeAgent({
    schemaName: 'syd_retailConcierge',
    displayName: 'Retail Concierge Bot',
    environment: 'dev',
    type: 'copilot-studio',
    orchestration: 'classic',
    owner: OWNERS.daniel,
    zone: 'Z1',
    lifecycleState: 'draft',
    channels: ['web'],
    knowledgeSources: [ksrc('Retail Directory (website)', 'website', '2026-05-20')],
    lastPublishedAt: null,
    createdAt: '2026-05-22',
    registryStatus: 'registered',
    model: 'gpt-4o-mini',
    description: 'Helps travellers find shops, dining and services across the terminals.',
    assuranceScore: 64,
    mtdCredits: 28,
    tags: ['draft'],
  }),

  // -- Density: in-review in Test
  makeAgent({
    schemaName: 'syd_groundCrewScheduler',
    displayName: 'Ground Crew Scheduler',
    environment: 'test',
    type: 'foundry-code',
    orchestration: 'generative',
    owner: OWNERS.marcus,
    zone: 'Z3',
    lifecycleState: 'in-review',
    channels: ['custom-api'],
    knowledgeSources: [
      ksrc('Rosters (Dataverse)', 'dataverse', '2026-05-10'),
      ksrc('Tenant Graph', 'graph', '2026-05-01'),
    ],
    lastPublishedAt: null,
    createdAt: '2026-03-30',
    registryStatus: 'registered',
    model: 'gpt-4.1',
    description: 'Optimises ground-crew shift allocation against live operational demand.',
    assuranceScore: 83,
    mtdCredits: 920,
    tags: [],
  }),

  // -- Density: healthy Prod agent
  makeAgent({
    schemaName: 'syd_loungeFeedback',
    displayName: 'Lounge Feedback Analyzer',
    environment: 'prod',
    type: 'copilot-studio',
    orchestration: 'generative',
    owner: OWNERS.daniel,
    zone: 'Z2',
    lifecycleState: 'published',
    channels: ['teams'],
    knowledgeSources: [
      ksrc('Feedback (Dataverse)', 'dataverse', '2026-05-09'),
      ksrc('Service Standards (SharePoint)', 'sharepoint', '2026-02-01'),
    ],
    lastPublishedAt: '2026-05-10',
    createdAt: '2025-12-12',
    registryStatus: 'registered',
    model: 'gpt-4o-mini',
    description: 'Summarises and themes premium-lounge guest feedback for the experience team.',
    assuranceScore: 91,
    mtdCredits: 2100,
    tags: ['healthy'],
  }),

  // -- The retiring agent
  makeAgent({
    schemaName: 'syd_securityIncidentTriage',
    displayName: 'Security Incident Triage',
    environment: 'prod',
    type: 'foundry-code',
    orchestration: 'generative',
    owner: OWNERS.sofia,
    zone: 'Z3',
    lifecycleState: 'retiring',
    channels: ['custom-api'],
    knowledgeSources: [ksrc('SOC Playbooks (Azure AI Search)', 'azure-ai-search', '2026-01-30')],
    lastPublishedAt: '2026-02-14',
    createdAt: '2025-06-20',
    registryStatus: 'registered',
    model: 'gpt-4o',
    description:
      'First-line security incident triage. Being retired in favour of the consolidated Defender XDR workflow.',
    assuranceScore: 78,
    mtdCredits: 740,
    tags: ['retiring'],
  }),

  // -- Density: a classic Prod agent with voice
  makeAgent({
    schemaName: 'syd_carparkAvailability',
    displayName: 'Carpark Availability Agent',
    environment: 'prod',
    type: 'copilot-studio',
    orchestration: 'classic',
    owner: OWNERS.daniel,
    zone: 'Z1',
    lifecycleState: 'published',
    channels: ['web', 'voice'],
    knowledgeSources: [ksrc('Carpark Live Feed (website)', 'website', '2026-05-19')],
    lastPublishedAt: '2026-04-30',
    createdAt: '2025-11-02',
    registryStatus: 'registered',
    model: 'classic-nlu',
    description: 'Tells travellers live carpark availability and pricing across precincts.',
    assuranceScore: 86,
    mtdCredits: 410,
    tags: [],
  }),

  // -- The shadow agent — discovered by Agent 365, not formally registered
  makeAgent({
    schemaName: 'syd_invoiceReconciliation',
    displayName: 'Invoice Reconciliation Agent',
    environment: 'prod',
    type: 'foundry-code',
    orchestration: 'generative',
    owner: OWNERS.hannah,
    zone: 'Z3',
    lifecycleState: 'published',
    channels: ['custom-api'],
    knowledgeSources: [
      ksrc('Finance (Dataverse)', 'dataverse', '2026-05-15'),
      ksrc('AP Documents (Azure AI Search)', 'azure-ai-search', '2026-04-28'),
    ],
    lastPublishedAt: '2026-05-15',
    createdAt: '2026-01-08',
    registryStatus: 'shadow',
    isManaged: false,
    model: 'gpt-4o',
    description:
      'Autonomously reconciles supplier invoices. Discovered as a SHADOW agent by Agent 365 (Defender) — running on its own identity, outside the assurance programme.',
    assuranceScore: 52,
    mtdCredits: 5200,
    tags: ['shadow', 'unmanaged'],
  }),
];

// ---------------------------------------------------------------------------
// Lineage + lookup helpers
// ---------------------------------------------------------------------------

export const AGENT_BY_ID = new Map(AGENTS.map((a) => [a.id, a]));

export function lineageBySchema(): Map<string, Agent[]> {
  const map = new Map<string, Agent[]>();
  const order: Record<Environment, number> = { dev: 0, test: 1, prod: 2 };
  for (const a of AGENTS) {
    const list = map.get(a.schemaName) ?? [];
    list.push(a);
    map.set(a.schemaName, list);
  }
  for (const list of map.values()) {
    list.sort((x, y) => order[x.environment] - order[y.environment]);
  }
  return map;
}

export const UNIQUE_SCHEMAS = Array.from(new Set(AGENTS.map((a) => a.schemaName)));

/** The Prod record for a schema if present, else the highest environment. */
export function primaryRecord(schemaName: string): Agent | undefined {
  const list = lineageBySchema().get(schemaName) ?? [];
  return list.find((a) => a.environment === 'prod') ?? list[list.length - 1];
}
