/** Live-incident root-cause slide-over — answers "what broke, and how do we
    know?" by correlating the real signals (App Insights exceptions/dependencies,
    the continuous-eval LLM-judge drop, the change that caused it) into one chain. */

import {
  Badge,
  Button,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowExportRegular,
  ArrowRightRegular,
  Dismiss24Regular,
  Wrench20Regular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../app/AppState';
import { useIncident } from '../services/hooks';
import type { DetectionSource, Incident, IncidentKind } from '../types/domain';
import { LoadingState } from './primitives';
import { dateLong } from '../utils/format';

const KIND_META: Record<IncidentKind, { label: string; color: string }> = {
  'runtime-error': { label: 'Runtime error', color: '#C50F1F' },
  'quality-degradation': { label: 'Quality degradation', color: '#B88217' },
  'cost-spike': { label: 'Cost spike', color: '#CA5010' },
  safety: { label: 'Safety', color: '#8332B0' },
};

const SOURCE_META: Record<DetectionSource, { label: string; color: string }> = {
  'app-insights': { label: 'App Insights', color: '#0F6CBD' },
  'continuous-eval': { label: 'Continuous eval', color: '#00859B' },
  purview: { label: 'Purview', color: '#C50F1F' },
  ppac: { label: 'PPAC credits', color: '#107C10' },
  inventory: { label: 'Inventory / change', color: '#6B6B6B' },
  'load-test': { label: 'Load test', color: '#8332B0' },
};

const KIND_ROUTE: Record<IncidentKind, string> = {
  'runtime-error': '/safety',
  'quality-degradation': '/assurance',
  'cost-spike': '/cost',
  safety: '/safety',
};

const useStyles = makeStyles({
  drawer: { width: 'min(560px, 100vw)' },
  header: { borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  badges: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' },
  body: { padding: '16px 18px 28px', display: 'flex', flexDirection: 'column', gap: '16px' },
  symptom: { fontSize: '14px', fontWeight: 600, lineHeight: 1.5 },
  rootCause: { padding: '12px 14px', borderRadius: tokens.borderRadiusLarge, display: 'flex', flexDirection: 'column', gap: '4px' },
  rootLabel: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  rootText: { fontSize: '13px', lineHeight: 1.5 },
  changeRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: tokens.colorNeutralForeground2 },
  sectionH: { fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: tokens.colorNeutralForeground3 },
  chain: { display: 'flex', flexDirection: 'column', gap: '0' },
  step: { display: 'flex', gap: '12px', paddingBottom: '14px', position: 'relative' },
  line: { position: 'absolute', left: '5px', top: '16px', bottom: '-2px', width: '2px', backgroundColor: tokens.colorNeutralStroke2 },
  dot: { width: '12px', height: '12px', borderRadius: '999px', marginTop: '3px', flexShrink: 0, zIndex: 1, border: `2px solid ${tokens.colorNeutralBackground1}` },
  stepBody: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 },
  stepTop: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  method: { fontSize: '11px', color: tokens.colorNeutralForeground3 },
  finding: { fontSize: '13px', fontWeight: 500, lineHeight: 1.45 },
  detail: { fontSize: '12px', color: tokens.colorNeutralForeground3, lineHeight: 1.45, fontStyle: 'italic' },
  kql: { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '11px', whiteSpace: 'pre', overflowX: 'auto', background: tokens.colorNeutralBackground3, border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: tokens.borderRadiusMedium, padding: '8px 10px', lineHeight: 1.5 },
  at: { fontSize: '11px', color: tokens.colorNeutralForeground4, whiteSpace: 'nowrap' },
  runbook: { margin: '6px 0 0', paddingLeft: '18px', fontSize: '12.5px', lineHeight: 1.7 },
});

export function IncidentDrawer() {
  const s = useStyles();
  const { incidentKey, closeIncident } = useAppState();
  const open = !!incidentKey;
  return (
    <Drawer
      type="overlay"
      open={open}
      onOpenChange={(_e, { open: o }) => !o && closeIncident()}
      position="end"
      className={mergeClasses(s.drawer, 'acrylic-strong')}
    >
      {open && incidentKey && <Content key={incidentKey} incidentKey={incidentKey} onClose={closeIncident} />}
    </Drawer>
  );
}

function Content({ incidentKey, onClose }: { incidentKey: string; onClose: () => void }) {
  const s = useStyles();
  const navigate = useNavigate();
  const { data: incident, isLoading } = useIncident(incidentKey);

  const kind = incident ? KIND_META[incident.kind] : null;

  return (
    <>
      <DrawerHeader className={s.header}>
        <DrawerHeaderTitle
          action={<Button appearance="subtle" aria-label="Close" icon={<Dismiss24Regular />} onClick={onClose} />}
        >
          {incident ? `Root cause — ${incident.agentName}` : 'Root cause'}
        </DrawerHeaderTitle>
        {incident && kind && (
          <div className={s.badges}>
            <Badge appearance="filled" style={{ background: kind.color }}>{kind.label}</Badge>
            <Badge appearance="tint" color={incident.status === 'active' ? 'danger' : 'success'}>
              {incident.status}
            </Badge>
            <Badge appearance="outline">{incident.environment.toUpperCase()}</Badge>
          </div>
        )}
      </DrawerHeader>
      <DrawerBody className={`${s.body} scroll-area`}>
        {isLoading || !incident || !kind ? (
          <LoadingState />
        ) : (
          <Diagnosis incident={incident} color={kind.color} onClose={onClose} navigate={navigate} />
        )}
      </DrawerBody>
    </>
  );
}

function Diagnosis({
  incident,
  color,
  onClose,
  navigate,
}: {
  incident: Incident;
  color: string;
  onClose: () => void;
  navigate: (to: string) => void;
}) {
  const s = useStyles();
  return (
    <>
      <div className={s.symptom}>{incident.symptom}</div>

      <div
        className={s.rootCause}
        style={{
          background: `color-mix(in srgb, ${color} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
        }}
      >
        <span className={s.rootLabel} style={{ color }}>
          Root cause
        </span>
        <span className={s.rootText}>{incident.rootCause}</span>
      </div>

      {incident.change && (
        <div className={s.changeRow}>
          <ArrowRightRegular style={{ color }} />
          <span>
            <strong>Correlated change:</strong> {incident.change}
          </span>
        </div>
      )}

      <div>
        <span className={s.sectionH}>How we know — evidence chain</span>
        <div className={s.chain} style={{ marginTop: 10 }}>
          {incident.evidence.map((e, i) => {
            const sm = SOURCE_META[e.source];
            return (
              <div key={i} className={s.step}>
                {i < incident.evidence.length - 1 && <span className={s.line} />}
                <span className={s.dot} style={{ background: sm.color }} />
                <div className={s.stepBody}>
                  <div className={s.stepTop}>
                    <Badge appearance="tint" size="small" style={{ color: sm.color }}>
                      {sm.label}
                    </Badge>
                    <span className={s.at}>{dateLong(e.at)}</span>
                  </div>
                  <span className={s.method}>{e.method}</span>
                  <span className={s.finding}>{e.finding}</span>
                  {e.detail && <span className={s.detail}>{e.detail}</span>}
                  {e.query && <div className={s.kql}>{e.query}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={s.rootCause}
        style={{ background: tokens.colorNeutralBackground2, border: `1px solid ${tokens.colorNeutralStroke2}` }}
      >
        <span className={s.rootLabel} style={{ color: tokens.colorBrandForeground1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wrench20Regular style={{ fontSize: 16 }} /> Recommended action
        </span>
        <span className={s.rootText}>{incident.recommendedAction}</span>
        <ol className={s.runbook}>
          {incident.runbook.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          size="small"
          appearance="subtle"
          icon={<ArrowExportRegular />}
          iconPosition="after"
          onClick={() => {
            onClose();
            navigate(`${KIND_ROUTE[incident.kind]}?agent=${incident.schemaName}`);
          }}
        >
          View the signal
        </Button>
        <Button size="small" appearance="subtle" onClick={() => { onClose(); navigate('/coverage'); }}>
          How it's collected
        </Button>
      </div>
    </>
  );
}
