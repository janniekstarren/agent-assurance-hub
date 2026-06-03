/**
 * Evaluation service.
 *
 * Mirrors the Copilot Studio Agent Evaluation REST API (preview) — abstention,
 * relevance, completeness, groundedness + AI-explanation per test case — plus
 * runtime quality from Application Insights `requests` / `customEvents` queried
 * via Log Analytics KQL (per-agent, opt-in connection).
 */

import type {
  AgentType,
  AssuranceSummary,
  DriftEvent,
  Environment,
  GateStatus,
  TimePoint,
} from '../types/domain';
import { AGENTS, observabilityFor } from '../mock/agents';
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
  const obs = observabilityFor(schemaName);
  const hasEval = obs.evaluation;
  const hasConfidence = obs.confidence !== 'none';
  const summary: AssuranceSummary = {
    schemaName,
    environment,
    observability: obs,
    evalSeries: hasEval ? evalSeriesFor(schemaName, environment) : [],
    confidenceSeries: hasConfidence ? confidenceSeriesFor(schemaName, environment) : [],
    confidenceHistogram: hasConfidence ? confidenceHistogram(schemaName, environment) : [],
    confidenceThreshold: confidenceThreshold(schemaName),
    latestRun: hasEval ? latestEvalRun(schemaName, environment) : undefined,
    drift: hasEval ? driftEventFor(schemaName, environment) : undefined,
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
  const gates: QualityGate[] = AGENTS.filter(
    (a) => a.lifecycleState !== 'draft' && observabilityFor(a.schemaName).evaluation,
  ).map((a) => {
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

/**
 * Golden-question status — each agent measured against its curated golden-set
 * (the eval test cases), with pass rate, degradation vs the published baseline,
 * and a groundedness trend. This is the core MVP signal: are agents still
 * answering correctly?
 */
export interface GoldenStatus {
  schemaName: string;
  agentName: string;
  environment: Environment;
  type: AgentType;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  groundedness: number;
  vsBaseline: number;
  degrading: boolean;
  trend: TimePoint[];
}

export async function getGoldenStatus(): Promise<GoldenStatus[]> {
  const rows: GoldenStatus[] = AGENTS.filter(
    (a) => a.lifecycleState !== 'draft' && observabilityFor(a.schemaName).evaluation,
  ).map((a) => {
    const run = latestEvalRun(a.schemaName, a.environment);
    const series = evalSeriesFor(a.schemaName, a.environment);
    const total = run.testCases.length;
    const passed = run.testCases.filter((c) => c.passed).length;
    const failed = total - passed;
    const vsBaseline = run.regression?.vsBaseline ?? 0;
    const degrading = failed > 0 || vsBaseline < -3;
    const trend = series.filter((_p, i) => i % 4 === 0).map((p) => ({ date: p.date, value: p.groundedness }));
    return {
      schemaName: a.schemaName,
      agentName: a.displayName,
      environment: a.environment,
      type: a.type,
      total,
      passed,
      failed,
      passRate: total ? Math.round((passed / total) * 100) : 100,
      groundedness: run.metrics.groundedness,
      vsBaseline,
      degrading,
      trend,
    };
  });
  rows.sort((x, y) =>
    x.degrading === y.degrading ? x.vsBaseline - y.vsBaseline : x.degrading ? -1 : 1,
  );
  return respond(rows, { label: 'evaluation.golden' });
}
