/** Persona definitions — three stakeholder lenses on the estate. The active
    persona re-shapes the Overview and personalises the Ask assistant's prompts. */

import type { ReactElement } from 'react';
import {
  Bot24Regular,
  Briefcase24Regular,
  ShieldCheckmark24Regular,
  Target24Regular,
} from '@fluentui/react-icons';

export type PersonaId = 'mvp' | 'executive' | 'it-admin' | 'agent-owner';

export interface Persona {
  id: PersonaId;
  label: string;
  tagline: string;
  icon: ReactElement;
  accent: string;
}

export const PERSONAS: Persona[] = [
  {
    id: 'mvp',
    label: 'MVP',
    tagline: 'Just the essentials — accuracy against golden questions & key issues',
    icon: <Target24Regular />,
    accent: 'var(--aah-good)',
  },
  {
    id: 'executive',
    label: 'Executive',
    tagline: 'Board-level estate health, cost and risk',
    icon: <Briefcase24Regular />,
    accent: '#165AF1',
  },
  {
    id: 'it-admin',
    label: 'IT Admin',
    tagline: 'Governance, security, registry and approvals',
    icon: <ShieldCheckmark24Regular />,
    accent: '#00859B',
  },
  {
    id: 'agent-owner',
    label: 'Agent Owner',
    tagline: 'Your agents — quality, cost and lifecycle',
    icon: <Bot24Regular />,
    accent: '#8332B0',
  },
];

export const PERSONA_BY_ID: Record<PersonaId, Persona> = PERSONAS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<PersonaId, Persona>,
);

/** Default suggested prompts per persona. The Agent Owner set is replaced at
    runtime with prompts referencing the selected owner's own agents. */
export const PERSONA_PROMPTS: Record<PersonaId, string[]> = {
  mvp: [
    'Which agents are degrading against their golden questions?',
    'What are the top agent issues?',
    'Is the Construction Contract Checker still accurate?',
  ],
  executive: [
    'What is our estate assurance score?',
    'What did we spend on the Ops Copilot, and why?',
    'Which agents would breach budget at current run-rate?',
    'What are the top safety risks?',
  ],
  'it-admin': [
    'Which agents are leaking sensitive data?',
    'Are there any shadow agents?',
    'Which agents are pending approval?',
    'Which agents are drifting?',
  ],
  'agent-owner': [
    'Are any of my agents drifting?',
    'Which of my agents are pending approval?',
    'How is the Airport Ops Copilot performing?',
  ],
};
