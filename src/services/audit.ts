/**
 * Safety / audit service.
 *
 * Mirrors Purview audit `CopilotInteraction` / `AIAppInteraction` via the
 * Office 365 Management Activity API. Records carry metadata, sensitivity
 * labels and JailbreakDetected / XPIADetected flags — NOT raw prompt text (that
 * is a separate eDiscovery path). Triage mutations are in-memory for the demo.
 */

import type { AlertStatus, AlertType, SafetyAlert } from '../types/domain';
import { ALERTS, ALERT_TYPES_ORDER } from '../mock/alerts';
import { respond } from './mockApi';

let alerts: SafetyAlert[] = ALERTS.map((a) => ({ ...a }));

export async function listAlerts(): Promise<SafetyAlert[]> {
  return respond(
    alerts.map((a) => ({ ...a })),
    { label: 'audit.alerts' },
  );
}

export async function getAlert(id: string): Promise<SafetyAlert | undefined> {
  return respond(
    alerts.find((a) => a.id === id),
    { label: 'audit.alert' },
  );
}

export async function setAlertStatus(id: string, status: AlertStatus): Promise<SafetyAlert> {
  alerts = alerts.map((a) => (a.id === id ? { ...a, status } : a));
  const updated = alerts.find((a) => a.id === id);
  if (!updated) throw new Error(`Alert ${id} not found`);
  return respond(updated, { min: 120, max: 300, label: 'audit.triage' });
}

export interface AlertHeatmap {
  agents: string[];
  types: AlertType[];
  cells: { agentName: string; type: AlertType; count: number; maxSeverity: string }[];
}

export async function getAlertHeatmap(): Promise<AlertHeatmap> {
  const agents = Array.from(new Set(alerts.map((a) => a.agentName))).sort();
  const types = [...ALERT_TYPES_ORDER];
  const sevRank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  const cells: AlertHeatmap['cells'] = [];
  for (const agentName of agents) {
    for (const type of types) {
      const matching = alerts.filter((a) => a.agentName === agentName && a.type === type);
      let maxSeverity = '';
      let rank = 0;
      for (const m of matching) {
        if (sevRank[m.severity] > rank) {
          rank = sevRank[m.severity];
          maxSeverity = m.severity;
        }
      }
      cells.push({ agentName, type, count: matching.length, maxSeverity });
    }
  }
  return respond({ agents, types, cells }, { label: 'audit.heatmap' });
}
