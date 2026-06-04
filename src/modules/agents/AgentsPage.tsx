import {
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dropdown,
  Option,
  SearchBox,
  Switch,
  TableCellLayout,
  createTableColumn,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import type { TableColumnDefinition } from '@fluentui/react-components';
import { ChevronDown20Regular, ChevronRight20Regular } from '@fluentui/react-icons';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppState } from '../../app/AppState';
import { useAgents, useLineageGroups } from '../../services/hooks';
import { EnvBadge, LifecycleBadge, RegistryBadge, ZoneBadge } from '../../components/badges';
import { AgentTypeBadge } from '../../components/AgentTypeBadge';
import { LoadingState, ErrorState, PageContainer, Panel, SectionTitle } from '../../components/primitives';
import type { Agent, LifecycleState } from '../../types/domain';
import { nf } from '../../utils/format';

const useStyles = makeStyles({
  toolbar: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' },
  spacer: { flex: 1 },
  grid: {
    '& .fui-DataGridCell': { alignItems: 'center', minHeight: '56px', paddingTop: '6px', paddingBottom: '6px' },
    '& .fui-DataGridHeaderCell': { minHeight: '40px' },
  },
  row: { cursor: 'pointer' },
  agentName: { display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 },
  agentNameText: { fontWeight: 600 },
  assur: { fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  count: { fontSize: '12px', color: tokens.colorNeutralForeground3 },
  // lineage
  lineGroup: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    marginBottom: '10px',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  lineHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorNeutralBackground2 },
  },
  lineName: { fontSize: '14px', fontWeight: 700 },
  lineMeta: { fontSize: '12px', color: tokens.colorNeutralForeground3 },
  envChips: { display: 'flex', gap: '5px' },
  lineSub: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px 10px 44px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    cursor: 'pointer',
    fontSize: '13px',
    ':hover': { backgroundColor: tokens.colorNeutralBackground2 },
  },
  pushRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '14px' },
});

function assuranceColor(score: number): string {
  return score >= 85 ? 'var(--aah-good)' : score >= 70 ? 'var(--aah-warn)' : 'var(--aah-bad)';
}

const LIFECYCLE_OPTIONS: { value: LifecycleState | 'all'; label: string }[] = [
  { value: 'all', label: 'All states' },
  { value: 'draft', label: 'Draft' },
  { value: 'in-review', label: 'In review' },
  { value: 'published', label: 'Published' },
  { value: 'retiring', label: 'Retiring' },
];

export function AgentsPage() {
  const s = useStyles();
  const { environment, openAgent } = useAppState();
  const [params] = useSearchParams();
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const [search, setSearch] = useState('');
  const [lifecycle, setLifecycle] = useState<LifecycleState | 'all'>('all');
  const [type, setType] = useState<'all' | 'copilot-studio' | 'foundry-code'>('all');
  const [lineageMode, setLineageMode] = useState(false);

  const filtered = useMemo(() => {
    if (!agents) return [];
    const q = search.trim().toLowerCase();
    return agents.filter((a) => {
      if (environment !== 'all' && a.environment !== environment) return false;
      if (lifecycle !== 'all' && a.lifecycleState !== lifecycle) return false;
      if (type !== 'all' && a.type !== type) return false;
      if (q && !`${a.displayName} ${a.owner.displayName} ${a.schemaName}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [agents, environment, lifecycle, type, search]);

  const columns: TableColumnDefinition<Agent>[] = useMemo(
    () => [
      createTableColumn<Agent>({
        columnId: 'name',
        compare: (a, b) => a.displayName.localeCompare(b.displayName),
        renderHeaderCell: () => 'Agent',
        renderCell: (a) => (
          <TableCellLayout>
            <span className={s.agentName}>
              <span className={s.agentNameText}>{a.displayName}</span>
              <span style={{ marginTop: 4 }}>
                <AgentTypeBadge type={a.type} short />
              </span>
            </span>
          </TableCellLayout>
        ),
      }),
      createTableColumn<Agent>({
        columnId: 'env',
        compare: (a, b) => a.environment.localeCompare(b.environment),
        renderHeaderCell: () => 'Env',
        renderCell: (a) => (
          <TableCellLayout>
            <EnvBadge env={a.environment} />
          </TableCellLayout>
        ),
      }),
      createTableColumn<Agent>({
        columnId: 'zone',
        compare: (a, b) => a.zone.localeCompare(b.zone),
        renderHeaderCell: () => 'Zone',
        renderCell: (a) => (
          <TableCellLayout>
            <ZoneBadge zone={a.zone} />
          </TableCellLayout>
        ),
      }),
      createTableColumn<Agent>({
        columnId: 'owner',
        compare: (a, b) => a.owner.displayName.localeCompare(b.owner.displayName),
        renderHeaderCell: () => 'Owner',
        renderCell: (a) => <TableCellLayout>{a.owner.displayName}</TableCellLayout>,
      }),
      createTableColumn<Agent>({
        columnId: 'lifecycle',
        compare: (a, b) => a.lifecycleState.localeCompare(b.lifecycleState),
        renderHeaderCell: () => 'Lifecycle',
        renderCell: (a) => (
          <TableCellLayout>
            <LifecycleBadge state={a.lifecycleState} />
          </TableCellLayout>
        ),
      }),
      createTableColumn<Agent>({
        columnId: 'registry',
        compare: (a, b) => a.registryStatus.localeCompare(b.registryStatus),
        renderHeaderCell: () => 'Agent 365',
        renderCell: (a) => (
          <TableCellLayout>
            <RegistryBadge status={a.registryStatus} />
          </TableCellLayout>
        ),
      }),
      createTableColumn<Agent>({
        columnId: 'assurance',
        compare: (a, b) => a.assuranceScore - b.assuranceScore,
        renderHeaderCell: () => 'Assurance',
        renderCell: (a) => (
          <TableCellLayout>
            <span className={s.assur} style={{ color: assuranceColor(a.assuranceScore) }}>
              {a.assuranceScore}
            </span>
          </TableCellLayout>
        ),
      }),
      createTableColumn<Agent>({
        columnId: 'credits',
        compare: (a, b) => a.mtdCredits - b.mtdCredits,
        renderHeaderCell: () => 'MTD credits',
        renderCell: (a) => (
          <TableCellLayout>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{nf(a.mtdCredits)}</span>
          </TableCellLayout>
        ),
      }),
    ],
    [s],
  );

  if (isLoading) return <PageContainer><LoadingState label="Loading inventory…" /></PageContainer>;
  if (isError || !agents)
    return <PageContainer><ErrorState onRetry={() => refetch()} /></PageContainer>;

  const focusSchema = params.get('agent');

  return (
    <PageContainer>
      <SectionTitle
        title="Agent inventory"
        caption="Every Copilot Studio and Foundry agent across Dev, Test and Prod. The same logical agent is one record per environment — toggle lineage to reconstruct it."
      />

      <div className={s.toolbar}>
        <SearchBox
          placeholder="Search agents, owners…"
          value={search}
          onChange={(_e, d) => setSearch(d.value)}
          style={{ minWidth: 240 }}
        />
        <Dropdown
          size="small"
          value={LIFECYCLE_OPTIONS.find((o) => o.value === lifecycle)?.label}
          selectedOptions={[lifecycle]}
          onOptionSelect={(_e, d) => setLifecycle(d.optionValue as LifecycleState | 'all')}
        >
          {LIFECYCLE_OPTIONS.map((o) => (
            <Option key={o.value} value={o.value} text={o.label}>
              {o.label}
            </Option>
          ))}
        </Dropdown>
        <Dropdown
          size="small"
          value={type === 'all' ? 'All types' : type === 'copilot-studio' ? 'Copilot Studio' : 'Foundry code'}
          selectedOptions={[type]}
          onOptionSelect={(_e, d) => setType(d.optionValue as typeof type)}
        >
          <Option value="all" text="All types">All types</Option>
          <Option value="copilot-studio" text="Copilot Studio">Copilot Studio</Option>
          <Option value="foundry-code" text="Foundry code">Foundry code</Option>
        </Dropdown>
        <div className={s.spacer} />
        <Switch
          label="Lineage view"
          checked={lineageMode}
          onChange={(_e, d) => setLineageMode(d.checked)}
        />
      </div>

      {lineageMode ? (
        <LineageView focusSchema={focusSchema} />
      ) : (
        <Panel style={{ padding: 0, overflow: 'hidden' }}>
          <DataGrid
            className={s.grid}
            items={filtered}
            columns={columns}
            sortable
            getRowId={(a) => a.id}
            focusMode="composite"
            columnSizingOptions={{
              name: { minWidth: 200, defaultWidth: 240 },
              env: { minWidth: 64, defaultWidth: 70 },
              zone: { minWidth: 64, defaultWidth: 70 },
              owner: { minWidth: 130, defaultWidth: 150 },
              lifecycle: { minWidth: 100, defaultWidth: 110 },
              registry: { minWidth: 120, defaultWidth: 140 },
              assurance: { minWidth: 90, defaultWidth: 100 },
              credits: { minWidth: 100, defaultWidth: 120 },
            }}
          >
            <DataGridHeader>
              <DataGridRow>
                {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
              </DataGridRow>
            </DataGridHeader>
            <DataGridBody<Agent>>
              {({ item, rowId }) => (
                <DataGridRow<Agent>
                  key={rowId}
                  className={s.row}
                  onClick={() => openAgent(item.id)}
                >
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        </Panel>
      )}
      {!lineageMode && (
        <span className={s.count}>
          {filtered.length} of {agents.length} records
          {environment !== 'all' ? ` · ${environment.toUpperCase()} only` : ''}
        </span>
      )}
    </PageContainer>
  );
}

function LineageView({ focusSchema }: { focusSchema: string | null }) {
  const s = useStyles();
  const { openAgent } = useAppState();
  const { data: lineage, isLoading } = useLineageGroups();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(focusSchema ? [focusSchema] : []),
  );

  if (isLoading || !lineage) return <LoadingState />;

  const toggle = (schema: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(schema)) next.delete(schema);
      else next.add(schema);
      return next;
    });
  };

  return (
    <div>
      {lineage.map((g) => {
        const open = expanded.has(g.schemaName);
        const avg = Math.round(
          g.records.reduce((sum, r) => sum + r.assuranceScore, 0) / g.records.length,
        );
        const totalCredits = g.records.reduce((sum, r) => sum + r.mtdCredits, 0);
        return (
          <div
            key={g.schemaName}
            className={mergeClasses(s.lineGroup)}
            style={focusSchema === g.schemaName ? { borderColor: tokens.colorBrandStroke1 } : undefined}
          >
            <div className={s.lineHead} onClick={() => toggle(g.schemaName)}>
              {open ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={s.lineName}>{g.agentName}</span>
                  <AgentTypeBadge type={g.type} short />
                </div>
                <div className={s.lineMeta}>
                  {g.records.length} environment{g.records.length > 1 ? 's' : ''} · {g.owner} ·{' '}
                  {g.schemaName}
                </div>
              </div>
              <div className={s.pushRight}>
                <span className={s.envChips}>
                  {g.environments.map((e) => (
                    <EnvBadge key={e} env={e} />
                  ))}
                </span>
                <span className={s.lineMeta}>
                  avg <strong style={{ color: assuranceColor(avg) }}>{avg}</strong>
                </span>
                <span className={s.lineMeta}>{nf(totalCredits)} cr</span>
              </div>
            </div>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
              >
                {g.records.map((r) => (
                  <div key={r.id} className={s.lineSub} onClick={() => openAgent(r.id)}>
                    <EnvBadge env={r.environment} />
                    <LifecycleBadge state={r.lifecycleState} />
                    <RegistryBadge status={r.registryStatus} />
                    <span style={{ color: tokens.colorNeutralForeground3 }}>
                      {r.lastPublishedAt ? `published ${r.lastPublishedAt}` : 'never published'}
                    </span>
                    <span className={s.pushRight}>
                      <span style={{ color: assuranceColor(r.assuranceScore), fontWeight: 700 }}>
                        {r.assuranceScore}
                      </span>
                      <span>{nf(r.mtdCredits)} cr</span>
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}
