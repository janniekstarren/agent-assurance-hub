/** Left navigation rail — brand, the eight modules, and a companion note.
    Collapsible to an icon-only rail (state in AppState, persisted). */

import { makeStyles, mergeClasses, tokens, Tooltip } from '@fluentui/react-components';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import { useAppState } from './AppState';
import { BrandGlyph, BrandMark } from '../components/BrandMark';

const useStyles = makeStyles({
  rail: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    transitionProperty: 'width, min-width',
    transitionDuration: '200ms',
    transitionTimingFunction: 'cubic-bezier(0.1,0.9,0.2,1)',
    overflow: 'hidden',
  },
  brand: {
    padding: '18px 16px 14px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    minHeight: '66px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
  },
  brandCollapsed: { padding: '18px 0', justifyContent: 'center' },
  nav: {
    flex: 1,
    padding: '10px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflowY: 'auto',
    overflowX: 'hidden',
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
    whiteSpace: 'nowrap',
    transitionProperty: 'background-color, color',
    transitionDuration: '120ms',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  itemCollapsed: { justifyContent: 'center', padding: '9px 0' },
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
  icon: { display: 'flex', fontSize: '20px', flexShrink: 0 },
  labels: { display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 },
  label: { fontSize: '13.5px', fontWeight: 600 },
  desc: { fontSize: '11px', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis' },
  footer: {
    padding: '12px 16px 16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  footerCollapsed: { alignItems: 'center', padding: '12px 0 16px' },
  footNote: { fontSize: '11px', color: tokens.colorNeutralForeground3, lineHeight: 1.4 },
  pillRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  greenDot: { width: '8px', height: '8px', backgroundColor: tokens.colorPaletteGreenBackground3 },
});

export function NavRail() {
  const s = useStyles();
  const { navCollapsed } = useAppState();
  return (
    <nav
      className={s.rail}
      style={{ width: navCollapsed ? 64 : 248, minWidth: navCollapsed ? 64 : 248 }}
      aria-label="Primary"
    >
      <div className={mergeClasses(s.brand, navCollapsed && s.brandCollapsed)}>
        {navCollapsed ? <BrandGlyph size={30} /> : <BrandMark />}
      </div>
      <div className={s.nav}>
        {NAV_ITEMS.map((item) => (
          <Tooltip
            key={item.path}
            content={navCollapsed ? item.label : item.description}
            relationship="label"
            positioning="after"
          >
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                mergeClasses(s.item, navCollapsed && s.itemCollapsed, isActive && s.itemActive)
              }
            >
              <span className={s.icon}>{item.icon}</span>
              {!navCollapsed && (
                <span className={s.labels}>
                  <span className={s.label}>{item.label}</span>
                  <span className={s.desc}>{item.description}</span>
                </span>
              )}
            </NavLink>
          </Tooltip>
        ))}
      </div>
      <div className={mergeClasses(s.footer, navCollapsed && s.footerCollapsed)}>
        <div className={s.pillRow}>
          <span className={mergeClasses('pulse-dot', s.greenDot)} />
          {!navCollapsed && <span className={s.footNote}>Companion to Microsoft Agent 365</span>}
        </div>
        {!navCollapsed && <span className={s.footNote}>Mock data · estate as of 24 May 2026</span>}
      </div>
    </nav>
  );
}
