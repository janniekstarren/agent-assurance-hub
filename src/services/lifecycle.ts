/**
 * Lifecycle / ALM service.
 *
 * Mirrors the Power Platform Inventory API for the estate, Power Platform
 * Pipelines run history (Dataverse in the host environment; targets must be
 * Managed Environments), and the M365 admin-center publish/reject gate +
 * Agent 365 approval flow (preview). Draft-vs-published is inferred from
 * `lastPublishedAt` — there is no native version-history field.
 */

import type {
  ApprovalRequest,
  Environment,
  LifecycleEvent,
  LifecycleState,
  PipelineRun,
  RegistryStatus,
} from '../types/domain';
import { lineageBySchema } from '../mock/agents';
import { APPROVALS, PIPELINE_RUNS, lifecycleEventsFor } from '../mock/pipelines';
import { respond } from './mockApi';

let approvals: ApprovalRequest[] = APPROVALS.map((a) => ({ ...a }));

export async function getPipelineRuns(): Promise<PipelineRun[]> {
  return respond(PIPELINE_RUNS, { label: 'lifecycle.pipelines' });
}

export async function getApprovals(): Promise<ApprovalRequest[]> {
  return respond(
    approvals.map((a) => ({ ...a })),
    { label: 'lifecycle.approvals' },
  );
}

export async function decideApproval(
  id: string,
  decision: 'approve' | 'reject',
  scope?: 'everyone' | 'specific-groups',
  groups?: string[],
): Promise<ApprovalRequest> {
  approvals = approvals.map((a) =>
    a.id === id
      ? {
          ...a,
          state: decision === 'approve' ? 'published' : 'rejected',
          reviewer: 'You (Reviewer)',
          decidedAt: new Date().toISOString(),
          scope: decision === 'approve' ? (scope ?? 'everyone') : a.scope,
          groups,
        }
      : a,
  );
  const updated = approvals.find((a) => a.id === id);
  if (!updated) throw new Error(`Approval ${id} not found`);
  return respond(updated, { min: 200, max: 420, label: 'lifecycle.decide' });
}

export async function getLifecycleEvents(schemaName: string): Promise<LifecycleEvent[]> {
  return respond(lifecycleEventsFor(schemaName), { label: 'lifecycle.events' });
}

export interface SwimlaneCell {
  state: LifecycleState;
  lastPublishedAt: string | null;
  registryStatus: RegistryStatus;
  agentId: string;
}

export interface SwimlaneAgent {
  schemaName: string;
  agentName: string;
  byEnv: Record<Environment, SwimlaneCell | null>;
}

export async function getSwimlane(): Promise<SwimlaneAgent[]> {
  const map = lineageBySchema();
  const out: SwimlaneAgent[] = [];
  for (const [schemaName, records] of map) {
    const byEnv: Record<Environment, SwimlaneCell | null> = { dev: null, test: null, prod: null };
    for (const r of records) {
      byEnv[r.environment] = {
        state: r.lifecycleState,
        lastPublishedAt: r.lastPublishedAt,
        registryStatus: r.registryStatus,
        agentId: r.id,
      };
    }
    out.push({ schemaName, agentName: records[0].displayName, byEnv });
  }
  out.sort((a, b) => a.agentName.localeCompare(b.agentName));
  return respond(out, { label: 'lifecycle.swimlane' });
}
