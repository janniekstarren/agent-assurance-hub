/**
 * Telemetry service.
 *
 * Mirrors Application Insights `requests` / `customEvents` for an agent,
 * queried via Log Analytics KQL (opt-in App Insights connection). Exposes
 * confidence (mean over time, distribution, threshold) and a live estate pulse.
 */

import type {
  ConfidenceBin,
  ConfidencePoint,
  Environment,
  TimePoint,
} from '../types/domain';
import {
  confidenceHistogram,
  confidenceSeriesFor,
  confidenceThreshold,
  latestConfidence,
  volumeSeriesFor,
} from '../mock/telemetry';
import { logAnalytics } from './synthetic/client';
import { respond } from './mockApi';

export interface ConfidenceView {
  series: ConfidencePoint[];
  histogram: ConfidenceBin[];
  threshold: number;
  latest: number;
}

export async function getConfidence(
  schemaName: string,
  environment: Environment,
): Promise<ConfidenceView> {
  return respond(
    {
      series: confidenceSeriesFor(schemaName, environment),
      histogram: confidenceHistogram(schemaName, environment),
      threshold: confidenceThreshold(schemaName),
      latest: latestConfidence(schemaName, environment),
    },
    { label: 'telemetry.confidence' },
  );
}

export async function getPulse(): Promise<TimePoint[]> {
  // Through the synthetic API: an Azure Monitor KQL query → Log Analytics table
  // → parsed back to a series. This is the App-Insights-KQL path the team uses.
  const res = await logAnalytics.query(
    'requests | summarize count() by bin(timestamp, 30m) | order by timestamp asc',
  );
  const table = res.tables[0];
  const ti = table.columns.findIndex((c) => c.name === 'timestamp');
  const vi = table.columns.findIndex((c) => c.name === 'count_');
  const points: TimePoint[] = table.rows.map((row) => ({
    date: String(row[ti]),
    value: Number(row[vi]),
  }));
  return respond(points, { min: 80, max: 200, label: 'telemetry.pulse' });
}

export async function getVolume(
  schemaName: string,
  environment: Environment,
): Promise<TimePoint[]> {
  return respond(volumeSeriesFor(schemaName, environment), { label: 'telemetry.volume' });
}
