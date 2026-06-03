/**
 * Incidents service. In production this is assembled by correlating Azure
 * Monitor (App Insights) alerts/exceptions, the continuous-eval results
 * (Dataverse, written by the Power Automate flow), PPAC credit signals and
 * inventory change events — keyed by agent and time window.
 */

import type { Incident } from '../types/domain';
import { INCIDENTS, INCIDENT_BY_SCHEMA } from '../mock/incidents';
import { respond } from './mockApi';

export async function getIncidents(): Promise<Incident[]> {
  return respond(INCIDENTS, { label: 'incidents' });
}

export async function getIncident(idOrSchema: string): Promise<Incident | undefined> {
  const found = INCIDENTS.find((i) => i.id === idOrSchema) ?? INCIDENT_BY_SCHEMA[idOrSchema];
  return respond(found, { label: 'incident' });
}
