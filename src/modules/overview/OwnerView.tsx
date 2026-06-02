import { Badge, Dropdown, Option, Persona, makeStyles, tokens } from '@fluentui/react-components';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/AppState';
import { KpiTile } from '../../components/KpiTile';
import { AgentTypeBadge } from '../../components/AgentTypeBadge';
import { EnvBadge, LifecycleBadge } from '../../components/badges';
import { ErrorState, LoadingState, Panel, SectionTitle } from '../../components/primitives';
import { useAgents, useAlerts, useEstateOverview } from '../../services/hooks';
import type { Agent } from '../../types/domain';
import { nf } from '../../utils/format';
import { AttentionList, item, stagger } from './shared';

const TAG_BADGE: Record<string, { label: string; color: 'danger' | 'warning' | 'brand' | 'severe' }> = {
  drift: { label: 'Drift', color: 'warning' },
  'data-leak': { label: 'Data leak', color: 'danger' },
  sensitivity: { label: 'Sensitivity', color: 'danger' },
  cost: { label: 'Cost', color: 'warning' },
  'pending-approval': { label: 'Pending', color: 'brand' },
  handover: { label: 'Handover', color: 'brand' },
  shadow: { label: 'Shadow', color: 'danger' },
  retiring: { label: 'Retiring', color: 'severe' },
};

const useStyles = makeStyles({
  ownerBar: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' },
  ownerLabel: { fontSize: '13px', fontWeight: 600, color: tokens.colorNeutralForeground3 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gridAutoRows: '150px', gap: '14px' },
  cell: { height: '100%' },
  split: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '14px', '@media (max-width: 1080px)': { gridTemplateColumns: '1fr' } },
  agentRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 12px', borderRadius: tokens.borderRadiusLarge, border: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground1, marginBottom: '8px', cursor: 'pointer', ':hover': { boxShadow: tokens.shadow4, border: `1px solid ${tokens.colorNeutralStroke1}` } },
  agentMain: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
  agentName: { fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  agentMeta: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  assur: { fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '15px' },
  mtd: { fontSize: '12px', color: tokens.colorNeutralForeground3, width: '90px', textAlign: 'right' },
  empty: { padding: '24px', textAlign: 'center', color: tokens.colorNeutralForeground3, fontSize: '13px' },
});

function assuranceColor(n: number) {
  return n >= 85 ? '#13A10E' : n >= 70 ? '#F7A700' : '#C50F1F';
}

export function OwnerView() {
  const s = useStyles();
  const navigate = useNavigate();
  const { ownerId, setOwnerId, openAgent } = useAppState();
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const { data: alerts } = useAlerts();
  const { data: overview } = useEstateOverview();

  const owners = useMemo(() => {
    const m = new Map<string, string>();
    (agents ?? []).forEach((a) => m.set(a.owner.id, a.owner.displayName));
    return [...m.entries()];
  }, [agents]);

  if (isLoading) return <LoadingState label="Loading your agents…" />;
  if (isError || !agents) return <ErrorState onRetry={() => refetch()} />;

  const activeOwnerId = owners.some(([id]) => id === ownerId) ? ownerId : owners[0]?.[0];
  const ownerName = owners.find(([id]) => id === activeOwnerId)?.[1] ?? 'Owner';
  const myAgents = agents
    .filter((a) => a.owner.id === activeOwnerId)
    .sort((a, b) => a.assuranceScore - b.assuranceScore);
  const mySchemas = new Set(myAgents.map((a) => a.schemaName));

  const avgAssurance = myAgents.length
    ? Math.round(myAgents.reduce((sum, a) => sum + a.assuranceScore, 0) / myAgents.length)
    : 0;
  const myMtd = myAgents.reduce((sum, a) => sum + a.mtdCredits, 0);
  const myPending = myAgents.filter((a) => a.registryStatus === 'pending-approval').length;
  const myOpenAlerts = (alerts ?? []).filter(
    (a) => mySchemas.has(a.schemaName) && a.status !== 'suppressed' && a.status !== 'resolved',
  ).length;
  const myAttention = (overview?.attention ?? []).filter((a) => mySchemas.has(a.schemaName));

  const flagsFor = (a: Agent) =>
    a.tags.map((t) => TAG_BADGE[t]).filter(Boolean) as { label: string; color: 'danger' | 'warning' | 'brand' | 'severe' }[];

  return (
    <>
      <div className={s.ownerBar}>
        <span className={s.ownerLabel}>Viewing as</span>
        <Persona
          name={ownerName}
          secondaryText="Agent owner"
          avatar={{ color: 'colorful' }}
          size="extra-small"
        />
        <Dropdown
          size="small"
          value={ownerName}
          selectedOptions={[activeOwnerId ?? '']}
          onOptionSelect={(_e, d) => d.optionValue && setOwnerId(d.optionValue)}
          style={{ minWidth: 200 }}
        >
          {owners.map(([id, name]) => (
            <Option key={id} value={id} text={name}>
              {name}
            </Option>
          ))}
        </Dropdown>
      </div>

      <motion.div className={s.kpiGrid} variants={stagger} initial="initial" animate="animate">
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="My agents" value={myAgents.length} caption="you own" />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Avg assurance" value={avgAssurance} suffix="/100" accent={assuranceColor(avgAssurance)} caption="across your agents" />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="My MTD spend" value={myMtd} format={(n) => nf(n)} suffix="cr" caption="month to date" onClick={() => navigate('/cost')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Pending approval" value={myPending} accent={myPending ? '#B88217' : undefined} caption="awaiting publish" onClick={() => navigate('/lifecycle')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Open alerts" value={myOpenAlerts} accent={myOpenAlerts ? '#C50F1F' : undefined} caption="on your agents" onClick={() => navigate('/safety')} />
        </motion.div>
      </motion.div>

      <div className={s.split}>
        <Panel>
          <SectionTitle title="My agents" caption="Sorted by assurance — lowest first. Click to open the profile." />
          <div style={{ marginTop: 10 }}>
            {myAgents.length === 0 ? (
              <div className={s.empty}>This owner has no agents.</div>
            ) : (
              myAgents.map((a) => (
                <div key={a.id} className={s.agentRow} onClick={() => openAgent(a.id)}>
                  <span className={s.agentMain}>
                    <span className={s.agentName}>
                      {a.displayName}
                      {flagsFor(a).map((f) => (
                        <Badge key={f.label} appearance="tint" color={f.color} size="small">
                          {f.label}
                        </Badge>
                      ))}
                    </span>
                    <span className={s.agentMeta}>
                      <AgentTypeBadge type={a.type} short />
                      <EnvBadge env={a.environment} />
                      <LifecycleBadge state={a.lifecycleState} />
                    </span>
                  </span>
                  <span className={s.assur} style={{ color: assuranceColor(a.assuranceScore) }}>
                    {a.assuranceScore}
                  </span>
                  <span className={s.mtd}>{nf(a.mtdCredits)} cr</span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Needs your attention" caption="Issues on the agents you own." />
          <AttentionList items={myAttention} />
        </Panel>
      </div>
    </>
  );
}
