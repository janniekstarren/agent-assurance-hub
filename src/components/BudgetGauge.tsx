/** Per-agent budget gauge — a semicircular radial gauge that changes colour as
    spend approaches the monthly cap. Encodes prepaid 125% grace-then-cutoff vs
    PAYG no-cutoff behaviour. */

import { makeStyles, tokens, Badge } from '@fluentui/react-components';
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import type { AgentBudget } from '../types/domain';
import { nf } from '../utils/format';

const useStyles = makeStyles({
  card: {
    padding: '12px 14px 14px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' },
  name: { fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  gaugeWrap: { position: 'relative', height: '120px', marginTop: '-6px' },
  center: {
    position: 'absolute',
    inset: 0,
    top: '18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  pct: { fontSize: '26px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  capText: { fontSize: '11px', color: tokens.colorNeutralForeground3, marginTop: '2px' },
  foot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: tokens.colorNeutralForeground3 },
});

function color(pct: number): string {
  if (pct > 100) return '#C50F1F';
  if (pct >= 75) return '#B88217';
  return '#107C10';
}

export function BudgetGauge({ budget }: { budget: AgentBudget }) {
  const s = useStyles();
  const uncapped = budget.monthlyCapCredits <= 0;
  const pct = uncapped ? 0 : Math.round((budget.mtdCredits / budget.monthlyCapCredits) * 100);
  // Map 0..125% of cap onto the gauge sweep so the 100% cap sits at 80% of arc.
  const arcValue = uncapped ? 0 : Math.min(100, (Math.min(pct, 125) / 125) * 100);
  const c = uncapped ? tokens.colorNeutralForeground4 : color(pct);

  return (
    <div className={s.card}>
      <div className={s.head}>
        <span className={s.name}>{budget.agentName}</span>
        <Badge appearance="outline" size="small">
          {budget.environment.toUpperCase()}
        </Badge>
      </div>
      <div className={s.gaugeWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="76%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
            data={[{ value: arcValue, fill: c }]}
            barSize={13}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background dataKey="value" cornerRadius={8} isAnimationActive animationDuration={900} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className={s.center}>
          <span className={s.pct} style={{ color: c }}>
            {uncapped ? '—' : `${pct}%`}
          </span>
          <span className={s.capText}>
            {uncapped ? 'uncapped' : `${nf(budget.mtdCredits)} / ${nf(budget.monthlyCapCredits)} cr`}
          </span>
        </div>
      </div>
      <div className={s.foot}>
        <span>
          {budget.enforcement === 'prepaid-grace' ? '125% grace → cutoff' : 'PAYG · no cutoff'}
        </span>
        {budget.hardStop ? (
          <Badge appearance="tint" color="danger" size="small">
            Hard stop
          </Badge>
        ) : uncapped ? (
          <Badge appearance="tint" color="warning" size="small">
            Shadow
          </Badge>
        ) : (
          <Badge appearance="tint" color="informative" size="small">
            Soft
          </Badge>
        )}
      </div>
    </div>
  );
}
