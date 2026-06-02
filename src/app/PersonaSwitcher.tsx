/** Persona switcher — selects the active stakeholder lens (Executive / IT Admin
    / Agent Owner). Changing it re-shapes the Overview and the Ask prompts. */

import {
  Button,
  Menu,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ChevronDown16Regular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useAppState } from './AppState';
import { PERSONAS, PERSONA_BY_ID } from './personas';
import type { PersonaId } from './personas';

const useStyles = makeStyles({
  trigger: { minWidth: '150px', justifyContent: 'space-between' },
  triggerInner: { display: 'flex', alignItems: 'center', gap: '7px' },
  item: { display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '300px' },
  itemIcon: { display: 'flex', marginTop: '1px' },
  itemText: { display: 'flex', flexDirection: 'column', gap: '1px' },
  itemLabel: { fontWeight: 600 },
  itemTag: { fontSize: '11.5px', color: tokens.colorNeutralForeground3, lineHeight: 1.35 },
});

export function PersonaSwitcher() {
  const s = useStyles();
  const { persona, setPersona } = useAppState();
  const navigate = useNavigate();
  const current = PERSONA_BY_ID[persona];

  return (
    <Menu
      checkedValues={{ persona: [persona] }}
      onCheckedValueChange={(_e, data) => {
        const id = data.checkedItems[0] as PersonaId;
        if (id) {
          setPersona(id);
          navigate('/overview');
        }
      }}
    >
      <MenuTrigger disableButtonEnhancement>
        <Button appearance="subtle" className={s.trigger}>
          <span className={s.triggerInner}>
            <span style={{ display: 'flex', color: current.accent }}>{current.icon}</span>
            <span style={{ fontWeight: 600 }}>{current.label}</span>
          </span>
          <ChevronDown16Regular />
        </Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {PERSONAS.map((p) => (
            <MenuItemRadio key={p.id} name="persona" value={p.id}>
              <span className={s.item}>
                <span className={s.itemIcon} style={{ color: p.accent }}>
                  {p.icon}
                </span>
                <span className={s.itemText}>
                  <span className={s.itemLabel}>{p.label}</span>
                  <span className={s.itemTag}>{p.tagline}</span>
                </span>
              </span>
            </MenuItemRadio>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
