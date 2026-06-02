/**
 * Agent Assurance Hub — domain model.
 *
 * One typed model shared by the mock service layer and every module. Field
 * names deliberately mirror the real Microsoft sources (see /src/services/*
 * header comments and README section 9) so a swap from mock -> live data is a
 * contained change. `erasableSyntaxOnly` is on in tsconfig, so we use
 * `as const` union maps instead of TypeScript enums throughout.
 */

// ---------------------------------------------------------------------------
// Primitives / unions
// ---------------------------------------------------------------------------

export type Environment = 'dev' | 'test' | 'prod';

export const ENVIRONMENTS: Environment[] = ['dev', 'test', 'prod'];

export type AgentType = 'copilot-studio' | 'foundry-code';

export type Orchestration = 'classic' | 'generative';

/** Governance zones: Z1 citizen, Z2 partnered, Z3 professional. */
export type GovernanceZone = 'Z1' | 'Z2' | 'Z3';

export type LifecycleState = 'draft' | 'in-review' | 'published' | 'retiring';

/** Agent 365 registry state for an agent. */
export type RegistryStatus = 'registered' | 'shadow' | 'pending-approval';

export type Channel =
  | 'm365-copilot-chat'
  | 'teams'
  | 'sharepoint'
  | 'web'
  | 'directline'
  | 'custom-api'
  | 'voice';

export type KnowledgeSourceType =
  | 'sharepoint'
  | 'dataverse'
  | 'website'
  | 'file'
  | 'snowflake'
  | 'graph'
  | 'azure-ai-search';

/** Who invoked the agent — determines billed vs zero-rated (see Cost module). */
export type CallerType = 'User' | 'Non-licensed user' | 'Application' | 'Microsoft';

export const CALLER_TYPES: CallerType[] = [
  'User',
  'Non-licensed user',
  'Application',
  'Microsoft',
];

// ---------------------------------------------------------------------------
// Agent inventory  (Power Platform Inventory API / Azure Resource Graph)
// ---------------------------------------------------------------------------

export interface Owner {
  id: string;
  displayName: string;
  email: string;
}

export interface KnowledgeSource {
  id: string;
  name: string;
  type: KnowledgeSourceType;
  /** ISO date the source last changed — drives the drift story. */
  lastChangedAt: string;
}

export interface Agent {
  /** Per-environment record id (Inventory API `botId`). */
  id: string;
  displayName: string;
  /** Stable across environments — the lineage key used to group Dev/Test/Prod. */
  schemaName: string;
  environment: Environment;
  type: AgentType;
  orchestration: Orchestration;
  owner: Owner;
  zone: GovernanceZone;
  lifecycleState: LifecycleState;
  channels: Channel[];
  knowledgeSources: KnowledgeSource[];
  /** ISO; null when never published (a true draft). */
  lastPublishedAt: string | null;
  createdAt: string;
  /** Entra Agent ID (preview) — the agent's first-class identity. */
  entraAgentId: string;
  registryStatus: RegistryStatus;
  /** Inventory API preview fields. */
  isManaged: boolean;
  isQuarantined: boolean;
  model: string;
  description: string;
  // Denormalised current values for grids/tiles (derived from time series).
  assuranceScore: number; // 0-100 composite RAG
  mtdCredits: number;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Assurance  (Copilot Studio Agent Evaluation API + App Insights via KQL)
// ---------------------------------------------------------------------------

export interface TimePoint {
  /** ISO day. */
  date: string;
  value: number;
}

/** Quality metrics stored 0-100 for display. Live API returns 0-1 (x100). */
export interface EvalMetricPoint {
  date: string;
  groundedness: number;
  relevance: number;
  completeness: number;
  abstention: number;
}

export interface EvalTestCase {
  id: string;
  question: string;
  expected: string;
  actual: string;
  groundedness: number;
  relevance: number;
  completeness: number;
  abstention: number;
  passed: boolean;
  /** AI-explanation string per test case, mirroring the eval API. */
  aiExplanation: string;
}

export type GateStatus = 'pass' | 'warn' | 'fail';

export interface RegressionResult {
  passed: number;
  failed: number;
  total: number;
  /** Delta vs baseline groundedness, in points. */
  vsBaseline: number;
}

export interface EvalRun {
  id: string;
  schemaName: string;
  environment: Environment;
  ranAt: string;
  baselineRunId?: string;
  gateStatus: GateStatus;
  metrics: {
    groundedness: number;
    relevance: number;
    completeness: number;
    abstention: number;
  };
  testCases: EvalTestCase[];
  regression?: RegressionResult;
}

export interface ConfidencePoint {
  date: string;
  mean: number; // 0-100
  p10: number;
  p90: number;
  /** Share of responses below the configured threshold (0-100). */
  belowThresholdPct: number;
}

export interface ConfidenceBin {
  /** Bucket label, e.g. "0.6–0.7". */
  bucket: string;
  lower: number;
  count: number;
}

export interface DriftEvent {
  id: string;
  schemaName: string;
  environment: Environment;
  at: string;
  kind: 'knowledge-source-changed' | 'model-changed' | 'prompt-changed';
  description: string;
  groundednessBefore: number;
  groundednessAfter: number;
}

export interface AssuranceSummary {
  schemaName: string;
  environment: Environment;
  evalSeries: EvalMetricPoint[];
  confidenceSeries: ConfidencePoint[];
  confidenceHistogram: ConfidenceBin[];
  confidenceThreshold: number;
  latestRun: EvalRun;
  drift?: DriftEvent;
}

// ---------------------------------------------------------------------------
// Safety  (Purview audit CopilotInteraction / AIAppInteraction via Mgmt API)
// ---------------------------------------------------------------------------

export type AlertType =
  | 'oversharing'
  | 'sensitivity-label-exposed'
  | 'jailbreak-detected'
  | 'XPIA';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus =
  | 'new'
  | 'acknowledged'
  | 'escalated'
  | 'suppressed'
  | 'resolved';

export interface SafetyAlert {
  id: string;
  schemaName: string;
  agentId: string;
  agentName: string;
  environment: Environment;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  timestamp: string;
  /** Resource the agent touched (metadata, not raw content). */
  accessedResource: string;
  sensitivityLabel?: string;
  jailbreakDetected?: boolean;
  xpiaDetected?: boolean;
  callerType: CallerType;
  /** A metadata-only summary. Raw prompt text is NOT in audit (eDiscovery path). */
  summary: string;
  metadata: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Cost & consumption  (PPAC Copilot credits + Azure Cost Management)
// ---------------------------------------------------------------------------

export type MeterFeature =
  | 'classic-answer'
  | 'generative-answer'
  | 'agent-action'
  | 'graph-grounding'
  | 'agent-flow-actions'
  | 'ai-tools-basic'
  | 'ai-tools-standard'
  | 'ai-tools-premium'
  | 'reasoning-surcharge'
  | 'content-processing'
  | 'voice-basic'
  | 'voice-standard'
  | 'voice-premium';

export interface CreditWeight {
  feature: MeterFeature;
  label: string;
  /** Credits per `unit`. */
  credits: number;
  unit: string;
}

export interface CostRecord {
  date: string;
  schemaName: string;
  agentId: string;
  environment: Environment;
  feature: MeterFeature;
  callerType: CallerType;
  units: number;
  credits: number;
  /** Billed vs zero-rated (depends on caller type + agent identity + channel). */
  billed: boolean;
}

export type LicensingModel =
  | 'prepaid-capacity'
  | 'shared-tenant-pool'
  | 'payg'
  | 'allocation-plus-payg';

export interface EnvLicensing {
  environment: Environment;
  model: LicensingModel;
  /** Prepaid monthly credit allocation (no rollover). */
  monthlyCredits?: number;
  packPriceUsd?: number;
  /** Pay-as-you-go $ per credit via linked Azure subscription. */
  paygRatePerCredit?: number;
  description: string;
}

export interface AgentBudget {
  schemaName: string;
  agentId: string;
  agentName: string;
  environment: Environment;
  monthlyCapCredits: number;
  hardStop: boolean;
  mtdCredits: number;
  /** prepaid = 125% grace then cutoff; payg = no cutoff. */
  enforcement: 'prepaid-grace' | 'payg-no-cutoff';
}

export interface SeatLicense {
  id: string;
  name: string;
  priceUsd: number;
  unit: string;
  seats: number;
  note: string;
}

// ---------------------------------------------------------------------------
// Lifecycle  (Inventory API + Power Platform Pipelines + admin publish gate)
// ---------------------------------------------------------------------------

export type StageStatus =
  | 'success'
  | 'running'
  | 'failed'
  | 'pending'
  | 'skipped';

export interface PipelineStage {
  name: string;
  environment: Environment;
  status: StageStatus;
}

export interface PipelineRun {
  id: string;
  solutionName: string;
  schemaName: string;
  agentName: string;
  stages: PipelineStage[];
  startedAt: string;
  finishedAt?: string;
  promotedBy: string;
  result: 'success' | 'failed' | 'running';
  notes?: string;
}

export type ApprovalState = 'requested' | 'published' | 'rejected';

export interface ApprovalRequest {
  id: string;
  schemaName: string;
  agentId: string;
  agentName: string;
  environment: Environment;
  state: ApprovalState;
  requestedBy: string;
  requestedAt: string;
  reviewer?: string;
  decidedAt?: string;
  scope?: 'everyone' | 'specific-groups';
  groups?: string[];
  justification: string;
}

export type LifecycleEventKind =
  | 'created'
  | 'published'
  | 'reviewed'
  | 'promoted'
  | 'retired'
  | 'handover';

export interface LifecycleEvent {
  id: string;
  schemaName: string;
  at: string;
  kind: LifecycleEventKind;
  label: string;
  version?: string;
  actor: string;
  environment?: Environment;
}

// ---------------------------------------------------------------------------
// Agent 365 companion  (Agent 365 Graph packages + Entra ID Protection)
// ---------------------------------------------------------------------------

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

export interface Agent365Record {
  schemaName: string;
  agentId: string;
  displayName: string;
  entraAgentId: string;
  registryStatus: RegistryStatus;
  discoveredVia: 'agent-365' | 'defender' | 'intune';
  riskLevel: RiskLevel;
  riskDetections: string[];
  approvalState: ApprovalState | 'n/a';
  owner: string;
  /** What Agent 365 governs for this agent (identity, CA, DLP...). */
  governedControls: string[];
  conditionalAccess: boolean;
  lastSeen: string;
  /** True for non-Microsoft / third-party agents surfaced via Agent 365. */
  external?: boolean;
  /** The originating platform, e.g. 'Amazon Bedrock', 'n8n', 'LangChain'. */
  platform?: string;
  /** How it is registered/governed, e.g. 'Auto-discovered via Bedrock API'. */
  integrationPath?: string;
  /** Feasibility status of the integration in the real product. */
  statusTag?: 'GA' | 'preview' | 'announced';
}

// ---------------------------------------------------------------------------
// Demo scenarios + handover
// ---------------------------------------------------------------------------

export type ScenarioId =
  | 'healthy'
  | 'drift'
  | 'data-leak'
  | 'cost-spike'
  | 'handover';

export interface DemoScenario {
  id: ScenarioId;
  label: string;
  tagline: string;
  description: string;
  /** Module route this scenario deep-links to. */
  route: string;
  highlightSchema?: string;
  banner?: string;
}

export type HandoverStepKind =
  | 'user-turn'
  | 'agent-turn'
  | 'confidence-breach'
  | 'handover-human'
  | 'handover-agent'
  | 'resolved';

export interface HandoverStep {
  id: string;
  order: number;
  actor: string;
  label: string;
  detail: string;
  confidence: number; // 0-100
  kind: HandoverStepKind;
}

export interface HandoverScenario {
  id: string;
  schemaName: string;
  agentName: string;
  threshold: number;
  variant: 'to-human' | 'to-agent';
  steps: HandoverStep[];
}

// ---------------------------------------------------------------------------
// Cross-cutting view models
// ---------------------------------------------------------------------------

export type AttentionReason =
  | 'drift'
  | 'leak'
  | 'over-budget'
  | 'stale'
  | 'pending-approval'
  | 'low-confidence';

export interface AttentionItem {
  schemaName: string;
  agentId: string;
  agentName: string;
  environment: Environment;
  reason: AttentionReason;
  detail: string;
  severity: AlertSeverity;
  route: string;
}

export interface EstateOverview {
  totalAgents: number;
  agentsByZone: Record<GovernanceZone, number>;
  agentsByEnvironment: Record<Environment, number>;
  assuranceScore: number;
  openAlerts: number;
  pendingApprovals: number;
  mtdCredits: number;
  budgetCredits: number;
  pulse: TimePoint[];
  attention: AttentionItem[];
}

/** A source citation the Ask assistant attaches to an answer. */
export interface Citation {
  label: string;
  route: string;
  kind: 'agent' | 'module' | 'tile' | 'alert';
}
