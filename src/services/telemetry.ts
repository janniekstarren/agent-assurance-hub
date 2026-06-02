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
  pulseSeries,
  volumeSeriesFor,
} from '../mock/telemetry';
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
  // Short latency — this tile feels "live".
  return respond(pulseSeries(), { min: 80, max: 200, label: 'telemetry.pulse' });
}

export async function getVolume(
  schemaName: string,
  environment: Environment,
): Promise<TimePoint[]> {
  return respond(volumeSeriesFor(schemaName, environment), { label: 'telemetry.volume' });
}
