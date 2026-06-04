/** Themed Recharts helpers. Colours derive from the active Fluent theme so
    charts track light/dark; the categorical palette is aligned to Fluent hues. */

import { makeStyles, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { useAppState } from '../app/AppState';
import { appDarkTheme, appLightTheme } from '../app/theme';

export interface ChartTheme {
  axis: string;
  grid: string;
  text: string;
  brand: string;
  success: string;
  warning: string;
  danger: string;
  categorical: string[];
}

const CATEGORICAL = [
  '#165AF1',
  '#3FB6E6',
  'var(--aah-good)',
  '#8764B8',
  '#F7A700',
  '#E3008C',
  '#00B7C3',
  '#6B69D6',
  '#CA5010',
  '#0B6A0B',
  '#C239B3',
  '#4F6BED',
  '#986F0B',
];

export function useChartTheme(): ChartTheme {
  const { themeMode } = useAppState();
  const t = themeMode === 'dark' ? appDarkTheme : appLightTheme;
  return {
    axis: t.colorNeutralForeground4,
    grid: t.colorNeutralStroke2,
    text: t.colorNeutralForeground3,
    brand: t.colorBrandBackground,
    success: t.colorPaletteGreenForeground1,
    warning: t.colorPaletteDarkOrangeForeground1,
    danger: t.colorPaletteRedForeground1,
    categorical: CATEGORICAL,
  };
}

const useTooltipStyles = makeStyles({
  tip: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow16,
    padding: '8px 10px',
    fontSize: '12px',
    minWidth: '120px',
  },
  label: { fontWeight: 700, marginBottom: '4px' },
  row: { display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' },
  left: { display: 'flex', alignItems: 'center', gap: '6px' },
  dot: { width: '9px', height: '9px', borderRadius: '2px', flexShrink: 0 },
  value: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
});

export interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  nameMap,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter?: (l: string | number) => string;
  valueFormatter?: (v: number) => string;
  nameMap?: (k: string) => string;
}) {
  const s = useTooltipStyles();
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={s.tip}>
      {label !== undefined && (
        <div className={s.label}>{labelFormatter ? labelFormatter(label) : String(label)}</div>
      )}
      {payload.map((entry, i) => {
        const key = String(entry.name ?? entry.dataKey ?? i);
        const num = typeof entry.value === 'number' ? entry.value : Number(entry.value);
        return (
          <div className={s.row} key={i}>
            <span className={s.left}>
              <span className={s.dot} style={{ background: entry.color }} />
              {nameMap ? nameMap(key) : key}
            </span>
            <span className={s.value}>
              {valueFormatter && !Number.isNaN(num) ? valueFormatter(num) : String(entry.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ChartFrame({ height = 240, children }: { height?: number; children: ReactNode }) {
  return <div style={{ width: '100%', height }}>{children}</div>;
}
