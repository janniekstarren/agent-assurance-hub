import { Badge, Button, makeStyles, tokens } from '@fluentui/react-components';
import {
  Bot24Regular,
  ChevronRight20Regular,
  ClockArrowDownload24Regular,
  Money24Regular,
  ShieldCheckmark24Regular,
  ShieldError24Regular,
} from '@fluentui/react-icons';
import { motion } from 'framer-motion';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { PageContainer, Panel, SectionTitle, LoadingState, ErrorState } from '../../components/primitives';
import { KpiTile } from '../../components/KpiTile';
import { Sparkline } from '../../components/Sparkline';
import { SeverityBadge } from '../../components/badges';
import { useEstateOverview, usePulse } from '../../services/hooks';
import { nf } from '../../utils/format';
import type { AttentionItem, GovernanceZone } from '../../types/domain';

const useStyles = makeStyles({
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(216px, 1fr))',
    gridAutoRows: '150px',
    gap: '14px',
  },
  kpiCell: { height: '100%' },
  split: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)',
    gap: '14px',
    '@media (max-width: 1080px)': { gridTemplateColumns: '1fr' },
  },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '14px' },
  attnList: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' },
  attnRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 12px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    transitionProperty: 'transform, box-shadow, border-color',
    transitionDuration: '140ms',
    ':hover': {
      transform: 'translateX(2px)',
      boxShadow: tokens.shadow8,
      border: `1px solid ${tokens.colorNeutralStroke1}`,
    },
  },
  attnIcon: {
    width: '34px',
    height: '34px',
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attnMain: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  attnName: { fontSize: '13.5px', fontWeight: 600 },
  attnDetail: { fontSize: '12px', color: tokens.colorNeutralForeground3 },
  donutWrap: { position: 'relative', height: '190px' },
  donutCenter: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  donutNum: { fontSize: '28px', fontWeight: 700, lineHeight: 1 },
  donutLabel: { fontSize: '11px', color: tokens.colorNeutralForeground3, textTransform: 'uppercase' },
  legend: { display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '6px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' },
  legendDot: { width: '10px', height: '10px', borderRadius: '3px' },
  zoneRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  zoneLabel: { width: '116px', fontSize: '12px', fontWeight: 600, flexShrink: 0 },
  zoneBarBg: {
    flex: 1,
    height: '10px',
    borderRadius: '999px',
    backgroundColor: tokens.colorNeutralBackground4,
    overflow: 'hidden',
  },
  zoneBarFill: { height: '100%', borderRadius: '999px' },
  zoneCount: { width: '24px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
});

const ENV_COLORS: Record<string, string> = { Dev: '#3FB6E6', Test: '#F7A700', Prod: '#13A10E' };
const ZONE_COLORS: Record<GovernanceZone, string> = { Z1: '#3FB6E6', Z2: '#165AF1', Z3: '#8764B8' };
const ZONE_NAMES: Record<GovernanceZone, string> = {
  Z1: 'Z1 · Citizen',
  Z2: 'Z2 · Partnered',
  Z3: 'Z3 · Professional',
};

const REASON_TINT: Record<string, { bg: string; fg: string }> = {
  'over-budget': { bg: tokens.colorStatusDangerBackground2, fg: tokens.colorStatusDangerForeground1 },
  leak: { bg: tokens.colorStatusDangerBackground2, fg: tokens.colorStatusDangerForeground1 },
  drift: { bg: tokens.colorStatusWarningBackground2, fg: tokens.colorStatusWarningForeground2 },
  'pending-approval': { bg: tokens.colorBrandBackground2, fg: tokens.colorBrandForeground1 },
  stale: { bg: tokens.colorNeutralBackground4, fg: tokens.colorNeutralForeground3 },
  'low-confidence': { bg: tokens.colorStatusWarningBackground2, fg: tokens.colorStatusWarningForeground2 },
};

function reasonIcon(reason: AttentionItem['reason']) {
  switch (reason) {
    case 'over-budget':
      return <Money24Regular />;
    case 'leak':
      return <ShieldError24Regular />;
    case 'drift':
      return <ShieldCheckmark24Regular />;
    case 'pending-approval':
      return <ClockArrowDownload24Regular />;
    default:
      return <Bot24Regular />;
  }
}

const stagger = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const item = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.1, 0.9, 0.2, 1] as const } },
};

export function OverviewPage() {
  const s = useStyles();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useEstateOverview();
  const { data: pulse } = usePulse();

  if (isLoading) return <PageContainer><LoadingState label="Loading estate health…" /></PageContainer>;
  if (isError || !data)
    return (
      <PageContainer>
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );

  const spendPct = Math.round((data.mtdCredits / data.budgetCredits) * 100);
  const spendColor =
    spendPct > 90 ? '#C50F1F' : spendPct > 75 ? '#F7A700' : '#13A10E';
  const assuranceColor =
    data.assuranceScore >= 85 ? '#13A10E' : data.assuranceScore >= 70 ? '#F7A700' : '#C50F1F';
  const pulseNow = pulse && pulse.length ? pulse[pulse.length - 1].value : 0;

  const envData = [
    { name: 'Dev', value: data.agentsByEnvironment.dev },
    { name: 'Test', value: data.agentsByEnvironment.test },
    { name: 'Prod', value: data.agentsByEnvironment.prod },
  ];
  const zoneMax = Math.max(...(Object.values(data.agentsByZone) as number[]), 1);

  return (
    <PageContainer>
      <SectionTitle
        title="Estate health"
        caption="Accuracy, safety, cost and lifecycle across every agent — Dev, Test and Prod."
      />

      <motion.div className={s.kpiGrid} variants={stagger} initial="initial" animate="animate">
        <motion.div variants={item} className={s.kpiCell}>
          <KpiTile
            label="Total agents"
            value={data.totalAgents}
            icon={<Bot24Regular />}
            caption="across Dev / Test / Prod"
            onClick={() => navigate('/agents')}
          />
        </motion.div>
        <motion.div variants={item} className={s.kpiCell}>
          <KpiTile
            label="Estate assurance"
            value={data.assuranceScore}
            suffix="/100"
            accent={assuranceColor}
            icon={<ShieldCheckmark24Regular />}
            caption="weighted RAG score"
            onClick={() => navigate('/assurance')}
          />
        </motion.div>
        <motion.div variants={item} className={s.kpiCell}>
          <KpiTile
            label="Open safety alerts"
            value={data.openAlerts}
            accent={data.openAlerts > 0 ? '#C50F1F' : undefined}
            icon={<ShieldError24Regular />}
            caption="awaiting triage"
            onClick={() => navigate('/safety')}
          />
        </motion.div>
        <motion.div variants={item} className={s.kpiCell}>
          <KpiTile
            label="MTD credit spend"
            value={data.mtdCredits}
            format={(n) => nf(n)}
            suffix="cr"
            progress={spendPct}
            progressColor={spendColor}
            caption={`${spendPct}% of ${nf(data.budgetCredits)} cap`}
            onClick={() => navigate('/cost')}
          />
        </motion.div>
        <motion.div variants={item} className={s.kpiCell}>
          <KpiTile
            label="Pending approvals"
            value={data.pendingApprovals}
            icon={<ClockArrowDownload24Regular />}
            caption="in the publish gate"
            onClick={() => navigate('/lifecycle')}
          />
        </motion.div>
        <motion.div variants={item} className={s.kpiCell}>
          <KpiTile
            label="Estate pulse"
            value={pulseNow}
            suffix="/min"
            live
            caption="interactions, live"
          >
            {pulse && <Sparkline data={pulse} height={34} />}
          </KpiTile>
        </motion.div>
      </motion.div>

      <div className={s.split}>
        <Panel>
          <SectionTitle
            title="Agents needing attention"
            caption="Ranked by severity — click through to the story."
          />
          <motion.div
            className={s.attnList}
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            {data.attention.map((a) => {
              const tint = REASON_TINT[a.reason] ?? REASON_TINT.stale;
              return (
                <motion.div
                  key={a.schemaName + a.reason}
                  variants={item}
                  className={s.attnRow}
                  onClick={() => navigate(a.route)}
                >
                  <span
                    className={s.attnIcon}
                    style={{ background: tint.bg, color: tint.fg }}
                  >
                    {reasonIcon(a.reason)}
                  </span>
                  <span className={s.attnMain}>
                    <span className={s.attnName}>{a.agentName}</span>
                    <span className={s.attnDetail}>{a.detail}</span>
                  </span>
                  <SeverityBadge severity={a.severity} />
                  <Badge appearance="outline" color="informative" size="small">
                    {a.environment.toUpperCase()}
                  </Badge>
                  <ChevronRight20Regular style={{ color: tokens.colorNeutralForeground4 }} />
                </motion.div>
              );
            })}
          </motion.div>
        </Panel>

        <div className={s.rightCol}>
          <Panel>
            <SectionTitle title="Environment distribution" />
            <div className={s.donutWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={envData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={2}
                    stroke="none"
                    animationDuration={800}
                  >
                    {envData.map((e) => (
                      <Cell key={e.name} fill={ENV_COLORS[e.name]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className={s.donutCenter}>
                <span className={s.donutNum}>{data.totalAgents}</span>
                <span className={s.donutLabel}>agents</span>
              </div>
            </div>
            <div className={s.legend}>
              {envData.map((e) => (
                <span className={s.legendItem} key={e.name}>
                  <span className={s.legendDot} style={{ background: ENV_COLORS[e.name] }} />
                  {e.name} · {e.value}
                </span>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Governance zones" />
            <div style={{ marginTop: 12 }}>
              {(Object.keys(data.agentsByZone) as GovernanceZone[]).map((z) => (
                <div className={s.zoneRow} key={z}>
                  <span className={s.zoneLabel}>{ZONE_NAMES[z]}</span>
                  <span className={s.zoneBarBg}>
                    <motion.span
                      className={s.zoneBarFill}
                      style={{ background: ZONE_COLORS[z], display: 'block' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(data.agentsByZone[z] / zoneMax) * 100}%` }}
                      transition={{ duration: 0.7, ease: [0.1, 0.9, 0.2, 1] }}
                    />
                  </span>
                  <span className={s.zoneCount}>{data.agentsByZone[z]}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <SectionTitle
          title="The companion view"
          caption="Agent 365 governs identity, security and approval. The Assurance Hub adds the accuracy, quality, cost and observability layer — and pulls the Agent 365 registry in as context."
          actions={
            <Button appearance="subtle" icon={<ChevronRight20Regular />} iconPosition="after" onClick={() => navigate('/agent365')}>
              Open Agent 365 view
            </Button>
          }
        />
      </Panel>
    </PageContainer>
  );
}
