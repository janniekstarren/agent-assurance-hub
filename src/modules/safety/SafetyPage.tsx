import {
  Badge,
  Button,
  Dropdown,
  Option,
  Switch,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  CheckmarkRegular,
  DismissRegular,
  Info16Regular,
  ArrowUpRegular,
  ShieldProhibited20Regular,
} from '@fluentui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SeverityBadge } from '../../components/badges';
import {
  ErrorState,
  InfoHint,
  LoadingState,
  PageContainer,
  Panel,
  SectionTitle,
} from '../../components/primitives';
import { useAlertHeatmap, useAlerts, useSetAlertStatus } from '../../services/hooks';
import type { AlertSeverity, AlertStatus, AlertType, SafetyAlert } from '../../types/domain';
import { relativeFromNow } from '../../utils/format';

const useStyles = makeStyles({
  note: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    padding: '11px 14px',
    borderRadius: tokens.borderRadiusLarge,
    background: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: '12.5px',
    color: tokens.colorNeutralForeground2,
    lineHeight: 1.45,
  },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' },
  stat: { padding: '12px 14px', borderRadius: tokens.borderRadiusLarge, border: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground1 },
  statNum: { fontSize: '26px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  statLabel: { fontSize: '11.5px', color: tokens.colorNeutralForeground3, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' },
  // heatmap
  heatTable: { width: '100%' },
  heatCorner: { fontSize: '11px', color: tokens.colorNeutralForeground3, textAlign: 'left', fontWeight: 600, padding: '4px' },
  heatColH: { fontSize: '10.5px', color: tokens.colorNeutralForeground3, fontWeight: 600, padding: '2px', textAlign: 'center', whiteSpace: 'nowrap' },
  heatRowH: { fontSize: '11.5px', textAlign: 'right', paddingRight: '8px', whiteSpace: 'nowrap', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' },
  heatCell: {
    width: '52px',
    height: '34px',
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
  },
  // layout
  split: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '14px', '@media (max-width: 1080px)': { gridTemplateColumns: '1fr' } },
  toolbar: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' },
  spacer: { flex: 1 },
  stream: { display: 'flex', flexDirection: 'column', gap: '8px' },
  alertCard: {
    padding: '11px 12px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    ':hover': { border: `1px solid ${tokens.colorNeutralStroke1}`, boxShadow: tokens.shadow4 },
  },
  alertSelected: { border: `1px solid ${tokens.colorBrandStroke1}`, boxShadow: `0 0 0 1px ${tokens.colorBrandStroke1}` },
  alertTop: { display: 'flex', alignItems: 'center', gap: '8px' },
  alertType: { fontWeight: 700, fontSize: '13px' },
  alertAgent: { fontSize: '12px', color: tokens.colorNeutralForeground3 },
  alertSummary: { fontSize: '12px', color: tokens.colorNeutralForeground2, lineHeight: 1.4 },
  alertMeta: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11px', color: tokens.colorNeutralForeground3 },
  actions: { display: 'flex', gap: '4px', marginLeft: 'auto' },
  // detail
  detailField: { display: 'flex', flexDirection: 'column', gap: '1px', marginBottom: '10px' },
  detailLabel: { fontSize: '11px', color: tokens.colorNeutralForeground3 },
  detailValue: { fontSize: '13px', fontWeight: 600, wordBreak: 'break-word' },
  metaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' },
  metaItem: { padding: '7px 9px', borderRadius: tokens.borderRadiusMedium, background: tokens.colorNeutralBackground2, fontSize: '11.5px' },
  metaKey: { color: tokens.colorNeutralForeground3, fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.03em' },
  empty: { padding: '40px 20px', textAlign: 'center', color: tokens.colorNeutralForeground3, fontSize: '13px' },
});

// Heatmap cells carry a white number, so they need a fill dark enough for
// contrast — a muted (not glaring) palette that holds up in both themes.
const SEV_COLOR: Record<AlertSeverity, string> = {
  critical: '#B5404C',
  high: '#B96838',
  medium: '#9C7622',
  low: '#5C82A8',
};

const TYPE_LABEL: Record<AlertType, string> = {
  'jailbreak-detected': 'Jailbreak',
  XPIA: 'XPIA',
  oversharing: 'Oversharing',
  'sensitivity-label-exposed': 'Label exposed',
};

/** How each alert type is generated — surfaced via the info icons so a reviewer
    can see the provenance of any signal. */
const TYPE_HINT: Record<AlertType, string> = {
  'jailbreak-detected':
    "Raised when Microsoft Purview's prompt-injection classifier flags a user prompt that tries to bypass the agent's instructions or safety guardrails — the JailbreakDetected flag on the runtime interaction. Captured via the Office 365 Management Activity API (Audit.AI). Metadata only; the raw prompt is not stored here.",
  XPIA:
    'Cross-Prompt Injection Attack — malicious instructions hidden inside content the agent ingests (a document, email or web page). Purview raises the XPIADetected flag. Same audit path as jailbreak.',
  oversharing:
    "Purview DLP flags when an agent returns data above the caller's access scope or a sensitivity label's policy — e.g. Confidential rows surfaced to an unentitled user.",
  'sensitivity-label-exposed':
    'A sensitivity-labelled item (e.g. Confidential) appeared in an agent response. Purview audit records the label and the resource touched — not the content itself.',
};

const STAT_HINT = {
  open: 'Audit alerts currently in New, Acknowledged or Escalated state. Source: Microsoft Purview audit via the Office 365 Management Activity API (Audit.AI feed).',
  critical: 'Open alerts at critical severity. Severity is assigned by the Purview classifier per detection.',
  attacks: 'Alerts carrying a JailbreakDetected or XPIADetected flag — i.e. prompt-injection attempts, whether or not the response was blocked.',
  agents: 'Distinct agents with at least one open alert.',
} as const;

export function SafetyPage() {
  const s = useStyles();
  const [params, setParams] = useSearchParams();
  const { data: alerts, isLoading, isError, refetch } = useAlerts();
  const { data: heatmap } = useAlertHeatmap();
  const triage = useSetAlertStatus();

  const [sev, setSev] = useState<AlertSeverity | 'all'>('all');
  const [type, setType] = useState<AlertType | 'all'>('all');
  const [openOnly, setOpenOnly] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const agentFilter = params.get('agent');

  const filtered = useMemo(() => {
    if (!alerts) return [];
    return alerts
      .filter((a) => {
        if (sev !== 'all' && a.severity !== sev) return false;
        if (type !== 'all' && a.type !== type) return false;
        if (agentFilter && a.schemaName !== agentFilter) return false;
        if (openOnly && (a.status === 'suppressed' || a.status === 'resolved')) return false;
        return true;
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [alerts, sev, type, openOnly, agentFilter]);

  if (isLoading) return <PageContainer><LoadingState label="Loading audit alerts…" /></PageContainer>;
  if (isError || !alerts) return <PageContainer><ErrorState onRetry={() => refetch()} /></PageContainer>;

  const open = alerts.filter((a) => a.status === 'new' || a.status === 'escalated' || a.status === 'acknowledged');
  const critical = open.filter((a) => a.severity === 'critical').length;
  const attacks = alerts.filter((a) => a.jailbreakDetected || a.xpiaDetected).length;
  const agentsAffected = new Set(open.map((a) => a.schemaName)).size;
  const selected = filtered.find((a) => a.id === selectedId) ?? null;

  return (
    <PageContainer>
      <SectionTitle
        title="Safety"
        caption="Data-leak, sensitivity and jailbreak signals from Purview audit. The Snowflake Data Agent is the active incident."
      />

      <div className={s.note}>
        <Info16Regular style={{ marginTop: 2, flexShrink: 0 }} />
        <span>
          Audit records carry <strong>metadata, sensitivity labels and JailbreakDetected /
          XPIADetected flags — not raw prompt text</strong>. Raw conversation content is a separate
          eDiscovery / Dataverse transcript path. Non-Microsoft-channel agents need Purview
          pay-as-you-go to be captured.
        </span>
      </div>

      <div className={s.statRow}>
        <div className={s.stat}><div className={s.statNum}>{open.length}</div><div className={s.statLabel}>Open alerts <InfoHint content={STAT_HINT.open} label="Where open alerts come from" /></div></div>
        <div className={s.stat}><div className={s.statNum} style={{ color: 'var(--aah-bad)' }}>{critical}</div><div className={s.statLabel}>Critical <InfoHint content={STAT_HINT.critical} /></div></div>
        <div className={s.stat}><div className={s.statNum} style={{ color: 'var(--aah-danger)' }}>{attacks}</div><div className={s.statLabel}>Jailbreak / XPIA flags <InfoHint content={STAT_HINT.attacks} /></div></div>
        <div className={s.stat}><div className={s.statNum}>{agentsAffected}</div><div className={s.statLabel}>Agents affected <InfoHint content={STAT_HINT.agents} /></div></div>
      </div>

      {heatmap && heatmap.agents.length > 0 && (
        <Panel>
          <SectionTitle title="Alert heatmap" caption="Alert type × agent. Colour shows the highest severity seen." />
          <div style={{ overflowX: 'auto' }} className="scroll-area">
            <table className={s.heatTable} style={{ borderCollapse: 'separate', borderSpacing: 4 }}>
              <thead>
                <tr>
                  <th className={s.heatCorner}>Agent</th>
                  {heatmap.types.map((t) => (
                    <th key={t} className={s.heatColH}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        {TYPE_LABEL[t]}
                        <InfoHint content={TYPE_HINT[t]} label={`How ${TYPE_LABEL[t]} is detected`} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.agents.map((agent) => (
                  <tr key={agent}>
                    <td className={s.heatRowH}>{agent}</td>
                    {heatmap.types.map((t) => {
                      const cell = heatmap.cells.find((c) => c.agentName === agent && c.type === t);
                      const count = cell?.count ?? 0;
                      const color = count > 0 ? SEV_COLOR[(cell?.maxSeverity as AlertSeverity) || 'low'] : tokens.colorNeutralBackground4;
                      return (
                        <td key={t}>
                          <div className={s.heatCell} style={{ background: color, color: count > 0 ? '#fff' : tokens.colorNeutralForeground4 }}>
                            {count > 0 ? count : '·'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <div className={s.split}>
        <Panel>
          <div className={s.toolbar}>
            <SectionTitle title="Alert stream" />
            <div className={s.spacer} />
            {agentFilter && (
              <Badge appearance="tint" color="brand" size="small">
                {agentFilter}
                <Button
                  size="small"
                  appearance="transparent"
                  icon={<DismissRegular />}
                  onClick={() => {
                    params.delete('agent');
                    setParams(params);
                  }}
                />
              </Badge>
            )}
            <Dropdown size="small" value={sev === 'all' ? 'All severities' : sev} selectedOptions={[sev]} onOptionSelect={(_e, d) => setSev(d.optionValue as AlertSeverity | 'all')} style={{ minWidth: 130 }}>
              <Option value="all" text="All severities">All severities</Option>
              <Option value="critical" text="critical">critical</Option>
              <Option value="high" text="high">high</Option>
              <Option value="medium" text="medium">medium</Option>
              <Option value="low" text="low">low</Option>
            </Dropdown>
            <Dropdown size="small" value={type === 'all' ? 'All types' : TYPE_LABEL[type]} selectedOptions={[type]} onOptionSelect={(_e, d) => setType(d.optionValue as AlertType | 'all')} style={{ minWidth: 140 }}>
              <Option value="all" text="All types">All types</Option>
              <Option value="jailbreak-detected" text="Jailbreak">Jailbreak</Option>
              <Option value="XPIA" text="XPIA">XPIA</Option>
              <Option value="oversharing" text="Oversharing">Oversharing</Option>
              <Option value="sensitivity-label-exposed" text="Label exposed">Label exposed</Option>
            </Dropdown>
            <Switch label="Open only" checked={openOnly} onChange={(_e, d) => setOpenOnly(d.checked)} />
          </div>

          <div className={s.stream}>
            <AnimatePresence initial={false}>
              {filtered.length === 0 && <div className={s.empty}>No alerts match. Clear filters to see more.</div>}
              {filtered.map((a) => (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0, marginBottom: -8 }}
                  transition={{ duration: 0.25 }}
                  className={mergeClasses(s.alertCard, selectedId === a.id && s.alertSelected)}
                  onClick={() => setSelectedId(a.id)}
                >
                  <div className={s.alertTop}>
                    <SeverityBadge severity={a.severity} />
                    <span className={s.alertType}>{TYPE_LABEL[a.type]}</span>
                    {(a.jailbreakDetected || a.xpiaDetected) && (
                      <ShieldProhibited20Regular style={{ color: 'var(--aah-bad)' }} />
                    )}
                    <span className={s.alertAgent}>· {a.agentName}</span>
                    <div className={s.actions} onClick={(e) => e.stopPropagation()}>
                      <TriageButton title="Acknowledge" icon={<CheckmarkRegular />} onClick={() => triage.mutate({ id: a.id, status: 'acknowledged' })} />
                      <TriageButton title="Escalate" icon={<ArrowUpRegular />} onClick={() => triage.mutate({ id: a.id, status: 'escalated' })} />
                      <TriageButton title="Suppress" icon={<DismissRegular />} onClick={() => triage.mutate({ id: a.id, status: 'suppressed' })} />
                    </div>
                  </div>
                  <span className={s.alertSummary}>{a.summary}</span>
                  <div className={s.alertMeta}>
                    <span>{a.accessedResource}</span>
                    {a.sensitivityLabel && (
                      <Badge appearance="outline" color="danger" size="small">{a.sensitivityLabel}</Badge>
                    )}
                    <span>· {relativeFromNow(a.timestamp)}</span>
                    <StatusBadge status={a.status} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Interaction metadata" />
          {!selected ? (
            <div className={s.empty}>Select an alert to inspect its metadata.</div>
          ) : (
            <AlertDetail alert={selected} />
          )}
        </Panel>
      </div>
    </PageContainer>
  );
}

function TriageButton({ title, icon, onClick }: { title: string; icon: React.ReactElement; onClick: () => void }) {
  return (
    <Tooltip content={title} relationship="label">
      <Button size="small" appearance="subtle" icon={icon} aria-label={title} onClick={onClick} />
    </Tooltip>
  );
}

function StatusBadge({ status }: { status: AlertStatus }) {
  const map: Record<AlertStatus, { color: 'informative' | 'warning' | 'danger' | 'success' | 'subtle'; label: string }> = {
    new: { color: 'informative', label: 'New' },
    acknowledged: { color: 'warning', label: 'Acknowledged' },
    escalated: { color: 'danger', label: 'Escalated' },
    suppressed: { color: 'subtle', label: 'Suppressed' },
    resolved: { color: 'success', label: 'Resolved' },
  };
  const m = map[status];
  return <Badge appearance="tint" color={m.color} size="small">{m.label}</Badge>;
}

function AlertDetail({ alert }: { alert: SafetyAlert }) {
  const s = useStyles();
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <SeverityBadge severity={alert.severity} />
        <StatusBadge status={alert.status} />
      </div>
      <div className={s.detailField}>
        <span className={s.detailLabel}>Summary (metadata)</span>
        <span className={s.detailValue} style={{ fontWeight: 500, lineHeight: 1.45 }}>{alert.summary}</span>
      </div>
      <div className={s.detailField}>
        <span className={s.detailLabel}>Accessed resource</span>
        <span className={s.detailValue}>{alert.accessedResource}</span>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div className={s.detailField}>
          <span className={s.detailLabel}>Sensitivity label</span>
          <span className={s.detailValue}>{alert.sensitivityLabel ?? '—'}</span>
        </div>
        <div className={s.detailField}>
          <span className={s.detailLabel}>Caller type</span>
          <span className={s.detailValue}>{alert.callerType}</span>
        </div>
      </div>
      {(alert.jailbreakDetected || alert.xpiaDetected) && (
        <Badge appearance="filled" color="danger" icon={<ShieldProhibited20Regular />} style={{ marginBottom: 10 }}>
          {alert.jailbreakDetected ? 'JailbreakDetected' : 'XPIADetected'}
        </Badge>
      )}
      <span className={s.detailLabel}>Audit metadata</span>
      <div className={s.metaGrid}>
        {Object.entries(alert.metadata).map(([k, v]) => (
          <div key={k} className={s.metaItem}>
            <div className={s.metaKey}>{k}</div>
            <div>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
