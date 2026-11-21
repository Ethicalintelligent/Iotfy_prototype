// Drivers: behaviour scores with search and a "Needs coaching" filter (score below 80), lowest
// scores first. Rows come from the spec's demo table (tables.drivers), generated once per load so
// they don't change when the screen redraws. Demo activity (labelled).
import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, Loading, SearchInput, Table, Tabs, useToast } from '@iotify/ui';
import { useAssets } from '@iotify/data';
import {
  Cell,
  DemoNote,
  Toolbar,
  cellTone,
  demoContext,
  useCoreRules,
  type DemoCell,
  type ScreenContext,
} from '@iotify/app-kit';
import { vehicleSpec } from '../spec';

/** Scores below this need coaching. */
const COACHING_BELOW = 80;

export default function DriversScreen({
  product,
  companyId,
  companyName,
  assetGroup,
}: ScreenContext) {
  const { rules } = useCoreRules();
  const toast = useToast();
  const assets = useAssets({ company_id: companyId }, { enabled: !!companyId });
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'coach'>('all');

  // The same assets and seed the generic screens use.
  const { rows, assetCount } = useMemo(() => {
    const types = rules?.productAssetTypes(product) ?? new Set<string>();
    const mine = (assets.data ?? [])
      .filter(
        (a) => types.has(a.asset_type_id ?? '') && (!assetGroup || a.asset_group === assetGroup),
      )
      .map((a) => ({ id: a.id, name: a.name ?? a.id }));
    const table = vehicleSpec.tables!.drivers!;
    const c = demoContext(product + 'drivers' + companyId, mine);
    return {
      rows: [...Array(table.rows ?? 10)].map((_, i) => table.row(c, i)),
      assetCount: mine.length,
    };
  }, [rules, assets.data, product, companyId, assetGroup]);

  if (!assets.data || !rules) return <Loading>Loading drivers…</Loading>;

  const score = (r: DemoCell[]) => Number(cellTone(r[2]!).text);
  const needCoaching = rows.filter((r) => score(r) < COACHING_BELOW);
  const shown = (tab === 'coach' ? needCoaching : rows)
    .filter((r) => !q || `${r[0]} ${r[1]}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => score(a) - score(b));

  return (
    <>
      <Toolbar
        search={<SearchInput value={q} onChange={setQ} placeholder="Search drivers or vehicles" />}
      >
        <Tabs
          label="Which drivers"
          tabs={[
            { key: 'all', label: `All drivers (${rows.length})` },
            { key: 'coach', label: `Needs coaching (${needCoaching.length})` },
          ]}
          value={tab}
          onChange={(k) => setTab(k as 'all' | 'coach')}
        />
        <Button size="sm" onClick={() => toast('Exported (demo)')}>
          Export
        </Button>
      </Toolbar>
      <Card padded={false}>
        <Table<DemoCell[]>
          bare
          label="Drivers"
          rows={shown}
          rowKey={(r) => String(r[0])}
          columns={vehicleSpec.tables!.drivers!.columns.map((h, i) => ({
            header: h,
            cell: (r: DemoCell[]) => <Cell v={r[i] ?? ''} />,
          }))}
          empty={
            <EmptyState icon="users" title="No drivers match">
              {q
                ? `Nothing matches “${q}”${tab === 'coach' ? ' among drivers who need coaching' : ''}. Try another name or vehicle.`
                : `Every driver scores ${COACHING_BELOW} or more.`}
            </EmptyState>
          }
        />
      </Card>
      <DemoNote companyName={companyName} count={assetCount} />
    </>
  );
}
