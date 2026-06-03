/** Executive KPI tile — count-up value, optional delta, live pulse, sparkline,
    and progress bar. Hover-raises and can deep-link. */

import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { ArrowDown16Filled, ArrowUp16Filled } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { CountUp } from './CountUp';
import { Panel } from './primitives';

const useStyles = makeStyles({
  tile: { display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' },
  head: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' },
  label: {
    fontSize: '11.5px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    lineHeight: 1.3,
  },
  headRight: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  iconChip: {
    width: '34px',
    height: '34px',
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '20px',
  },
  value: {
    fontSize: '32px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  suffix: { fontSize: '15px', fontWeight: 600, color: tokens.colorNeutralForeground3 },
  footer: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginTop: 'auto', paddingTop: '2px' },
  caption: { color: tokens.colorNeutralForeground3, lineHeight: 1.35 },
  delta: { display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 },
  good: { color: tokens.colorPaletteGreenForeground1 },
  bad: { color: tokens.colorPaletteRedForeground1 },
  pulseDot: { width: '9px', height: '9px', background: tokens.colorPaletteGreenBackground3 },
  bar: {
    height: '6px',
    borderRadius: '999px',
    backgroundColor: tokens.colorNeutralBackground4,
    overflow: 'hidden',
    marginTop: '2px',
  },
  barFill: { height: '100%', borderRadius: '999px', transition: 'width 700ms cubic-bezier(0.1,0.9,0.2,1)' },
});

function chipStyle(accent?: string): React.CSSProperties {
  return accent
    ? {
        backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${accent} 26%, transparent), color-mix(in srgb, ${accent} 9%, transparent))`,
        color: accent,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 24%, transparent)`,
      }
    : { background: tokens.colorNeutralBackground4, color: tokens.colorNeutralForeground3 };
}

export function KpiTile({
  label,
  value,
  format,
  suffix,
  caption,
  delta,
  icon,
  live,
  onClick,
  progress,
  progressColor,
  accent,
  children,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  suffix?: string;
  caption?: ReactNode;
  delta?: { value: number; good: boolean; suffix?: string };
  icon?: ReactNode;
  live?: boolean;
  onClick?: () => void;
  progress?: number;
  progressColor?: string;
  accent?: string;
  children?: ReactNode;
}) {
  const s = useStyles();
  return (
    <Panel interactive={!!onClick} onClick={onClick} className={s.tile}>
      <div className={s.head}>
        <span className={s.label}>{label}</span>
        <span className={s.headRight}>
          {live && <span className={mergeClasses('pulse-dot', s.pulseDot)} aria-label="live" />}
          {icon && (
            <span className={s.iconChip} style={chipStyle(accent)}>
              {icon}
            </span>
          )}
        </span>
      </div>
      <div className={s.value} style={accent ? { color: accent } : undefined}>
        <CountUp value={value} format={format} />
        {suffix && <span className={s.suffix}>{suffix}</span>}
      </div>
      {progress !== undefined && (
        <div className={s.bar}>
          <div
            className={s.barFill}
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: progressColor ?? tokens.colorBrandBackground,
            }}
          />
        </div>
      )}
      {(delta || caption) && (
        <div className={s.footer}>
          {delta && (
            <span className={mergeClasses(s.delta, delta.good ? s.good : s.bad)}>
              {delta.good ? <ArrowUp16Filled /> : <ArrowDown16Filled />}
              {Math.abs(delta.value)}
              {delta.suffix}
            </span>
          )}
          {caption && <span className={s.caption}>{caption}</span>}
        </div>
      )}
      {children}
    </Panel>
  );
}
