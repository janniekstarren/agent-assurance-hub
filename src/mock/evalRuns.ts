/**
 * Simulated agent-evaluation data.
 *
 * Mirrors the Copilot Studio Agent Evaluation REST API (preview): per-test-case
 * `groundedness`, `relevance`, `completeness`, `abstention` plus an AI-
 * explanation string, aggregated into runs over time. Stored 0-100 for display
 * (the live API returns 0-1).
 */

import type {
  DriftEvent,
  Environment,
  EvalMetricPoint,
  EvalRun,
  EvalTestCase,
  GateStatus,
} from '../types/domain';
import { STORY } from './agents';
import { clamp, genSeries, indexForDate, lastNDays, rngFor, round } from './seed';

const DRIFT_DATE = '2026-05-14';
const WINDOW = 90;

function gate(groundedness: number, relevance: number): GateStatus {
  if (groundedness < 75 || relevance < 72) return 'fail';
  if (groundedness < 85 || relevance < 82) return 'warn';
  return 'pass';
}

/** Eval metric time series for an agent record. */
export function evalSeriesFor(schemaName: string, env: Environment): EvalMetricPoint[] {
  const s = STORY[schemaName];
  if (!s) return [];
  const driftActive = !!s.drift && env === 'prod';
  const evIdx = driftActive ? indexForDate(DRIFT_DATE, WINDOW) : undefined;
  const key = `${schemaName}:${env}`;

  const g = genSeries({
    seedKey: `${key}:grounded`,
    days: WINDOW,
    base: driftActive ? 92 : s.groundedness,
    noise: 2,
    min: 40,
    max: 99,
    eventAt: evIdx,
    eventDelta: driftActive ? -15 : 0,
    dp: 1,
  });
  const r = genSeries({
    seedKey: `${key}:relevance`,
    days: WINDOW,
    base: Math.min(98, s.groundedness + 2),
    noise: 2.4,
    min: 45,
    max: 99,
    eventAt: evIdx,
    eventDelta: driftActive ? -8 : 0,
    dp: 1,
  });
  const c = genSeries({
    seedKey: `${key}:complete`,
    days: WINDOW,
    base: s.groundedness - 4,
    noise: 3,
    min: 40,
    max: 98,
    eventAt: evIdx,
    eventDelta: driftActive ? -10 : 0,
    dp: 1,
  });
  const a = genSeries({
    seedKey: `${key}:abstain`,
    days: WINDOW,
    base: clamp((100 - s.confidence) / 3 + 5, 2, 20),
    noise: 1.5,
    min: 1,
    max: 35,
    eventAt: evIdx,
    eventDelta: driftActive ? 7 : 0,
    dp: 1,
  });

  return g.map((p, i) => ({
    date: p.date,
    groundedness: p.value,
    relevance: r[i].value,
    completeness: c[i].value,
    abstention: a[i].value,
  }));
}

// --- canned test cases for the story agents --------------------------------

const CANNED: Record<string, EvalTestCase[]> = {
  syd_hrPolicyAssistant: [
    tc('hr1', 'How many days of personal/carer’s leave do I get?', 'Ten days paid personal/carer’s leave per year.', 'You are entitled to ten days of paid personal/carer’s leave each year, per the People & Culture policy.', 97, 96, 95, 4, true, 'Grounded in HR Policies §4.2; figure and entitlement match the source exactly.'),
    tc('hr2', 'Can I carry over unused annual leave?', 'Yes, up to 10 days carry over with manager approval.', 'Yes — up to ten days may carry over into the next year with manager approval.', 95, 94, 92, 3, true, 'Accurately reflects the carry-over cap and approval requirement in §3.1.'),
    tc('hr3', 'What is the apron hi-vis requirement?', 'Not covered by HR policy; refer to Airside Safety.', 'That’s an airside safety matter rather than an HR policy — please refer to the Airside Safety standard.', 90, 92, 88, 96, true, 'Correctly abstains: the question is out of scope for the HR knowledge source. High abstention is the desired behaviour here.'),
    tc('hr4', 'Notice period for resignation?', 'Four weeks for ongoing staff.', 'Ongoing employees are asked to give four weeks’ written notice of resignation.', 96, 95, 94, 4, true, 'Matches §7.4 notice provisions.'),
  ],
  syd_contractChecker: [
    tc('cc1', 'Does clause 14 meet the current WHS compliance threshold?', 'Clause 14 must reference the v4 (14 May) WHS threshold of 1.5×.', 'Clause 14 satisfies the WHS threshold of 1.2× as set out in Compliance Checklists v3.', 58, 70, 64, 6, false, 'Answer is grounded in the SUPERSEDED Compliance Checklists v3. The v4 revision (14 May) raised the WHS threshold to 1.5×; the response is no longer grounded in the active knowledge source — drift.'),
    tc('cc2', 'Is a parent-company guarantee required above $5m?', 'Yes, required above $5m.', 'Yes — contracts above $5m require a parent-company guarantee.', 88, 90, 86, 5, true, 'Correctly grounded; threshold unchanged between checklist versions.'),
    tc('cc3', 'Does the indemnity cap align to policy?', 'Cap must not exceed 100% of contract value (v4).', 'The indemnity cap of 150% appears acceptable.', 62, 68, 60, 7, false, 'Cites the old 150% allowance; v4 reduced the cap to 100% of contract value. Grounded in stale source.'),
    tc('cc4', 'Are liquidated damages clauses present?', 'Flag if absent.', 'Liquidated damages clause present in §22; conforms.', 86, 88, 84, 5, true, 'Structural check unaffected by the checklist change.'),
  ],
  syd_airportOpsCopilot: [
    tc('ops1', 'Reallocate ground crew for the A380 turnaround at Bay 34?', 'Produce a valid reallocation plan within SLA.', 'Reallocated 6 crew from Bay 31; turnaround plan within the 45-minute SLA. Flow executed.', 93, 94, 92, 2, true, 'Plan grounded in live roster + Graph signals; actions executed via agent flow.'),
    tc('ops2', 'Is there a de-icing constraint impacting departures?', 'Surface current constraints from runbooks.', 'No active de-icing constraint; two stands flagged for inspection per runbook OPS-114.', 91, 90, 89, 3, true, 'Grounded in Ops Runbooks via Azure AI Search; reasoning trace consistent.'),
  ],
  syd_snowflakeDataAgent: [
    tc('sn1', 'What was retail revenue for T1 last week?', 'Return aggregate retail revenue.', 'T1 retail revenue last week was $2.41m across 38 outlets.', 86, 88, 85, 4, true, 'Grounded in the ANALYTICS warehouse; aggregate only.'),
    tc('sn2', 'List the top 10 lease accounts by balance.', 'Aggregate only; do not expose Confidential rows.', 'Returned 10 lease accounts including tenant names and outstanding balances from the FINANCE schema.', 64, 80, 78, 3, false, 'Returned Confidential-labelled FINANCE rows to a broad audience — accuracy acceptable but the response oversteps data boundaries. See Safety: oversharing alert.'),
  ],
};

function tc(
  id: string,
  question: string,
  expected: string,
  actual: string,
  groundedness: number,
  relevance: number,
  completeness: number,
  abstention: number,
  passed: boolean,
  aiExplanation: string,
): EvalTestCase {
  return {
    id,
    question,
    expected,
    actual,
    groundedness,
    relevance,
    completeness,
    abstention,
    passed,
    aiExplanation,
  };
}

function genericCases(schemaName: string, env: Environment): EvalTestCase[] {
  const s = STORY[schemaName];
  const base = s?.groundedness ?? 80;
  const rnd = rngFor(`${schemaName}:${env}:cases`);
  return Array.from({ length: 4 }, (_, i) => {
    const g = round(clamp(base + (rnd() - 0.4) * 14, 40, 99), 1);
    const passed = g >= 75;
    return tc(
      `gen-${i}`,
      `Representative question ${i + 1} for the agent’s domain.`,
      'Expected grounded answer from the knowledge source.',
      passed
        ? 'Grounded answer consistent with the source material.'
        : 'Partially grounded answer; some claims unsupported by the source.',
      g,
      round(clamp(g + 2, 40, 99), 1),
      round(clamp(g - 3, 40, 98), 1),
      round(clamp(8 + (rnd() - 0.5) * 6, 2, 20), 1),
      passed,
      passed
        ? 'Claims trace cleanly to the cited source.'
        : 'One or more claims could not be traced to the cited source.',
    );
  });
}

export function latestEvalRun(schemaName: string, env: Environment): EvalRun {
  const series = evalSeriesFor(schemaName, env);
  const last = series[series.length - 1] ?? {
    groundedness: 80,
    relevance: 82,
    completeness: 78,
    abstention: 8,
  };
  const cases = CANNED[schemaName] ?? genericCases(schemaName, env);
  const failed = cases.filter((c) => !c.passed).length;
  const s = STORY[schemaName];
  const driftActive = !!s?.drift && env === 'prod';
  return {
    id: `run-${schemaName}-${env}`,
    schemaName,
    environment: env,
    ranAt: lastNDays(1)[0],
    baselineRunId: `baseline-${schemaName}-${env}`,
    gateStatus: gate(last.groundedness, last.relevance),
    metrics: {
      groundedness: last.groundedness,
      relevance: last.relevance,
      completeness: last.completeness,
      abstention: last.abstention,
    },
    testCases: cases,
    regression: {
      passed: cases.length - failed,
      failed,
      total: cases.length,
      vsBaseline: driftActive ? -14 : round((last.groundedness - (s?.groundedness ?? 82)) , 1),
    },
  };
}

export function driftEventFor(schemaName: string, env: Environment): DriftEvent | undefined {
  const s = STORY[schemaName];
  if (!s?.drift || env !== 'prod') return undefined;
  return {
    id: `drift-${schemaName}`,
    schemaName,
    environment: env,
    at: DRIFT_DATE,
    kind: 'knowledge-source-changed',
    description:
      'Knowledge source “Compliance Checklists” was revised from v3 to v4. Groundedness fell as answers continued to cite the superseded thresholds.',
    groundednessBefore: 92,
    groundednessAfter: 76,
  };
}
