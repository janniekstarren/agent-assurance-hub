/** Left navigation rail — brand, the eight modules, and a companion note. */

import { makeStyles, mergeClasses, tokens, Tooltip } from '@fluentui/react-components';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import { BrandMark } from '../components/BrandMark';

const useStyles = makeStyles({
  rail: {
    width: '248px',
    minWidth: '248px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  brand: {
    padding: '18px 16px 14px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  nav: {
    flex: 1,
    padding: '10px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '9px 12px',
    borderRadius: tokens.borderRadiusLarge,
    textDecoration: 'none',
    color: tokens.colorNeutralForeground2,
    position: 'relative',
    transitionProperty: 'background-color, color',
    transitionDuration: '120ms',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  itemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2,
      color: tokens.colorBrandForeground1,
    },
    '::before': {
      content: '""',
      position: 'absolute',
      left: '-10px',
      top: '8px',
      bottom: '8px',
      width: '3px',
      borderRadius: '0 3px 3px 0',
      backgroundColor: tokens.colorBrandStroke1,
    },
  },
  icon: {
    display: 'flex',
    fontSize: '20px',
  },
  labels: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.15,
  },
  label: {
    fontSize: '13.5px',
    fontWeight: 600,
  },
  desc: {
    fontSize: '11px',
    opacity: 0.7,
  },
  footer: {
    padding: '12px 16px 16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  footNote: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    lineHeight: 1.4,
  },
  pillRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  greenDot: {
    width: '8px',
    height: '8px',
    backgroundColor: tokens.colorPaletteGreenBackground3,
  },
});

export function NavRail() {
  const s = useStyles();
  return (
    <nav className={s.rail} aria-label="Primary">
      <div className={s.brand}>
        <BrandMark />
      </div>
      <div className={s.nav}>
        {NAV_ITEMS.map((item) => (
          <Tooltip key={item.path} content={item.description} relationship="description" positioning="after">
            <NavLink
              to={item.path}
              className={({ isActive }) => mergeClasses(s.item, isActive && s.itemActive)}
            >
              <span className={s.icon}>{item.icon}</span>
              <span className={s.labels}>
                <span className={s.label}>{item.label}</span>
                <span className={s.desc}>{item.description}</span>
              </span>
            </NavLink>
          </Tooltip>
        ))}
      </div>
      <div className={s.footer}>
        <div className={s.pillRow}>
          <span className={mergeClasses('pulse-dot', s.greenDot)} />
          <span className={s.footNote}>Companion to Microsoft Agent 365</span>
        </div>
        <span className={s.footNote}>Mock data · estate as of 24 May 2026</span>
      </div>
    </nav>
  );
}
