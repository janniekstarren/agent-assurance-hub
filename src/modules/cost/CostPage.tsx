import { Dropdown, Option, Tab, TabList, makeStyles, tokens } from '@fluentui/react-components';
import { Info16Regular } from '@fluentui/react-icons';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppState } from '../../app/AppState';
import { BudgetGauge } from '../../components/BudgetGauge';
import { KpiTile } from '../../components/KpiTile';
import { CallerBadge, EnvBadge } from '../../components/badges';
import { ChartTooltip, useChartTheme } from '../../components/charts';
import { ErrorState, LoadingState, PageContainer, Panel, SectionTitle } from '../../components/primitives';
import { featureLabel } from '../../mock/creditWeights';
import {
  useAgents,
  useBudgets,
  useCostSummary,
  useEnvLicensing,
  useSeatLicenses,
  useSpendStacked,
} from '../../services/hooks';
import type { CallerType, MeterFeature } from '../../types/domain';
import { compact, dateShort, nf, usd } from '../../utils/format';

const FEATURE_COLOR: Record<MeterFeature, string> = {
  'reasoning-surcharge': '#C50F1F',
  'graph-grounding': '#8764B8',
  'agent-action': '#165AF1',
  'ai-tools-premium': '#E3008C',
  'generative-answer': '#00B7C3',
  'agent-flow-actions': '#CA5010',
  'content-processing': '#0B6A0B',
  'ai-tools-standard': '#6B69D6',
  'ai-tools-basic': '#986F0B',
  'classic-answer': '#5C9BD5',
  'voice-premium': '#C239B3',
  'voice-standard': '#4F6BED',
  'voice-basic': '#3FB6E6',
};

const useStyles = makeStyles({
  footnote: { fontSize: '11.5px', color: tokens.colorNeutralForeground3, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '-8px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' },
  toolbar: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' },
  spacer: { flex: 1 },
  legend: { display: 'flex', gap: '12px 16px', flexWrap: 'wrap', marginTop: '8px', fontSize: '11.5px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
  dot: { width: '10px', height: '10px', borderRadius: '3px', flexShrink: 0 },
  grid2: { display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '14px', '@media (max-width: 1080px)': { gridTemplateColumns: '1fr' } },
  attnBar: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' },
  callerRow: { display: 'flex', flexDirection: 'column', gap: '4px' },
  callerTop: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' },
  bar: { height: '14px', borderRadius: '7px', overflow: 'hidden', display: 'flex', backgroundColor: tokens.colorNeutralBackground4 },
  ruleList: { margin: '6px 0 0', paddingLeft: '18px', fontSize: '12.5px', lineHeight: 1.7, color: tokens.colorNeutralForeground2 },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', marginTop: '10px' },
  licCard: { padding: '14px', borderRadius: tokens.borderRadiusLarge, border: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground1, display: 'flex', flexDirection: 'column', gap: '6px' },
  licModel: { fontSize: '13.5px', fontWeight: 700 },
  licBig: { fontSize: '20px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  licDesc: { fontSize: '12px', color: tokens.colorNeutralForeground3, lineHeight: 1.45 },
  subH: { fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: tokens.colorNeutralForeground3, marginTop: '6px' },
  gaugeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '10px' },
});

const CALLER_OPTIONS: { value: CallerType | 'all'; label: string }[] = [
  { value: 'all', label: 'All callers' },
  { value: 'User', label: 'User (licensed)' },
  { value: 'Non-licensed user', label: 'Non-licensed user' },
  { value: 'Application', label: 'Application (autonomous)' },
  { value: 'Microsoft', label: 'Microsoft' },
];

export function CostPage() {
  const s = useStyles();
  const chart = useChartTheme();
  const [params] = useSearchParams();
  const { environment } = useAppState();
  const { data: agents } = useAgents();

  const [caller, setCaller] = useState<CallerType | 'all'>('all');
  const [agentFilter, setAgentFilter] = useState<string>(params.get('agent') ?? 'all');
  const [win, setWin] = useState<'mtd' | '90d'>('90d');

  const baseFilter = useMemo(
    () => ({
      environment,
      callerType: caller === 'all' ? undefined : caller,
      schemaName: agentFilter === 'all' ? undefined : agentFilter,
    }),
    [environment, caller, agentFilter],
  );

  const summary = useCostSummary(baseFilter);
  const stacked = useSpendStacked({ ...baseFilter, window: win });
  const budgets = useBudgets();
  const licensing = useEnvLicensing();
  const seats = useSeatLicenses();

  const uniqueAgents = useMemo(() => {
    const seen = new Map<string, string>();
    (agents ?? []).forEach((a) => seen.set(a.schemaName, a.displayName));
    return [...seen.entries()];
  }, [agents]);

  if (summary.isLoading || !summary.data)
    return <PageContainer><LoadingState label="Loading credit ledger…" /></PageContainer>;
  if (summary.isError)
    return <PageContainer><ErrorState onRetry={() => summary.refetch()} /></PageContainer>;

  const sum = summary.data;
  const orderedFeatures = (stacked.data?.features ?? [])
    .slice()
    .sort((a, b) => {
      const ta = (stacked.data?.data ?? []).reduce((s2, r) => s2 + ((r[a] as number) ?? 0), 0);
      const tb = (stacked.data?.data ?? []).reduce((s2, r) => s2 + ((r[b] as number) ?? 0), 0);
      return ta - tb; // ascending so biggest stacks on top visually
    });
  const seatMonthly = (seats.data ?? []).reduce((acc, l) => acc + l.priceUsd * l.seats, 0);
  const maxCaller = Math.max(...sum.byCallerType.map((c) => c.credits), 1);

  return (
    <PageContainer>
      <SectionTitle
        title="Cost & consumption"
        caption="Copilot Credits (renamed from messages, 1 Sep 2025) — pooled at tenant level, metered per feature and additive per interaction."
      />
      <div className={s.footnote}>
        <Info16Regular /> Figures illustrative — verify against current Microsoft pricing before a
        live demo.
      </div>

      <div className={s.kpiGrid}>
        <KpiTile label="MTD credits" value={sum.totalCredits} format={(n) => nf(n)} suffix="cr" caption="month to date" />
        <KpiTile label="Billed" value={sum.billedCredits} format={(n) => nf(n)} suffix="cr" accent="#C50F1F" caption="consumes credits" />
        <KpiTile label="Zero-rated" value={sum.zeroRatedCredits} format={(n) => nf(n)} suffix="cr" accent="#107C10" caption="M365 Copilot covered" />
        <KpiTile label="Est. consumption" value={sum.estMonthlyConsumptionUsd} format={(n) => usd(n)} caption="projected $/month (PAYG)" />
        <KpiTile label="Seat licences" value={seatMonthly} format={(n) => usd(n)} caption="M365 Copilot + Agent 365 /mo" />
      </div>

      <Panel>
        <SectionTitle
          title="Spend explorer"
          caption="Stacked by meter. The reasoning-model surcharge and Graph grounding dominate the autonomous Ops Copilot."
          actions={
            <TabList size="small" selectedValue={win} onTabSelect={(_e, d) => setWin(d.value as 'mtd' | '90d')}>
              <Tab value="mtd">MTD</Tab>
              <Tab value="90d">90 days</Tab>
            </TabList>
          }
        />
        <div className={s.toolbar}>
          <Dropdown
            size="small"
            value={CALLER_OPTIONS.find((o) => o.value === caller)?.label}
            selectedOptions={[caller]}
            onOptionSelect={(_e, d) => setCaller(d.optionValue as CallerType | 'all')}
            style={{ minWidth: 180 }}
          >
            {CALLER_OPTIONS.map((o) => (
              <Option key={o.value} value={o.value} text={o.label}>{o.label}</Option>
            ))}
          </Dropdown>
          <Dropdown
            size="small"
            value={agentFilter === 'all' ? 'All agents' : uniqueAgents.find(([sc]) => sc === agentFilter)?.[1] ?? 'All agents'}
            selectedOptions={[agentFilter]}
            onOptionSelect={(_e, d) => d.optionValue && setAgentFilter(d.optionValue)}
            style={{ minWidth: 200 }}
          >
            <Option value="all" text="All agents">All agents</Option>
            {uniqueAgents.map(([sc, name]) => (
              <Option key={sc} value={sc} text={name}>{name}</Option>
            ))}
          </Dropdown>
        </div>

        {stacked.isLoading || !stacked.data ? (
          <LoadingState />
        ) : (
          <>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stacked.data.data} margin={{ top: 6, right: 12, bottom: 0, left: 4 }}>
                  <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: chart.axis }} tickFormatter={(d) => dateShort(String(d))} minTickGap={42} />
                  <YAxis tick={{ fontSize: 10, fill: chart.axis }} tickFormatter={(v) => compact(Number(v))} />
                  <RTooltip
                    content={
                      <ChartTooltip
                        labelFormatter={(l) => dateShort(String(l))}
                        valueFormatter={(v) => `${nf(v)} cr`}
                        nameMap={(k) => featureLabel(k as MeterFeature)}
                      />
                    }
                  />
                  {orderedFeatures.map((f) => (
                    <Area
                      key={f}
                      type="monotone"
                      dataKey={f}
                      stackId="1"
                      stroke={FEATURE_COLOR[f]}
                      fill={FEATURE_COLOR[f]}
                      fillOpacity={0.55}
                      strokeWidth={1}
                      animationDuration={900}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className={s.legend}>
              {orderedFeatures
                .slice()
                .reverse()
                .map((f) => (
                  <span key={f} className={s.legendItem}>
                    <span className={s.dot} style={{ background: FEATURE_COLOR[f] }} />
                    {featureLabel(f)}
                  </span>
                ))}
            </div>
          </>
        )}
      </Panel>

      <div className={s.grid2}>
        <Panel>
          <SectionTitle
            title="Licensing attribution"
            caption="Billed vs zero-rated by caller type — why traffic does or doesn't consume credits."
          />
          <div className={s.attnBar}>
            {sum.byCallerType
              .slice()
              .sort((a, b) => b.credits - a.credits)
              .map((c) => (
                <div key={c.callerType} className={s.callerRow}>
                  <div className={s.callerTop}>
                    <CallerBadge caller={c.callerType} />
                    <span className={s.spacer} />
                    <span style={{ color: '#C50F1F' }}>{nf(c.billed)} billed</span>
                    <span style={{ color: '#107C10' }}>{nf(c.zeroRated)} free</span>
                  </div>
                  <div className={s.bar}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.billed / maxCaller) * 100}%` }}
                      transition={{ duration: 0.7, ease: [0.1, 0.9, 0.2, 1] }}
                      style={{ background: '#C50F1F' }}
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.zeroRated / maxCaller) * 100}%` }}
                      transition={{ duration: 0.7, ease: [0.1, 0.9, 0.2, 1] }}
                      style={{ background: '#107C10' }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Why billed or zero-rated?" />
          <ul className={s.ruleList}>
            <li>
              A <strong>Microsoft 365 Copilot–licensed User</strong> using an agent in Copilot
              Chat / Teams / SharePoint under their own identity → core conversational features are{' '}
              <strong style={{ color: '#107C10' }}>zero-rated</strong>.
            </li>
            <li>
              Credits are <strong style={{ color: '#C50F1F' }}>billed</strong> when the caller is{' '}
              <strong>non-licensed</strong>, the agent is <strong>external / B2C</strong> or{' '}
              <strong>autonomous</strong> (runs on its own identity), or it is published to{' '}
              <strong>non-Microsoft channels</strong>.
            </li>
            <li>Microsoft-initiated traffic is zero-rated. Credits are pooled at tenant level.</li>
          </ul>
        </Panel>
      </div>

      <Panel>
        <SectionTitle
          title="Licensing structures — side by side"
          caption="One tenant mixes billing models simultaneously, scoped per environment and agent. Yes — agents can have different licensing structures."
        />
        <div className={s.subH}>Per environment</div>
        <div className={s.cardGrid}>
          {(licensing.data ?? []).map((l) => (
            <div key={l.environment} className={s.licCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <EnvBadge env={l.environment} />
                <span className={s.licModel}>
                  {l.model === 'prepaid-capacity'
                    ? 'Prepaid capacity pack'
                    : l.model === 'shared-tenant-pool'
                      ? 'Shared tenant pool'
                      : 'Allocation + PAYG'}
                </span>
              </div>
              <span className={s.licBig}>
                {l.monthlyCredits ? `${nf(l.monthlyCredits)} cr` : 'Tenant pool'}
              </span>
              <span className={s.licDesc}>{l.description}</span>
            </div>
          ))}
        </div>

        <div className={s.subH}>Seat licences</div>
        <div className={s.cardGrid}>
          {(seats.data ?? []).map((l) => (
            <div key={l.id} className={s.licCard}>
              <span className={s.licModel}>{l.name}</span>
              <span className={s.licBig}>{usd(l.priceUsd, l.priceUsd % 1 ? 2 : 0)}</span>
              <span className={s.licDesc}>
                {l.unit} · {nf(l.seats)} seats · {usd(l.priceUsd * l.seats)} / mo
              </span>
              <span className={s.licDesc} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Info16Regular /> {l.note}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          title="Budgets & enforcement"
          caption="Per-agent monthly caps. Prepaid environments enforce a 125% grace then cut off; PAYG has no cutoff — overage is billed."
        />
        {budgets.isLoading || !budgets.data ? (
          <LoadingState />
        ) : (
          <div className={s.gaugeGrid}>
            {budgets.data
              .slice()
              .sort((a, b) => (b.mtdCredits / (b.monthlyCapCredits || 1)) - (a.mtdCredits / (a.monthlyCapCredits || 1)))
              .map((b) => (
                <BudgetGauge key={`${b.schemaName}-${b.environment}`} budget={b} />
              ))}
          </div>
        )}
      </Panel>
    </PageContainer>
  );
}
