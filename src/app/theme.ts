/**
 * Brand theme.
 *
 * Fluent 2 light/dark themes parameterised by the Engage Squared accent ramp
 * (#165AF1). We use the official `createLightTheme` / `createDarkTheme` (the
 * same factories behind webLightTheme / webDarkTheme) so every colour, type,
 * spacing, shadow and motion value remains a Fluent token — the brand accent
 * only shapes the brand ramp used for selection / active / brand marks.
 */

import { createDarkTheme, createLightTheme } from '@fluentui/react-components';
import type { BrandVariants, Theme } from '@fluentui/react-components';

/** Engage Squared accent (#165AF1) expanded to a 16-step Fluent brand ramp. */
const brand: BrandVariants = {
  10: '#020308',
  20: '#0F1330',
  30: '#141C52',
  40: '#16246F',
  50: '#162D8D',
  60: '#1437AC',
  70: '#1547D1',
  80: '#165AF1',
  90: '#3D72F3',
  100: '#5C88F5',
  110: '#789DF7',
  120: '#94B2F9',
  130: '#AFC6FB',
  140: '#CADBFC',
  150: '#E3EDFE',
  160: '#F3F7FF',
};

/** Supporting brand ink (navy) for brand marks — used sparingly. */
export const BRAND_INK = '#13134C';
export const BRAND_PRIMARY = '#165AF1';

export const appLightTheme: Theme = {
  ...createLightTheme(brand),
};

export const appDarkTheme: Theme = {
  ...createDarkTheme(brand),
};

// Slightly deepen the dark canvas for the "never flat-and-grey" depth target.
appDarkTheme.colorNeutralBackground1 = '#16171D';
appDarkTheme.colorNeutralBackground2 = '#1C1D26';
appDarkTheme.colorNeutralBackground3 = '#23242F';
