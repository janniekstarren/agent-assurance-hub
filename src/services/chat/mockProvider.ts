/**
 * MockChatProvider — deterministic, offline tool-calling simulation.
 *
 * Parses intent, "calls" the same typed mock data the dashboard uses (the
 * tools in tools.ts), and returns a grounded answer with inline citations that
 * deep-link into the relevant module. It feels like it reasons over real data
 * because it does — it reads the app's own estate.
 */

import type { Citation } from '../../types/domain';
import { AGENTS } from '../../mock/agents';
import { ALERTS } from '../../mock/alerts';
import { BUDGETS, mtdCreditsFor } from '../../mock/costLedger';
import { driftEventFor, latestEvalRun } from '../../mock/evalRuns';
import { APPROVALS } from '../../mock/pipelines';
import { AGENT365_RECORDS } from '../../mock/agent365';
import { nf } from '../../utils/format';
import type { ChatProvider, ChatResult } from './types';

export const SUGGESTED_PROMPTS = [
  'Which agents are drifting?',
  'What did we spend on the Ops Copilot, and why?',
  'Which agents are leaking sensitive data?',
  'Which agents would breach budget at current run-rate?',
  'Which agents are pending approval?',
  'Are there any shadow agents?',
];

interface Handler {
  tool: string;
  keywords: string[];
  run: () => ChatResult;
}

const cite = (label: string, route: string, kind: Citation['kind']): Citation => ({ label, route, kind });

const HANDLERS: Handler[] = [
  {
    tool: 'query_evaluation',
    keywords: ['drift', 'drifting', 'groundedness', 'regress', 'regression', 'accuracy dropp'],
    run: () => {
      const drifting = AGENTS.filter((a) => driftEventFor(a.schemaName, a.environment));
      if (drifting.length === 0)
        return { answer: 'No agents are currently drifting — all groundedness is within thresholds.', citations: [], toolsUsed: ['query_evaluation'] };
      const d = driftEventFor(drifting[0].schemaName, drifting[0].environment)!;
      return {
        answer:
          `**1 agent is drifting: Construction Contract Checker (Prod).** Groundedness fell from ` +
          `${d.groundednessBefore}% to ${d.groundednessAfter}% after the Compliance Checklists v4 ` +
          `change on 14 May — answers kept citing the superseded thresholds. The regression gate ` +
          `failed (2 of 4 cases) and promotion to Prod is blocked.`,
        citations: [cite('Construction Contract Checker · Assurance', '/assurance?agent=syd_contractChecker', 'agent')],
        toolsUsed: ['query_evaluation'],
        template: {
          kind: 'metrics',
          title: 'Construction Contract Checker — Prod',
          metrics: [
            { label: 'Groundedness before', value: `${d.groundednessBefore}%`, tone: 'neutral' },
            { label: 'Groundedness now', value: `${d.groundednessAfter}%`, tone: 'bad' },
            { label: 'Change', value: `−${d.groundednessBefore - d.groundednessAfter} pts`, tone: 'bad' },
            { label: 'Quality gate', value: 'Fail', tone: 'bad' },
          ],
        },
      };
    },
  },
  {
    tool: 'query_cost',
    keywords: ['spend', 'spent', 'cost', 'credits', 'ops copilot', 'reasoning', 'expensive'],
    run: () => {
      const opsMtd = mtdCreditsFor('syd_airportOpsCopilot', 'prod');
      const cap = BUDGETS.find((b) => b.schemaName === 'syd_airportOpsCopilot')?.monthlyCapCredits ?? 40000;
      const pct = Math.round((opsMtd / cap) * 100);
      return {
        answer:
          `**The Airport Ops Copilot consumed ${nf(opsMtd)} credits month-to-date** — the most in ` +
          `the estate. The spend is dominated by the **reasoning-model surcharge** and **Tenant ` +
          `Graph grounding**, because it is an autonomous agent running on its own identity: all ` +
          `its traffic is billed (none zero-rated). That puts it at ~${pct}% of its ${nf(cap)}-credit ` +
          `cap — over budget, though PAYG means no cutoff.`,
        citations: [cite('Airport Ops Copilot · Cost', '/cost?agent=syd_airportOpsCopilot', 'agent')],
        toolsUsed: ['query_cost', 'query_budgets'],
        template: {
          kind: 'metrics',
          title: 'Airport Ops Copilot — month to date',
          metrics: [
            { label: 'Credits', value: nf(opsMtd), tone: 'neutral' },
            { label: 'of cap', value: `${pct}%`, tone: pct > 100 ? 'bad' : 'warn' },
            { label: 'Billed', value: '100%', tone: 'bad' },
            { label: 'Top meter', value: 'Reasoning surcharge', tone: 'warn' },
          ],
        },
      };
    },
  },
  {
    tool: 'query_safety',
    keywords: ['leak', 'leaking', 'sensitive', 'oversharing', 'jailbreak', 'safety', 'xpia', 'expos'],
    run: () => {
      const open = ALERTS.filter((a) => a.status !== 'suppressed' && a.status !== 'resolved');
      const critical = open.filter((a) => a.severity === 'critical').length;
      return {
        answer:
          `**Two agents are flagged for data exposure.** The **Snowflake Data Agent** overshared ` +
          `Confidential FINANCE rows and a jailbreak attempt against it was blocked. The shadow ` +
          `**Invoice Reconciliation Agent** had a cross-prompt-injection (XPIA) attempt via a ` +
          `supplier invoice and accessed Confidential data without DLP scope. ${open.length} alerts ` +
          `are open (${critical} critical). Audit holds metadata + labels + jailbreak/XPIA flags — ` +
          `not raw prompt text.`,
        citations: [
          cite('Snowflake Data Agent · Safety', '/safety?agent=syd_snowflakeDataAgent', 'agent'),
          cite('Safety alert stream', '/safety', 'module'),
        ],
        toolsUsed: ['query_safety'],
        template: {
          kind: 'list',
          title: 'Flagged for data exposure',
          items: [
            { title: 'Snowflake Data Agent', detail: 'Oversharing of Confidential FINANCE rows + a jailbreak attempt blocked', badge: 'critical', tone: 'bad' },
            { title: 'Invoice Reconciliation Agent', detail: 'XPIA via a supplier invoice + Confidential access (shadow agent)', badge: 'high', tone: 'bad' },
          ],
        },
      };
    },
  },
  {
    tool: 'query_budgets',
    keywords: ['budget', 'breach', 'run-rate', 'run rate', 'over budget', 'cap', 'limit'],
    run: () => {
      const ranked = BUDGETS.filter((b) => b.monthlyCapCredits > 0)
        .map((b) => ({ b, pct: Math.round((b.mtdCredits / b.monthlyCapCredits) * 100) }))
        .sort((a, z) => z.pct - a.pct);
      const over = ranked.filter((r) => r.pct >= 100);
      const near = ranked.filter((r) => r.pct >= 75 && r.pct < 100);
      return {
        answer:
          `At current run-rate, **${over.map((r) => r.b.agentName).join(', ') || 'no agent'} ` +
          `breaches budget** — the Airport Ops Copilot is already at ~${ranked[0]?.pct}% of its ` +
          `${nf(ranked[0]?.b.monthlyCapCredits ?? 0)}-credit cap (PAYG, no cutoff). Approaching the ` +
          `line: ${near.map((r) => `${r.b.agentName} (~${r.pct}%)`).join(', ') || 'none'}.`,
        citations: [cite('Budgets & enforcement · Cost', '/cost', 'module')],
        toolsUsed: ['query_budgets'],
        template: {
          kind: 'list',
          title: 'Budget run-rate vs cap',
          items: ranked.slice(0, 4).map((r) => ({
            title: r.b.agentName,
            detail: `${nf(r.b.mtdCredits)} / ${nf(r.b.monthlyCapCredits)} credits`,
            badge: `${r.pct}%`,
            tone: r.pct >= 100 ? 'bad' : r.pct >= 75 ? 'warn' : 'good',
          })),
        },
      };
    },
  },
  {
    tool: 'query_lifecycle',
    keywords: ['pending', 'approval', 'publish', 'gate', 'awaiting', 'review'],
    run: () => {
      const pendingAgents = AGENTS.filter((a) => a.registryStatus === 'pending-approval');
      const pendingApprovals = APPROVALS.filter((a) => a.state === 'requested');
      const name = pendingAgents[0]?.displayName ?? pendingApprovals[0]?.agentName ?? 'none';
      return {
        answer:
          `**1 agent is pending approval: ${name} (Dev).** It is in the publish gate, requested by ` +
          `Marcus Webb. A confidence-driven handover to a human (and agent-to-agent to the Ops ` +
          `Copilot) has been validated in Dev. No agents are pending approval in Test.`,
        citations: [cite('Approval gate · Lifecycle', '/lifecycle?agent=syd_baggageEnquiryBot', 'module')],
        toolsUsed: ['query_lifecycle'],
        template: {
          kind: 'list',
          title: 'Pending approval',
          items: [
            { title: `${name} (Dev)`, detail: 'In the publish gate; confidence-driven handover validated', badge: 'Requested', tone: 'warn' },
          ],
        },
      };
    },
  },
  {
    tool: 'query_agent365',
    keywords: ['shadow', 'unregistered', 'unmanaged', 'discovered', 'rogue'],
    run: () => {
      const shadow = AGENT365_RECORDS.filter((r) => r.registryStatus === 'shadow');
      return {
        answer:
          `**Yes — 1 shadow agent: ${shadow[0]?.displayName ?? 'Invoice Reconciliation Agent'}.** ` +
          `It was discovered by Agent 365 via Defender, running autonomously on its own identity ` +
          `outside the registry — no Conditional Access, no DLP, and accessing Confidential financial ` +
          `data. It is the highest-risk agent in the estate and is unmonitored by the assurance programme.`,
        citations: [cite('Registry · Agent 365', '/agent365?agent=syd_invoiceReconciliation', 'module')],
        toolsUsed: ['query_agent365'],
        template: {
          kind: 'list',
          title: 'Shadow agents',
          items: [
            {
              title: shadow[0]?.displayName ?? 'Invoice Reconciliation Agent',
              detail: 'Autonomous, own identity, Confidential data, no DLP — discovered by Defender',
              badge: 'high risk',
              tone: 'bad',
            },
          ],
        },
      };
    },
  },
  {
    tool: 'query_inventory',
    keywords: ['how many', 'inventory', 'list agents', 'total agents', 'estate', 'how healthy', 'assurance score'],
    run: () => {
      const prod = AGENTS.filter((a) => a.environment === 'prod').length;
      return {
        answer:
          `The estate has **${AGENTS.length} agent records** across Dev, Test and Prod ` +
          `(${prod} in Prod), mixing Copilot Studio and Azure AI Foundry agents. The headline risks ` +
          `right now: the Ops Copilot over budget, the Snowflake agent leaking, the Contract Checker ` +
          `drifting, and a shadow Invoice agent. Open the Overview for the full picture.`,
        citations: [cite('Estate overview', '/overview', 'module'), cite('Agent inventory', '/agents', 'module')],
        toolsUsed: ['query_inventory'],
        template: {
          kind: 'metrics',
          title: 'Estate',
          metrics: [
            { label: 'Agents', value: String(AGENTS.length), tone: 'neutral' },
            { label: 'In Prod', value: String(prod), tone: 'neutral' },
            { label: 'Copilot Studio', value: String(AGENTS.filter((a) => a.type === 'copilot-studio').length), tone: 'neutral' },
            { label: 'Foundry', value: String(AGENTS.filter((a) => a.type === 'foundry-code').length), tone: 'neutral' },
          ],
        },
      };
    },
  },
  {
    tool: 'query_evaluation',
    keywords: ['handover', 'hand over', 'escalat', 'confidence drop', 'baggage'],
    run: () => ({
      answer:
        `The **Baggage Enquiry Bot** demonstrates a confidence-driven handover. When a traveller ` +
        `escalates (medication in a missing bag), the bot's next-turn confidence drops to 64 — below ` +
        `its 70 threshold — so it hands over: to a human baggage agent, or agent-to-agent to the ` +
        `Airport Ops Copilot which raises a priority trace flow. Replay it on the Ask page.`,
      citations: [cite('Handover demonstration · Ask', '/ask', 'module'), cite('Baggage bot · Lifecycle', '/lifecycle?agent=syd_baggageEnquiryBot', 'agent')],
      toolsUsed: ['query_evaluation', 'query_lifecycle'],
    }),
  },
];

function fallback(): ChatResult {
  return {
    answer:
      `I reason over the estate's evaluation, safety, cost, lifecycle and Agent 365 telemetry. Try ` +
      `asking about **drift**, **spend on a specific agent**, **data leaks**, **budget breaches**, ` +
      `**pending approvals**, or **shadow agents**.`,
    citations: [],
    toolsUsed: [],
  };
}

function score(q: string, keywords: string[]): number {
  const lower = q.toLowerCase();
  return keywords.reduce((n, k) => (lower.includes(k) ? n + 1 : n), 0);
}

/** Specific-agent status — answers "how is {agent} performing/doing?". */
function agentStatus(q: string): ChatResult | null {
  const lower = q.toLowerCase();
  if (!/(how|perform|status|health|doing|about|score)/.test(lower)) return null;
  const agent = AGENTS.find((a) => lower.includes(a.displayName.toLowerCase()));
  if (!agent) return null;
  const run = latestEvalRun(agent.schemaName, agent.environment);
  const mtd = mtdCreditsFor(agent.schemaName, agent.environment);
  return {
    answer:
      `**${agent.displayName} (${agent.environment.toUpperCase()})** — assurance ` +
      `${agent.assuranceScore}/100, groundedness ${run.metrics.groundedness}%, quality gate ` +
      `**${run.gateStatus}**. Month-to-date spend ${nf(mtd)} credits. Lifecycle: ${agent.lifecycleState}.`,
    citations: [cite(`${agent.displayName} · Assurance`, `/assurance?agent=${agent.schemaName}`, 'agent')],
    toolsUsed: ['query_evaluation', 'query_cost'],
    template: {
      kind: 'metrics',
      title: `${agent.displayName} — status`,
      metrics: [
        { label: 'Assurance', value: `${agent.assuranceScore}`, tone: agent.assuranceScore >= 85 ? 'good' : agent.assuranceScore >= 70 ? 'warn' : 'bad' },
        { label: 'Groundedness', value: `${run.metrics.groundedness}%`, tone: 'neutral' },
        { label: 'Gate', value: run.gateStatus, tone: run.gateStatus === 'pass' ? 'good' : run.gateStatus === 'warn' ? 'warn' : 'bad' },
        { label: 'MTD credits', value: nf(mtd), tone: 'neutral' },
      ],
    },
  };
}

export class MockChatProvider implements ChatProvider {
  id = 'mock' as const;
  label = 'Mock (offline, deterministic)';
  enabled = true;

  async ask(question: string): Promise<ChatResult> {
    // Simulate the tool-calling round-trip.
    await new Promise((r) => setTimeout(r, 360 + Math.random() * 320));
    const status = agentStatus(question);
    if (status) return status;
    let best: Handler | null = null;
    let bestScore = 0;
    for (const h of HANDLERS) {
      const sc = score(question, h.keywords);
      if (sc > bestScore) {
        bestScore = sc;
        best = h;
      }
    }
    return best && bestScore > 0 ? best.run() : fallback();
  }
}
