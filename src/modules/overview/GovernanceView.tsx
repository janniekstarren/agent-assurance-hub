import { Badge, Button, makeStyles, tokens } from '@fluentui/react-components';
import {
  ChevronRight20Regular,
  ClockArrowDownload24Regular,
  PersonProhibited24Regular,
  ShieldError24Regular,
  ShieldKeyhole24Regular,
} from '@fluentui/react-icons';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/AppState';
import { KpiTile } from '../../components/KpiTile';
import { RegistryBadge, RiskBadge } from '../../components/badges';
import { ErrorState, LoadingState, Panel, SectionTitle } from '../../components/primitives';
import { useAlerts, useApprovals, useRegistry, useRegistrySummary } from '../../services/hooks';
import type { AlertType } from '../../types/domain';
import { relativeFromNow } from '../../utils/format';
import { item, stagger } from './shared';

const TYPE_LABEL: Record<AlertType, string> = {
  'jailbreak-detected': 'Jailbreak',
  XPIA: 'XPIA',
  oversharing: 'Oversharing',
  'sensitivity-label-exposed': 'Label exposed',
};
const SEV_COLOR: Record<string, string> = { critical: 'var(--aah-bad)', high: 'var(--aah-danger)', medium: 'var(--aah-warn)', low: '#5C9BD5' };
const RISK_RANK: Record<string, number> = { high: 3, medium: 2, low: 1, none: 0 };

const useStyles = makeStyles({
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gridAutoRows: '150px', gap: '14px' },
  cell: { height: '100%' },
  split: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '14px', '@media (max-width: 1080px)': { gridTemplateColumns: '1fr' } },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '14px' },
  riskRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: tokens.borderRadiusLarge, border: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground1, marginBottom: '8px', cursor: 'pointer', ':hover': { boxShadow: tokens.shadow4 } },
  riskMain: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  riskName: { fontSize: '13.5px', fontWeight: 600 },
  riskDetail: { fontSize: '11.5px', color: tokens.colorNeutralForeground3 },
  postureRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  postureLabel: { width: '150px', fontSize: '12.5px', flexShrink: 0 },
  bar: { flex: 1, height: '9px', borderRadius: '999px', backgroundColor: tokens.colorNeutralBackground4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '999px' },
  postureVal: { width: '44px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '13px' },
  typeStrip: { display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '10px' },
  typeRow: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' },
  typeLabel: { width: '110px', flexShrink: 0 },
  apprRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 0', borderBottom: `1px solid ${tokens.colorNeutralStroke3}`, fontSize: '13px' },
  empty: { padding: '20px', textAlign: 'center', color: tokens.colorNeutralForeground3, fontSize: '13px' },
});

export function GovernanceView() {
  const s = useStyles();
  const navigate = useNavigate();
  const { openAgent } = useAppState();
  const registry = useRegistry();
  const summary = useRegistrySummary();
  const alerts = useAlerts();
  const approvals = useApprovals();

  if (registry.isLoading || summary.isLoading || alerts.isLoading)
    return <LoadingState label="Loading governance posture…" />;
  if (registry.isError || !registry.data || !summary.data || !alerts.data)
    return <ErrorState onRetry={() => registry.refetch()} />;

  const open = alerts.data.filter((a) => a.status === 'new' || a.status === 'escalated' || a.status === 'acknowledged');
  const critical = open.filter((a) => a.severity === 'critical').length;
  const caCovered = registry.data.filter((r) => r.conditionalAccess).length;
  const caPct = Math.round((caCovered / registry.data.length) * 100);
  const registered = registry.data.filter((r) => r.registryStatus === 'registered').length;
  const regPct = Math.round((registered / registry.data.length) * 100);

  const riskiest = registry.data
    .filter((r) => r.riskLevel === 'high' || r.riskLevel === 'medium')
    .sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]);

  const byType: { type: AlertType; count: number }[] = (['jailbreak-detected', 'XPIA', 'oversharing', 'sensitivity-label-exposed'] as AlertType[]).map((t) => ({
    type: t,
    count: alerts.data!.filter((a) => a.type === t).length,
  }));
  const maxType = Math.max(...byType.map((t) => t.count), 1);
  const pendingApprovals = approvals.data?.filter((a) => a.state === 'requested') ?? [];

  return (
    <>
      <motion.div className={s.kpiGrid} variants={stagger} initial="initial" animate="animate">
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Open safety alerts" value={open.length} accent={open.length ? 'var(--aah-bad)' : undefined} icon={<ShieldError24Regular />} caption={`${critical} critical`} onClick={() => navigate('/safety')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Shadow agents" value={summary.data.shadow} accent={summary.data.shadow ? 'var(--aah-bad)' : undefined} icon={<PersonProhibited24Regular />} caption="unregistered / unmanaged" onClick={() => navigate('/agent365')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Risky agents" value={summary.data.riskyAgents} accent="var(--aah-danger)" icon={<ShieldKeyhole24Regular />} caption="Entra ID Protection" onClick={() => navigate('/agent365')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Pending approvals" value={summary.data.pendingApproval} icon={<ClockArrowDownload24Regular />} caption="in the publish gate" onClick={() => navigate('/lifecycle')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Conditional Access" value={caPct} suffix="%" progress={caPct} progressColor={caPct >= 80 ? 'var(--aah-good)' : '#F7A700'} caption="of agents covered" />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Registry coverage" value={regPct} suffix="%" progress={regPct} progressColor={regPct >= 80 ? 'var(--aah-good)' : '#F7A700'} caption="registered in Agent 365" />
        </motion.div>
      </motion.div>

      <div className={s.split}>
        <Panel>
          <SectionTitle title="Agents needing governance" caption="Highest-risk agents from the Agent 365 registry. Click to open." />
          <div style={{ marginTop: 10 }}>
            {riskiest.map((r) => (
              <div key={r.agentId} className={s.riskRow} onClick={() => !r.external && openAgent(r.agentId)} style={{ cursor: r.external ? 'default' : 'pointer' }}>
                <RiskBadge level={r.riskLevel} />
                <span className={s.riskMain}>
                  <span className={s.riskName}>
                    {r.displayName}
                    {r.external && (
                      <Badge appearance="tint" color="severe" size="small" style={{ marginLeft: 8 }}>
                        External
                      </Badge>
                    )}
                  </span>
                  <span className={s.riskDetail}>{r.riskDetections[0] ?? 'Elevated risk signal'}</span>
                </span>
                <RegistryBadge status={r.registryStatus} />
              </div>
            ))}
          </div>
        </Panel>

        <div className={s.rightCol}>
          <Panel>
            <SectionTitle title="Governance posture" />
            <div style={{ marginTop: 12 }}>
              <Posture label="Conditional Access" pct={caPct} />
              <Posture label="Registered in Agent 365" pct={regPct} />
              <Posture label="External / 3rd-party" pct={Math.round(((summary.data.external ?? 0) / registry.data.length) * 100)} tone="info" />
            </div>
            <SectionTitle title="Safety alerts by type" />
            <div className={s.typeStrip}>
              {byType.map((t) => (
                <div key={t.type} className={s.typeRow}>
                  <span className={s.typeLabel}>{TYPE_LABEL[t.type]}</span>
                  <span className={s.bar}>
                    <span className={s.barFill} style={{ width: `${(t.count / maxType) * 100}%`, background: SEV_COLOR.high, display: 'block' }} />
                  </span>
                  <span style={{ width: 22, textAlign: 'right', fontWeight: 700 }}>{t.count}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <SectionTitle
              title="Pending approvals"
              actions={
                <Button size="small" appearance="subtle" icon={<ChevronRight20Regular />} iconPosition="after" onClick={() => navigate('/lifecycle')}>
                  Review
                </Button>
              }
            />
            {pendingApprovals.length === 0 ? (
              <div className={s.empty}>No agents awaiting approval.</div>
            ) : (
              pendingApprovals.map((a) => (
                <div key={a.id} className={s.apprRow}>
                  <Badge appearance="tint" color="warning" size="small">
                    Requested
                  </Badge>
                  <span style={{ flex: 1, fontWeight: 600 }}>{a.agentName}</span>
                  <span style={{ fontSize: 11, color: tokens.colorNeutralForeground3 }}>{relativeFromNow(a.requestedAt)}</span>
                </div>
              ))
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Posture({ label, pct, tone }: { label: string; pct: number; tone?: 'info' }) {
  const s = useStyles();
  const color = tone === 'info' ? '#8332B0' : pct >= 80 ? 'var(--aah-good)' : pct >= 50 ? '#F7A700' : 'var(--aah-bad)';
  return (
    <div className={s.postureRow}>
      <span className={s.postureLabel}>{label}</span>
      <span className={s.bar}>
        <motion.span className={s.barFill} style={{ background: color, display: 'block' }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: [0.1, 0.9, 0.2, 1] }} />
      </span>
      <span className={s.postureVal}>{pct}%</span>
    </div>
  );
}
