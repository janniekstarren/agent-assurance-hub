import { Button, makeStyles, tokens } from '@fluentui/react-components';
import {
  ArrowExportRegular,
  CheckmarkCircle24Filled,
  CheckmarkCircle24Regular,
  ErrorCircle24Regular,
  PlugDisconnected24Regular,
  Warning24Filled,
  Warning24Regular,
} from '@fluentui/react-icons';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { KpiTile } from '../../components/KpiTile';
import { Sparkline } from '../../components/Sparkline';
import { AgentTypeBadge } from '../../components/AgentTypeBadge';
import { EnvBadge } from '../../components/badges';
import { ErrorState, LoadingState, Panel, SectionTitle } from '../../components/primitives';
import { useAgents, useEstateOverview, useGoldenStatus } from '../../services/hooks';
import { AttentionList, item, stagger } from './shared';

const useStyles = makeStyles({
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px 18px',
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow4,
  },
  statusIcon: { width: '44px', height: '44px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statusText: { fontSize: '16px', fontWeight: 600, lineHeight: 1.45 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(212px, 1fr))', gridAutoRows: '132px', gap: '14px' },
  cell: { height: '100%' },
  split: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: '14px', '@media (max-width: 1080px)': { gridTemplateColumns: '1fr' } },
  gRow: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 1.1fr 90px 88px',
    gap: '12px',
    alignItems: 'center',
    padding: '11px 12px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    marginBottom: '8px',
    cursor: 'pointer',
    ':hover': { boxShadow: tokens.shadow4, border: `1px solid ${tokens.colorNeutralStroke1}` },
  },
  gHead: { display: 'grid', gridTemplateColumns: '1.6fr 1.1fr 90px 88px', gap: '12px', padding: '4px 12px', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: tokens.colorNeutralForeground3 },
  gName: { display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 },
  gNameText: { fontSize: '13.5px', fontWeight: 600 },
  gMeta: { display: 'flex', alignItems: 'center', gap: '6px' },
  passWrap: { display: 'flex', flexDirection: 'column', gap: '3px' },
  passBar: { height: '7px', borderRadius: '999px', overflow: 'hidden', display: 'flex', backgroundColor: tokens.colorNeutralBackground4 },
  passLabel: { fontSize: '10.5px', color: tokens.colorNeutralForeground3 },
  delta: { textAlign: 'right', fontWeight: 700, fontSize: '13px', fontVariantNumeric: 'tabular-nums' },
});

export function MvpView() {
  const s = useStyles();
  const navigate = useNavigate();
  const golden = useGoldenStatus();
  const overview = useEstateOverview();
  const { data: agents } = useAgents();

  if (golden.isLoading || overview.isLoading) return <LoadingState label="Checking golden questions…" />;
  if (golden.isError || !golden.data || !overview.data) return <ErrorState onRetry={() => golden.refetch()} />;

  const evaluated = golden.data.length;
  const degrading = golden.data.filter((g) => g.degrading);
  const onTrack = evaluated - degrading.length;
  const nonDraft = (agents ?? []).filter((a) => a.lifecycleState !== 'draft').length;
  const noTelemetry = Math.max(0, nonDraft - evaluated);
  const issues = overview.data.attention;
  const allClear = degrading.length === 0 && issues.length === 0;

  const statusColor = allClear ? '#107C10' : degrading.length ? '#C50F1F' : '#B88217';
  const statusText =
    `${onTrack} of ${evaluated} evaluated agents are answering correctly against their golden questions.` +
    `${degrading.length ? ` ${degrading.length} ${degrading.length === 1 ? 'is' : 'are'} degrading.` : ''}` +
    `${noTelemetry ? ` ${noTelemetry} ${noTelemetry === 1 ? 'agent has' : 'agents have'} no quality telemetry.` : ''}` +
    `${issues.length ? ` ${issues.length} issue${issues.length === 1 ? '' : 's'} need attention.` : ''}`;

  return (
    <>
      <motion.div className={s.status} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <span className={s.statusIcon} style={{ background: `color-mix(in srgb, ${statusColor} 14%, transparent)`, color: statusColor }}>
          {allClear ? <CheckmarkCircle24Filled /> : <Warning24Filled />}
        </span>
        <span className={s.statusText}>{statusText}</span>
      </motion.div>

      <motion.div className={s.kpiGrid} variants={stagger} initial="initial" animate="animate">
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="On track" value={onTrack} suffix={`/ ${evaluated}`} accent="#107C10" icon={<CheckmarkCircle24Regular />} caption="passing golden questions" hint="Agents whose latest evaluation run passes their golden-question set. Source: Copilot Studio Agent Evaluation API, read from the continuous-eval Dataverse table." onClick={() => navigate('/assurance')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Degrading" value={degrading.length} accent={degrading.length ? '#C50F1F' : '#6E6E6E'} icon={<Warning24Regular />} caption="below baseline accuracy" hint="Evaluated agents whose groundedness has fallen below their published baseline, or with failing golden questions — compared run-over-run." onClick={() => navigate('/assurance')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="No telemetry" value={noTelemetry} accent={noTelemetry ? '#D83B01' : '#6E6E6E'} icon={<PlugDisconnected24Regular />} caption="not instrumented / evaluated" hint="Non-draft agents with no evaluation suite or Application Insights connection — their quality can't be measured. Source: per-agent observability." onClick={() => navigate('/coverage')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Open issues" value={issues.length} accent={issues.length ? '#D83B01' : '#6E6E6E'} icon={<ErrorCircle24Regular />} caption="need attention" hint="Items needing attention across safety, cost, drift and approvals — the list shown on the right." onClick={() => navigate('/safety')} />
        </motion.div>
      </motion.div>

      <div className={s.split}>
        <Panel>
          <SectionTitle
            title="Accuracy against golden questions"
            caption={`Only agents with an evaluation suite configured appear here${noTelemetry ? ` — ${noTelemetry} more have no quality telemetry` : ''}. Degrading agents first.`}
            actions={
              <Button size="small" appearance="subtle" icon={<ArrowExportRegular />} iconPosition="after" onClick={() => navigate('/coverage')}>
                Coverage
              </Button>
            }
          />
          <div className={s.gHead}>
            <span>Agent</span>
            <span>Golden questions</span>
            <span style={{ textAlign: 'center' }}>90-day trend</span>
            <span style={{ textAlign: 'right' }}>vs baseline</span>
          </div>
          {golden.data.map((g) => (
            <div key={g.schemaName + g.environment} className={s.gRow} onClick={() => navigate(`/assurance?agent=${g.schemaName}`)}>
              <span className={s.gName}>
                <span className={s.gNameText}>{g.agentName}</span>
                <span className={s.gMeta}>
                  <AgentTypeBadge type={g.type} short />
                  <EnvBadge env={g.environment} />
                </span>
              </span>
              <span className={s.passWrap}>
                <span className={s.passBar}>
                  <span style={{ width: `${(g.passed / g.total) * 100}%`, background: '#107C10' }} />
                  <span style={{ width: `${(g.failed / g.total) * 100}%`, background: '#C50F1F' }} />
                </span>
                <span className={s.passLabel}>
                  {g.passed} / {g.total} passing · groundedness {g.groundedness}%
                </span>
              </span>
              <span style={{ width: 90 }}>
                <Sparkline data={g.trend} height={32} color={g.degrading ? '#C50F1F' : '#107C10'} />
              </span>
              <span className={s.delta} style={{ color: g.vsBaseline < 0 ? '#C50F1F' : '#107C10' }}>
                {g.vsBaseline > 0 ? '+' : ''}
                {g.vsBaseline} pts
              </span>
            </div>
          ))}
        </Panel>

        <Panel>
          <SectionTitle title="Issues to fix" caption="The few things that need attention right now." />
          <AttentionList items={issues.slice(0, 4)} />
          {issues.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0', color: '#107C10' }}>
              <CheckmarkCircle24Filled />
              <span style={{ fontWeight: 600 }}>No open issues.</span>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
