import { makeStyles, tokens } from '@fluentui/react-components';
import { useAppState } from '../../app/AppState';
import { PERSONA_BY_ID } from '../../app/personas';
import { PageContainer } from '../../components/primitives';
import { MvpView } from './MvpView';
import { ExecutiveView } from './ExecutiveView';
import { GovernanceView } from './GovernanceView';
import { OwnerView } from './OwnerView';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 22px',
    borderRadius: '18px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow4,
    position: 'relative',
    overflow: 'hidden',
  },
  iconWrap: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  titleText: { display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative' },
  title: { fontSize: '21px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 },
  tagline: { fontSize: '13px', color: tokens.colorNeutralForeground3 },
});

export function OverviewPage() {
  const s = useStyles();
  const { persona } = useAppState();
  const p = PERSONA_BY_ID[persona];
  return (
    <PageContainer>
      <div className={`${s.header} brand-mesh`}>
        <span
          className={s.iconWrap}
          style={{
            backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${p.accent} 26%, transparent), color-mix(in srgb, ${p.accent} 9%, transparent))`,
            color: p.accent,
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${p.accent} 24%, transparent)`,
          }}
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
