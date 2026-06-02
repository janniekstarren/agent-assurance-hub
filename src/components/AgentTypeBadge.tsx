/** Visual distinction between Copilot Studio agents and Azure AI Foundry code
    agents — distinct icon, colour and label. */

import { makeStyles } from '@fluentui/react-components';
import { BotSparkle16Regular, Code16Regular } from '@fluentui/react-icons';
import type { AgentType } from '../types/domain';

const useStyles = makeStyles({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '2px 8px 2px 6px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    border: '1px solid',
  },
  icon: { display: 'flex', fontSize: '14px' },
});

const CONFIG: Record<AgentType, { label: string; short: string; color: string }> = {
  'copilot-studio': { label: 'Copilot Studio', short: 'Copilot Studio', color: '#00859B' },
  'foundry-code': { label: 'Azure AI Foundry', short: 'Foundry', color: '#8332B0' },
};

export function AgentTypeBadge({
  type,
  showLabel = true,
  short = false,
}: {
  type: AgentType;
  showLabel?: boolean;
  short?: boolean;
}) {
  const s = useStyles();
  const cfg = CONFIG[type];
  return (
    <span
      className={s.chip}
      style={{
        color: cfg.color,
        borderColor: `color-mix(in srgb, ${cfg.color} 45%, transparent)`,
        background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
      }}
    >
      <span className={s.icon}>
        {type === 'copilot-studio' ? <BotSparkle16Regular /> : <Code16Regular />}
      </span>
      {showLabel && <span>{short ? cfg.short : cfg.label}</span>}
    </span>
  );
}
