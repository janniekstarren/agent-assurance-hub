/** App shell — nav rail, command bar, scenario banner, animated page outlet and
    the global Ask drawer. */

import { makeStyles, tokens } from '@fluentui/react-components';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import { NavRail } from './NavRail';
import { CommandBar } from './CommandBar';
import { ScenarioBanner } from './ScenarioBanner';
import { AskDrawer } from './AskDrawer';
import { pageVariants } from './motion';

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
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                className={`${s.page} scroll-area`}
                style={{ overflowY: 'auto' }}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <AskDrawer />
      </div>
    </MotionConfig>
  );
}
