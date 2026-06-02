/** Confidence-driven handover — an animated escalation. As the conversation
    advances, confidence falls; when it crosses the threshold the Baggage bot
    hands over (to a human, or agent-to-agent to the Ops Copilot). */

import { Badge, Button, Tab, TabList, makeStyles, tokens } from '@fluentui/react-components';
import {
  ArrowSync16Regular,
  BotSparkle20Regular,
  CheckmarkCircle20Filled,
  Person20Regular,
  Warning20Filled,
} from '@fluentui/react-icons';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { HANDOVER_TO_AGENT, HANDOVER_TO_HUMAN } from '../mock/scenarios';
import type { HandoverStep } from '../types/domain';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: '14px' },
  head: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  spacer: { flex: 1 },
  confWrap: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 14px', borderRadius: tokens.borderRadiusLarge, background: tokens.colorNeutralBackground2, border: `1px solid ${tokens.colorNeutralStroke2}` },
  confTop: { display: 'flex', alignItems: 'baseline', gap: '8px' },
  confNum: { fontSize: '30px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 },
  confLabel: { fontSize: '12px', color: tokens.colorNeutralForeground3 },
  track: { position: 'relative', height: '8px', borderRadius: '999px', background: tokens.colorNeutralBackground4, overflow: 'visible', marginTop: '4px' },
  fill: { height: '100%', borderRadius: '999px' },
  threshold: { position: 'absolute', top: '-3px', bottom: '-3px', width: '2px', background: tokens.colorPaletteRedForeground1 },
  steps: { display: 'flex', flexDirection: 'column', gap: '0' },
  step: { display: 'flex', gap: '12px', paddingBottom: '14px', position: 'relative' },
  line: { position: 'absolute', left: '13px', top: '28px', bottom: '-2px', width: '2px', background: tokens.colorNeutralStroke2 },
  dot: { width: '28px', height: '28px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 },
  body: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  stepTop: { display: 'flex', alignItems: 'center', gap: '8px' },
  actor: { fontWeight: 700, fontSize: '13px' },
  label: { fontSize: '13px' },
  detail: { fontSize: '12px', color: tokens.colorNeutralForeground3, lineHeight: 1.4 },
});

function stepColor(kind: HandoverStep['kind']): string {
  switch (kind) {
    case 'confidence-breach':
      return tokens.colorPaletteRedForeground1;
    case 'handover-human':
    case 'handover-agent':
      return tokens.colorBrandForeground1;
    case 'resolved':
      return tokens.colorPaletteGreenForeground1;
    case 'agent-turn':
      return tokens.colorBrandForeground2;
    default:
      return tokens.colorNeutralForeground3;
  }
}

function StepIcon({ kind }: { kind: HandoverStep['kind'] }) {
  if (kind === 'confidence-breach') return <Warning20Filled style={{ fontSize: 16, color: '#fff' }} />;
  if (kind === 'resolved') return <CheckmarkCircle20Filled style={{ fontSize: 16, color: '#fff' }} />;
  if (kind === 'handover-agent' || kind === 'agent-turn') return <BotSparkle20Regular style={{ fontSize: 15, color: '#fff' }} />;
  return <Person20Regular style={{ fontSize: 15, color: '#fff' }} />;
}

export function HandoverFlow() {
  const s = useStyles();
  const reduced = useReducedMotion();
  const [variant, setVariant] = useState<'to-human' | 'to-agent'>('to-human');
  const [replayKey, setReplayKey] = useState(0);
  const scenario = variant === 'to-human' ? HANDOVER_TO_HUMAN : HANDOVER_TO_AGENT;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reduced) {
      setIdx(scenario.steps.length - 1);
      return;
    }
    setIdx(0);
    const t = setInterval(() => {
      setIdx((i) => (i < scenario.steps.length - 1 ? i + 1 : i));
    }, 1300);
    return () => clearInterval(t);
  }, [variant, replayKey, reduced, scenario.steps.length]);

  const current = scenario.steps[idx];
  const conf = current.confidence;
  const below = conf < scenario.threshold;
  const confColor = below ? '#C50F1F' : conf < scenario.threshold + 10 ? '#B88217' : '#107C10';

  return (
    <div className={s.root}>
      <div className={s.head}>
        <TabList size="small" selectedValue={variant} onTabSelect={(_e, d) => setVariant(d.value as 'to-human' | 'to-agent')}>
          <Tab value="to-human">Hand over to human</Tab>
          <Tab value="to-agent">Agent-to-agent</Tab>
        </TabList>
        <div className={s.spacer} />
        <Button size="small" appearance="subtle" icon={<ArrowSync16Regular />} onClick={() => setReplayKey((k) => k + 1)}>
          Replay
        </Button>
      </div>

      <div className={s.confWrap}>
        <div className={s.confTop}>
          <motion.span key={conf} className={s.confNum} style={{ color: confColor }} initial={{ scale: reduced ? 1 : 1.15 }} animate={{ scale: 1 }}>
            {conf}
          </motion.span>
          <span className={s.confLabel}>live confidence · threshold {scenario.threshold}</span>
          {below && <Badge appearance="filled" color="danger" size="small">below threshold</Badge>}
        </div>
        <div className={s.track}>
          <motion.div className={s.fill} style={{ background: confColor }} animate={{ width: `${conf}%` }} transition={{ duration: 0.5 }} />
          <div className={s.threshold} style={{ left: `${scenario.threshold}%` }} />
        </div>
      </div>

      <div className={s.steps}>
        <AnimatePresence>
          {scenario.steps.slice(0, idx + 1).map((step, i) => (
            <motion.div
              key={step.id}
              className={s.step}
              initial={{ opacity: 0, x: reduced ? 0 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {i < idx && <span className={s.line} />}
              <span
                className={s.dot}
                style={{ background: stepColor(step.kind) }}
              >
                <StepIcon kind={step.kind} />
              </span>
              <div className={s.body}>
                <div className={s.stepTop}>
                  <span className={s.actor}>{step.actor}</span>
                  <span className={s.label}>{step.label}</span>
                  <span className={s.spacer} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: stepColor(step.kind), fontVariantNumeric: 'tabular-nums' }}>
                    {step.confidence}
                  </span>
                </div>
                <span className={s.detail}>{step.detail}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
