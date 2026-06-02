/**
 * Evaluation service.
 *
 * Mirrors the Copilot Studio Agent Evaluation REST API (preview) — abstention,
 * relevance, completeness, groundedness + AI-explanation per test case — plus
 * runtime quality from Application Insights `requests` / `customEvents` queried
 * via Log Analytics KQL (per-agent, opt-in connection).
 */

import type { AssuranceSummary, DriftEvent, Environment, GateStatus } from '../types/domain';
import { AGENTS } from '../mock/agents';
import { driftEventFor, evalSeriesFor, latestEvalRun } from '../mock/evalRuns';
import {
  confidenceHistogram,
  confidenceSeriesFor,
  confidenceThreshold,
} from '../mock/telemetry';
import { respond } from './mockApi';

export async function getAssuranceSummary(
  schemaName: string,
  environment: Environment,
): Promise<AssuranceSummary> {
  const summary: AssuranceSummary = {
    schemaName,
    environment,
    evalSeries: evalSeriesFor(schemaName, environment),
    confidenceSeries: confidenceSeriesFor(schemaName, environment),
    confidenceHistogram: confidenceHistogram(schemaName, environment),
    confidenceThreshold: confidenceThreshold(schemaName),
    latestRun: latestEvalRun(schemaName, environment),
    drift: driftEventFor(schemaName, environment),
  };
  return respond(summary, { label: 'evaluation.summary' });
}

export interface QualityGate {
  schemaName: string;
  agentName: string;
  environment: Environment;
  gateStatus: GateStatus;
  groundedness: number;
  relevance: number;
  completeness: number;
  abstention: number;
  regressionFailed: number;
  regressionTotal: number;
}

export async function getQualityGates(): Promise<QualityGate[]> {
  const gates: QualityGate[] = AGENTS.filter((a) => a.lifecycleState !== 'draft').map((a) => {
    const run = latestEvalRun(a.schemaName, a.environment);
    return {
      schemaName: a.schemaName,
      agentName: a.displayName,
      environment: a.environment,
      gateStatus: run.gateStatus,
      groundedness: run.metrics.groundedness,
      relevance: run.metrics.relevance,
      completeness: run.metrics.completeness,
      abstention: run.metrics.abstention,
      regressionFailed: run.regression?.failed ?? 0,
      regressionTotal: run.regression?.total ?? 0,
    };
  });
  return respond(gates, { label: 'evaluation.gates' });
}

export async function getDriftEvents(): Promise<DriftEvent[]> {
  const events: DriftEvent[] = [];
  for (const a of AGENTS) {
    const d = driftEventFor(a.schemaName, a.environment);
    if (d) events.push(d);
  }
  return respond(events, { label: 'evaluation.drift' });
}
