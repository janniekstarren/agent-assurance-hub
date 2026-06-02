import { Button, makeStyles } from '@fluentui/react-components';
import {
  Bot24Regular,
  ChevronRight20Regular,
  ClockArrowDownload24Regular,
  ShieldCheckmark24Regular,
  ShieldError24Regular,
} from '@fluentui/react-icons';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { KpiTile } from '../../components/KpiTile';
import { Sparkline } from '../../components/Sparkline';
import { ErrorState, LoadingState, Panel, SectionTitle } from '../../components/primitives';
import { useEstateOverview, usePulse } from '../../services/hooks';
import { nf } from '../../utils/format';
import { AttentionList, EnvDonut, ZoneBars, item, stagger } from './shared';

const useStyles = makeStyles({
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(216px, 1fr))', gridAutoRows: '150px', gap: '14px' },
  cell: { height: '100%' },
  split: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: '14px', '@media (max-width: 1080px)': { gridTemplateColumns: '1fr' } },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '14px' },
});

export function ExecutiveView() {
  const s = useStyles();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useEstateOverview();
  const { data: pulse } = usePulse();

  if (isLoading) return <LoadingState label="Loading estate health…" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const spendPct = Math.round((data.mtdCredits / data.budgetCredits) * 100);
  const spendColor = spendPct > 90 ? '#C50F1F' : spendPct > 75 ? '#F7A700' : '#13A10E';
  const assuranceColor = data.assuranceScore >= 85 ? '#13A10E' : data.assuranceScore >= 70 ? '#F7A700' : '#C50F1F';
  const pulseNow = pulse && pulse.length ? pulse[pulse.length - 1].value : 0;
  const criticalRisks = data.attention.filter((a) => a.severity === 'critical' || a.severity === 'high');

  return (
    <>
      <motion.div className={s.kpiGrid} variants={stagger} initial="initial" animate="animate">
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Estate assurance" value={data.assuranceScore} suffix="/100" accent={assuranceColor} icon={<ShieldCheckmark24Regular />} caption="weighted RAG score" onClick={() => navigate('/assurance')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="MTD credit spend" value={data.mtdCredits} format={(n) => nf(n)} suffix="cr" progress={spendPct} progressColor={spendColor} caption={`${spendPct}% of ${nf(data.budgetCredits)} cap`} onClick={() => navigate('/cost')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Open safety alerts" value={data.openAlerts} accent={data.openAlerts > 0 ? '#C50F1F' : undefined} icon={<ShieldError24Regular />} caption="awaiting triage" onClick={() => navigate('/safety')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Total agents" value={data.totalAgents} icon={<Bot24Regular />} caption="across Dev / Test / Prod" onClick={() => navigate('/agents')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Pending approvals" value={data.pendingApprovals} icon={<ClockArrowDownload24Regular />} caption="in the publish gate" onClick={() => navigate('/lifecycle')} />
        </motion.div>
        <motion.div variants={item} className={s.cell}>
          <KpiTile label="Estate pulse" value={pulseNow} suffix="/min" live caption="interactions, live">
            {pulse && <Sparkline data={pulse} height={34} />}
          </KpiTile>
        </motion.div>
      </motion.div>

      <div className={s.split}>
        <Panel>
          <SectionTitle title="Top risks" caption="The highest-severity items across the estate — click through to the story." />
          <AttentionList items={criticalRisks} />
        </Panel>
        <div className={s.rightCol}>
          <Panel>
            <SectionTitle title="Environment distribution" />
            <EnvDonut byEnvironment={data.agentsByEnvironment} total={data.totalAgents} />
          </Panel>
          <Panel>
            <SectionTitle title="Governance zones" />
            <ZoneBars byZone={data.agentsByZone} />
          </Panel>
        </div>
      </div>

      <Panel>
        <SectionTitle
          title="Companion to Agent 365"
          caption="Agent 365 governs identity, security and approval. The Assurance Hub adds the accuracy, quality, cost and observability layer — and pulls the Agent 365 registry in as context."
          actions={
            <Button appearance="subtle" icon={<ChevronRight20Regular />} iconPosition="after" onClick={() => navigate('/agent365')}>
              Open Agent 365 view
            </Button>
          }
        />
      </Panel>
    </>
  );
}
