/**
 * Coverage service — the honesty matrix. Exposes the per-signal data-source
 * coverage table and the per-agent observability rows, so the UI can state
 * exactly where telemetry comes from and where the gaps are.
 */

import type { AgentType, Environment, SignalCoverage, TelemetryLevel } from '../types/domain';
import { SIGNAL_COVERAGE } from '../mock/coverage';
import { AGENTS, observabilityFor } from '../mock/agents';
import { respond } from './mockApi';

export async function getSignalCoverage(): Promise<SignalCoverage[]> {
  return respond(SIGNAL_COVERAGE, { label: 'coverage.signals' });
}

export interface AgentObservabilityRow {
  schemaName: string;
  agentName: string;
  environment: Environment;
  type: AgentType;
  appInsights: boolean;
  evaluation: boolean;
  confidence: 'classic-nlu' | 'derived' | 'none';
  level: TelemetryLevel;
  note?: string;
}

const LEVEL_ORDER: Record<TelemetryLevel, number> = {
  none: 0,
  metadata: 1,
  classic: 2,
  runtime: 3,
  full: 4,
};

export async function getAgentObservability(): Promise<AgentObservabilityRow[]> {
  const rows: AgentObservabilityRow[] = AGENTS.map((a) => {
    const o = observabilityFor(a.schemaName);
    return {
      schemaName: a.schemaName,
      agentName: a.displayName,
      environment: a.environment,
      type: a.type,
      appInsights: o.appInsights,
      evaluation: o.evaluation,
      confidence: o.confidence,
      level: o.level,
      note: o.note,
    };
  });
  rows.sort((x, y) => LEVEL_ORDER[x.level] - LEVEL_ORDER[y.level]);
  return respond(rows, { label: 'coverage.agents' });
}
