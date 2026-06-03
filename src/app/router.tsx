/** Route table — the eight modules under the shared Layout. Each module is
    code-split (lazy) so the initial bundle stays small; the shell + Overview
    load first, the rest on navigation. */

import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';

const OverviewPage = lazy(() => import('../modules/overview/OverviewPage').then((m) => ({ default: m.OverviewPage })));
const AgentsPage = lazy(() => import('../modules/agents/AgentsPage').then((m) => ({ default: m.AgentsPage })));
const AssurancePage = lazy(() => import('../modules/assurance/AssurancePage').then((m) => ({ default: m.AssurancePage })));
const SafetyPage = lazy(() => import('../modules/safety/SafetyPage').then((m) => ({ default: m.SafetyPage })));
const CostPage = lazy(() => import('../modules/cost/CostPage').then((m) => ({ default: m.CostPage })));
const LifecyclePage = lazy(() => import('../modules/lifecycle/LifecyclePage').then((m) => ({ default: m.LifecyclePage })));
const Agent365Page = lazy(() => import('../modules/agent365/Agent365Page').then((m) => ({ default: m.Agent365Page })));
const CoveragePage = lazy(() => import('../modules/coverage/CoveragePage').then((m) => ({ default: m.CoveragePage })));
const AskPage = lazy(() => import('../modules/ask/AskPage').then((m) => ({ default: m.AskPage })));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: 'assurance', element: <AssurancePage /> },
      { path: 'safety', element: <SafetyPage /> },
      { path: 'cost', element: <CostPage /> },
      { path: 'lifecycle', element: <LifecyclePage /> },
      { path: 'agent365', element: <Agent365Page /> },
      { path: 'coverage', element: <CoveragePage /> },
      { path: 'ask', element: <AskPage /> },
      { path: '*', element: <Navigate to="/overview" replace /> },
    ],
  },
]);
