/** Demo scenario switcher — jumps the whole app to a seeded narrative state and
    deep-links to the module that tells that story. */

import {
  Badge,
  Menu,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Beaker24Regular, ChevronDown16Regular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useAppState } from './AppState';
import { SCENARIOS, SCENARIO_BY_ID } from '../mock/scenarios';
import type { ScenarioId } from '../types/domain';

const useStyles = makeStyles({
  trigger: {
    minWidth: '210px',
    justifyContent: 'space-between',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    maxWidth: '320px',
  },
  label: { fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' },
  desc: { fontSize: '11.5px', color: tokens.colorNeutralForeground3, lineHeight: 1.35 },
});

export function ScenarioSwitcher() {
  const s = useStyles();
  const { scenario, setScenario } = useAppState();
  const navigate = useNavigate();
  const current = SCENARIO_BY_ID[scenario];

  const onSelect = (id: ScenarioId) => {
    setScenario(id);
    const target = SCENARIO_BY_ID[id];
    if (target?.route) navigate(target.route);
  };

  return (
    <Menu
      checkedValues={{ scenario: [scenario] }}
      onCheckedValueChange={(_e, data) => {
        const id = data.checkedItems[0] as ScenarioId;
        if (id) onSelect(id);
      }}
    >
      <MenuTrigger disableButtonEnhancement>
        <Button
          className={s.trigger}
          appearance="subtle"
          icon={<Beaker24Regular />}
          iconPosition="before"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600 }}>Scenario:</span>
            <Badge appearance="tint" color="brand" shape="rounded">
              {current?.label ?? 'Healthy estate'}
            </Badge>
          </span>
          <ChevronDown16Regular />
        </Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {SCENARIOS.map((sc) => (
            <MenuItemRadio key={sc.id} name="scenario" value={sc.id}>
              <span className={s.item}>
                <span className={s.label}>
                  {sc.label}
                  <Badge size="small" appearance="outline" color="informative">
                    {sc.tagline}
                  </Badge>
                </span>
                <span className={s.desc}>{sc.description}</span>
              </span>
            </MenuItemRadio>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
