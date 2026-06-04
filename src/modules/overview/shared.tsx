/** Shared building blocks for the persona Overview views. */

import { Button, makeStyles, tokens } from '@fluentui/react-components';
import {
  Bot24Regular,
  ChevronRight20Regular,
  ClockArrowDownload24Regular,
  Money24Regular,
  Search16Regular,
  ShieldCheckmark24Regular,
  ShieldError24Regular,
} from '@fluentui/react-icons';
import { motion } from 'framer-motion';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/AppState';
import { EnvBadge, SeverityBadge } from '../../components/badges';
import { INCIDENT_BY_SCHEMA } from '../../mock/incidents';
import type { AttentionItem, Environment, GovernanceZone } from '../../types/domain';

export const stagger = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
export const item = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.1, 0.9, 0.2, 1] as const } },
};

export const ENV_COLORS: Record<string, string> = { Dev: '#3FB6E6', Test: '#F7A700', Prod: '#13A10E' };
export const ZONE_COLORS: Record<GovernanceZone, string> = { Z1: '#3FB6E6', Z2: '#165AF1', Z3: '#8764B8' };
export const ZONE_NAMES: Record<GovernanceZone, string> = {
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

const useStyles = makeStyles({
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
    ':hover': { transform: 'translateX(2px)', boxShadow: tokens.shadow8, border: `1px solid ${tokens.colorNeutralStroke1}` },
  },
  attnIcon: { width: '32px', height: '32px', borderRadius: tokens.borderRadiusMedium, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  attnMain: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  attnName: {
    fontSize: '13.5px',
    fontWeight: 600,
    lineHeight: 1.25,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  attnDetail: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  // Fixed columns so severity / env / action line up across every row,
  // regardless of badge text width or whether the row ends in a button or chevron.
  attnMeta: {
    display: 'grid',
    gridTemplateColumns: '60px 44px 98px',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  metaSev: { display: 'flex', justifyContent: 'flex-start', minWidth: 0 },
  metaEnv: { display: 'flex', justifyContent: 'flex-start' },
  metaAction: { display: 'flex', justifyContent: 'flex-end' },
  donutWrap: { position: 'relative', height: '190px' },
  donutCenter: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  donutNum: { fontSize: '28px', fontWeight: 700, lineHeight: 1 },
  donutLabel: { fontSize: '11px', color: tokens.colorNeutralForeground3, textTransform: 'uppercase' },
  legend: { display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '6px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' },
  legendDot: { width: '10px', height: '10px', borderRadius: '3px' },
  zoneRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  zoneLabel: { width: '116px', fontSize: '12px', fontWeight: 600, flexShrink: 0 },
  zoneBarBg: { flex: 1, height: '10px', borderRadius: '999px', backgroundColor: tokens.colorNeutralBackground4, overflow: 'hidden' },
  zoneBarFill: { height: '100%', borderRadius: '999px' },
  zoneCount: { width: '24px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  empty: { padding: '24px', textAlign: 'center', color: tokens.colorNeutralForeground3, fontSize: '13px' },
});

export function AttentionList({ items }: { items: AttentionItem[] }) {
  const s = useStyles();
  const navigate = useNavigate();
  const { openIncident } = useAppState();
  if (items.length === 0) return <div className={s.empty}>Nothing needs attention right now.</div>;
  return (
    <motion.div className={s.attnList} variants={stagger} initial="initial" animate="animate">
      {items.map((a) => {
        const tint = REASON_TINT[a.reason] ?? REASON_TINT.stale;
        const incident = INCIDENT_BY_SCHEMA[a.schemaName];
        return (
          <motion.div key={a.schemaName + a.reason} variants={item} className={s.attnRow} onClick={() => navigate(a.route)}>
            <span className={s.attnIcon} style={{ background: tint.bg, color: tint.fg }}>
              {reasonIcon(a.reason)}
            </span>
            <span className={s.attnMain}>
              <span className={s.attnName}>{a.agentName}</span>
              <span className={s.attnDetail}>{a.detail}</span>
            </span>
            <span className={s.attnMeta}>
              <span className={s.metaSev}>
                <SeverityBadge severity={a.severity} />
              </span>
              <span className={s.metaEnv}>
                <EnvBadge env={a.environment} />
              </span>
              <span className={s.metaAction}>
                {incident ? (
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<Search16Regular />}
                    onClick={(e) => {
                      e.stopPropagation();
                      openIncident(incident.id);
                    }}
                  >
                    Diagnose
                  </Button>
                ) : (
                  <ChevronRight20Regular style={{ color: tokens.colorNeutralForeground4 }} />
                )}
              </span>
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export function EnvDonut({
  byEnvironment,
  total,
}: {
  byEnvironment: Record<Environment, number>;
  total: number;
}) {
  const s = useStyles();
  const envData = [
    { name: 'Dev', value: byEnvironment.dev },
    { name: 'Test', value: byEnvironment.test },
    { name: 'Prod', value: byEnvironment.prod },
  ];
  return (
    <>
      <div className={s.donutWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={envData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none" animationDuration={800}>
              {envData.map((e) => (
                <Cell key={e.name} fill={ENV_COLORS[e.name]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className={s.donutCenter}>
          <span className={s.donutNum}>{total}</span>
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
    </>
  );
}

export function ZoneBars({ byZone }: { byZone: Record<GovernanceZone, number> }) {
  const s = useStyles();
  const zoneMax = Math.max(...(Object.values(byZone) as number[]), 1);
  return (
    <div style={{ marginTop: 12 }}>
      {(Object.keys(byZone) as GovernanceZone[]).map((z) => (
        <div className={s.zoneRow} key={z}>
          <span className={s.zoneLabel}>{ZONE_NAMES[z]}</span>
          <span className={s.zoneBarBg}>
            <motion.span
              className={s.zoneBarFill}
              style={{ background: ZONE_COLORS[z], display: 'block' }}
              initial={{ width: 0 }}
              animate={{ width: `${(byZone[z] / zoneMax) * 100}%` }}
              transition={{ duration: 0.7, ease: [0.1, 0.9, 0.2, 1] }}
            />
          </span>
          <span className={s.zoneCount}>{byZone[z]}</span>
        </div>
      ))}
    </div>
  );
}
