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

// --- Surfaces -------------------------------------------------------------
// Cool the light canvas off flat grey so white cards lift against it; keep
// card surfaces clean white for crisp contrast.
appLightTheme.colorNeutralBackground2 = '#F4F6FB';
appLightTheme.colorNeutralBackground3 = '#EAEEF6';

// Dark shell is a subtle desaturated navy (not flat black-grey) so the whole
// app reads calmer and less harsh. Canvas darkest → cards lift → nav lightest.
appDarkTheme.colorNeutralBackground1 = '#171E2E'; // cards / panels
appDarkTheme.colorNeutralBackground2 = '#1B2334'; // nav rail, secondary surfaces
appDarkTheme.colorNeutralBackground3 = '#0E1320'; // app canvas (deep navy)
appDarkTheme.colorNeutralBackground4 = '#222C40'; // track / inset fills
// Soften strokes to a blue-grey so borders don't cut harshly on navy.
appDarkTheme.colorNeutralStroke1 = '#39435C';
appDarkTheme.colorNeutralStroke2 = '#2A3347';
appDarkTheme.colorNeutralStroke3 = '#222A3B';

// --- Elevation ------------------------------------------------------------
// Replace Fluent's flat grey shadows with soft, layered, indigo-tinted depth
// (light) and deep glassy depth (dark). Cascades to every Panel / drawer.
const LIGHT_SHADOWS = {
  shadow2: '0 1px 2px rgba(16,23,64,0.05)',
  shadow4: '0 1px 2px rgba(16,23,64,0.04), 0 4px 12px rgba(16,23,64,0.06)',
  shadow8: '0 2px 4px rgba(16,23,64,0.04), 0 10px 26px rgba(16,23,64,0.09)',
  shadow16: '0 4px 8px rgba(16,23,64,0.05), 0 20px 48px rgba(16,23,64,0.12)',
  shadow28: '0 8px 16px rgba(16,23,64,0.07), 0 30px 72px rgba(16,23,64,0.16)',
  shadow64: '0 16px 32px rgba(16,23,64,0.09), 0 50px 120px rgba(16,23,64,0.22)',
} as const;
const DARK_SHADOWS = {
  shadow2: '0 1px 2px rgba(0,0,0,0.5)',
  shadow4: '0 1px 3px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.42)',
  shadow8: '0 2px 6px rgba(0,0,0,0.5), 0 12px 30px rgba(0,0,0,0.5)',
  shadow16: '0 6px 14px rgba(0,0,0,0.55), 0 24px 56px rgba(0,0,0,0.6)',
  shadow28: '0 10px 24px rgba(0,0,0,0.6), 0 36px 84px rgba(0,0,0,0.7)',
  shadow64: '0 20px 48px rgba(0,0,0,0.72), 0 64px 150px rgba(0,0,0,0.82)',
} as const;
Object.assign(appLightTheme, LIGHT_SHADOWS);
Object.assign(appDarkTheme, DARK_SHADOWS);
