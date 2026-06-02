/**
 * Runtime telemetry — confidence and live volume.
 *
 * Mirrors Application Insights `requests` / `customEvents` for a Copilot Studio
 * or Foundry agent, queried per-agent via Log Analytics KQL (opt-in App
 * Insights connection). Confidence is a per-response score; we expose its mean
 * over time, a distribution histogram, and a live estate "pulse".
 */

import type {
  ConfidenceBin,
  ConfidencePoint,
  Environment,
  TimePoint,
} from '../types/domain';
import { STORY } from './agents';
import { clamp, genSeries, indexForDate, lastNDays, rngFor, round } from './seed';

const WINDOW = 90;
const HANDOVER_DATE = '2026-05-22';
const DRIFT_DATE = '2026-05-14';

export function confidenceThreshold(schemaName: string): number {
  return STORY[schemaName]?.confidenceThreshold ?? 70;
}

export function confidenceSeriesFor(schemaName: string, env: Environment): ConfidencePoint[] {
  const s = STORY[schemaName];
  if (!s) return [];
  const threshold = s.confidenceThreshold;
  const key = `${schemaName}:${env}`;
  const handoverActive = !!s.handover;
  const driftActive = !!s.drift && env === 'prod';

  const mean = genSeries({
    seedKey: `${key}:conf`,
    days: WINDOW,
    base: s.confidence,
    noise: 2.2,
    min: 35,
    max: 99,
    eventAt: handoverActive
      ? indexForDate(HANDOVER_DATE, WINDOW)
      : driftActive
        ? indexForDate(DRIFT_DATE, WINDOW)
        : undefined,
    eventDelta: handoverActive ? -9 : driftActive ? -6 : 0,
    dp: 1,
  });

  return mean.map((p) => {
    const spread = 9 + (p.value < threshold ? 4 : 0);
    const belowThresholdPct = round(
      clamp(50 - (p.value - threshold) * 3 + (rngFor(`${key}:${p.date}`)() - 0.5) * 6, 2, 65),
      1,
    );
    return {
      date: p.date,
      mean: p.value,
      p10: round(clamp(p.value - spread, 20, 100), 1),
      p90: round(clamp(p.value + spread * 0.7, 20, 100), 1),
      belowThresholdPct,
    };
  });
}

/** Per-response confidence distribution (10-point buckets). */
export function confidenceHistogram(schemaName: string, env: Environment): ConfidenceBin[] {
  const s = STORY[schemaName];
  const mean = s?.confidence ?? 80;
  const rnd = rngFor(`${schemaName}:${env}:hist`);
  const counts = new Array(10).fill(0);
  const samples = 600;
  for (let i = 0; i < samples; i++) {
    // Box–Muller for a normal-ish distribution.
    const u1 = Math.max(1e-6, rnd());
    const u2 = rnd();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const v = clamp(mean + z * 11, 0, 99.999);
    counts[Math.floor(v / 10)]++;
  }
  return counts.map((count, i) => ({
    bucket: `${i * 10}–${i * 10 + 10}`,
    lower: i * 10,
    count,
  }));
}

/** Estate-wide live pulse — interactions per minute over the last ~48 ticks. */
export function pulseSeries(): TimePoint[] {
  const base = Object.values(STORY).reduce((sum, s) => sum + s.volumePerDay, 0) / (24 * 60);
  return genSeries({
    seedKey: 'estate:pulse',
    days: 48,
    base: base * 6,
    noise: base * 1.1,
    min: 0,
    reversion: 0.4,
    dp: 0,
  }).map((p, i) => ({ date: `t-${48 - i}`, value: Math.max(0, p.value) }));
}

/** Daily interaction volume for an agent record. */
export function volumeSeriesFor(schemaName: string, env: Environment): TimePoint[] {
  const s = STORY[schemaName];
  const envFactor = env === 'prod' ? 1 : env === 'test' ? 0.25 : 0.08;
  const base = (s?.volumePerDay ?? 100) * envFactor;
  return genSeries({
    seedKey: `${schemaName}:${env}:vol`,
    days: WINDOW,
    base,
    noise: base * 0.18,
    trend: base * 0.15,
    min: 0,
    dp: 0,
  });
}

/** Latest mean confidence for an agent record. */
export function latestConfidence(schemaName: string, env: Environment): number {
  const series = confidenceSeriesFor(schemaName, env);
  return series[series.length - 1]?.mean ?? STORY[schemaName]?.confidence ?? 80;
}

export const TODAY = lastNDays(1)[0];
