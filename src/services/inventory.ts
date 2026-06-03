/**
 * Inventory service.
 *
 * Goes through the synthetic API (Azure Resource Graph). `rowToAgent` is the
 * REAL parse from the Resource Graph projection of
 * `microsoft.copilotstudio/agents` (joined to environments) into the domain
 * model — it is unchanged when you swap the synthetic client for a live call.
 * Excludes classic PVA v1 bots; not available in sovereign clouds.
 */

import type { Agent, Environment } from '../types/domain';
import { mtdCreditsFor } from '../mock/costLedger';
import { resourceGraph } from './synthetic/client';
import type { InventoryAgentRow } from './synthetic/client';
import { respond } from './mockApi';

/** Parse one Resource Graph row into the domain Agent. */
function rowToAgent(r: InventoryAgentRow): Agent {
  const p = r.properties;
  return {
    id: p.botId,
    displayName: p.displayName,
    schemaName: p.schemaName,
    environment: p.environmentName,
    type: p.agentType as Agent['type'],
    orchestration: p.orchestration as Agent['orchestration'],
    owner: { id: p.ownerId, displayName: p.ownerDisplayName, email: p.ownerEmail },
    zone: p.governanceZone as Agent['zone'],
    lifecycleState: p.lifecycleState as Agent['lifecycleState'],
    channels: p.channels,
    knowledgeSources: p.knowledgeSources,
    lastPublishedAt: p.lastPublishedAt,
    createdAt: p.createdOn,
    entraAgentId: p.entraAgentId,
    registryStatus: p.registryStatus as Agent['registryStatus'],
    isManaged: p.isManaged,
    isQuarantined: p.isQuarantined,
    model: p.model,
    description: p.description,
    assuranceScore: p.assuranceScore,
    // MTD credits come from the cost ledger so grids match the Cost module.
    mtdCredits: mtdCreditsFor(p.schemaName, p.environmentName),
    tags: p.tags,
  };
}

async function fetchAgents(): Promise<Agent[]> {
  const res = await resourceGraph.queryAgents();
  return res.data.map(rowToAgent);
}

export async function listAgents(): Promise<Agent[]> {
  return respond(await fetchAgents(), { label: 'inventory' });
}

export async function getAgentById(id: string): Promise<Agent | undefined> {
  const agents = await fetchAgents();
  return respond(
    agents.find((a) => a.id === id),
    { label: 'inventory.get' },
  );
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
  const agents = await fetchAgents();
  const order: Record<Environment, number> = { dev: 0, test: 1, prod: 2 };
  const map = new Map<string, Agent[]>();
  for (const a of agents) {
    const list = map.get(a.schemaName) ?? [];
    list.push(a);
    map.set(a.schemaName, list);
  }
  const groups: LineageGroup[] = [];
  for (const [schemaName, records] of map) {
    records.sort((x, y) => order[x.environment] - order[y.environment]);
    const first = records[0];
    groups.push({
      schemaName,
      agentName: first.displayName,
      type: first.type,
      zone: first.zone,
      owner: first.owner.displayName,
      records,
      environments: records.map((r) => r.environment),
    });
  }
  groups.sort((a, b) => a.agentName.localeCompare(b.agentName));
  return respond(groups, { label: 'inventory.lineage' });
}
