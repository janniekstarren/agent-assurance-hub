/** A slim banner that appears when a non-baseline demo scenario is active,
    summarising the story and deep-linking to its module. */

import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowRight16Regular, Dismiss16Regular } from '@fluentui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from './AppState';
import { SCENARIO_BY_ID } from '../mock/scenarios';
import type { ScenarioId } from '../types/domain';

const INTENT: Record<ScenarioId, { bar: string; bg: string; fg: string }> = {
  healthy: {
    bar: tokens.colorStatusSuccessBorder1,
    bg: tokens.colorStatusSuccessBackground1,
    fg: tokens.colorStatusSuccessForeground1,
  },
  drift: {
    bar: tokens.colorStatusWarningBorder1,
    bg: tokens.colorStatusWarningBackground1,
    fg: tokens.colorStatusWarningForeground1,
  },
  'data-leak': {
    bar: tokens.colorStatusDangerBorder1,
    bg: tokens.colorStatusDangerBackground1,
    fg: tokens.colorStatusDangerForeground1,
  },
  'cost-spike': {
    bar: tokens.colorStatusWarningBorder1,
    bg: tokens.colorStatusWarningBackground1,
    fg: tokens.colorStatusWarningForeground1,
  },
  handover: {
    bar: tokens.colorBrandStroke1,
    bg: tokens.colorBrandBackground2,
    fg: tokens.colorBrandForeground1,
  },
};

const useStyles = makeStyles({
  wrap: { overflow: 'hidden' },
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '9px 18px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  bar: { width: '4px', alignSelf: 'stretch', borderRadius: '3px' },
  text: { fontSize: '13px', fontWeight: 600, flex: 1 },
  spacer: { flex: 1 },
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
  const intent = INTENT[scenario];
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
            <div className={s.banner} style={{ backgroundColor: intent.bg, color: intent.fg }}>
              <div className={s.bar} style={{ backgroundColor: intent.bar }} />
              <span className={s.text}>{sc.banner}</span>
              {!onRoute && (
                <Button
                  size="small"
                  appearance="transparent"
                  icon={<ArrowRight16Regular />}
                  iconPosition="after"
                  onClick={() => navigate(sc.route)}
                  style={{ color: intent.fg }}
                >
                  View story
                </Button>
              )}
              <Button
                size="small"
                appearance="transparent"
                icon={<Dismiss16Regular />}
                aria-label="Dismiss"
                onClick={() => setDismissed(scenario)}
                style={{ color: intent.fg }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
