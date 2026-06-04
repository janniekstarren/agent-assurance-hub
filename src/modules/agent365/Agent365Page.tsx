import { Badge, Tooltip, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import {
  CheckmarkCircle16Filled,
  Info16Regular,
  ShieldKeyhole24Regular,
  Warning16Filled,
  DataTrending24Regular,
} from '@fluentui/react-icons';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useAppState } from '../../app/AppState';
import { PreviewTag, RegistryBadge, RiskBadge } from '../../components/badges';
import { ErrorState, LoadingState, PageContainer, Panel, SectionTitle } from '../../components/primitives';
import { useRegistry, useRegistrySummary } from '../../services/hooks';
import { relativeFromNow } from '../../utils/format';

const useStyles = makeStyles({
  banner: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '0',
    borderRadius: tokens.borderRadiusXLarge,
    overflow: 'hidden',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow4,
    '@media (max-width: 900px)': { gridTemplateColumns: '1fr' },
  },
  bannerCol: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px' },
  govCol: { background: tokens.colorNeutralBackground2 },
  measureCol: { background: tokens.colorBrandBackground2 },
  bannerH: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700 },
  bannerList: { margin: '2px 0 0', paddingLeft: '0', listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '6px' },
  pill: { fontSize: '11.5px', padding: '3px 9px', borderRadius: '999px', background: tokens.colorNeutralBackground1, border: `1px solid ${tokens.colorNeutralStroke2}` },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    background: `linear-gradient(180deg, ${tokens.colorNeutralBackground2}, ${tokens.colorBrandBackground2})`,
    fontSize: '20px',
    color: tokens.colorNeutralForeground3,
    '@media (max-width: 900px)': { padding: '8px', transform: 'rotate(90deg)' },
  },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' },
  stat: { padding: '12px 14px', borderRadius: tokens.borderRadiusLarge, border: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground1, display: 'flex', flexDirection: 'column', gap: '3px' },
  statTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  statNum: { fontSize: '26px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  statLabel: { fontSize: '11.5px', color: tokens.colorNeutralForeground3 },
  split: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '14px', '@media (max-width: 1080px)': { gridTemplateColumns: '1fr' } },
  regRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    marginBottom: '8px',
    cursor: 'pointer',
    ':hover': { boxShadow: tokens.shadow4, border: `1px solid ${tokens.colorNeutralStroke1}` },
  },
  regShadow: { border: `1px solid ${tokens.colorPaletteRedBorder2}`, background: tokens.colorStatusDangerBackground1 },
  regName: { fontWeight: 600, fontSize: '13px' },
  mono: { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '11px', color: tokens.colorNeutralForeground3 },
  // Fixed columns so the Conditional-Access icon, risk and registry badges line
  // up across every row regardless of the optional status tag or badge widths.
  regRight: {
    marginLeft: 'auto',
    display: 'grid',
    gridTemplateColumns: '62px 20px 66px 112px',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  rrStatus: { display: 'flex', justifyContent: 'flex-end' },
  rrCA: { display: 'flex', justifyContent: 'center' },
  rrRisk: { display: 'flex', justifyContent: 'flex-start' },
  rrReg: { display: 'flex', justifyContent: 'flex-start' },
  riskCard: { padding: '12px', borderRadius: tokens.borderRadiusLarge, border: `1px solid ${tokens.colorNeutralStroke2}`, marginBottom: '10px', backgroundColor: tokens.colorNeutralBackground1 },
  riskDetections: { margin: '6px 0 0', paddingLeft: '16px', fontSize: '12px', lineHeight: 1.6, color: tokens.colorNeutralForeground2 },
  cardGrid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(228px, 1fr))', gap: '12px', marginTop: '10px' },
  pathCard: { padding: '12px 14px', borderRadius: tokens.borderRadiusLarge, border: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground1, display: 'flex', flexDirection: 'column', gap: '5px' },
  pathHead: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' },
  pathPlatforms: { fontSize: '12px', fontWeight: 600, color: tokens.colorBrandForeground1 },
  pathDesc: { fontSize: '11.5px', color: tokens.colorNeutralForeground3, lineHeight: 1.45 },
  note: { display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '11.5px', color: tokens.colorNeutralForeground2, lineHeight: 1.5, padding: '10px 12px', borderRadius: tokens.borderRadiusLarge, backgroundColor: tokens.colorNeutralBackground2, border: `1px solid ${tokens.colorNeutralStroke2}`, marginTop: '12px' },
});

const PATHS: { title: string; tag: 'GA' | 'preview' | 'announced'; platforms: string; desc: string }[] = [
  { title: 'Auto-discovery', tag: 'GA', platforms: 'Amazon Bedrock · Google Vertex AI', desc: 'Existing agents are pulled in automatically via the cloud-provider API — no code change. Visible in the registry; observability layered via the SDK.' },
  { title: 'Agent factories', tag: 'GA', platforms: 'n8n · Kore · Kasisto', desc: 'Each agent the platform builds auto-gets a governed Entra Agent ID and inherits identity, compliance and observability.' },
  { title: 'Agent 365 SDK', tag: 'GA', platforms: 'OpenAI Agents SDK · Claude · LangChain', desc: 'Wrap an agent built on any framework to add an Entra identity, Work IQ tools, OpenTelemetry observability and governance.' },
  { title: 'Shadow discovery', tag: 'preview', platforms: 'Defender + Intune', desc: 'Unsanctioned local agents (e.g. OpenClaw) are detected on managed devices and can be blocked via Intune policy. Expanding June 2026.' },
  { title: 'Identity provisioning', tag: 'announced', platforms: 'ServiceNow · Workday', desc: 'Announced partnerships to auto-provision Entra Agent IDs for agents created there. Roadmap — not yet GA.' },
];

function StatusTagBadge({ tag }: { tag: 'GA' | 'preview' | 'announced' }) {
  const map = {
    GA: { color: 'success' as const, label: 'GA' },
    preview: { color: 'informative' as const, label: 'preview' },
    announced: { color: 'warning' as const, label: 'announced' },
  };
  const m = map[tag];
  return (
    <Badge appearance="outline" color={m.color} size="small">
      {m.label}
    </Badge>
  );
}

export function Agent365Page() {
  const s = useStyles();
  const [params] = useSearchParams();
  const { openAgent } = useAppState();
  const { data: registry, isLoading, isError, refetch } = useRegistry();
  const { data: summary } = useRegistrySummary();
  const focusSchema = params.get('agent');

  if (isLoading) return <PageContainer><LoadingState label="Loading Agent 365 registry…" /></PageContainer>;
  if (isError || !registry) return <PageContainer><ErrorState onRetry={() => refetch()} /></PageContainer>;

  const sorted = registry
    .slice()
    .sort((a, b) => {
      const rank = (x: typeof a) => (x.registryStatus === 'shadow' ? 0 : x.riskLevel === 'high' ? 1 : x.riskLevel === 'medium' ? 2 : 3);
      return rank(a) - rank(b);
    });
  const risky = registry.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'medium');

  return (
    <PageContainer>
      <SectionTitle
        title="Agent 365 companion"
        caption="The registry and security context the Hub pulls from Agent 365. Put this next to the real Agent 365 portal — they line up."
      />

      <div className={s.banner}>
        <div className={mergeClasses(s.bannerCol, s.govCol)}>
          <span className={s.bannerH}>
            <ShieldKeyhole24Regular /> Agent 365 governs
          </span>
          <ul className={s.bannerList}>
            {['Entra Agent ID', 'Conditional Access', 'Purview DLP', 'Approval workflow', 'Registry', 'Risk detection'].map((c) => (
              <li key={c} className={s.pill}>{c}</li>
            ))}
          </ul>
        </div>
        <div className={s.divider}>+</div>
        <div className={mergeClasses(s.bannerCol, s.measureCol)}>
          <span className={s.bannerH}>
            <DataTrending24Regular /> Assurance Hub measures
          </span>
          <ul className={s.bannerList}>
            {['Accuracy & groundedness', 'Confidence & drift', 'Credit consumption', 'Safety alerts', 'Quality gates', 'Lifecycle'].map((c) => (
              <li key={c} className={s.pill}>{c}</li>
            ))}
          </ul>
        </div>
      </div>

      {summary && (
        <div className={s.statRow}>
          <div className={s.stat}>
            <div className={s.statTop}><span className={s.statLabel}>Registered</span><PreviewTag note="Agent 365 Graph List packages (preview)" /></div>
            <div className={s.statNum}>{summary.registered}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statTop}><span className={s.statLabel}>Shadow</span><PreviewTag note="Defender / Intune shadow-agent discovery (preview)" /></div>
            <div className={s.statNum} style={{ color: 'var(--aah-bad)' }}>{summary.shadow}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statTop}><span className={s.statLabel}>Pending approval</span></div>
            <div className={s.statNum} style={{ color: 'var(--aah-warn)' }}>{summary.pendingApproval}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statTop}><span className={s.statLabel}>Risky agents</span><PreviewTag note="Entra ID Protection riskyAgents / agentRiskDetections (beta)" /></div>
            <div className={s.statNum} style={{ color: 'var(--aah-danger)' }}>{summary.riskyAgents}</div>
          </div>
          <div className={s.stat}>
            <div className={s.statTop}><span className={s.statLabel}>External / 3rd-party</span></div>
            <div className={s.statNum} style={{ color: '#8332B0' }}>{summary.external}</div>
          </div>
        </div>
      )}

      <div className={s.split}>
        <Panel>
          <SectionTitle title="Registry inventory" caption="Registered vs shadow agents. Click to open the agent." actions={<PreviewTag />} />
          <div style={{ marginTop: 10 }}>
            {sorted.map((r) => (
              <motion.div
                key={r.agentId}
                className={mergeClasses(s.regRow, r.registryStatus === 'shadow' && s.regShadow)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  if (!r.external) openAgent(r.agentId);
                }}
                style={{
                  cursor: r.external ? 'default' : 'pointer',
                  ...(focusSchema === r.schemaName
                    ? { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: 2 }
                    : {}),
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className={s.regName} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {r.displayName}
                    {r.external && (
                      <Badge appearance="tint" color="severe" size="small">
                        External
                      </Badge>
                    )}
                  </div>
                  {r.external ? (
                    <div className={s.mono} style={{ whiteSpace: 'normal' }}>
                      {r.platform} · {r.integrationPath}
                    </div>
                  ) : (
                    <div className={s.mono}>{r.entraAgentId}</div>
                  )}
                </div>
                <div className={s.regRight}>
                  <span className={s.rrStatus}>
                    {r.external && r.statusTag && <StatusTagBadge tag={r.statusTag} />}
                  </span>
                  <span className={s.rrCA}>
                    {r.conditionalAccess ? (
                      <Tooltip content="Conditional Access enforced" relationship="label">
                        <CheckmarkCircle16Filled style={{ color: tokens.colorStatusSuccessForeground1 }} />
                      </Tooltip>
                    ) : (
                      <Tooltip content="No Conditional Access enforced" relationship="label">
                        <Warning16Filled style={{ color: tokens.colorStatusWarningForeground1 }} />
                      </Tooltip>
                    )}
                  </span>
                  <span className={s.rrRisk}>
                    <RiskBadge level={r.riskLevel} />
                  </span>
                  <span className={s.rrReg}>
                    <RegistryBadge status={r.registryStatus} />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Risk signals" caption="Entra ID Protection riskyAgents." actions={<PreviewTag note="Entra ID Protection (beta)" />} />
          <div style={{ marginTop: 10 }}>
            {risky.length === 0 ? (
              <div style={{ color: tokens.colorNeutralForeground3, fontSize: 13, padding: 16 }}>No risky agents.</div>
            ) : (
              risky.map((r) => (
                <div key={r.agentId} className={s.riskCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 64, flexShrink: 0, display: 'flex' }}>
                      <RiskBadge level={r.riskLevel} />
                    </span>
                    <span className={s.regName}>{r.displayName}</span>
                    <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 11, color: tokens.colorNeutralForeground3 }}>
                      {relativeFromNow(r.lastSeen)}
                    </span>
                  </div>
                  <ul className={s.riskDetections}>
                    {r.riskDetections.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle
          title="Exposing agents from other platforms"
          caption="Agent 365 registers and governs non-Microsoft agents — the path depends on the platform."
          actions={<PreviewTag note="A mix of GA, preview and announced capabilities" />}
        />
        <div className={s.cardGrid2}>
          {PATHS.map((p) => (
            <div key={p.title} className={s.pathCard}>
              <div className={s.pathHead}>
                {p.title}
                <StatusTagBadge tag={p.tag} />
              </div>
              <div className={s.pathPlatforms}>{p.platforms}</div>
              <div className={s.pathDesc}>{p.desc}</div>
            </div>
          ))}
        </div>
        <div className={s.note}>
          <Info16Regular style={{ marginTop: 1, flexShrink: 0 }} />
          <span>
            Visibility ≠ enforcement: Conditional Access, DLP and Defender enforce only when the
            agent authenticates through an Entra Agent ID. Salesforce Agentforce is not a
            Microsoft-documented partner (interop is via the open A2A protocol). ServiceNow / Workday
            identity provisioning is announced, not yet GA.
          </span>
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Honesty note" />
        <span style={{ fontSize: 12.5, color: tokens.colorNeutralForeground2, lineHeight: 1.6 }}>
          This view is stitched from <strong>GA inventory</strong> + <strong>GA Dataverse pipeline
          history</strong> + <strong>preview Agent 365 approval</strong> APIs — not a single unified
          API. Entra Agent ID and Entra ID Protection riskyAgents are <strong>beta</strong>;
          shadow-agent discovery via Defender / Intune is <strong>preview</strong>. Verify all
          preview/GA states before a live demo.
        </span>
      </Panel>
    </PageContainer>
  );
}
