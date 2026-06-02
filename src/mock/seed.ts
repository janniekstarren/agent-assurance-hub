/**
 * Deterministic seed utilities.
 *
 * Every metric in the estate is generated from a stable PRNG so the demo looks
 * pixel-identical on each load — essential for a repeatable pitch. All date
 * math is anchored to a fixed DEMO_NOW rather than the wall clock, so the
 * 90-day windows, "month to date" figures and the seeded drift/leak/handover
 * events stay put relative to "now".
 */

import type { TimePoint } from '../types/domain';

/**
 * Fixed anchor — the dataset is "as of" Friday 24 May 2026, Sydney. Chosen so
 * month-to-date spend is ~24 days into May (meaningful budget run-rate), the
 * 14 May drift event is ~10 days old, and the handover fired this week.
 */
export const DEMO_NOW = new Date('2026-05-24T17:00:00+10:00');

/** mulberry32 — tiny, fast, deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string → PRNG seed. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A PRNG keyed by an arbitrary string. */
export function rngFor(key: string): () => number {
  return mulberry32(hashString(key));
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}

/** Oldest → newest ISO days ending today (inclusive). */
export function lastNDays(n: number, base: Date = DEMO_NOW): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(isoDay(addDays(base, -i)));
  return out;
}

/** Index of an ISO date within a `days`-long window ending today, or undefined. */
export function indexForDate(dateISO: string, days: number): number | undefined {
  const d = new Date(`${dateISO}T09:00:00+10:00`);
  const ago = daysBetween(d, DEMO_NOW);
  const idx = days - 1 - ago;
  return idx >= 0 && idx < days ? idx : undefined;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function round(v: number, dp = 0): number {
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
}

export interface SeriesOptions {
  seedKey: string;
  days: number;
  base: number;
  /** Total drift across the window, in value units. */
  trend?: number;
  /** Day-to-day volatility. */
  noise?: number;
  min?: number;
  max?: number;
  /** Mean-reversion strength (0..1). */
  reversion?: number;
  /** Inject a step change `eventDelta` at this day index (0 = oldest). */
  eventAt?: number;
  eventDelta?: number;
  /** Round each value to this many decimal places. */
  dp?: number;
}

/**
 * Mean-reverting random walk with optional linear trend and a one-off level
 * shift (used for drift / cost-spike events).
 */
export function genSeries(opts: SeriesOptions): TimePoint[] {
  const {
    seedKey,
    days,
    base,
    trend = 0,
    noise = 1,
    min = -Infinity,
    max = Infinity,
    reversion = 0.25,
    eventAt,
    eventDelta = 0,
    dp = 0,
  } = opts;
  const rnd = rngFor(seedKey);
  const dates = lastNDays(days);
  const out: TimePoint[] = [];
  let v = base;
  let shift = 0;
  for (let i = 0; i < days; i++) {
    const target = base + (trend * i) / Math.max(1, days - 1);
    v = v + reversion * (target - v) + (rnd() - 0.5) * 2 * noise;
    if (eventAt !== undefined && i >= eventAt) shift = eventDelta;
    const value = clamp(v + shift, min, max);
    out.push({ date: dates[i], value: round(value, dp) });
  }
  return out;
}

/** Pick a deterministic element from a list using a key. */
export function pick<T>(key: string, list: readonly T[]): T {
  const r = rngFor(key)();
  return list[Math.floor(r * list.length)];
}

/** Deterministic integer in [min, max]. */
export function intBetween(key: string, min: number, max: number): number {
  return Math.floor(min + rngFor(key)() * (max - min + 1));
}
