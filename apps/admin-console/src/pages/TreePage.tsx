// Product tree: groups are folders; only products are sold, priced and given features. Each
// product sits once; "includes" is a link, never a copy. Port of legacy pTree / productDetail
// (legacy/src/app.js ~1149–1255).
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CheckboxField,
  Chip,
  EmptyState,
  Field,
  Icon,
  Loading,
  Note,
  SearchInput,
  SelectField,
  Stack,
  StatusChip,
  Table,
  Tabs,
  TextField,
  YesNo,
  useToast,
  Subhead,
} from '@iotify/ui';
import {
  useDeleteRecord,
  useDeviceModels,
  useNodes,
  usePricePlans,
  useProductAssetTypes,
  useProductDevices,
  useSaveRecord,
  useUpdateRecord,
  type NodesRow,
} from '@iotify/data';
import {
  ChildGrid,
  RecordFormModal,
  TableRecordCard,
  enumOptions,
  nextId,
  useCoreRules,
  type ChildConfig,
  type FieldDef,
  type RecordConfig,
} from '@iotify/app-kit';

const productLabel = (r: Record<string, unknown>) => String(r.name ?? r.id);

const GROUP_FIELDS: FieldDef<NodesRow>[] = [
  { key: 'name', label: 'Name', required: true },
  {
    key: 'parent_id',
    label: 'Parent group',
    type: 'select',
    options: { table: 'nodes', label: productLabel, filter: { type: 'Group' } },
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: enumOptions('nodes', 'status'),
    placeholder: null,
  },
  { key: 'sort', label: 'Sort', type: 'number' },
];
const PRODUCT_FIELDS: FieldDef<NodesRow>[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'code', label: 'Code' },
  {
    key: 'parent_id',
    label: 'Parent',
    type: 'select',
    options: { table: 'nodes', label: productLabel },
  },
  { key: 'kind', label: 'Kind', type: 'select', options: { lookup: 'Product Kind' } },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: enumOptions('nodes', 'status'),
    placeholder: null,
  },
  { key: 'sort', label: 'Sort', type: 'number' },
  {
    key: 'requires_certification',
    label: 'Requires certification',
    type: 'select',
    options: { lookup: 'Certification' },
  },
  {
    key: 'markets',
    label: 'Markets (blank = everywhere)',
    hint: 'Comma-separated, from the Market lookup',
  },
];
// A product's own rows go with it; anything else that uses it (sub-products, subscriptions,
// quotes, rules pointing at it) makes Neon refuse the delete.
const PRODUCT_OWN_ROWS: RecordConfig<'nodes'>['ownRows'] = [
  ['product_features', 'product_id'],
  ['bundle_rules', 'from_product'],
  ['product_asset_types', 'product_id'],
  ['product_devices', 'product_id'],
];

const BUNDLES: ChildConfig<'bundle_rules'> = {
  table: 'bundle_rules',
  title: 'Bundle rules',
  parentKey: 'from_product',
  idPrefix: 'BR',
  addLabel: 'Add rule',
  fields: [
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: enumOptions('bundle_rules', 'type'),
      required: true,
    },
    {
      key: 'to_product',
      label: 'Product',
      type: 'select',
      options: { table: 'nodes', label: productLabel, filter: { type: 'Product' } },
      required: true,
    },
  ],
};
const FEATURES: ChildConfig<'product_features'> = {
  table: 'product_features',
  title: 'Own app features',
  parentKey: 'product_id',
  idPrefix: 'PF',
  addLabel: 'Add app feature',
  fields: [
    {
      key: 'feature_id',
      label: 'App feature',
      type: 'select',
      options: { table: 'features', label: productLabel },
      required: true,
    },
    {
      key: 'availability',
      label: 'Availability',
      type: 'select',
      options: enumOptions('product_features', 'availability'),
      required: true,
    },
  ],
};
const PLANS: ChildConfig<'price_plans'> = {
  table: 'price_plans',
  title: 'Price plans',
  parentKey: 'product_id',
  idPrefix: 'PP',
  addLabel: 'Add plan',
  fields: [
    {
      key: 'sold_to',
      label: 'Sold to',
      type: 'select',
      options: enumOptions('price_plans', 'sold_to'),
      required: true,
    },
    { key: 'base_price', label: 'Base price', type: 'number' },
    {
      key: 'period',
      label: 'Period',
      type: 'select',
      options: enumOptions('price_plans', 'period'),
    },
    { key: 'currency', label: 'Currency' },
  ],
};
const RULES: ChildConfig<'price_rules'> = {
  table: 'price_rules',
  title: 'Price rules',
  parentKey: 'plan_id',
  idPrefix: 'PR',
  addLabel: 'Add rule',
  fields: [
    {
      key: 'rule_type',
      label: 'Rule type',
      type: 'select',
      options: enumOptions('price_rules', 'rule_type'),
      required: true,
    },
    {
      key: 'condition',
      label: 'Condition',
      hint: 'Tier name, band like 10-49 or 50+, asset type, feature',
    },
    {
      key: 'effect',
      label: 'Effect',
      type: 'select',
      options: enumOptions('price_rules', 'effect'),
      required: true,
    },
    { key: 'value', label: 'Value', type: 'number' },
  ],
};

export function TreePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const nodes = useNodes();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<'Group' | 'Product' | null>(null);
  const all = useMemo(() => nodes.data ?? [], [nodes.data]);
  const sel = all.find((n) => n.id === id) ?? all.find((n) => n.type === 'Product');
  const kids = (pid: string) =>
    all
      .filter((n) => (n.parent_id || '') === pid)
      .sort(
        (a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.name).localeCompare(String(b.name)),
      );
  const desc = (pid: string): NodesRow[] => kids(pid).flatMap((k) => [k, ...desc(k.id)]);
  const matches = (n: NodesRow) =>
    (!q || String(n.name).toLowerCase().includes(q.toLowerCase())) &&
    (!status || n.status === status);
  const visible = (n: NodesRow) => matches(n) || desc(n.id).some(matches);
  // The selected item's path stays open.
  const path = useMemo(() => {
    const out = new Set<string>();
    let p = sel?.parent_id;
    while (p) {
      out.add(p);
      p = all.find((n) => n.id === p)?.parent_id;
    }
    return out;
  }, [sel, all]);

  const rows = (pid: string, depth: number): ReactNode[] =>
    kids(pid)
      .filter(visible)
      .flatMap((n) => {
        const children = kids(n.id);
        const isOpen = !!q || open.has(n.id) || path.has(n.id);
        return [
          <button
            key={n.id}
            type="button"
            role="treeitem"
            aria-selected={sel?.id === n.id}
            aria-expanded={children.length ? isOpen : undefined}
            className={`ak-tr ${sel?.id === n.id ? 'ak-tr--on' : ''}`}
            style={{ paddingLeft: 8 + depth * 18 }}
            onClick={() => navigate('/tree/' + n.id)}
          >
            {children.length ? (
              <span
                className={`ak-tr__tg ${isOpen ? 'ak-tr__tg--open' : ''}`}
                aria-label={isOpen ? 'Collapse' : 'Expand'}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((s) => {
                    const x = new Set(s);
                    if (x.has(n.id)) x.delete(n.id);
                    else x.add(n.id);
                    return x;
                  });
                }}
              >
                <Icon name="chev" size={14} />
              </span>
            ) : (
              <span style={{ width: 20, flex: 'none' }} />
            )}
            {n.type === 'Group' ? (
              <>
                <Icon name="lookups" size={15} />
                <span style={{ color: n.status === 'Active' ? undefined : 'var(--muted)' }}>
                  {n.name}
                </span>
                <span className="ak-tr__meta ui-muted">
                  {desc(n.id).filter((d) => d.type === 'Product').length}
                </span>
              </>
            ) : (
              <>
                <span className={`ak-sq ${n.status === 'Active' ? '' : 'ak-sq--off'}`} />
                <span>{n.name}</span>
                {n.kind && (
                  <span className="ak-tr__meta">
                    <Chip>{n.kind}</Chip>
                  </span>
                )}
              </>
            )}
          </button>,
          ...(isOpen ? rows(n.id, depth + 1) : []),
        ];
      });

  if (nodes.isLoading) return <Loading>Loading the product tree…</Loading>;
  return (
    <div className="ak-treewrap">
      <Card>
        <Stack gap={6} wrap={false}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchInput value={q} onChange={setQ} placeholder="Search groups and products" />
          </div>
          <Button
            size="sm"
            onClick={() => setAdding('Group')}
            title="New group under the selected group"
          >
            + Group
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setAdding('Product')}
            title="New product under the selected item"
          >
            + Product
          </Button>
        </Stack>
        <SelectField
          label="Status"
          value={status}
          onChange={setStatus}
          options={[{ value: '', label: 'All' }, ...enumOptions('nodes', 'status')]}
        />
        <div role="tree" aria-label="Products" className="ak-tree">
          {rows('', 0)}
        </div>
      </Card>
      <div>
        {sel ? (
          sel.type === 'Group' ? (
            <GroupDetail node={sel} kids={kids(sel.id)} />
          ) : (
            <ProductDetail node={sel} />
          )
        ) : (
          <EmptyState>Add a group to start.</EmptyState>
        )}
      </div>
      {adding && (
        <RecordFormModal
          title={`New · ${adding}`}
          config={{
            table: 'nodes',
            idPrefix: 'N',
            fields:
              adding === 'Group'
                ? GROUP_FIELDS.slice(0, 2)
                : [PRODUCT_FIELDS[0]!, PRODUCT_FIELDS[2]!, PRODUCT_FIELDS[3]!],
          }}
          initial={{
            type: adding,
            status: 'Active',
            parent_id:
              adding === 'Group'
                ? sel?.type === 'Group'
                  ? sel.id
                  : (sel?.parent_id ?? null)
                : (sel?.id ?? null),
            ...(adding === 'Product' ? { kind: sel?.type === 'Product' ? 'Add-on' : 'Base' } : {}),
          }}
          isNew
          onClose={() => setAdding(null)}
          onSaved={(newId) => navigate('/tree/' + newId)}
        />
      )}
    </div>
  );
}

function GroupDetail({ node, kids }: { node: NodesRow; kids: NodesRow[] }) {
  const navigate = useNavigate();
  return (
    <>
      <TableRecordCard
        key={node.id}
        config={{
          table: 'nodes',
          fields: GROUP_FIELDS,
          label: (n) => n.name ?? n.id,
          noun: 'Group',
        }}
        row={node}
        onDeleted={() => navigate('/tree')}
      />
      <Card title={`Inside this group (${kids.length})`}>
        <Table<NodesRow>
          bare
          label="Inside this group"
          rows={kids}
          onRowClick={(c) => navigate('/tree/' + c.id)}
          empty="Empty group. Use + Group or + Product."
          columns={[
            { header: 'Name', cell: (c) => <b>{c.name}</b> },
            { header: 'Type', cell: 'type' },
            { header: 'Kind', cell: 'kind' },
            { header: 'Status', cell: (c) => <StatusChip status={c.status} /> },
          ]}
        />
        <Note tone="grey">
          Groups are only folders: they have no price and no features. A group can hold groups and
          products, at any depth.
        </Note>
      </Card>
    </>
  );
}

function ProductDetail({ node }: { node: NodesRow }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'bundles' | 'features' | 'hardware' | 'pricing'>('bundles');
  const { rules } = useCoreRules();
  const plans = usePricePlans({ product_id: node.id });
  const isEdition = rules?.isEdition(node.id) ?? false;
  return (
    <>
      <TableRecordCard
        key={node.id}
        config={{
          table: 'nodes',
          fields: PRODUCT_FIELDS,
          label: (n) => n.name ?? n.id,
          noun: 'Product',
          ownRows: PRODUCT_OWN_ROWS,
        }}
        row={node}
        onDeleted={() => navigate('/tree')}
      >
        <span className="ui-muted">
          {rules?.groupPath(node.id) || 'Top level'} · <Chip tone="blue">{node.type}</Chip>{' '}
          {node.kind && <Chip>{node.kind}</Chip>} <StatusChip status={node.status} />
        </span>
        {isEdition && (
          <Note tone="grey">
            Edition of <b>{rules?.node(rules.baseOf(node.id))?.name}</b>: it behaves as that product
            (same included products, app features and add-ons) plus its own app features, price and
            certification.
          </Note>
        )}
        <DefaultDevice product={node.id} />
        <AssetTypes product={node.id} />
      </TableRecordCard>
      <Card>
        <Tabs
          label="Product details"
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'bundles', label: 'Bundle rules' },
            {
              key: 'features',
              label: `App features (${rules?.featuresOf(node.id).length ?? '…'})`,
            },
            { key: 'hardware', label: 'Hardware' },
            { key: 'pricing', label: 'Pricing' },
          ]}
        />
        {tab === 'bundles' && (
          <>
            <Note tone="grey">
              <b>Includes</b>: always comes with it, no charge. <b>Needs</b>: sold only together
              with the other product. <b>Optional</b>: the customer may add it as its own priced
              line.
            </Note>
            <ChildGrid config={BUNDLES} parentId={node.id} />
            {rules && (
              <PointingAt
                lines={rules.data.bundle_rules
                  .filter((r) => r.to_product === node.id)
                  .map(
                    (r) =>
                      `${rules.node(r.from_product)?.name} ${String(r.type).toLowerCase()} ${node.name}`,
                  )}
              />
            )}
          </>
        )}
        {tab === 'features' && (
          <>
            <p className="ui-muted" style={{ margin: 0 }}>
              App features this product switches on for the customer. Roles then decide who sees
              each one.
            </p>
            <ChildGrid config={FEATURES} parentId={node.id} />
            {rules && <Inherited rules={rules} product={node.id} />}
          </>
        )}
        {tab === 'hardware' &&
          (rules ? <HardwareFit rules={rules} product={node.id} /> : <Loading />)}
        {tab === 'pricing' && (
          <>
            <p className="ui-muted" style={{ margin: 0 }}>
              Price = base price, then every matching rule adjusts it. Dealer plan = wholesale
              (platform → dealer); Company plan = retail (dealer → company).
            </p>
            <ChildGrid config={PLANS} parentId={node.id} />
            {(plans.data ?? []).map((p) => (
              <Card key={p.id} title={`${p.sold_to} plan · rules`} padded>
                <ChildGrid config={RULES} parentId={p.id} />
                {rules && <PricePreview rules={rules} product={node.id} soldTo={p.sold_to!} />}
              </Card>
            ))}
          </>
        )}
      </Card>
      {rules && <WhereUsed rules={rules} product={node.id} />}
    </>
  );
}

function PointingAt({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div>
      <Subhead>Rules pointing at this product</Subhead>
      {lines.map((l) => (
        <Note key={l} tone="grey">
          {l}
        </Note>
      ))}
    </div>
  );
}

type R = NonNullable<ReturnType<typeof useCoreRules>['rules']>;

function Inherited({ rules, product }: { rules: R; product: string }) {
  const inh = rules.featuresOf(product).filter((f) => f.source !== product);
  return (
    <>
      <Subhead>Inherited from the base or "includes" ({inh.length})</Subhead>
      <Table
        bare
        label="Inherited app features"
        rows={inh.map((f) => ({ id: f.featureId, ...f }))}
        empty="None."
        columns={[
          {
            header: 'App feature',
            cell: (f) => rules.data.features.find((x) => x.id === f.featureId)?.name ?? f.featureId,
          },
          { header: 'From', cell: (f) => <Chip tone="blue">{rules.node(f.source)?.name}</Chip> },
          { header: 'Availability', cell: (f) => f.availability ?? '—' },
        ]}
      />
    </>
  );
}

/** Which device models fit, worked out from the features (never typed in). */
function HardwareFit({ rules, product }: { rules: R; product: string }) {
  if (rules.isPackage(product))
    return (
      <Note tone="grey">
        A package has no hardware of its own. Each chosen component brings its own hardware; the
        package's app features work when the components supply their data points.
      </Note>
    );
  const need = rules.withNeeds([product]);
  const allF = rules.featuresOfSet(need);
  const dps = new Map<string, string | null | undefined>();
  allF.forEach((f) =>
    rules.dataPointsOf(f.featureId).forEach((x) => {
      if (!dps.has(x.data_point_id ?? '') || f.availability !== 'Optional')
        dps.set(x.data_point_id ?? '', f.availability);
    }),
  );
  const certs = rules.requiredCertifications([product]);
  const dmName = (id: string) => {
    const m = rules.data.device_models.find((x) => x.id === id);
    return `${m?.maker ?? ''} ${m?.model ?? ''}`.trim();
  };
  return (
    <>
      <p className="ui-muted" style={{ margin: 0 }}>
        Worked out from the features.{' '}
        {need.size > 1 &&
          `Includes what this product needs or includes: ${[...need]
            .filter((x) => x !== product)
            .map((x) => rules.node(x)?.name)
            .join(', ')}.`}
      </p>
      <Stack gap={6}>
        {[...dps.entries()].map(([d, a]) => (
          <Chip key={d} tone={a === 'Optional' ? 'amber' : 'neutral'}>
            {rules.dataPointName(d)}
            {a === 'Optional' ? ' · optional' : ''}
          </Chip>
        ))}
        {!dps.size && (
          <span className="ui-muted">No data points: give this product features first.</span>
        )}
      </Stack>
      {certs.length > 0 && (
        <Note>
          Requires certified hardware: <b>{certs.join(', ')}</b>. Only device models with this
          certification fit.
        </Note>
      )}
      <Table
        bare
        label="Device models that fit"
        rows={rules.data.device_models.map((d) => {
          const ev = rules.evalModel(d.id, allF);
          const cm = rules.missingCertifications(d.id, [product]);
          const miss = [
            ...new Set(
              ev.results
                .filter((r) => !r.ok && r.availability !== 'Optional')
                .flatMap((r) => rules.missingText(r.missing)),
            ),
          ];
          return {
            id: d.id,
            name: dmName(d.id),
            fits: ev.all && !cm.length,
            cm,
            miss,
            opt: ev.optionalMissing,
          };
        })}
        columns={[
          { header: 'Device model', cell: (r) => <b>{r.name}</b> },
          {
            header: 'Result',
            cell: (r) =>
              allF.length ? <YesNo value={r.fits} yes="Fits" no="Does not fit" /> : '—',
          },
          {
            header: 'Missing / note',
            cell: (r) =>
              [
                r.cm.length ? `Not certified: ${r.cm.join(', ')}` : '',
                r.miss.length
                  ? `Missing: ${r.miss.join(', ')}`
                  : r.opt.length
                    ? `Optional not possible: ${r.opt.length}`
                    : '',
              ]
                .filter(Boolean)
                .join(' · ') || '—',
          },
        ]}
      />
    </>
  );
}

function PricePreview({
  rules,
  product,
  soldTo,
}: {
  rules: R;
  product: string;
  soldTo: 'Dealer' | 'Company';
}) {
  const [tier, setTier] = useState('');
  const [qty, setQty] = useState('1');
  const [assetType, setAssetType] = useState('');
  const r = rules.priceLine(product, soldTo, { tier, qty: Number(qty) || 1, assetType });
  const money = `${r.currency} ${(Math.round(r.unit * 100) / 100).toLocaleString('en-US')}`;
  return (
    <Stack gap={10} align="flex-end">
      <TextField label="Preview tier" value={tier} onChange={setTier} placeholder="e.g. Premium" />
      <TextField label="Qty" type="number" value={qty} onChange={setQty} />
      <SelectField
        label="Asset type"
        value={assetType}
        placeholder="—"
        options={rules.data.asset_types.map((a) => ({ value: a.id, label: a.name ?? a.id }))}
        onChange={setAssetType}
      />
      <Field label="Price per asset">
        <span data-testid={`price-${soldTo}`}>
          <Subhead size={18}>{money}</Subhead>{' '}
          <span className="ui-muted">{r.applied.join(' → ')}</span>
        </span>
      </Field>
    </Stack>
  );
}

/** Default device model (product_devices, priority 1). A choice like this saves at once. */
function DefaultDevice({ product }: { product: string }) {
  const models = useDeviceModels();
  const all = useProductDevices();
  const save = useSaveRecord();
  const update = useUpdateRecord();
  const del = useDeleteRecord();
  const toast = useToast();
  const row = all.data?.find((p) => p.product_id === product && p.priority === 1);
  const onError = (e: Error) => toast({ type: 'error', title: 'Not saved', desc: e.message });
  return (
    <SelectField
      label="Default device model"
      hint="Suggested first on quotes. Saves at once."
      value={row?.device_model_id ?? ''}
      placeholder="—"
      options={(models.data ?? []).map((m) => ({
        value: m.id,
        label: `${m.maker ?? ''} ${m.model ?? ''}`.trim(),
      }))}
      onChange={(v) => {
        if (!v && row) del.mutate('product_devices', { id: row.id }, { onError });
        else if (v && row)
          update.mutate('product_devices', { id: row.id, device_model_id: v }, { onError });
        else if (v)
          save.mutate(
            'product_devices',
            {
              id: nextId('PD', all.data ?? []),
              product_id: product,
              device_model_id: v,
              priority: 1,
            },
            { onError },
          );
      }}
    />
  );
}

/** Asset types the product applies to. Ticking saves at once. */
function AssetTypes({ product }: { product: string }) {
  const { rules } = useCoreRules();
  const links = useProductAssetTypes();
  const save = useSaveRecord();
  const del = useDeleteRecord();
  const toast = useToast();
  const onError = (e: Error) => toast({ type: 'error', title: 'Not saved', desc: e.message });
  return (
    <Field label="Asset types this product applies to">
      <Stack gap={14}>
        {(rules?.data.asset_types ?? []).map((a) => {
          const link = links.data?.find(
            (l) => l.product_id === product && l.asset_type_id === a.id,
          );
          return (
            <CheckboxField
              key={a.id}
              label={a.name ?? a.id}
              checked={!!link}
              onChange={(on) =>
                on
                  ? save.mutate(
                      'product_asset_types',
                      {
                        id: nextId('PA', links.data ?? []),
                        product_id: product,
                        asset_type_id: a.id,
                      },
                      { onError },
                    )
                  : link && del.mutate('product_asset_types', { id: link.id }, { onError })
              }
            />
          );
        })}
      </Stack>
    </Field>
  );
}

function WhereUsed({ rules, product }: { rules: R; product: string }) {
  const d = rules.data;
  const used: [string, number][] = [
    [
      'Bundle rules',
      d.bundle_rules.filter((r) => r.from_product === product || r.to_product === product).length,
    ],
    ['Price plans', d.price_plans.filter((r) => r.product_id === product).length],
    ['Asset types', d.product_asset_types.filter((r) => r.product_id === product).length],
    ['Subscriptions', d.subscriptions.filter((r) => r.product_id === product).length],
    ['Sub-products', d.nodes.filter((n) => n.parent_id === product).length],
  ];
  return (
    <Card padded>
      <Stack gap={18}>
        <Subhead>Where used</Subhead>
        {used.map(([l, n]) => (
          <span key={l} className="ui-muted">
            {l}: <b style={{ color: 'var(--ink)' }}>{n}</b>
          </span>
        ))}
      </Stack>
    </Card>
  );
}
