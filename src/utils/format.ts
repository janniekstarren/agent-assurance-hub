/** Formatting helpers shared across modules. */

import type {
  AlertSeverity,
  CallerType,
  Environment,
  GovernanceZone,
  LifecycleState,
} from '../types/domain';
import { DEMO_NOW } from '../mock/seed';

const numberFmt = new Intl.NumberFormat('en-AU');

export function nf(n: number): string {
  return numberFmt.format(Math.round(n));
}

export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(Math.abs(n) >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

export function credits(n: number): string {
  return `${nf(n)} cr`;
}

export function compactCredits(n: number): string {
  return `${compact(n)} cr`;
}

export function usd(n: number, dp = 0): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: dp,
    minimumFractionDigits: dp,
  }).format(n);
}

export function pct(n: number, dp = 0): string {
  return `${n.toFixed(dp)}%`;
}

export function dateShort(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00+10:00` : iso);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export function dateLong(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00+10:00` : iso);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeFromNow(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00+10:00` : iso);
  const ms = DEMO_NOW.getTime() - d.getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

export const ZONE_LABEL: Record<GovernanceZone, string> = {
  Z1: 'Z1 · Citizen',
  Z2: 'Z2 · Partnered',
  Z3: 'Z3 · Professional',
};

export const ENV_LABEL: Record<Environment, string> = {
  dev: 'Dev',
  test: 'Test',
  prod: 'Prod',
};

export const LIFECYCLE_LABEL: Record<LifecycleState, string> = {
  draft: 'Draft',
  'in-review': 'In review',
  published: 'Published',
  retiring: 'Retiring',
};

export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function callerShort(c: CallerType): string {
  return c === 'Non-licensed user' ? 'Non-licensed' : c;
}

export function titleCase(s: string): string {
  return s.replace(/(^|[\s-])\w/g, (m) => m.toUpperCase());
}
