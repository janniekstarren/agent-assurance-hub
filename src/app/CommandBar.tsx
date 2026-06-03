/** Top command bar — page context + persona on the left, global controls on the
    right: environment filter, demo scenario switcher, Ask, theme toggle. */

import {
  Button,
  Divider,
  Tab,
  TabList,
  ToggleButton,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  ChatSparkle20Regular,
  LineHorizontal320Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from '@fluentui/react-icons';
import { useLocation } from 'react-router-dom';
import { BRAND_PRIMARY } from './theme';
import { useAppState } from './AppState';
import type { EnvFilter } from './AppState';
import { NAV_BY_PATH } from './navItems';
import { ScenarioSwitcher } from './ScenarioSwitcher';
import { PersonaSwitcher } from './PersonaSwitcher';

const useStyles = makeStyles({
  bar: {
    height: '60px',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 16px 0 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  titleWrap: { display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0, flexShrink: 1 },
  titleIcon: {
    display: 'flex',
    fontSize: '22px',
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
  },
  titleText: { display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0, overflow: 'hidden' },
  title: {
    fontSize: '15.5px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  subtitle: {
    fontSize: '11.5px',
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  spacer: { flex: 1, minWidth: '8px' },
  controls: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
  group: { display: 'flex', alignItems: 'center', gap: '6px' },
  groupLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: tokens.colorNeutralForeground3,
  },
  askButton: {
    backgroundImage: 'linear-gradient(135deg, #2E6BF5, #1547D1)',
    border: 'none',
    color: '#fff',
    boxShadow: `0 2px 10px color-mix(in srgb, ${BRAND_PRIMARY} 42%, transparent)`,
    ':hover': {
      backgroundImage: 'linear-gradient(135deg, #3D72F3, #165AF1)',
      color: '#fff',
      boxShadow: `0 4px 16px color-mix(in srgb, ${BRAND_PRIMARY} 54%, transparent)`,
    },
    ':hover:active': {
      backgroundImage: 'linear-gradient(135deg, #1547D1, #1340C8)',
      color: '#fff',
    },
  },
});

const ENV_TABS: { value: EnvFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'dev', label: 'Dev' },
  { value: 'test', label: 'Test' },
  { value: 'prod', label: 'Prod' },
];

export function CommandBar() {
  const s = useStyles();
  const { pathname } = useLocation();
  const nav = NAV_BY_PATH[pathname] ?? NAV_BY_PATH['/overview'];
  const {
    environment,
    setEnvironment,
    themeMode,
    toggleTheme,
    openAskWith,
    toggleNav,
  } = useAppState();

  return (
    <header className={mergeClasses(s.bar, 'acrylic')}>
      <Tooltip content="Collapse / expand menu" relationship="label">
        <Button
          appearance="subtle"
          icon={<LineHorizontal320Regular />}
          aria-label="Toggle navigation menu"
          onClick={toggleNav}
        />
      </Tooltip>
      <div className={s.titleWrap}>
        <span className={s.titleIcon}>{nav.icon}</span>
        <span className={s.titleText}>
          <span className={s.title}>{nav.label}</span>
          <span className={s.subtitle}>{nav.description}</span>
        </span>
      </div>

      <Divider vertical style={{ height: 28 }} />
      <PersonaSwitcher />

      <div className={s.spacer} />

      <div className={s.controls}>
        <div className={s.group}>
          <span className={s.groupLabel}>Env</span>
          <TabList
            size="small"
            selectedValue={environment}
            onTabSelect={(_e, d) => setEnvironment(d.value as EnvFilter)}
            appearance="subtle"
          >
            {ENV_TABS.map((t) => (
              <Tab key={t.value} value={t.value}>
                {t.label}
              </Tab>
            ))}
          </TabList>
        </div>

        <Divider vertical style={{ height: 28 }} />

        <ScenarioSwitcher />

        <Button
          appearance="primary"
          className={s.askButton}
          icon={<ChatSparkle20Regular />}
          onClick={() => openAskWith('')}
        >
          Ask
        </Button>

        <Tooltip
          content={themeMode === 'light' ? 'Switch to dark' : 'Switch to light'}
          relationship="label"
        >
          <ToggleButton
            appearance="subtle"
            checked={themeMode === 'dark'}
            onClick={toggleTheme}
            icon={themeMode === 'light' ? <WeatherMoon20Regular /> : <WeatherSunny20Regular />}
            aria-label="Toggle theme"
          />
        </Tooltip>
      </div>
    </header>
  );
}
