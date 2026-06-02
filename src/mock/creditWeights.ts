/**
 * Copilot Credits — per-feature meter weights.
 *
 * Source: Microsoft Copilot Studio / Copilot billing documentation. Credits
 * (renamed from "messages" on 1 Sep 2025) are pooled at tenant level and
 * metered per feature, additive per interaction. These weights are seeded
 * verbatim from the brief; verify against current Microsoft pricing before a
 * live demo.
 */

import type { CreditWeight, MeterFeature } from '../types/domain';

export const CREDIT_WEIGHTS: CreditWeight[] = [
  { feature: 'classic-answer', label: 'Classic answer', credits: 1, unit: 'per answer' },
  { feature: 'generative-answer', label: 'Generative answer', credits: 2, unit: 'per answer' },
  {
    feature: 'agent-action',
    label: 'Agent action',
    credits: 5,
    unit: 'per trigger / reasoning step / topic transition / CUA step',
  },
  {
    feature: 'graph-grounding',
    label: 'Tenant Graph grounding',
    credits: 10,
    unit: 'per message (Work IQ / Graph RAG)',
  },
  {
    feature: 'agent-flow-actions',
    label: 'Agent flow actions',
    credits: 0.13,
    unit: 'per action (13 per 100)',
  },
  {
    feature: 'ai-tools-basic',
    label: 'Generative AI tools — basic',
    credits: 0.1,
    unit: 'per response (1 per 10)',
  },
  {
    feature: 'ai-tools-standard',
    label: 'Generative AI tools — standard',
    credits: 1.5,
    unit: 'per response (15 per 10)',
  },
  {
    feature: 'ai-tools-premium',
    label: 'Generative AI tools — premium',
    credits: 10,
    unit: 'per response (100 per 10)',
  },
  {
    feature: 'reasoning-surcharge',
    label: 'Reasoning-model surcharge',
    credits: 10,
    unit: 'premium AI-tools rate, on top of the feature',
  },
  { feature: 'content-processing', label: 'Content processing', credits: 8, unit: 'per page' },
  { feature: 'voice-basic', label: 'Voice — basic', credits: 10, unit: 'per minute' },
  { feature: 'voice-standard', label: 'Voice — standard', credits: 35, unit: 'per minute' },
  {
    feature: 'voice-premium',
    label: 'Voice — premium (realtime)',
    credits: 75,
    unit: 'per minute',
  },
];

export const CREDIT_WEIGHT_BY_FEATURE: Record<MeterFeature, CreditWeight> =
  CREDIT_WEIGHTS.reduce(
    (acc, w) => {
      acc[w.feature] = w;
      return acc;
    },
    {} as Record<MeterFeature, CreditWeight>,
  );

/** Short human label for a meter feature. */
export function featureLabel(feature: MeterFeature): string {
  return CREDIT_WEIGHT_BY_FEATURE[feature]?.label ?? feature;
}
