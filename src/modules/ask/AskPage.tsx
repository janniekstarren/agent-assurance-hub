import { makeStyles } from '@fluentui/react-components';
import { PageContainer, Panel, SectionTitle } from '../../components/primitives';
import { HandoverFlow } from '../../components/HandoverFlow';
import { ChatPanel } from './ChatPanel';

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
    gap: '14px',
    '@media (max-width: 1080px)': { gridTemplateColumns: '1fr' },
  },
  chatPanel: { height: '620px', display: 'flex', flexDirection: 'column', padding: '14px 16px' },
});

export function AskPage() {
  const s = useStyles();
  return (
    <PageContainer>
      <SectionTitle
        title="Ask"
        caption="An NLP assistant that reasons over the estate's telemetry — and the confidence-driven handover demonstration."
      />
      <div className={s.grid}>
        <Panel className={s.chatPanel}>
          <ChatPanel />
        </Panel>
        <Panel>
          <SectionTitle
            title="Handover demonstration"
            caption="The Baggage Enquiry Bot hands over when confidence drops below threshold."
          />
          <div style={{ marginTop: 12 }}>
            <HandoverFlow />
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
