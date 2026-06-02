/** Route table — the eight modules under the shared Layout. */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { OverviewPage } from '../modules/overview/OverviewPage';
import { AgentsPage } from '../modules/agents/AgentsPage';
import { AssurancePage } from '../modules/assurance/AssurancePage';
import { SafetyPage } from '../modules/safety/SafetyPage';
import { CostPage } from '../modules/cost/CostPage';
import { LifecyclePage } from '../modules/lifecycle/LifecyclePage';
import { Agent365Page } from '../modules/agent365/Agent365Page';
import { AskPage } from '../modules/ask/AskPage';

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
      { path: 'ask', element: <AskPage /> },
      { path: '*', element: <Navigate to="/overview" replace /> },
    ],
  },
]);
