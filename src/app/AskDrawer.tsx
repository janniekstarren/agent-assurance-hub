/** Global Ask slide-over — the NLP assistant, reachable from anywhere. */

import {
  Button,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  OverlayDrawer,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { useAppState } from './AppState';
import { ChatPanel } from '../modules/ask/ChatPanel';

const useStyles = makeStyles({
  drawer: { width: 'min(460px, 100vw)' },
  header: { borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
});

export function AskDrawer() {
  const s = useStyles();
  const { askOpen, setAskOpen, askSeed } = useAppState();

  return (
    <OverlayDrawer
      open={askOpen}
      onOpenChange={(_e, { open }) => setAskOpen(open)}
      position="end"
      size="medium"
      className={mergeClasses(s.drawer, 'acrylic-strong')}
    >
      <DrawerHeader className={s.header}>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={() => setAskOpen(false)}
            />
          }
        >
          Ask — estate assistant
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody className={s.body}>
        <ChatPanel seed={askSeed} embedded />
      </DrawerBody>
    </OverlayDrawer>
  );
}
