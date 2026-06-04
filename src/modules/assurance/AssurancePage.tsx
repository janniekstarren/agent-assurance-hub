import {
  Badge,
  Button,
  Dropdown,
  Option,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { BookInformation20Regular, Warning20Filled } from '@fluentui/react-icons';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppState } from '../../app/AppState';
import { GateBadge } from '../../components/badges';
import { ChartTooltip, useChartTheme } from '../../components/charts';
import {
  ErrorState,
  LoadingState,
  PageContainer,
  Panel,
  SectionTitle,
} from '../../components/primitives';
import { useAgents, useAssuranceSummary, useQualityGates } from '../../services/hooks';
import type { Agent, Observability, TelemetryLevel } from '../../types/domain';
import { dateShort, pct } from '../../utils/format';

const useStyles = makeStyles({
  toolbar: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', '@media (max-width: 1080px)': { gridTemplateColumns: '1fr' } },
  legend: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px', fontSize: '12px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
  dot: { width: '10px', height: '10px', borderRadius: '3px' },
  driftCallout: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    padding: '12px 14px',
    borderRadius: tokens.borderRadiusLarge,
    background: tokens.colorStatusWarningBackground1,
    color: tokens.colorStatusWarningForeground2,
    marginBottom: '12px',
  },
  confNote: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    padding: '10px 14px',
    borderRadius: tokens.borderRadiusLarge,
    background: tokens.colorStatusWarningBackground1,
    color: tokens.colorStatusWarningForeground2,
    fontSize: '12px',
    lineHeight: 1.45,
  },
  cases: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' },
  caseRow: {
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  caseTop: { display: 'flex', alignItems: 'center', gap: '8px' },
  caseQ: { fontWeight: 600, fontSize: '13px', flex: 1 },
  caseExpl: { fontSize: '12px', color: tokens.colorNeutralForeground3, lineHeight: 1.45 },
  regSummary: { display: 'flex', gap: '10px', marginBottom: '4px' },
  regChip: { padding: '8px 12px', borderRadius: tokens.borderRadiusLarge, background: tokens.colorNeutralBackground2, fontSize: '12px' },
  regNum: { fontSize: '18px', fontWeight: 700 },
  gateGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', marginTop: '10px' },
  gateCard: {
    padding: '12px 14px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  gateTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' },
  gateName: { fontWeight: 600, fontSize: '13.5px' },
  gateMetrics: { display: 'flex', gap: '14px', fontSize: '12px', color: tokens.colorNeutralForeground3 },
  runbook: { display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '300px' },
  runStep: { fontSize: '12px', display: 'flex', gap: '8px' },
});

const SERIES = [
  { key: 'groundedness', label: 'Groundedness', color: '#165AF1' },
  { key: 'relevance', label: 'Relevance', color: '#00B7C3' },
  { key: 'completeness', label: 'Completeness', color: '#8764B8' },
  { key: 'abstention', label: 'Abstention', color: '#F7A700' },
] as const;

function defaultAgent(agents: Agent[], focusSchema: string | null): Agent | undefined {
  if (focusSchema) {
    const f = agents.find((a) => a.schemaName === focusSchema && a.environment === 'prod')
      ?? agents.find((a) => a.schemaName === focusSchema);
    if (f) return f;
  }
  return (
    agents.find((a) => a.schemaName === 'syd_contractChecker' && a.environment === 'prod') ??
    agents.find((a) => a.environment === 'prod')
  );
}

export function AssurancePage() {
  const s = useStyles();
  const [params] = useSearchParams();
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const focusSchema = params.get('agent');
  const selectableAgents = useMemo(
    () => (agents ?? []).filter((a) => a.lifecycleState !== 'draft'),
    [agents],
  );
  const selected =
    selectableAgents.find((a) => a.id === selectedId) ?? defaultAgent(selectableAgents, focusSchema);

  if (isLoading) return <PageContainer><LoadingState label="Loading evaluation data…" /></PageContainer>;
  if (isError || !agents || !selected)
    return <PageContainer><ErrorState onRetry={() => refetch()} /></PageContainer>;

  return (
    <PageContainer>
      <SectionTitle
        title="Assurance"
        caption="Accuracy, drift and confidence from simulated agent-evaluation runs and runtime telemetry."
      />

      <div className={s.toolbar}>
        <span style={{ fontSize: 12, fontWeight: 600, color: tokens.colorNeutralForeground3 }}>
          Agent
        </span>
        <Dropdown
          value={`${selected.displayName} · ${selected.environment.toUpperCase()}`}
          selectedOptions={[selected.id]}
          onOptionSelect={(_e, d) => d.optionValue && setSelectedId(d.optionValue)}
          style={{ minWidth: 280 }}
        >
          {selectableAgents.map((a) => (
            <Option key={a.id} value={a.id} text={`${a.displayName} · ${a.environment.toUpperCase()}`}>
              {a.displayName} · {a.environment.toUpperCase()}
            </Option>
          ))}
        </Dropdown>
      </div>

      <AgentAssurance key={selected.id} agent={selected} />

      <Panel>
        <SectionTitle
          title="Quality gates"
          caption="Each agent's evaluation gate against thresholds, with an alert-to-action runbook."
        />
        <QualityGatesBoard />
      </Panel>
    </PageContainer>
  );
}

function AgentAssurance({ agent }: { agent: Agent }) {
  const s = useStyles();
  const chart = useChartTheme();
  const { data, isLoading } = useAssuranceSummary(agent.schemaName, agent.environment);
  if (isLoading || !data) return <Panel><LoadingState /></Panel>;

  const obs = data.observability;
  const run = data.latestRun;
  const hasEval = data.evalSeries.length > 0 && !!run;
  const hasConfidence = data.confidenceSeries.length > 0;
  const confLabel =
    obs.confidence === 'classic-nlu' ? 'Recognition confidence (classic NLU)' : 'Mean confidence';
  const breaches = data.confidenceSeries.filter((p) => p.mean < data.confidenceThreshold).length;

  return (
    <>
      <ObsBanner obs={obs} />

      <Panel>
        <SectionTitle
          title="Evaluation scores — 90 days"
          caption={
            obs.confidence === 'classic-nlu'
              ? 'Generative groundedness does not apply to classic-NLU (scripted) answers.'
              : "Groundedness, relevance, completeness and abstention from the agent's evaluation runs (golden set)."
          }
        />
        {hasEval ? (
          <>
        {data.drift && (
          <div className={s.driftCallout}>
            <Warning20Filled />
            <div>
              <strong>Drift detected — {dateShort(data.drift.at)}.</strong> {data.drift.description}{' '}
              Groundedness fell from {pct(data.drift.groundednessBefore)} to{' '}
              {pct(data.drift.groundednessAfter)}.
            </div>
          </div>
        )}
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.evalSeries} margin={{ top: 6, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: chart.axis }}
                tickFormatter={(d) => dateShort(String(d))}
                minTickGap={40}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: chart.axis }} />
              <RTooltip
                content={
                  <ChartTooltip labelFormatter={(l) => dateShort(String(l))} valueFormatter={(v) => pct(v)} />
                }
              />
              {data.drift && (
                <>
                  <ReferenceArea
                    x1={data.drift.at}
                    x2={data.evalSeries[data.evalSeries.length - 1]?.date}
                    fill={chart.warning}
                    fillOpacity={0.07}
                  />
                  <ReferenceLine
                    x={data.drift.at}
                    stroke={chart.warning}
                    strokeDasharray="4 3"
                    label={{ value: 'KB change', position: 'top', fontSize: 10, fill: chart.warning }}
                  />
                </>
              )}
              {SERIES.map((ser) => (
                <Line
                  key={ser.key}
                  type="monotone"
                  dataKey={ser.key}
                  name={ser.label}
                  stroke={ser.color}
                  strokeWidth={2}
                  dot={false}
                  animationDuration={1100}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={s.legend}>
          {SERIES.map((ser) => (
            <span key={ser.key} className={s.legendItem}>
              <span className={s.dot} style={{ background: ser.color }} />
              {ser.label}
            </span>
          ))}
        </div>
          </>
        ) : (
          <NotAvailable obs={obs} signal="Evaluation & groundedness" />
        )}
      </Panel>

      {hasConfidence ? (
      <div className={s.grid2}>
        <Panel>
          <SectionTitle
            title={confLabel + ' — over time'}
            caption={`Threshold ${data.confidenceThreshold}. ${breaches} day(s) below threshold.`}
          />
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.confidenceSeries} margin={{ top: 6, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: chart.axis }}
                  tickFormatter={(d) => dateShort(String(d))}
                  minTickGap={40}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: chart.axis }} />
                <RTooltip
                  content={
                    <ChartTooltip labelFormatter={(l) => dateShort(String(l))} valueFormatter={(v) => pct(v)} />
                  }
                />
                <ReferenceArea y1={0} y2={data.confidenceThreshold} fill={chart.danger} fillOpacity={0.06} />
                <ReferenceLine
                  y={data.confidenceThreshold}
                  stroke={chart.danger}
                  strokeDasharray="4 3"
                  label={{ value: `threshold ${data.confidenceThreshold}`, position: 'insideBottomRight', fontSize: 10, fill: chart.danger }}
                />
                <Area
                  type="monotone"
                  dataKey="mean"
                  name="Mean confidence"
                  stroke={chart.brand}
                  fill={chart.brand}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  animationDuration={1000}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            title="Confidence distribution"
            caption="Per-response confidence. Bars below threshold are flagged."
          />
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.confidenceHistogram} margin={{ top: 6, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: chart.axis }} interval={1} />
                <YAxis tick={{ fontSize: 10, fill: chart.axis }} />
                <RTooltip content={<ChartTooltip valueFormatter={(v) => `${v} responses`} />} />
                <Bar dataKey="count" name="Responses" radius={[3, 3, 0, 0]} animationDuration={900}>
                  {data.confidenceHistogram.map((bin) => (
                    <Cell
                      key={bin.bucket}
                      fill={bin.lower < data.confidenceThreshold ? chart.danger : chart.brand}
                      fillOpacity={bin.lower < data.confidenceThreshold ? 0.85 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      ) : (
        <Panel>
          <SectionTitle title="Confidence" />
          <NotAvailable obs={obs} signal="Confidence" />
        </Panel>
      )}

      {hasConfidence && (
        <div className={s.confNote}>
          <Warning20Filled style={{ flexShrink: 0 }} />
          <span>
            Generative-answer confidence is <strong>not a native Copilot Studio API</strong> — it is
            derived from Application Insights custom events the agent emits. Classic-NLU agents
            expose recognition confidence directly.
          </span>
        </div>
      )}

      {run && (
      <Panel>
        <SectionTitle
          title="Regression vs baseline"
          caption="The latest evaluation run's golden-question set against the published baseline."
        />
        {run.regression && (
          <div className={s.regSummary}>
            <span className={s.regChip}>
              <span className={s.regNum} style={{ color: chart.success }}>
                {run.regression.passed}
              </span>{' '}
              passed
            </span>
            <span className={s.regChip}>
              <span className={s.regNum} style={{ color: chart.danger }}>
                {run.regression.failed}
              </span>{' '}
              failed
            </span>
            <span className={s.regChip}>
              <span className={s.regNum} style={{ color: run.regression.vsBaseline < 0 ? chart.danger : chart.success }}>
                {run.regression.vsBaseline > 0 ? '+' : ''}
                {run.regression.vsBaseline}
              </span>{' '}
              pts vs baseline
            </span>
          </div>
        )}
        <div className={s.cases}>
          {run.testCases.map((c) => (
            <motion.div
              key={c.id}
              className={s.caseRow}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={!c.passed ? { borderColor: tokens.colorPaletteRedBorder1 } : undefined}
            >
              <div className={s.caseTop}>
                <Badge appearance="filled" color={c.passed ? 'success' : 'danger'} size="small">
                  {c.passed ? 'Pass' : 'Fail'}
                </Badge>
                <span className={s.caseQ}>{c.question}</span>
                <span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                  G {pct(c.groundedness)}
                </span>
              </div>
              <span className={s.caseExpl}>{c.aiExplanation}</span>
            </motion.div>
          ))}
        </div>
      </Panel>
      )}
    </>
  );
}

const LEVEL_META: Record<TelemetryLevel, { label: string; color: string; desc: string }> = {
  full: { label: 'Full telemetry', color: 'var(--aah-good)', desc: 'App Insights connected + evaluation suite configured.' },
  runtime: { label: 'Runtime only', color: 'var(--aah-warn)', desc: 'Instrumented, but no evaluation suite — groundedness unavailable.' },
  classic: { label: 'Classic NLU', color: '#0F6CBD', desc: 'Recognition confidence available; generative groundedness not applicable.' },
  metadata: { label: 'Metadata only', color: 'var(--aah-danger)', desc: 'Not instrumented — only Purview governance metadata.' },
  none: { label: 'No observability', color: 'var(--aah-bad)', desc: 'Shadow / unmonitored — no telemetry.' },
};

function ObsBanner({ obs }: { obs: Observability }) {
  const m = LEVEL_META[obs.level];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        fontSize: 12.5,
        border: `1px solid color-mix(in srgb, ${m.color} 35%, transparent)`,
        background: `color-mix(in srgb, ${m.color} 9%, transparent)`,
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 999, background: m.color, flexShrink: 0 }} />
      <span>
        <strong style={{ color: m.color }}>Telemetry: {m.label}.</strong> {obs.note ?? m.desc}
      </span>
    </div>
  );
}

function NotAvailable({ obs, signal }: { obs: Observability; signal: string }) {
  const needsInstrumentation = obs.level === 'metadata' || obs.level === 'runtime';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '34px 20px', textAlign: 'center' }}>
      <Warning20Filled style={{ fontSize: 26, color: tokens.colorNeutralForeground4 }} />
      <div style={{ fontWeight: 700, fontSize: 14 }}>{signal} not available</div>
      <div style={{ fontSize: 12.5, color: tokens.colorNeutralForeground3, maxWidth: 440, lineHeight: 1.5 }}>
        {obs.note ?? 'No telemetry available for this agent.'}
      </div>
      {needsInstrumentation && (
        <div style={{ fontSize: 11.5, color: tokens.colorNeutralForeground4, maxWidth: 440 }}>
          Connect Application Insights and configure an evaluation suite (golden set) to populate this.
        </div>
      )}
    </div>
  );
}

const RUNBOOK: Record<string, string[]> = {
  fail: [
    'Freeze promotion — block the pipeline gate.',
    'Diff the knowledge source against the last good baseline.',
    'Re-run the evaluation suite; compare groundedness vs baseline.',
    'Notify the owner and open a drift review.',
  ],
  warn: [
    'Schedule a re-evaluation within 24h.',
    'Review recent knowledge-source or prompt changes.',
    'Tighten the system prompt if abstention is rising.',
  ],
  pass: ['No action — within thresholds. Keep monitoring.'],
};

function QualityGatesBoard() {
  const s = useStyles();
  const chart = useChartTheme();
  const { openAgent } = useAppState();
  const { data: gates, isLoading } = useQualityGates();
  const { data: agents } = useAgents();
  if (isLoading || !gates) return <LoadingState />;

  return (
    <div className={s.gateGrid}>
      {gates
        .slice()
        .sort((a, b) => (a.gateStatus === 'fail' ? -1 : 1) - (b.gateStatus === 'fail' ? -1 : 1))
        .map((g) => {
          const agentId = agents?.find((a) => a.schemaName === g.schemaName && a.environment === g.environment)?.id;
          return (
            <div key={`${g.schemaName}-${g.environment}`} className={s.gateCard}>
              <div className={s.gateTop}>
                <span className={s.gateName}>{g.agentName}</span>
                <GateBadge status={g.gateStatus} />
              </div>
              <div className={s.gateMetrics}>
                <span>{g.environment.toUpperCase()}</span>
                <span style={{ color: g.groundedness < 75 ? chart.danger : undefined }}>
                  G {pct(g.groundedness)}
                </span>
                <span>R {pct(g.relevance)}</span>
                {g.regressionFailed > 0 && (
                  <span style={{ color: chart.danger }}>
                    {g.regressionFailed}/{g.regressionTotal} failed
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Popover withArrow>
                  <PopoverTrigger disableButtonEnhancement>
                    <Button size="small" appearance="subtle" icon={<BookInformation20Regular />}>
                      Runbook
                    </Button>
                  </PopoverTrigger>
                  <PopoverSurface>
                    <div className={s.runbook}>
                      <strong>Alert-to-action runbook</strong>
                      {(RUNBOOK[g.gateStatus] ?? []).map((step, i) => (
                        <span key={i} className={s.runStep}>
                          <span style={{ color: chart.brand, fontWeight: 700 }}>{i + 1}.</span>
                          {step}
                        </span>
                      ))}
                    </div>
                  </PopoverSurface>
                </Popover>
                {agentId && (
                  <Button size="small" appearance="subtle" onClick={() => openAgent(agentId)}>
                    Open agent
                  </Button>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
