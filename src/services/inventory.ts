/**
 * Inventory service.
 *
 * Mirrors the Power Platform Inventory API / Azure Resource Graph
 * `PowerPlatformResources` where `type == "microsoft.copilotstudio/agents"`,
 * joined to `microsoft.powerplatform/environments`. Fields: environmentId,
 * ownerId, lastPublishedAt, schemaName, botId, entraAgentId; orchestration /
 * model / channels / isManaged / isQuarantined (preview). Excludes classic PVA
 * v1 bots; not available in sovereign clouds.
 */

import type { Agent, Environment } from '../types/domain';
import { AGENTS, lineageBySchema } from '../mock/agents';
import { mtdCreditsFor } from '../mock/costLedger';
import { respond } from './mockApi';

/** MTD credits come from the cost ledger so grids match the Cost module. */
function withLedgerCredits(a: Agent): Agent {
  return { ...a, mtdCredits: mtdCreditsFor(a.schemaName, a.environment) };
}

export async function listAgents(): Promise<Agent[]> {
  return respond(AGENTS.map(withLedgerCredits), { label: 'inventory' });
}

export async function getAgentById(id: string): Promise<Agent | undefined> {
  const a = AGENTS.find((x) => x.id === id);
  return respond(a ? withLedgerCredits(a) : undefined, { label: 'inventory.get' });
}

export interface LineageGroup {
  schemaName: string;
  agentName: string;
  type: Agent['type'];
  zone: Agent['zone'];
  owner: string;
  records: Agent[];
  environments: Environment[];
}

export async function listLineageGroups(): Promise<LineageGroup[]> {
  const map = lineageBySchema();
  const groups: LineageGroup[] = [];
  for (const [schemaName, records] of map) {
    const first = records[0];
    groups.push({
      schemaName,
      agentName: first.displayName,
      type: first.type,
      zone: first.zone,
      owner: first.owner.displayName,
      records: records.map(withLedgerCredits),
      environments: records.map((r) => r.environment),
    });
  }
  groups.sort((a, b) => a.agentName.localeCompare(b.agentName));
  return respond(groups, { label: 'inventory.lineage' });
}
