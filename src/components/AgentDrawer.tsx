/** Agent profile slide-over — the spine. Acrylic drawer with tabs Summary /
    Assurance / Safety / Cost / Lifecycle / Agent 365. Other modules deep-link
    here via useAppState().openAgent(id). */

import {
  Badge,
  Button,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Tab,
  TabList,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowExportRegular,
  CopyRegular,
  Dismiss24Regular,
} from '@fluentui/react-icons';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppState } from '../app/AppState';
import {
  useAgent,
  useAgentCostBreakdown,
  useAlerts,
  useAssuranceSummary,
  useLifecycleEvents,
  useRegistry,
} from '../services/hooks';
import type { Agent } from '../types/domain';
import {
  EnvBadge,
  GateBadge,
  LifecycleBadge,
  RegistryBadge,
  RiskBadge,
  SeverityBadge,
  ZoneBadge,
} from './badges';
import { AgentTypeBadge } from './AgentTypeBadge';
import { ChartTooltip, useChartTheme } from './charts';
import { LoadingState } from './primitives';
import { featureLabel } from '../mock/creditWeights';
import { observabilityFor } from '../mock/agents';
import {
  ENV_LABEL,
  compactCredits,
  dateLong,
  dateShort,
  nf,
  pct,
  relativeFromNow,
} from '../utils/format';

const useStyles = makeStyles({
  drawer: { width: 'min(580px, 100vw)' },
  header: { borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, paddingBottom: '6px' },
  titleRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  badges: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' },
  body: { padding: '0' },
  tabs: { padding: '4px 10px 0', borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  content: { padding: '16px 18px 28px', display: 'flex', flexDirection: 'column', gap: '16px' },
  section: { display: 'flex', flexDirection: 'column', gap: '8px' },
  sectionH: { fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: tokens.colorNeutralForeground3 },
  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px' },
  field: { display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 },
  fieldLabel: { fontSize: '11px', color: tokens.colorNeutralForeground3 },
  fieldValue: { fontSize: '13px', fontWeight: 600, wordBreak: 'break-word' },
  mono: { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '12px', fontWeight: 500 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  desc: { fontSize: '13px', color: tokens.colorNeutralForeground2, lineHeight: 1.5 },
  ks: { display: 'flex', flexDirection: 'column', gap: '6px' },
  ksRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    fontSize: '12px',
  },
  statRow: { display: 'flex', gap: '10px' },
  stat: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  statNum: { fontSize: '22px', fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
  statLabel: { fontSize: '11px', color: tokens.colorNeutralForeground3 },
  barRow: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', marginBottom: '7px' },
  barLabel: { width: '160px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  barBg: { flex: 1, height: '9px', borderRadius: '999px', backgroundColor: tokens.colorNeutralBackground4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '999px' },
  barVal: { width: '74px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 },
  alertRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  alertTop: { display: 'flex', alignItems: 'center', gap: '8px' },
  timeline: { display: 'flex', flexDirection: 'column', gap: '0', paddingLeft: '6px' },
  tlItem: { display: 'flex', gap: '12px', paddingBottom: '14px', position: 'relative' },
  tlDot: { width: '11px', height: '11px', borderRadius: '999px', marginTop: '3px', flexShrink: 0, zIndex: 1, border: `2px solid ${tokens.colorNeutralBackground1}` },
  tlLine: { position: 'absolute', left: '5px', top: '12px', bottom: '-2px', width: '2px', backgroundColor: tokens.colorNeutralStroke2 },
  tlBody: { display: 'flex', flexDirection: 'column', gap: '1px' },
  empty: { padding: '24px', textAlign: 'center', color: tokens.colorNeutralForeground3, fontSize: '13px' },
  splitCols: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  govCol: { padding: '12px', borderRadius: tokens.borderRadiusLarge, border: `1px solid ${tokens.colorNeutralStroke2}` },
  govList: { margin: '8px 0 0', paddingLeft: '16px', fontSize: '12px', lineHeight: 1.7 },
});

function Field({ label, children }: { label: string; children: ReactNode }) {
  const s = useStyles();
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      <span className={s.fieldValue}>{children}</span>
    </div>
  );
}

function LinkOut({ to, label, onClose }: { to: string; label: string; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <Button
      appearance="subtle"
      size="small"
      icon={<ArrowExportRegular />}
      iconPosition="after"
      onClick={() => {
        onClose();
        navigate(to);
      }}
    >
      {label}
    </Button>
  );
}

export function AgentDrawer() {
  const s = useStyles();
  const { agentDrawerId, closeAgent } = useAppState();
  const open = !!agentDrawerId;
  return (
    <Drawer
      type="overlay"
      open={open}
      onOpenChange={(_e, { open: o }) => !o && closeAgent()}
      position="end"
      className={mergeClasses(s.drawer, 'acrylic-strong')}
    >
      {open && agentDrawerId && <DrawerContent id={agentDrawerId} onClose={closeAgent} />}
    </Drawer>
  );
}

function DrawerContent({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStyles();
  const { data: agent, isLoading } = useAgent(id);
  const [tab, setTab] = useState('summary');

  return (
    <>
      <DrawerHeader className={s.header}>
        <DrawerHeaderTitle
          action={
            <Button appearance="subtle" aria-label="Close" icon={<Dismiss24Regular />} onClick={onClose} />
          }
        >
          {agent ? agent.displayName : 'Agent'}
        </DrawerHeaderTitle>
        {agent && (
          <div className={s.badges}>
            <EnvBadge env={agent.environment} />
            <ZoneBadge zone={agent.zone} />
            <LifecycleBadge state={agent.lifecycleState} />
            <RegistryBadge status={agent.registryStatus} />
            <AgentTypeBadge type={agent.type} />
          </div>
        )}
      </DrawerHeader>
      <DrawerBody className={s.body}>
        {isLoading || !agent ? (
          <LoadingState />
        ) : (
          <>
            <div className={s.tabs}>
              <TabList selectedValue={tab} onTabSelect={(_e, d) => setTab(d.value as string)} size="small">
                <Tab value="summary">Summary</Tab>
                <Tab value="assurance">Assurance</Tab>
                <Tab value="safety">Safety</Tab>
                <Tab value="cost">Cost</Tab>
                <Tab value="lifecycle">Lifecycle</Tab>
                <Tab value="agent365">Agent 365</Tab>
              </TabList>
            </div>
            <div className={`${s.content} scroll-area`}>
              {tab === 'summary' && <SummaryTab agent={agent} />}
              {tab === 'assurance' && <AssuranceTab agent={agent} onClose={onClose} />}
              {tab === 'safety' && <SafetyTab agent={agent} onClose={onClose} />}
              {tab === 'cost' && <CostTab agent={agent} onClose={onClose} />}
              {tab === 'lifecycle' && <LifecycleTab agent={agent} onClose={onClose} />}
              {tab === 'agent365' && <Agent365Tab agent={agent} onClose={onClose} />}
            </div>
          </>
        )}
      </DrawerBody>
    </>
  );
}

function SummaryTab({ agent }: { agent: Agent }) {
  const s = useStyles();
  return (
    <>
      <p className={s.desc}>{agent.description}</p>
      <div className={s.section}>
        <span className={s.sectionH}>Details</span>
        <div className={s.fieldGrid}>
          <Field label="Orchestration">{agent.orchestration === 'generative' ? 'Generative' : 'Classic'}</Field>
          <Field label="Model">{agent.model}</Field>
          <Field label="Owner">{agent.owner.displayName}</Field>
          <Field label="Environment">{ENV_LABEL[agent.environment]}</Field>
          <Field label="Created">{dateLong(agent.createdAt)}</Field>
          <Field label="Last published">
            {agent.lastPublishedAt ? dateLong(agent.lastPublishedAt) : 'Never (draft)'}
          </Field>
          <Field label="Managed">{agent.isManaged ? 'Yes' : 'No'}</Field>
          <Field label="Quarantined">{agent.isQuarantined ? 'Yes' : 'No'}</Field>
          <Field label="Telemetry coverage">
            {(() => {
              const lv = observabilityFor(agent.schemaName).level;
              return lv === 'full'
                ? 'Full (instrumented + evaluated)'
                : lv === 'runtime'
                  ? 'Runtime only'
                  : lv === 'classic'
                    ? 'Classic NLU (recognition)'
                    : lv === 'metadata'
                      ? 'Metadata only'
                      : 'None (shadow)';
            })()}
          </Field>
        </div>
      </div>

      <div className={s.section}>
        <span className={s.sectionH}>Channels</span>
        <div className={s.chips}>
          {agent.channels.map((c) => (
            <Badge key={c} appearance="tint" color="brand" size="small">
              {c}
            </Badge>
          ))}
        </div>
      </div>

      <div className={s.section}>
        <span className={s.sectionH}>Knowledge sources</span>
        <div className={s.ks}>
          {agent.knowledgeSources.map((k) => (
            <div key={k.id} className={s.ksRow}>
              <span>
                <strong>{k.name}</strong> · {k.type}
              </span>
              <span style={{ color: tokens.colorNeutralForeground3 }}>
                changed {dateShort(k.lastChangedAt)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={s.section}>
        <span className={s.sectionH}>Identity</span>
        <div className={s.fieldGrid}>
          <Field label="Schema name (lineage key)">
            <span className={s.mono}>{agent.schemaName}</span>
          </Field>
          <CopyField label="Entra Agent ID" value={agent.entraAgentId} />
        </div>
      </div>
    </>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className={s.mono} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </span>
        <Tooltip content="Copy" relationship="label">
          <Button
            size="small"
            appearance="subtle"
            icon={<CopyRegular />}
            onClick={() => navigator.clipboard?.writeText(value)}
          />
        </Tooltip>
      </span>
    </div>
  );
}

function AssuranceTab({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const s = useStyles();
  const chart = useChartTheme();
  const { data, isLoading } = useAssuranceSummary(agent.schemaName, agent.environment);
  if (isLoading || !data) return <LoadingState />;
  const obs = data.observability;
  const run = data.latestRun;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, fontSize: 11.5, background: tokens.colorNeutralBackground2 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: run ? '#107C10' : '#D83B01', flexShrink: 0 }} />
        <span>{obs.note ?? (run ? 'Full telemetry — instrumented and evaluated.' : 'Limited telemetry.')}</span>
      </div>
      {run ? (
        <>
      <div className={s.statRow}>
        <div className={s.stat}>
          <div className={s.statNum}>{pct(run.metrics.groundedness)}</div>
          <div className={s.statLabel}>Groundedness</div>
        </div>
        <div className={s.stat}>
          <div className={s.statNum}>{pct(run.metrics.relevance)}</div>
          <div className={s.statLabel}>Relevance</div>
        </div>
        <div className={s.stat}>
          <div className={s.statNum}>{pct(run.metrics.completeness)}</div>
          <div className={s.statLabel}>Completeness</div>
        </div>
        <div className={s.stat}>
          <div style={{ marginTop: 2 }}>
            <GateBadge status={run.gateStatus} />
          </div>
          <div className={s.statLabel} style={{ marginTop: 6 }}>
            Quality gate
          </div>
        </div>
      </div>

      {data.drift && (
        <div
          className={s.section}
          style={{
            padding: 12,
            borderRadius: 10,
            background: tokens.colorStatusWarningBackground1,
            color: tokens.colorStatusWarningForeground2,
          }}
        >
          <strong>Drift detected</strong>
          <span style={{ fontSize: 12 }}>{data.drift.description}</span>
        </div>
      )}

      <div className={s.section}>
        <span className={s.sectionH}>Groundedness — 90 days</span>
        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.evalSeries} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis domain={[40, 100]} tick={{ fontSize: 10, fill: chart.axis }} />
              <RTooltip
                content={
                  <ChartTooltip
                    labelFormatter={(l) => dateShort(String(l))}
                    valueFormatter={(v) => pct(v)}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="groundedness"
                stroke={chart.brand}
                strokeWidth={2}
                dot={false}
                animationDuration={900}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '28px 16px', textAlign: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Runtime quality not available</span>
          <span style={{ fontSize: 12, color: tokens.colorNeutralForeground3, lineHeight: 1.5 }}>
            {obs.note ?? 'This agent is not instrumented for quality telemetry.'}
          </span>
        </div>
      )}

      <LinkOut to={`/assurance?agent=${agent.schemaName}`} label="Open in Assurance" onClose={onClose} />
    </>
  );
}

function SafetyTab({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const s = useStyles();
  const { data, isLoading } = useAlerts();
  if (isLoading || !data) return <LoadingState />;
  const mine = data.filter((a) => a.schemaName === agent.schemaName && a.environment === agent.environment);
  return (
    <>
      <div className={s.section}>
        <span className={s.sectionH}>Safety alerts ({mine.length})</span>
        {mine.length === 0 ? (
          <div className={s.empty}>No safety alerts for this agent. Clean record.</div>
        ) : (
          mine.map((a) => (
            <div key={a.id} className={s.alertRow}>
              <div className={s.alertTop}>
                <SeverityBadge severity={a.severity} />
                <strong style={{ fontSize: 13 }}>{a.type}</strong>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: tokens.colorNeutralForeground3 }}>
                  {relativeFromNow(a.timestamp)}
                </span>
              </div>
              <span style={{ fontSize: 12, color: tokens.colorNeutralForeground2 }}>{a.summary}</span>
              {a.sensitivityLabel && (
                <Badge appearance="outline" color="danger" size="small">
                  {a.sensitivityLabel}
                </Badge>
              )}
            </div>
          ))
        )}
      </div>
      <span style={{ fontSize: 11, color: tokens.colorNeutralForeground3 }}>
        Audit records carry metadata + labels + jailbreak/XPIA flags — not raw prompt text.
      </span>
      <LinkOut to={`/safety?agent=${agent.schemaName}`} label="Open in Safety" onClose={onClose} />
    </>
  );
}

function CostTab({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const s = useStyles();
  const chart = useChartTheme();
  const { data, isLoading } = useAgentCostBreakdown(agent.schemaName, agent.environment);
  if (isLoading || !data) return <LoadingState />;
  const max = Math.max(...data.byFeature.map((f) => f.credits), 1);
  return (
    <>
      <div className={s.statRow}>
        <div className={s.stat}>
          <div className={s.statNum}>{compactCredits(data.total)}</div>
          <div className={s.statLabel}>MTD credits</div>
        </div>
        <div className={s.stat}>
          <div className={s.statNum} style={{ color: chart.danger }}>
            {compactCredits(data.billedCredits)}
          </div>
          <div className={s.statLabel}>Billed</div>
        </div>
        <div className={s.stat}>
          <div className={s.statNum} style={{ color: chart.success }}>
            {compactCredits(data.zeroRatedCredits)}
          </div>
          <div className={s.statLabel}>Zero-rated</div>
        </div>
      </div>

      <div className={s.fieldGrid}>
        <Field label="Funding model (derived)">{data.fundingModelLabel}</Field>
        <Field label="Environment">{ENV_LABEL[agent.environment]}</Field>
      </div>

      <div className={s.section}>
        <span className={s.sectionH}>By meter (MTD)</span>
        {data.byFeature.map((f, i) => (
          <div key={f.feature} className={s.barRow}>
            <span className={s.barLabel}>{featureLabel(f.feature)}</span>
            <span className={s.barBg}>
              <span
                className={s.barFill}
                style={{
                  width: `${(f.credits / max) * 100}%`,
                  background: chart.categorical[i % chart.categorical.length],
                  display: 'block',
                }}
              />
            </span>
            <span className={s.barVal}>{nf(f.credits)}</span>
          </div>
        ))}
      </div>

      <LinkOut to={`/cost?agent=${agent.schemaName}`} label="Open in Cost" onClose={onClose} />
    </>
  );
}

function LifecycleTab({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const s = useStyles();
  const { data, isLoading } = useLifecycleEvents(agent.schemaName);
  if (isLoading || !data) return <LoadingState />;
  const kindColor: Record<string, string> = {
    created: tokens.colorNeutralForeground3,
    published: tokens.colorPaletteGreenForeground1,
    reviewed: tokens.colorPaletteDarkOrangeForeground1,
    promoted: tokens.colorBrandForeground1,
    retired: tokens.colorPaletteRedForeground1,
    handover: tokens.colorBrandForeground1,
  };
  return (
    <>
      <div className={s.fieldGrid}>
        <Field label="Current state">
          <LifecycleBadge state={agent.lifecycleState} />
        </Field>
        <Field label="Last published">
          {agent.lastPublishedAt ? dateLong(agent.lastPublishedAt) : 'Never (draft)'}
        </Field>
      </div>
      <div className={s.section}>
        <span className={s.sectionH}>Lifecycle timeline</span>
        <div className={s.timeline}>
          {data.map((e, i) => (
            <div key={e.id} className={s.tlItem}>
              {i < data.length - 1 && <span className={s.tlLine} />}
              <span className={s.tlDot} style={{ background: kindColor[e.kind] ?? tokens.colorNeutralForeground3 }} />
              <span className={s.tlBody}>
                <strong style={{ fontSize: 13 }}>{e.label}</strong>
                <span style={{ fontSize: 11, color: tokens.colorNeutralForeground3 }}>
                  {dateLong(e.at)} · {e.actor}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <span style={{ fontSize: 11, color: tokens.colorNeutralForeground3 }}>
        Draft-vs-published is inferred from lastPublishedAt — there is no native version-history field.
      </span>
      <LinkOut to={`/lifecycle?agent=${agent.schemaName}`} label="Open in Lifecycle" onClose={onClose} />
    </>
  );
}

function Agent365Tab({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const s = useStyles();
  const { data, isLoading } = useRegistry();
  if (isLoading || !data) return <LoadingState />;
  const rec = data.find((r) => r.agentId === agent.id) ?? data.find((r) => r.schemaName === agent.schemaName);
  if (!rec) return <div className={s.empty}>No Agent 365 record.</div>;
  return (
    <>
      <div className={s.fieldGrid}>
        <Field label="Registry status">
          <RegistryBadge status={rec.registryStatus} />
        </Field>
        <Field label="Risk level">
          <RiskBadge level={rec.riskLevel} />
        </Field>
        <Field label="Discovered via">{rec.discoveredVia}</Field>
        <Field label="Conditional Access">{rec.conditionalAccess ? 'Enforced' : 'None'}</Field>
      </div>

      {rec.riskDetections.length > 0 && (
        <div className={s.section}>
          <span className={s.sectionH}>Risk detections</span>
          <ul className={s.govList} style={{ color: tokens.colorPaletteRedForeground1 }}>
            {rec.riskDetections.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={s.splitCols}>
        <div className={s.govCol}>
          <span className={s.sectionH}>Agent 365 governs</span>
          <ul className={s.govList}>
            {rec.governedControls.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div className={s.govCol} style={{ borderColor: tokens.colorBrandStroke2 }}>
          <span className={s.sectionH}>Assurance Hub measures</span>
          <ul className={s.govList}>
            <li>Accuracy &amp; groundedness</li>
            <li>Confidence &amp; drift</li>
            <li>Credit consumption</li>
            <li>Quality gates</li>
          </ul>
        </div>
      </div>

      <LinkOut to={`/agent365?agent=${agent.schemaName}`} label="Open in Agent 365" onClose={onClose} />
    </>
  );
}
