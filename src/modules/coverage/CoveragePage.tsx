import { makeStyles, tokens } from '@fluentui/react-components';
import {
  CheckmarkCircle16Filled,
  DismissCircle16Filled,
  Info16Regular,
} from '@fluentui/react-icons';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AgentTypeBadge } from '../../components/AgentTypeBadge';
import { EnvBadge } from '../../components/badges';
import { ErrorState, LoadingState, PageContainer, Panel, SectionTitle } from '../../components/primitives';
import { useAgentObservability, useSignalCoverage } from '../../services/hooks';
import type { CoverageLevel, CoverageStatus, TelemetryLevel } from '../../types/domain';

const COVERAGE_META: Record<CoverageLevel, { label: string; color: string }> = {
  full: { label: 'Full', color: '#107C10' },
  partial: { label: 'Partial', color: '#B88217' },
  'metadata-only': { label: 'Metadata only', color: '#D83B01' },
  'requires-instrumentation': { label: 'Needs instrumentation', color: '#0F6CBD' },
  preview: { label: 'Preview', color: '#8332B0' },
};
const STATUS_COLOR: Record<CoverageStatus, string> = { GA: '#107C10', preview: '#B88217', beta: '#D83B01' };
const LEVEL_META: Record<TelemetryLevel, { label: string; color: string }> = {
  full: { label: 'Full', color: '#107C10' },
  runtime: { label: 'Runtime only', color: '#B88217' },
  classic: { label: 'Classic NLU', color: '#0F6CBD' },
  metadata: { label: 'Metadata only', color: '#D83B01' },
  none: { label: 'None', color: '#C50F1F' },
};

const useStyles = makeStyles({
  banner: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    padding: '14px 16px',
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    background: tokens.colorNeutralBackground2,
    fontSize: '13px',
    lineHeight: 1.5,
    color: tokens.colorNeutralForeground2,
  },
  scroll: { overflowX: 'auto' },
  sigHead: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 2fr 0.7fr 1fr 2.4fr',
    gap: '12px',
    padding: '4px 12px',
    fontSize: '10.5px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: tokens.colorNeutralForeground3,
    minWidth: '900px',
  },
  sigRow: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 2fr 0.7fr 1fr 2.4fr',
    gap: '12px',
    padding: '11px 12px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    fontSize: '12.5px',
    alignItems: 'center',
    minWidth: '900px',
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorNeutralBackground2 },
  },
  sigName: { fontWeight: 600 },
  source: { fontSize: '11.5px', color: tokens.colorNeutralForeground3, fontFamily: 'ui-monospace, Consolas, monospace' },
  caveat: { fontSize: '11.5px', color: tokens.colorNeutralForeground3, lineHeight: 1.4 },
  pill: { display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, border: '1px solid', whiteSpace: 'nowrap', width: 'fit-content' },
  obsHead: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 0.7fr 0.9fr 0.9fr 1fr 1fr',
    gap: '12px',
    padding: '4px 12px',
    fontSize: '10.5px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: tokens.colorNeutralForeground3,
    minWidth: '820px',
  },
  obsRow: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 0.7fr 0.9fr 0.9fr 1fr 1fr',
    gap: '12px',
    padding: '11px 12px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    fontSize: '12.5px',
    alignItems: 'center',
    minWidth: '820px',
  },
  obsName: { display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 },
  obsNameText: { fontWeight: 600 },
});

function Pill({ label, color }: { label: string; color: string }) {
  const s = useStyles();
  return (
    <span className={s.pill} style={{ color, borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
      {label}
    </span>
  );
}

function YesNo({ value }: { value: boolean }) {
  return value ? (
    <CheckmarkCircle16Filled style={{ color: '#107C10' }} />
  ) : (
    <DismissCircle16Filled style={{ color: tokens.colorNeutralForeground4 }} />
  );
}

export function CoveragePage() {
  const s = useStyles();
  const navigate = useNavigate();
  const signals = useSignalCoverage();
  const agents = useAgentObservability();

  if (signals.isLoading || agents.isLoading)
    return <PageContainer><LoadingState label="Loading coverage…" /></PageContainer>;
  if (signals.isError || !signals.data || !agents.data)
    return <PageContainer><ErrorState onRetry={() => signals.refetch()} /></PageContainer>;

  return (
    <PageContainer>
      <SectionTitle
        title="Data sources & coverage"
        caption="Where every signal actually comes from — and how complete the coverage really is."
      />

      <div className={s.banner}>
        <Info16Regular style={{ marginTop: 2, flexShrink: 0 }} />
        <span>
          <strong>Observability is not uniform.</strong> Inventory, safety metadata, cost and
          lifecycle are broadly available. But <strong>quality signals (groundedness, confidence,
          drift) require the agent to be a Copilot Studio / Foundry agent with Application Insights
          connected and an evaluation suite configured.</strong> Generative confidence is derived
          from instrumented events — not a native Copilot Studio API. SharePoint / declarative
          agents are a runtime black box (Purview metadata only), and shadow agents have no
          telemetry at all. This view is honest about every gap; verify preview/GA states before a
          live demo.
        </span>
      </div>

      <Panel>
        <SectionTitle title="Signal coverage" caption="Each module's signal mapped to its real Microsoft source." />
        <div className={`${s.scroll} scroll-area`} style={{ marginTop: 8 }}>
          <div className={s.sigHead}>
            <span>Signal</span>
            <span>Source</span>
            <span>Status</span>
            <span>Coverage</span>
            <span>Caveat</span>
          </div>
          {signals.data.map((c) => (
            <div key={c.signal} className={s.sigRow} onClick={() => navigate(c.route)}>
              <span className={s.sigName}>{c.signal}</span>
              <span className={s.source}>{c.source}</span>
              <span>
                <Pill label={c.status} color={STATUS_COLOR[c.status]} />
              </span>
              <span>
                <Pill label={COVERAGE_META[c.coverage].label} color={COVERAGE_META[c.coverage].color} />
              </span>
              <span className={s.caveat}>{c.caveat}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Per-agent observability" caption="What telemetry is actually available for each agent — least to most instrumented." />
        <div className={`${s.scroll} scroll-area`} style={{ marginTop: 8 }}>
          <div className={s.obsHead}>
            <span>Agent</span>
            <span>Env</span>
            <span>App Insights</span>
            <span>Evaluation</span>
            <span>Confidence</span>
            <span>Telemetry</span>
          </div>
          {agents.data.map((a) => (
            <motion.div
              key={a.schemaName + a.environment}
              className={s.obsRow}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <span className={s.obsName}>
                <span className={s.obsNameText}>{a.agentName}</span>
                <AgentTypeBadge type={a.type} short />
              </span>
              <span><EnvBadge env={a.environment} /></span>
              <span><YesNo value={a.appInsights} /></span>
              <span><YesNo value={a.evaluation} /></span>
              <span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                {a.confidence === 'classic-nlu' ? 'Recognition' : a.confidence === 'derived' ? 'Derived' : '—'}
              </span>
              <span>
                <Pill label={LEVEL_META[a.level].label} color={LEVEL_META[a.level].color} />
              </span>
            </motion.div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11.5, color: tokens.colorNeutralForeground3, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Info16Regular style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Classic-NLU agents expose recognition confidence but not generative groundedness.
            Uninstrumented agents are governance-metadata-only. Shadow agents have no observability —
            which is exactly why they are a risk.
          </span>
        </div>
      </Panel>
    </PageContainer>
  );
}
