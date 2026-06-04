/** A slim, low-key ribbon that marks which demo scenario is active and
    deep-links to its story. Deliberately styled as presenter chrome — not an
    alert — so it reads differently from page content like the Overview summary. */

import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowRight16Regular, Beaker16Regular, Dismiss16Regular } from '@fluentui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from './AppState';
import { SCENARIO_BY_ID } from '../mock/scenarios';
import type { ScenarioId } from '../types/domain';

/** Intent dot colour per scenario. */
const DOT: Record<ScenarioId, string> = {
  healthy: tokens.colorStatusSuccessBorder1,
  drift: tokens.colorStatusWarningBorder1,
  'data-leak': tokens.colorStatusDangerBorder1,
  'cost-spike': tokens.colorStatusWarningBorder1,
  handover: tokens.colorBrandStroke1,
};

const useStyles = makeStyles({
  wrap: { overflow: 'hidden' },
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '5px 12px 5px 14px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '10.5px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  dot: { width: '7px', height: '7px', borderRadius: '999px', flexShrink: 0 },
  text: {
    fontSize: '12.5px',
    color: tokens.colorNeutralForeground2,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

export function ScenarioBanner() {
  const s = useStyles();
  const { scenario } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState<ScenarioId | null>(null);

  useEffect(() => {
    setDismissed(null);
  }, [scenario]);

  const sc = SCENARIO_BY_ID[scenario];
  const show = scenario !== 'healthy' && sc?.banner && dismissed !== scenario;
  const onRoute = sc?.route && location.pathname === sc.route.split('?')[0];

  return (
    <div className={s.wrap}>
      <AnimatePresence initial={false}>
        {show && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.1, 0.9, 0.2, 1] }}
          >
            <div className={s.banner}>
              <span className={s.tag}>
                <Beaker16Regular />
                Demo scenario
              </span>
              <span className={s.dot} style={{ backgroundColor: DOT[scenario] }} />
              <span className={s.text}>{sc.banner}</span>
              {!onRoute && (
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<ArrowRight16Regular />}
                  iconPosition="after"
                  onClick={() => navigate(sc.route)}
                >
                  View story
                </Button>
              )}
              <Button
                size="small"
                appearance="subtle"
                icon={<Dismiss16Regular />}
                aria-label="Dismiss"
                onClick={() => setDismissed(scenario)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
