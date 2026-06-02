/** App shell — nav rail, command bar, scenario banner, animated page outlet and
    the global Ask drawer. */

import { makeStyles, tokens } from '@fluentui/react-components';
import { MotionConfig } from 'framer-motion';
import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NavRail } from './NavRail';
import { CommandBar } from './CommandBar';
import { ScenarioBanner } from './ScenarioBanner';
import { AskDrawer } from './AskDrawer';
import { AgentDrawer } from '../components/AgentDrawer';
import { LoadingState } from '../components/primitives';

const useStyles = makeStyles({
  root: { display: 'flex', height: '100%', width: '100%', overflow: 'hidden' },
  main: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  content: { flex: 1, minHeight: 0, position: 'relative' },
  page: { height: '100%' },
});

export function Layout() {
  const s = useStyles();
  const location = useLocation();
  return (
    <MotionConfig reducedMotion="user">
      <div className={s.root}>
        <NavRail />
        <div className={s.main}>
          <CommandBar />
          <ScenarioBanner />
          <main className={`${s.content} scroll-area`}>
            <Suspense fallback={<div style={{ paddingTop: 60 }}><LoadingState /></div>}>
              <div
                key={location.pathname}
                className={`${s.page} page-enter scroll-area`}
                style={{ overflowY: 'auto' }}
              >
                <Outlet />
              </div>
            </Suspense>
          </main>
        </div>
        <AskDrawer />
        <AgentDrawer />
      </div>
    </MotionConfig>
  );
}
