import {
  Badge,
  Button,
  Radio,
  RadioGroup,
  Spinner,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  CheckmarkCircle20Filled,
  DismissCircle20Filled,
  Clock20Regular,
} from '@fluentui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppState } from '../../app/AppState';
import { LifecycleBadge, RegistryBadge } from '../../components/badges';
import { ErrorState, LoadingState, PageContainer, Panel, SectionTitle } from '../../components/primitives';
import {
  useApprovals,
  useDecideApproval,
  usePipelineRuns,
  useSwimlane,
} from '../../services/hooks';
import type { SwimlaneCell } from '../../services/lifecycle';
import type { ApprovalRequest, Environment, PipelineRun, StageStatus } from '../../types/domain';
import { dateLong, dateShort, relativeFromNow } from '../../utils/format';

const useStyles = makeStyles({
  // approval gate
  gate: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '16px', '@media (max-width: 1000px)': { gridTemplateColumns: '1fr' } },
  pendingCard: {
    padding: '16px',
    borderRadius: tokens.borderRadiusXLarge,
    border: `1.5px solid ${tokens.colorBrandStroke1}`,
    background: tokens.colorBrandBackground2,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  pendName: { fontSize: '16px', fontWeight: 700 },
  just: { fontSize: '13px', color: tokens.colorNeutralForeground2, lineHeight: 1.5 },
  reviewerPanel: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', borderRadius: tokens.borderRadiusLarge, border: `1px solid ${tokens.colorNeutralStroke2}`, background: tokens.colorNeutralBackground1 },
  histRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: `1px solid ${tokens.colorNeutralStroke3}`, fontSize: '13px' },
  // swimlane
  laneHeader: { display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr', gap: '10px', marginBottom: '8px', position: 'sticky' },
  laneCol: { fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: tokens.colorNeutralForeground3, textAlign: 'center', padding: '6px', borderRadius: tokens.borderRadiusMedium, background: tokens.colorNeutralBackground2 },
  laneRow: { display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr', gap: '10px', alignItems: 'stretch', marginBottom: '8px' },
  laneAgent: { display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 600, paddingRight: '6px' },
  cell: {
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    cursor: 'pointer',
    minHeight: '58px',
    justifyContent: 'center',
    ':hover': { boxShadow: tokens.shadow4, border: `1px solid ${tokens.colorNeutralStroke1}` },
  },
  cellEmpty: { border: `1px dashed ${tokens.colorNeutralStroke2}`, background: 'transparent', color: tokens.colorNeutralForeground4, alignItems: 'center', justifyContent: 'center', cursor: 'default', fontSize: '18px', ':hover': { boxShadow: 'none', border: `1px dashed ${tokens.colorNeutralStroke2}` } },
  cellPubDate: { fontSize: '11px', color: tokens.colorNeutralForeground3 },
  // pipelines
  runCard: { padding: '14px', borderRadius: tokens.borderRadiusLarge, border: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground1, marginBottom: '10px' },
  runHead: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' },
  runSolution: { fontWeight: 700, fontSize: '13.5px' },
  runMeta: { fontSize: '11.5px', color: tokens.colorNeutralForeground3 },
  stages: { display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap' },
  stage: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', fontSize: '11.5px', fontWeight: 600 },
  stageConn: { width: '20px', height: '2px', background: tokens.colorNeutralStroke2 },
  notes: { fontSize: '12px', color: tokens.colorNeutralForeground2, marginTop: '8px', fontStyle: 'italic' },
});

const STAGE_STYLE: Record<StageStatus, { bg: string; fg: string }> = {
  success: { bg: tokens.colorStatusSuccessBackground2, fg: tokens.colorStatusSuccessForeground1 },
  failed: { bg: tokens.colorStatusDangerBackground2, fg: tokens.colorStatusDangerForeground1 },
  running: { bg: tokens.colorBrandBackground2, fg: tokens.colorBrandForeground1 },
  pending: { bg: tokens.colorNeutralBackground3, fg: tokens.colorNeutralForeground3 },
  skipped: { bg: tokens.colorNeutralBackground3, fg: tokens.colorNeutralForeground4 },
};

const ENVS: Environment[] = ['dev', 'test', 'prod'];

export function LifecyclePage() {
  const s = useStyles();
  const swimlane = useSwimlane();
  const pipelines = usePipelineRuns();
  const approvals = useApprovals();
  const [params] = useSearchParams();
  const focusSchema = params.get('agent');

  if (swimlane.isLoading || approvals.isLoading)
    return <PageContainer><LoadingState label="Loading lifecycle…" /></PageContainer>;
  if (swimlane.isError || !swimlane.data || !approvals.data)
    return <PageContainer><ErrorState onRetry={() => swimlane.refetch()} /></PageContainer>;

  const pending = approvals.data.filter((a) => a.state === 'requested');
  const decided = approvals.data.filter((a) => a.state !== 'requested');

  return (
    <PageContainer>
      <SectionTitle
        title="Lifecycle"
        caption="Multi-environment ALM: estate across Dev/Test/Prod, pipeline run history, and the publish approval gate."
      />

      <Panel>
        <SectionTitle title="Approval gate" caption="Publish or reject — mirrors the M365 admin-center gate + Agent 365 approval flow." />
        <div className={s.gate}>
          <div>
            <AnimatePresence mode="popLayout">
              {pending.length === 0 ? (
                <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 20, color: tokens.colorNeutralForeground3 }}>
                  No agents awaiting approval.
                </motion.div>
              ) : (
                pending.map((a) => <PendingApproval key={a.id} approval={a} />)
              )}
            </AnimatePresence>
          </div>
          <div>
            <span className={s.runMeta} style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recent decisions
            </span>
            {decided.map((a) => (
              <div key={a.id} className={s.histRow}>
                {a.state === 'published' ? (
                  <CheckmarkCircle20Filled style={{ color: tokens.colorStatusSuccessForeground1 }} />
                ) : (
                  <DismissCircle20Filled style={{ color: tokens.colorStatusDangerForeground1 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{a.agentName}</div>
                  <div className={s.runMeta}>
                    {a.state === 'published' ? 'Published' : 'Rejected'}
                    {a.scope ? ` · ${a.scope}` : ''} · {a.reviewer} · {a.decidedAt ? relativeFromNow(a.decidedAt) : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          title="Estate across environments"
          caption="The same logical agent (by schemaName) as it progresses Dev → Test → Prod. Click a cell to open the agent."
        />
        <div className={s.laneHeader}>
          <div />
          {ENVS.map((e) => (
            <div key={e} className={s.laneCol}>{e}</div>
          ))}
        </div>
        {swimlane.data.map((row, i) => (
          <motion.div
            key={row.schemaName}
            className={s.laneRow}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            style={focusSchema === row.schemaName ? { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: 4, borderRadius: 12 } : undefined}
          >
            <div className={s.laneAgent}>{row.agentName}</div>
            {ENVS.map((e) => (
              <SwimCell key={e} cell={row.byEnv[e]} />
            ))}
          </motion.div>
        ))}
      </Panel>

      <Panel>
        <SectionTitle title="Pipeline run history" caption="Power Platform Pipelines carrying solutions Dev → Test → Prod. Up to 7 stages." />
        {pipelines.isLoading || !pipelines.data ? (
          <LoadingState />
        ) : (
          pipelines.data.map((run) => <PipelineRunCard key={run.id} run={run} />)
        )}
      </Panel>
    </PageContainer>
  );
}

function SwimCell({ cell }: { cell: SwimlaneCell | null }) {
  const s = useStyles();
  const { openAgent } = useAppState();
  if (!cell) return <div className={mergeClasses(s.cell, s.cellEmpty)}>—</div>;
  return (
    <div className={s.cell} onClick={() => openAgent(cell.agentId)}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <LifecycleBadge state={cell.state} />
        <RegistryBadge status={cell.registryStatus} />
      </div>
      <span className={s.cellPubDate}>
        {cell.lastPublishedAt ? `published ${dateShort(cell.lastPublishedAt)}` : 'not published'}
      </span>
    </div>
  );
}

function PendingApproval({ approval }: { approval: ApprovalRequest }) {
  const s = useStyles();
  const decide = useDecideApproval();
  const [scope, setScope] = useState<'everyone' | 'specific-groups'>('everyone');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={s.pendingCard}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Badge appearance="tint" color="warning">Requested</Badge>
        <span className={s.pendName}>{approval.agentName}</span>
      </div>
      <div className={s.runMeta}>
        Requested by {approval.requestedBy} · {dateLong(approval.requestedAt)} · {approval.environment.toUpperCase()}
      </div>
      <div className={s.just}>{approval.justification}</div>
      <div className={s.reviewerPanel}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>Reviewer action — publish scope</span>
        <RadioGroup value={scope} onChange={(_e, d) => setScope(d.value as 'everyone' | 'specific-groups')}>
          <Radio value="everyone" label="Everyone in the organisation" />
          <Radio value="specific-groups" label="Specific groups (Baggage Services, Ops)" />
        </RadioGroup>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            appearance="primary"
            disabled={decide.isPending}
            onClick={() => decide.mutate({ id: approval.id, decision: 'approve', scope })}
          >
            {decide.isPending ? <Spinner size="tiny" /> : 'Approve & publish'}
          </Button>
          <Button
            disabled={decide.isPending}
            onClick={() => decide.mutate({ id: approval.id, decision: 'reject' })}
          >
            Reject
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function PipelineRunCard({ run }: { run: PipelineRun }) {
  const s = useStyles();
  const resultColor =
    run.result === 'success' ? 'success' : run.result === 'failed' ? 'danger' : 'brand';
  return (
    <div className={s.runCard}>
      <div className={s.runHead}>
        <span className={s.runSolution}>{run.solutionName}</span>
        <Badge appearance="tint" color={resultColor as 'success' | 'danger' | 'brand'} size="small">
          {run.result}
        </Badge>
        <span className={s.runMeta}>
          {run.agentName} · promoted by {run.promotedBy} · {dateShort(run.startedAt)}
        </span>
      </div>
      <div className={s.stages}>
        {run.stages.map((st, i) => {
          const style = STAGE_STYLE[st.status];
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <span className={s.stageConn} />}
              <span className={s.stage} style={{ background: style.bg, color: style.fg }}>
                <StageIcon status={st.status} />
                {st.name}
              </span>
            </span>
          );
        })}
      </div>
      {run.notes && <div className={s.notes}>{run.notes}</div>}
    </div>
  );
}

function StageIcon({ status }: { status: StageStatus }) {
  if (status === 'success') return <CheckmarkCircle20Filled style={{ fontSize: 14 }} />;
  if (status === 'failed') return <DismissCircle20Filled style={{ fontSize: 14 }} />;
  if (status === 'running') return <Spinner size="extra-tiny" />;
  return <Clock20Regular style={{ fontSize: 14 }} />;
}
