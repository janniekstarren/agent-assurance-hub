/** The eight modules — shared by the nav rail and the command-bar page title. */

import type { ReactElement } from 'react';
import {
  ArrowSync24Regular,
  Bot24Regular,
  Building24Regular,
  ChatSparkle24Regular,
  Database24Regular,
  DataTrending24Regular,
  Money24Regular,
  ShieldCheckmark24Regular,
  ShieldError24Regular,
} from '@fluentui/react-icons';

export interface NavItem {
  path: string;
  label: string;
  description: string;
  icon: ReactElement;
}

export const NAV_ITEMS: NavItem[] = [
  {
    path: '/overview',
    label: 'Overview',
    description: 'Estate health at a glance',
    icon: <DataTrending24Regular />,
  },
  {
    path: '/agents',
    label: 'Agents',
    description: 'Inventory across environments',
    icon: <Bot24Regular />,
  },
  {
    path: '/assurance',
    label: 'Assurance',
    description: 'Accuracy, drift, confidence',
    icon: <ShieldCheckmark24Regular />,
  },
  {
    path: '/safety',
    label: 'Safety',
    description: 'Data-leak, sensitivity, jailbreak',
    icon: <ShieldError24Regular />,
  },
  {
    path: '/cost',
    label: 'Cost',
    description: 'Credits, licensing, budgets',
    icon: <Money24Regular />,
  },
  {
    path: '/lifecycle',
    label: 'Lifecycle',
    description: 'Multi-env ALM & approvals',
    icon: <ArrowSync24Regular />,
  },
  {
    path: '/agent365',
    label: 'Agent 365',
    description: 'Registry & security context',
    icon: <Building24Regular />,
  },
  {
    path: '/coverage',
    label: 'Coverage',
    description: 'Data sources & telemetry gaps',
    icon: <Database24Regular />,
  },
  {
    path: '/ask',
    label: 'Ask',
    description: 'NLP assistant over the estate',
    icon: <ChatSparkle24Regular />,
  },
];

export const NAV_BY_PATH: Record<string, NavItem> = NAV_ITEMS.reduce(
  (acc, item) => {
    acc[item.path] = item;
    return acc;
  },
  {} as Record<string, NavItem>,
);
