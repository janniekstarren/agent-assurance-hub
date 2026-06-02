/**
 * Multi-environment ALM data.
 *
 * Pipeline run history mirrors Power Platform Pipelines stored in the host
 * environment's Dataverse (target environments must be Managed). Approval state
 * mirrors the M365 admin-center publish/reject gate + Agent 365 approval flow
 * (preview). Lifecycle timelines are inferred from `lastPublishedAt` — there is
 * no native version-history field, which the UI states honestly.
 */

import type {
  ApprovalRequest,
  Environment,
  LifecycleEvent,
  PipelineRun,
  StageStatus,
} from '../types/domain';
import { AGENTS, lineageBySchema } from './agents';

function stage(name: string, environment: Environment, status: StageStatus) {
  return { name, environment, status };
}

export const PIPELINE_RUNS: PipelineRun[] = [
  // HR Policy Assistant — clean promotion to Prod
  {
    id: 'run-hr-014',
    solutionName: 'HRPolicyAssistant_Solution',
    schemaName: 'syd_hrPolicyAssistant',
    agentName: 'HR Policy Assistant',
    stages: [
      stage('Build', 'dev', 'success'),
      stage('Deploy to Test', 'test', 'success'),
      stage('Deploy to Prod', 'prod', 'success'),
    ],
    startedAt: '2026-05-20T02:10:00Z',
    finishedAt: '2026-05-20T02:21:00Z',
    promotedBy: 'Priya Nair',
    result: 'success',
    notes: 'Quality gate passed (groundedness 95). Promoted to Prod.',
  },
  {
    id: 'run-hr-013',
    solutionName: 'HRPolicyAssistant_Solution',
    schemaName: 'syd_hrPolicyAssistant',
    agentName: 'HR Policy Assistant',
    stages: [
      stage('Build', 'dev', 'success'),
      stage('Deploy to Test', 'test', 'success'),
      stage('Deploy to Prod', 'prod', 'skipped'),
    ],
    startedAt: '2026-05-02T23:40:00Z',
    finishedAt: '2026-05-02T23:48:00Z',
    promotedBy: 'Priya Nair',
    result: 'success',
    notes: 'Promoted to Test for UAT.',
  },

  // Construction Contract Checker — regression caught at the Test gate
  {
    id: 'run-cc-031',
    solutionName: 'ContractChecker_Solution',
    schemaName: 'syd_contractChecker',
    agentName: 'Construction Contract Checker',
    stages: [
      stage('Build', 'dev', 'success'),
      stage('Deploy to Test', 'test', 'success'),
      stage('Quality gate', 'test', 'failed'),
      stage('Deploy to Prod', 'prod', 'pending'),
    ],
    startedAt: '2026-05-16T05:00:00Z',
    finishedAt: '2026-05-16T05:12:00Z',
    promotedBy: "Liam O'Connor",
    result: 'failed',
    notes:
      'Regression gate failed: groundedness regressed 14 pts vs baseline after the Compliance Checklists v4 change. Promotion to Prod blocked.',
  },
  {
    id: 'run-cc-030',
    solutionName: 'ContractChecker_Solution',
    schemaName: 'syd_contractChecker',
    agentName: 'Construction Contract Checker',
    stages: [
      stage('Build', 'dev', 'success'),
      stage('Deploy to Test', 'test', 'success'),
      stage('Deploy to Prod', 'prod', 'success'),
    ],
    startedAt: '2026-05-12T01:00:00Z',
    finishedAt: '2026-05-12T01:09:00Z',
    promotedBy: "Liam O'Connor",
    result: 'success',
    notes: 'Promoted to Prod (pre-drift).',
  },

  // Snowflake Data Agent — Test -> Prod
  {
    id: 'run-sn-022',
    solutionName: 'SnowflakeDataAgent_Solution',
    schemaName: 'syd_snowflakeDataAgent',
    agentName: 'Snowflake Data Agent',
    stages: [
      stage('Build', 'dev', 'skipped'),
      stage('Deploy to Test', 'test', 'success'),
      stage('Deploy to Prod', 'prod', 'success'),
    ],
    startedAt: '2026-05-18T04:30:00Z',
    finishedAt: '2026-05-18T04:41:00Z',
    promotedBy: 'Hannah Zhou',
    result: 'success',
    notes: 'Promoted to Prod. Data-loss-prevention review noted for follow-up.',
  },

  // Baggage Enquiry Bot — built in Dev, Prod stage awaiting approval
  {
    id: 'run-bg-007',
    solutionName: 'BaggageEnquiryBot_Solution',
    schemaName: 'syd_baggageEnquiryBot',
    agentName: 'Baggage Enquiry Bot',
    stages: [
      stage('Build', 'dev', 'success'),
      stage('Deploy to Test', 'test', 'running'),
      stage('Approval', 'prod', 'pending'),
      stage('Publish', 'prod', 'pending'),
    ],
    startedAt: '2026-05-23T22:15:00Z',
    promotedBy: 'Marcus Webb',
    result: 'running',
    notes: 'Awaiting publish approval. Confidence-driven handover validated in Dev.',
  },

  // Ground Crew Scheduler — in Test
  {
    id: 'run-gc-005',
    solutionName: 'GroundCrewScheduler_Solution',
    schemaName: 'syd_groundCrewScheduler',
    agentName: 'Ground Crew Scheduler',
    stages: [
      stage('Build', 'dev', 'success'),
      stage('Deploy to Test', 'test', 'success'),
      stage('Deploy to Prod', 'prod', 'pending'),
    ],
    startedAt: '2026-05-19T03:00:00Z',
    finishedAt: '2026-05-19T03:07:00Z',
    promotedBy: 'Marcus Webb',
    result: 'success',
    notes: 'In UAT in Test.',
  },
];

export const APPROVALS: ApprovalRequest[] = [
  {
    id: 'appr-bag-01',
    schemaName: 'syd_baggageEnquiryBot',
    agentId: AGENTS.find((a) => a.schemaName === 'syd_baggageEnquiryBot')?.id ?? '',
    agentName: 'Baggage Enquiry Bot',
    environment: 'prod',
    state: 'requested',
    requestedBy: 'Marcus Webb',
    requestedAt: '2026-05-23T22:20:00Z',
    justification:
      'Public-facing baggage assistant for the SYD website and Teams. Confidence-driven handover to human agents validated. Requesting publish to everyone.',
  },
  {
    id: 'appr-hr-09',
    schemaName: 'syd_hrPolicyAssistant',
    agentId: AGENTS.find((a) => a.schemaName === 'syd_hrPolicyAssistant' && a.environment === 'prod')?.id ?? '',
    agentName: 'HR Policy Assistant',
    environment: 'prod',
    state: 'published',
    requestedBy: 'Priya Nair',
    requestedAt: '2026-05-19T08:00:00Z',
    reviewer: 'Governance Board',
    decidedAt: '2026-05-20T01:55:00Z',
    scope: 'everyone',
    justification: 'Annual policy refresh. Approved for all staff.',
  },
  {
    id: 'appr-rt-03',
    schemaName: 'syd_retailConcierge',
    agentId: AGENTS.find((a) => a.schemaName === 'syd_retailConcierge')?.id ?? '',
    agentName: 'Retail Concierge Bot',
    environment: 'test',
    state: 'rejected',
    requestedBy: 'Daniel Foster',
    requestedAt: '2026-05-10T06:00:00Z',
    reviewer: 'Governance Board',
    decidedAt: '2026-05-11T22:30:00Z',
    justification:
      'Rejected: insufficient groundedness and no DLP review. Returned to Dev for rework.',
  },
];

/** Lifecycle timeline for a schema, inferred from records + seeded events. */
export function lifecycleEventsFor(schemaName: string): LifecycleEvent[] {
  const records = lineageBySchema().get(schemaName) ?? [];
  const events: LifecycleEvent[] = [];
  const first = records[0];
  if (first) {
    events.push({
      id: `${schemaName}-created`,
      schemaName,
      at: first.createdAt,
      kind: 'created',
      label: `Created in ${first.environment.toUpperCase()} by ${first.owner.displayName}`,
      actor: first.owner.displayName,
      environment: first.environment,
    });
  }
  for (const r of records) {
    if (r.lastPublishedAt) {
      events.push({
        id: `${schemaName}-${r.environment}-pub`,
        schemaName,
        at: r.lastPublishedAt,
        kind: 'published',
        label: `Published to ${r.environment.toUpperCase()}`,
        version: r.environment === 'prod' ? 'v1.4' : 'v1.4-rc',
        actor: r.owner.displayName,
        environment: r.environment,
      });
    }
  }
  // Story embellishments.
  if (schemaName === 'syd_contractChecker') {
    events.push({
      id: 'cc-drift-review',
      schemaName,
      at: '2026-05-15',
      kind: 'reviewed',
      label: 'Drift review opened — groundedness regression after checklist v4 change',
      actor: "Liam O'Connor",
      environment: 'prod',
    });
  }
  if (schemaName === 'syd_baggageEnquiryBot') {
    events.push({
      id: 'bag-handover',
      schemaName,
      at: '2026-05-22',
      kind: 'handover',
      label: 'Confidence-driven handover fired during UAT (to human, then to Ops Copilot)',
      actor: 'System',
      environment: 'dev',
    });
  }
  if (schemaName === 'syd_securityIncidentTriage') {
    events.push({
      id: 'sec-retire',
      schemaName,
      at: '2026-05-05',
      kind: 'retired',
      label: 'Marked retiring — superseded by Defender XDR workflow',
      actor: 'Sofia Marchetti',
      environment: 'prod',
    });
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}
