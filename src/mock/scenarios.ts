/**
 * Demo scenario switcher states + the scripted handover narrative.
 *
 * Switching a scenario jumps the whole app to a seeded narrative state and
 * deep-links to the module that tells the story. The handover scenarios drive
 * an animated, confidence-led escalation visible across Overview, Assurance and
 * Lifecycle.
 */

import type { DemoScenario, HandoverScenario, HandoverStep } from '../types/domain';

export const SCENARIOS: DemoScenario[] = [
  {
    id: 'healthy',
    label: 'Healthy estate',
    tagline: 'Baseline',
    description:
      'Every agent inside its quality, safety and budget guardrails. The estate assurance score is green.',
    route: '/overview',
  },
  {
    id: 'drift',
    label: 'Drift detected',
    tagline: 'Contract Checker',
    description:
      'The Construction Contract Checker’s groundedness dropped after a knowledge-source change. A regression gate failed and an alert fired.',
    route: '/assurance',
    highlightSchema: 'syd_contractChecker',
    banner:
      'Drift on Construction Contract Checker — groundedness −16 pts after Compliance Checklists v4 (14 May).',
  },
  {
    id: 'data-leak',
    label: 'Data-leak alert',
    tagline: 'Snowflake Data Agent',
    description:
      'The Snowflake Data Agent overshared Confidential FINANCE rows and a jailbreak attempt was blocked.',
    route: '/safety',
    highlightSchema: 'syd_snowflakeDataAgent',
    banner:
      'Critical safety event — Snowflake Data Agent: oversharing + jailbreak attempt blocked.',
  },
  {
    id: 'cost-spike',
    label: 'Cost spike',
    tagline: 'Airport Ops Copilot',
    description:
      'The autonomous Airport Ops Copilot’s reasoning-model surcharge and Graph grounding pushed it past its monthly cap.',
    route: '/cost',
    highlightSchema: 'syd_airportOpsCopilot',
    banner:
      'Budget breach — Airport Ops Copilot at ~120% of cap, driven by reasoning surcharge + Graph grounding.',
  },
  {
    id: 'handover',
    label: 'Approval & handover',
    tagline: 'Baggage Enquiry Bot',
    description:
      'The Baggage Enquiry Bot sits in the publish gate; a confidence-driven handover to a human (and agent-to-agent to Ops Copilot) fires.',
    route: '/lifecycle',
    highlightSchema: 'syd_baggageEnquiryBot',
    banner:
      'Baggage Enquiry Bot pending approval — confidence-driven handover validated.',
  },
];

export const SCENARIO_BY_ID = SCENARIOS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<string, DemoScenario>,
);

function step(
  order: number,
  actor: string,
  label: string,
  detail: string,
  confidence: number,
  kind: HandoverStep['kind'],
): HandoverStep {
  return { id: `step-${order}`, order, actor, label, detail, confidence, kind };
}

const COMMON_OPENING: HandoverStep[] = [
  step(
    1,
    'Traveller',
    'Bag didn’t arrive on QF512',
    'My bag didn’t come out on the QF512 carousel — what do I do?',
    88,
    'user-turn',
  ),
  step(
    2,
    'Baggage Enquiry Bot',
    'Explains the standard trace process',
    'Grounded answer from Baggage Policies: how to lodge a property-irregularity report.',
    82,
    'agent-turn',
  ),
  step(
    3,
    'Traveller',
    'Raises urgency — medication inside',
    'It has my heart medication in it and I fly out again tonight — this is urgent.',
    71,
    'user-turn',
  ),
  step(
    4,
    'Baggage Enquiry Bot',
    'Confidence falls below threshold',
    'The bot’s next-turn confidence drops to 64 — below the 70 threshold for this Z1 public agent.',
    64,
    'confidence-breach',
  ),
];

export const HANDOVER_TO_HUMAN: HandoverScenario = {
  id: 'handover-human',
  schemaName: 'syd_baggageEnquiryBot',
  agentName: 'Baggage Enquiry Bot',
  threshold: 70,
  variant: 'to-human',
  steps: [
    ...COMMON_OPENING,
    step(
      5,
      'Assurance Hub',
      'Escalates to a human',
      'Confidence 64 < 70 → hand over to a human baggage-services agent with full context.',
      64,
      'handover-human',
    ),
    step(
      6,
      'Baggage Services (human)',
      'Human takes over',
      'Marcus Webb’s team opens a priority trace and contacts the traveller directly.',
      96,
      'resolved',
    ),
  ],
};

export const HANDOVER_TO_AGENT: HandoverScenario = {
  id: 'handover-agent',
  schemaName: 'syd_baggageEnquiryBot',
  agentName: 'Baggage Enquiry Bot',
  threshold: 70,
  variant: 'to-agent',
  steps: [
    ...COMMON_OPENING,
    step(
      5,
      'Assurance Hub',
      'Agent-to-agent handover',
      'Confidence 64 < 70 → hand over to the Airport Ops Copilot, which can run a priority baggage-trace flow.',
      64,
      'handover-agent',
    ),
    step(
      6,
      'Airport Ops Copilot',
      'Autonomous agent resolves',
      'Ops Copilot raises a priority trace flow, notifies ground crew and returns a tracking reference.',
      94,
      'resolved',
    ),
  ],
};

export const HANDOVERS: HandoverScenario[] = [HANDOVER_TO_HUMAN, HANDOVER_TO_AGENT];
