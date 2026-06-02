/**
 * Global UI state shared across every module: theme mode, the environment
 * filter, the time-range picker, the active demo scenario, and the global Ask
 * slide-over. Theme and scenario persist to localStorage so the pitch resumes
 * where it left off. Data lives in TanStack Query; this is purely view state.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Environment, ScenarioId } from '../types/domain';

export type ThemeMode = 'light' | 'dark';
export type EnvFilter = Environment | 'all';
export type TimeRange = '7d' | '30d' | '90d';

interface AppState {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  navCollapsed: boolean;
  toggleNav: () => void;
  environment: EnvFilter;
  setEnvironment: (e: EnvFilter) => void;
  timeRange: TimeRange;
  setTimeRange: (t: TimeRange) => void;
  scenario: ScenarioId;
  setScenario: (s: ScenarioId) => void;
  askOpen: boolean;
  setAskOpen: (open: boolean) => void;
  askSeed: string | null;
  openAskWith: (question: string) => void;
  /** The agent profile slide-over (the spine other modules deep-link into). */
  agentDrawerId: string | null;
  openAgent: (id: string) => void;
  closeAgent: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

function readStored<T extends string>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  return (localStorage.getItem(key) as T) ?? fallback;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    readStored<ThemeMode>('aah.theme', 'light'),
  );
  const [navCollapsed, setNavCollapsed] = useState<boolean>(
    () => readStored<string>('aah.nav', 'false') === 'true',
  );
  const [environment, setEnvironment] = useState<EnvFilter>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('90d');
  const [scenario, setScenarioState] = useState<ScenarioId>(() =>
    readStored<ScenarioId>('aah.scenario', 'healthy'),
  );
  const [askOpen, setAskOpen] = useState(false);
  const [askSeed, setAskSeed] = useState<string | null>(null);
  const [agentDrawerId, setAgentDrawerId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('aah.theme', themeMode);
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('aah.nav', String(navCollapsed));
  }, [navCollapsed]);

  useEffect(() => {
    localStorage.setItem('aah.scenario', scenario);
  }, [scenario]);

  const toggleTheme = useCallback(
    () => setThemeMode((m) => (m === 'light' ? 'dark' : 'light')),
    [],
  );
  const toggleNav = useCallback(() => setNavCollapsed((v) => !v), []);
  const setScenario = useCallback((s: ScenarioId) => setScenarioState(s), []);
  const openAskWith = useCallback((question: string) => {
    setAskSeed(question);
    setAskOpen(true);
  }, []);
  const openAgent = useCallback((id: string) => setAgentDrawerId(id), []);
  const closeAgent = useCallback(() => setAgentDrawerId(null), []);

  const value = useMemo<AppState>(
    () => ({
      themeMode,
      toggleTheme,
      navCollapsed,
      toggleNav,
      environment,
      setEnvironment,
      timeRange,
      setTimeRange,
      scenario,
      setScenario,
      askOpen,
      setAskOpen,
      askSeed,
      openAskWith,
      agentDrawerId,
      openAgent,
      closeAgent,
    }),
    [
      themeMode,
      toggleTheme,
      navCollapsed,
      toggleNav,
      environment,
      timeRange,
      scenario,
      askOpen,
      askSeed,
      openAskWith,
      setScenario,
      agentDrawerId,
      openAgent,
      closeAgent,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
