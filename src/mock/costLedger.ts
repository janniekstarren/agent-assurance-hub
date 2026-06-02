/**
 * Copilot Credits ledger + licensing model.
 *
 * Mirrors the Power Platform admin center Copilot credit reports (per
 * environment / per agent / per caller type, daily) and Azure Cost Management
 * (billed $ per meter / billing policy). Credit weights come from
 * creditWeights.ts. Billed-vs-zero-rated encodes the M365-Copilot zero-rating
 * rule: a licensed `User` on a Microsoft channel under their own identity is
 * zero-rated; non-licensed callers, autonomous `Application` identities, and
 * non-Microsoft channels are billed.
 *
 * Figures are illustrative — verify against current Microsoft pricing.
 */

import type {
  Agent,
  AgentBudget,
  CallerType,
  CostRecord,
  EnvLicensing,
  MeterFeature,
  SeatLicense,
} from '../types/domain';
import { AGENTS, STORY } from './agents';
import { CREDIT_WEIGHT_BY_FEATURE } from './creditWeights';
import { round } from './seed';
import { volumeSeriesFor } from './telemetry';

/** Month-to-date length: the anchor is 24 May 2026. */
const MTD_DAYS = 24;
const MICROSOFT_CHANNELS = new Set(['m365-copilot-chat', 'teams', 'sharepoint']);

const CALLER_MIX: Record<string, Partial<Record<CallerType, number>>> = {
  syd_hrPolicyAssistant: { User: 0.9, Microsoft: 0.1 },
  syd_contractChecker: { User: 0.9, Microsoft: 0.1 },
  syd_airportOpsCopilot: { Application: 0.8, User: 0.2 },
  syd_snowflakeDataAgent: { User: 0.6, 'Non-licensed user': 0.3, Application: 0.1 },
  syd_baggageEnquiryBot: { 'Non-licensed user': 0.85, User: 0.15 },
  syd_retailConcierge: { 'Non-licensed user': 0.9, User: 0.1 },
  syd_groundCrewScheduler: { Application: 0.7, User: 0.3 },
  syd_loungeFeedback: { User: 0.85, Application: 0.15 },
  syd_securityIncidentTriage: { Application: 0.8, User: 0.2 },
  syd_carparkAvailability: { 'Non-licensed user': 0.8, User: 0.2 },
  syd_invoiceReconciliation: { Application: 1 },
};

function isBilled(callerType: CallerType, agent: Agent): boolean {
  if (callerType === 'Application' || callerType === 'Non-licensed user') return true;
  if (callerType === 'Microsoft') return false;
  // 'User' — zero-rated only if every channel is a Microsoft channel.
  return !agent.channels.every((c) => MICROSOFT_CHANNELS.has(c));
}

let _records: CostRecord[] | null = null;

/** Full 90-day ledger across the estate (memoised). */
export function costRecords(): CostRecord[] {
  if (_records) return _records;
  const out: CostRecord[] = [];

  for (const agent of AGENTS) {
    const story = STORY[agent.schemaName];
    if (!story) continue;
    const vol = volumeSeriesFor(agent.schemaName, agent.environment);
    const avgVol = vol.reduce((s, p) => s + p.value, 0) / vol.length || 1;
    const targetDaily = agent.mtdCredits / MTD_DAYS;

    // Normalise the feature mix.
    const mixEntries = Object.entries(story.costMix) as [MeterFeature, number][];
    const mixTotal = mixEntries.reduce((s, [, w]) => s + w, 0) || 1;
    const callerEntries = Object.entries(CALLER_MIX[agent.schemaName] ?? { User: 1 }) as [
      CallerType,
      number,
    ][];

    for (let i = 0; i < vol.length; i++) {
      const dayFactor = vol[i].value / avgVol;
      const dailyCredits = targetDaily * dayFactor;
      for (const [feature, w] of mixEntries) {
        const featureCredits = dailyCredits * (w / mixTotal);
        if (featureCredits <= 0) continue;
        const weight = CREDIT_WEIGHT_BY_FEATURE[feature]?.credits || 1;
        for (const [callerType, frac] of callerEntries) {
          const credits = featureCredits * frac;
          if (credits < 0.01) continue;
          out.push({
            date: vol[i].date,
            schemaName: agent.schemaName,
            agentId: agent.id,
            environment: agent.environment,
            feature,
            callerType,
            units: round((credits / weight) , 2),
            credits: round(credits, 2),
            billed: isBilled(callerType, agent),
          });
        }
      }
    }
  }

  _records = out;
  return out;
}

/** Month-to-date credits for an agent record, from the ledger. */
export function mtdCreditsFor(schemaName: string, environment: string): number {
  return round(
    costRecords()
      .filter(
        (r) =>
          r.schemaName === schemaName &&
          r.environment === environment &&
          r.date >= '2026-05-01',
      )
      .reduce((s, r) => s + r.credits, 0),
    0,
  );
}

// ---------------------------------------------------------------------------
// Licensing — three structures, side by side, one per environment
// ---------------------------------------------------------------------------

export const ENV_LICENSING: EnvLicensing[] = [
  {
    environment: 'dev',
    model: 'prepaid-capacity',
    monthlyCredits: 25000,
    packPriceUsd: 200,
    description:
      'Prepaid capacity pack — $200 for 25,000 credits/month, pooled, no rollover. Hard 125% grace then cutoff.',
  },
  {
    environment: 'test',
    model: 'shared-tenant-pool',
    description:
      'Draws on the shared tenant Copilot credit pool. No dedicated allocation; usage nets against the tenant balance.',
  },
  {
    environment: 'prod',
    model: 'allocation-plus-payg',
    monthlyCredits: 60000,
    paygRatePerCredit: 0.01,
    description:
      'Allocation of 60,000 credits + pay-as-you-go overage at $0.01/credit via a linked Azure subscription. No cutoff — overage is billed.',
  },
];

export const ENV_LICENSING_BY_ENV: Record<string, EnvLicensing> = ENV_LICENSING.reduce(
  (acc, l) => {
    acc[l.environment] = l;
    return acc;
  },
  {} as Record<string, EnvLicensing>,
);

// ---------------------------------------------------------------------------
// Per-agent budgets (PPAC-style caps)
// ---------------------------------------------------------------------------

function budget(
  schemaName: string,
  environment: Agent['environment'],
  monthlyCapCredits: number,
  hardStop: boolean,
  enforcement: AgentBudget['enforcement'],
): AgentBudget {
  const a = AGENTS.find((x) => x.schemaName === schemaName && x.environment === environment);
  return {
    schemaName,
    agentId: a?.id ?? `${schemaName}-${environment}`,
    agentName: a?.displayName ?? schemaName,
    environment,
    monthlyCapCredits,
    hardStop,
    mtdCredits: mtdCreditsFor(schemaName, environment),
    enforcement,
  };
}

export const BUDGETS: AgentBudget[] = [
  budget('syd_airportOpsCopilot', 'prod', 40000, false, 'payg-no-cutoff'), // ~120% — over
  budget('syd_snowflakeDataAgent', 'prod', 7000, false, 'payg-no-cutoff'), // ~91%
  budget('syd_hrPolicyAssistant', 'prod', 12000, false, 'payg-no-cutoff'), // ~68%
  budget('syd_contractChecker', 'prod', 4000, true, 'payg-no-cutoff'), // ~78%
  budget('syd_loungeFeedback', 'prod', 4000, false, 'payg-no-cutoff'),
  budget('syd_securityIncidentTriage', 'prod', 2000, true, 'payg-no-cutoff'),
  budget('syd_carparkAvailability', 'prod', 1500, false, 'payg-no-cutoff'),
  budget('syd_invoiceReconciliation', 'prod', 0, false, 'payg-no-cutoff'), // shadow — uncapped risk
  budget('syd_snowflakeDataAgent', 'test', 3000, true, 'prepaid-grace'),
  budget('syd_groundCrewScheduler', 'test', 2500, true, 'prepaid-grace'),
];

// ---------------------------------------------------------------------------
// Seat licensing — spans consumption (credits) and seats (Agent 365 / Copilot)
// ---------------------------------------------------------------------------

export const SEAT_LICENSES: SeatLicense[] = [
  {
    id: 'm365-copilot',
    name: 'Microsoft 365 Copilot (per user)',
    priceUsd: 30,
    unit: 'user / month',
    seats: 850,
    note: 'Zero-rates licensed-user conversational traffic on Microsoft channels.',
  },
  {
    id: 'agent-365',
    name: 'Agent 365 (per user)',
    priceUsd: 15,
    unit: 'user / month',
    seats: 120,
    note: 'GA 1 May 2026. Identity, security and registry for agents — verify current pricing.',
  },
  {
    id: 'e7-frontier',
    name: 'E7 “Frontier” bundle',
    priceUsd: 54.99,
    unit: 'user / month',
    seats: 40,
    note: 'Bundles M365 Copilot + Agent 365 + more — figure illustrative, verify against current Microsoft pricing.',
  },
];
