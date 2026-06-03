/**
 * Safety / audit service.
 *
 * Mirrors Purview audit `CopilotInteraction` / `AIAppInteraction` via the
 * Office 365 Management Activity API. Records carry metadata, sensitivity
 * labels and JailbreakDetected / XPIADetected flags — NOT raw prompt text (that
 * is a separate eDiscovery path). Triage mutations are in-memory for the demo.
 */

import type {
  AlertSeverity,
  AlertStatus,
  AlertType,
  CallerType,
  Environment,
  SafetyAlert,
} from '../types/domain';
import { ALERT_TYPES_ORDER } from '../mock/alerts';
import { managementActivity } from './synthetic/client';
import type { ManagementActivityRecord } from './synthetic/client';
import { respond } from './mockApi';

/** Parse one Management Activity audit record into the domain SafetyAlert. */
function recordToAlert(r: ManagementActivityRecord): SafetyAlert {
  // schemaName rides in ExtendedProperties; strip it back out of display metadata.
  const { schemaName: sn, ...metadata } = r.ExtendedProperties;
  return {
    id: r.Id,
    schemaName: sn ?? r.AppId,
    agentId: r.AppId,
    agentName: r.AppName,
    environment: r.EnvironmentName as Environment,
    type: r.AlertType as AlertType,
    severity: r.Severity as AlertSeverity,
    status: r.Status as AlertStatus,
    timestamp: r.CreationTime,
    accessedResource: r.AccessedResource,
    sensitivityLabel: r.SensitivityLabel,
    jailbreakDetected: r.JailbreakDetected,
    xpiaDetected: r.XPIADetected,
    callerType: r.CallerType as CallerType,
    summary: r.Summary,
    metadata,
  };
}

// Hydrated once from the feed; triage mutations persist on this cache.
let alerts: SafetyAlert[] | null = null;
async function ensureLoaded(): Promise<SafetyAlert[]> {
  if (!alerts) {
    const feed = await managementActivity.feed();
    alerts = feed.records.map(recordToAlert);
  }
  return alerts;
}

export async function listAlerts(): Promise<SafetyAlert[]> {
  const current = await ensureLoaded();
  return respond(
    current.map((a) => ({ ...a })),
    { label: 'audit.alerts' },
  );
}

export async function getAlert(id: string): Promise<SafetyAlert | undefined> {
  const current = await ensureLoaded();
  return respond(
    current.find((a) => a.id === id),
    { label: 'audit.alert' },
  );
}

export async function setAlertStatus(id: string, status: AlertStatus): Promise<SafetyAlert> {
  const current = await ensureLoaded();
  alerts = current.map((a) => (a.id === id ? { ...a, status } : a));
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
  const current = await ensureLoaded();
  const agents = Array.from(new Set(current.map((a) => a.agentName))).sort();
  const types = [...ALERT_TYPES_ORDER];
  const sevRank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  const cells: AlertHeatmap['cells'] = [];
  for (const agentName of agents) {
    for (const type of types) {
      const matching = current.filter((a) => a.agentName === agentName && a.type === type);
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
