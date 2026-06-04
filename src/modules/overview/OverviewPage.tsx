import { makeStyles, tokens } from '@fluentui/react-components';
import { useAppState } from '../../app/AppState';
import { PERSONA_BY_ID } from '../../app/personas';
import { PageContainer } from '../../components/primitives';
import { MvpView } from './MvpView';
import { ExecutiveView } from './ExecutiveView';
import { GovernanceView } from './GovernanceView';
import { OwnerView } from './OwnerView';

const useStyles = makeStyles({
  header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2px' },
  iconWrap: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleText: { display: 'flex', flexDirection: 'column', gap: '1px' },
  title: { fontSize: '19px', fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.15 },
  tagline: { fontSize: '12.5px', color: tokens.colorNeutralForeground3 },
});

export function OverviewPage() {
  const s = useStyles();
  const { persona } = useAppState();
  const p = PERSONA_BY_ID[persona];
  return (
    <PageContainer>
      <div className={s.header}>
        <span
          className={s.iconWrap}
          style={{ background: `color-mix(in srgb, ${p.accent} 12%, transparent)`, color: p.accent }}
        >
          {p.icon}
        </span>
        <span className={s.titleText}>
          <span className={s.title}>{p.label} view</span>
          <span className={s.tagline}>{p.tagline}</span>
        </span>
      </div>
      {persona === 'mvp' && <MvpView />}
      {persona === 'executive' && <ExecutiveView />}
      {persona === 'it-admin' && <GovernanceView />}
      {persona === 'agent-owner' && <OwnerView />}
    </PageContainer>
  );
}
