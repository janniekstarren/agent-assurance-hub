/**
 * Cost service.
 *
 * Mirrors the Power Platform admin center Copilot credit reports (per
 * environment / per agent / per caller type, daily) and Azure Cost Management
 * (billed $ per meter / billing policy). Credit weights, capacity-vs-PAYG,
 * per-agent caps, M365-Copilot zero-rating by caller type and the 125%
 * grace-then-cutoff behaviour follow current Microsoft billing docs.
 * Figures are illustrative — verify against current Microsoft pricing.
 */

import type {
  AgentBudget,
  AgentType,
  CallerType,
  CostRecord,
  EnvLicensing,
  Environment,
  MeterFeature,
  SeatLicense,
} from '../types/domain';
import {
  BUDGETS,
  ENV_LICENSING,
  FUNDING_MODELS,
  SEAT_LICENSES,
  agentBilledSplit,
  costRecords,
  fundingModelFor,
} from '../mock/costLedger';
import { AGENTS } from '../mock/agents';
import { respond } from './mockApi';

export { FUNDING_MODELS };

const MTD_START = '2026-05-01';
const PAYG_RATE = 0.01;
const MTD_DAYS = 24;
const MONTH_DAYS = 31;

export interface CostFilter {
  environment?: Environment | 'all';
  schemaName?: string;
  callerType?: CallerType | 'all';
  window?: 'mtd' | '90d';
}

function applyFilter(records: CostRecord[], f: CostFilter): CostRecord[] {
  return records.filter((r) => {
    if (f.environment && f.environment !== 'all' && r.environment !== f.environment) return false;
    if (f.schemaName && r.schemaName !== f.schemaName) return false;
    if (f.callerType && f.callerType !== 'all' && r.callerType !== f.callerType) return false;
    if ((f.window ?? 'mtd') === 'mtd' && r.date < MTD_START) return false;
    return true;
  });
}

export interface CostSummary {
  totalCredits: number;
  billedCredits: number;
  zeroRatedCredits: number;
  estMonthlyConsumptionUsd: number;
  byFeature: { feature: MeterFeature; credits: number }[];
  byEnvironment: { environment: Environment; credits: number }[];
  byCallerType: { callerType: CallerType; credits: number; billed: number; zeroRated: number }[];
}

export async function getCostSummary(filter: CostFilter = {}): Promise<CostSummary> {
  const records = applyFilter(costRecords(), { window: 'mtd', ...filter });
  const round = (n: number) => Math.round(n);

  const byFeatureMap = new Map<MeterFeature, number>();
  const byEnvMap = new Map<Environment, number>();
  const byCallerMap = new Map<CallerType, { credits: number; billed: number; zeroRated: number }>();
  let billed = 0;
  let zeroRated = 0;

  for (const r of records) {
    byFeatureMap.set(r.feature, (byFeatureMap.get(r.feature) ?? 0) + r.credits);
    byEnvMap.set(r.environment, (byEnvMap.get(r.environment) ?? 0) + r.credits);
    const c = byCallerMap.get(r.callerType) ?? { credits: 0, billed: 0, zeroRated: 0 };
    c.credits += r.credits;
    if (r.billed) {
      c.billed += r.credits;
      billed += r.credits;
    } else {
      c.zeroRated += r.credits;
      zeroRated += r.credits;
    }
    byCallerMap.set(r.callerType, c);
  }

  return respond(
    {
      totalCredits: round(billed + zeroRated),
      billedCredits: round(billed),
      zeroRatedCredits: round(zeroRated),
      estMonthlyConsumptionUsd: round((billed / MTD_DAYS) * MONTH_DAYS * PAYG_RATE),
      byFeature: [...byFeatureMap.entries()]
        .map(([feature, credits]) => ({ feature, credits: round(credits) }))
        .sort((a, b) => b.credits - a.credits),
      byEnvironment: [...byEnvMap.entries()].map(([environment, credits]) => ({
        environment,
        credits: round(credits),
      })),
      byCallerType: [...byCallerMap.entries()].map(([callerType, v]) => ({
        callerType,
        credits: round(v.credits),
        billed: round(v.billed),
        zeroRated: round(v.zeroRated),
      })),
    },
    { label: 'cost.summary' },
  );
}

export interface StackedSpend {
  data: Array<Record<string, number | string>>;
  features: MeterFeature[];
}

export async function getSpendStacked(filter: CostFilter = {}): Promise<StackedSpend> {
  const records = applyFilter(costRecords(), { window: '90d', ...filter });
  const featureSet = new Set<MeterFeature>();
  const byDate = new Map<string, Record<string, number | string>>();
  for (const r of records) {
    featureSet.add(r.feature);
    const row = byDate.get(r.date) ?? { date: r.date };
    row[r.feature] = ((row[r.feature] as number) ?? 0) + r.credits;
    byDate.set(r.date, row);
  }
  const features = [...featureSet];
  const data = [...byDate.values()]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((row) => {
      const out: Record<string, number | string> = { date: row.date };
      for (const f of features) out[f] = Math.round((row[f] as number) ?? 0);
      return out;
    });
  return respond({ data, features }, { label: 'cost.stacked' });
}

export interface AgentCostBreakdown {
  total: number;
  billedCredits: number;
  zeroRatedCredits: number;
  fundingModelLabel: string;
  byFeature: { feature: MeterFeature; credits: number }[];
  byCallerType: { callerType: CallerType; credits: number; billed: boolean }[];
}

export async function getAgentCostBreakdown(
  schemaName: string,
  environment: Environment,
): Promise<AgentCostBreakdown> {
  const records = applyFilter(costRecords(), { window: 'mtd', schemaName, environment });
  const round = (n: number) => Math.round(n);
  const byFeature = new Map<MeterFeature, number>();
  const byCaller = new Map<CallerType, { credits: number; billed: boolean }>();
  let billed = 0;
  let zeroRated = 0;
  for (const r of records) {
    byFeature.set(r.feature, (byFeature.get(r.feature) ?? 0) + r.credits);
    const c = byCaller.get(r.callerType) ?? { credits: 0, billed: r.billed };
    c.credits += r.credits;
    byCaller.set(r.callerType, c);
    if (r.billed) billed += r.credits;
    else zeroRated += r.credits;
  }
  return respond(
    {
      total: round(billed + zeroRated),
      billedCredits: round(billed),
      zeroRatedCredits: round(zeroRated),
      fundingModelLabel: fundingModelFor(schemaName, environment).label,
      byFeature: [...byFeature.entries()]
        .map(([feature, credits]) => ({ feature, credits: round(credits) }))
        .sort((a, b) => b.credits - a.credits),
      byCallerType: [...byCaller.entries()].map(([callerType, v]) => ({
        callerType,
        credits: round(v.credits),
        billed: v.billed,
      })),
    },
    { label: 'cost.agent' },
  );
}

export async function getBudgets(): Promise<AgentBudget[]> {
  return respond(BUDGETS, { label: 'cost.budgets' });
}

export interface AgentLicensingRow {
  schemaName: string;
  agentName: string;
  environment: Environment;
  type: AgentType;
  fundingModelId: string;
  fundingModelLabel: string;
  total: number;
  billed: number;
  zeroRated: number;
  zeroRatedPct: number;
  capCredits: number | null;
  capPct: number | null;
  hardStop: boolean;
}

/** Per-agent derived funding view: each agent's environment-level funding model
    (overridden to seat-covered when mostly zero-rated), caller-coverage split,
    and per-agent cap status. The native unit is the environment; this is a
    derived presentation. */
export async function getAgentLicensing(): Promise<AgentLicensingRow[]> {
  const rows: AgentLicensingRow[] = [];
  for (const a of AGENTS) {
    const split = agentBilledSplit(a.schemaName, a.environment);
    if (split.total < 1) continue;
    const fm = fundingModelFor(a.schemaName, a.environment);
    const budget = BUDGETS.find(
      (b) => b.schemaName === a.schemaName && b.environment === a.environment,
    );
    const capped = budget && budget.monthlyCapCredits > 0 ? budget : undefined;
    rows.push({
      schemaName: a.schemaName,
      agentName: a.displayName,
      environment: a.environment,
      type: a.type,
      fundingModelId: fm.id,
      fundingModelLabel: fm.label,
      total: split.total,
      billed: split.billed,
      zeroRated: split.zeroRated,
      zeroRatedPct: split.total > 0 ? Math.round((split.zeroRated / split.total) * 100) : 0,
      capCredits: capped ? capped.monthlyCapCredits : null,
      capPct: capped ? Math.round((capped.mtdCredits / capped.monthlyCapCredits) * 100) : null,
      hardStop: budget?.hardStop ?? false,
    });
  }
  rows.sort((x, y) => y.total - x.total);
  return respond(rows, { label: 'cost.licensing-agents' });
}

export async function getEnvLicensing(): Promise<EnvLicensing[]> {
  return respond(ENV_LICENSING, { label: 'cost.licensing' });
}

export async function getSeatLicenses(): Promise<SeatLicense[]> {
  return respond(SEAT_LICENSES, { label: 'cost.seats' });
}
