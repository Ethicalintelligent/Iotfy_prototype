// Quotes: product lines are recurring (priced by the rules), hardware lines are one-time (or
// rented). Accepting a quote freezes its prices and creates the subscriptions, in one save.
// Port of legacy pQuotes / quoteDetail / lineCalc (legacy/src/app.js ~1606–1670).
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  IconButton,
  Note,
  SelectField,
  Stack,
  StatusChip,
  Table,
  useToast,
} from '@iotify/ui';
import {
  useCompanies,
  useDeleteRecord,
  useQuoteLines,
  useQuotes,
  useSaveBatch,
  useSaveRecord,
  useSensorModels,
  useSubscriptions,
  useUpdateRecord,
  type QuoteLinesRow,
  type QuotesRow,
} from '@iotify/data';
import { useAuth } from '@iotify/auth';
import {
  RecordFormModal,
  TableRecordCard,
  Toolbar,
  enumOptions,
  nextId,
  useCoreRules,
  useDetailTitle,
  type FieldDef,
} from '@iotify/app-kit';

const name = (r: Record<string, unknown>) => String(r.name ?? r.id);
const money = (n: number, cur = 'SAR') =>
  `${cur} ${(Math.round(n * 100) / 100).toLocaleString('en-US')}`;
type R = NonNullable<ReturnType<typeof useCoreRules>['rules']>;

export function QuotesPage() {
  const { id } = useParams();
  return id ? <QuoteDetail id={id} /> : <QuoteList />;
}

function QuoteList() {
  const auth = useAuth();
  const navigate = useNavigate();
  const dealer = auth.account ?? '';
  const quotes = useQuotes({ dealer_id: dealer }, { enabled: !!dealer });
  const companies = useCompanies({ dealer_id: dealer }, { enabled: !!dealer });
  const [adding, setAdding] = useState(false);
  const companyName = (cid: string | null | undefined) =>
    companies.data?.find((c) => c.id === cid)?.name ?? '—';
  return (
    <>
      <Toolbar>
        {!auth.support && (
          <Button size="sm" variant="primary" icon="plus" onClick={() => setAdding(true)}>
            Quote
          </Button>
        )}
      </Toolbar>
      <Table<QuotesRow>
        label="Quotes"
        rows={[...(quotes.data ?? [])].sort((a, b) => b.id.localeCompare(a.id))}
        empty={quotes.isLoading ? 'Loading…' : 'No quotes yet.'}
        onRowClick={(q) => navigate('/quotes/' + q.id)}
        columns={[
          { header: 'Quote', cell: (q) => <b>{q.id}</b> },
          { header: 'Company', cell: (q) => companyName(q.company_id) },
          { header: 'CRM id', cell: 'crm_id' },
          { header: 'Version', cell: 'version' },
          { header: 'Valid until', cell: 'valid_until' },
          { header: 'Status', cell: (q) => <StatusChip status={q.status} /> },
        ]}
      />
      {adding && (
        <RecordFormModal
          title="New · Quote"
          config={{
            table: 'quotes',
            idPrefix: 'Q',
            fields: [
              {
                key: 'company_id',
                label: 'Company',
                type: 'select',
                options: { table: 'companies', label: name, filter: { dealer_id: dealer } },
                required: true,
              },
              { key: 'crm_id', label: 'CRM id' },
            ],
          }}
          initial={{ dealer_id: dealer, status: 'Draft', version: 1 }}
          isNew
          onClose={() => setAdding(false)}
          onSaved={(qid) => navigate('/quotes/' + qid)}
        />
      )}
    </>
  );
}

interface LineCalc {
  unit: number;
  recurring: number;
  oneTime: number;
  applied: string;
  live: boolean;
  currency: string;
}

/** Price of a line: live from the rules while the quote is open, frozen once accepted. */
function lineCalc(rules: R, l: QuoteLinesRow, isSensor: (id: string) => boolean): LineCalc {
  const snap = l.unit_price != null;
  const qty = l.qty ?? 1;
  if (l.kind === 'Product') {
    const r = rules.priceLine(l.item_id ?? '', 'Company', {
      tier: l.tier ?? '',
      qty,
      assetType: l.asset_type_id ?? '',
      items: l.item_count ?? 0,
    });
    const unit = snap ? l.unit_price! : r.unit;
    return {
      unit,
      recurring: unit * qty,
      oneTime: 0,
      applied: snap ? (l.rules_applied ?? '') : r.applied.join(' → '),
      live: !snap,
      currency: r.currency,
    };
  }
  const hp = rules.hardwarePrice(
    isSensor(l.item_id ?? '') ? 'Sensor' : 'Device',
    l.item_id ?? '',
    'Company',
    l.supply ?? 'Sold',
  );
  const unit = snap ? l.unit_price! : (hp?.price ?? 0);
  const rented = l.supply === 'Rented';
  return {
    unit,
    recurring: rented ? unit * qty : 0,
    oneTime: rented ? 0 : unit * qty,
    applied: hp || snap ? '' : 'no hardware price',
    live: !snap,
    currency: hp?.currency ?? 'SAR',
  };
}

function QuoteDetail({ id }: { id: string }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const dealer = auth.account ?? '';
  const quotes = useQuotes({ dealer_id: dealer }, { enabled: !!dealer });
  const companies = useCompanies({ dealer_id: dealer }, { enabled: !!dealer });
  const lines = useQuoteLines({ quote_id: id });
  const sensorModels = useSensorModels();
  const allSubs = useSubscriptions();
  const { rules } = useCoreRules();
  const save = useSaveRecord();
  const update = useUpdateRecord();
  const del = useDeleteRecord();
  const batch = useSaveBatch();
  const [lineForm, setLineForm] = useState<{
    row: Partial<QuoteLinesRow>;
    isNew: boolean;
    kind: 'Product' | 'Hardware';
  } | null>(null);
  const [addProduct, setAddProduct] = useState('');
  const q = quotes.data?.find((x) => x.id === id);
  const qCompany = companies.data?.find((c) => c.id === q?.company_id)?.name;
  useDetailTitle(q ? `Quote ${q.id}${qCompany ? ` · ${qCompany}` : ''}` : null);
  if (!q || !rules || !lines.data || !sensorModels.data)
    return <Note tone="grey">Loading the quote…</Note>;

  const locked = q.status !== 'Draft';
  const readOnly = locked || !!auth.support;
  const isSensor = (mid: string) => sensorModels.data!.some((s) => s.id === mid);
  const market = companies.data?.find((c) => c.id === q.company_id)?.country ?? null;
  const offered = rules.dealerProducts(dealer) ?? new Set(rules.products().map((p) => p.id));
  const allowed = [...offered].filter(
    (p) => rules.marketOk(p, market) && rules.node(p)?.status === 'Active',
  );
  const pl = lines.data.filter((l) => l.kind === 'Product');
  const hl = lines.data.filter((l) => l.kind === 'Hardware');
  const pids = pl.map((l) => l.item_id ?? '');
  const effective = [...rules.grantedBy(pids, rules.choicesOf(pl, 'item_id'))];
  const covered = rules.covers(effective);
  const missingNeeds = pids.flatMap((p) =>
    [...rules.needsOf(p)]
      .filter((n) => !covered.has(n))
      .map((n) => `${rules.node(p)?.name} needs ${rules.node(n)?.name} (or one of its editions)`),
  );
  const clash = effective
    .filter((p) => rules.isEdition(p) && effective.includes(rules.baseOf(p)))
    .map(
      (p) =>
        `${rules.node(p)?.name} and ${rules.node(rules.baseOf(p))?.name} can't go on the same vehicle: quote them for different vehicles or keep one.`,
    );
  const certs = rules.requiredCertifications(effective);
  const groups = rules.quoteHardwareGroups(id);
  let oneTime = 0;
  let recurring = 0;
  lines.data.forEach((l) => {
    const c = lineCalc(rules, l, isSensor);
    oneTime += c.oneTime;
    recurring += c.recurring;
  });
  const minTerm = Math.max(0, ...hl.map((l) => l.min_term_months ?? 0));
  const modelName = (mid: string | null | undefined) => {
    const m =
      rules.data.device_models.find((x) => x.id === mid) ??
      sensorModels.data!.find((x) => x.id === mid);
    return m ? `${m.maker ?? ''} ${m.model ?? ''}`.trim() : (mid ?? '—');
  };
  const onError = (e: Error) => toast({ type: 'error', title: 'Not saved', desc: e.message });
  const setStatus = (status: QuotesRow['status']) =>
    update.mutate('quotes', { id, status }, { onError });

  const accept = () => {
    const subs = allSubs.data ?? [];
    let n = subs.reduce((m, s) => Math.max(m, Number(/^SUB(\d+)$/.exec(s.id)?.[1] ?? 0)), 0);
    const today = new Date().toISOString().slice(0, 10);
    const newSubs = pl.map((l) => ({
      id: `SUB${String(++n).padStart(3, '0')}`,
      seller_id: dealer,
      buyer_id: q.company_id,
      product_id: l.item_id,
      plan_id: rules.planFor(l.item_id ?? '', 'Company')?.id ?? null,
      qty: l.qty ?? 1,
      tier: l.tier ?? null,
      start: today,
      min_term_months: minTerm || null,
      status: 'Active' as const,
      edition_choice: l.edition_choice ?? null,
      item_count: l.item_count ?? null,
      package_id: l.package_id ?? null,
    }));
    const frozen = lines.data!.map((l) => {
      const c = lineCalc(rules, l, isSensor);
      return { id: l.id, unit_price: c.unit, rules_applied: c.applied };
    });
    batch.mutate(
      {
        upserts: [{ table: 'subscriptions', rows: newSubs }],
        updates: [
          { table: 'quote_lines', rows: frozen },
          { table: 'quotes', rows: [{ id, status: 'Accepted' }] },
        ],
      },
      { onSuccess: () => toast(`Accepted: ${newSubs.length} subscription(s) created`), onError },
    );
  };

  const productFields: FieldDef<QuoteLinesRow>[] = [
    {
      key: 'item_id',
      label: 'Product',
      type: 'select',
      options: allowed.map((p) => ({ value: p, label: rules.node(p)?.name ?? p })),
      required: true,
    },
    { key: 'tier', label: 'Tier', type: 'select', options: { lookup: 'Tier' } },
    {
      key: 'asset_type_id',
      label: 'Asset type',
      type: 'select',
      options: { table: 'asset_types', label: name },
    },
    { key: 'qty', label: 'Qty', type: 'number', required: true },
    { key: 'item_count', label: 'Items (item-count pricing)', type: 'number' },
    {
      key: 'edition_choice',
      label: 'Included edition',
      type: 'select',
      options: { table: 'nodes', label: name, filter: { kind: 'Edition' } },
    },
  ];
  const hardwareFields: FieldDef<QuoteLinesRow>[] = [
    {
      key: 'item_id',
      label: 'Device or sensor model',
      type: 'select',
      options: [
        ...rules.data.device_models
          .filter((m) => m.status !== 'Inactive')
          .map((m) => ({ value: m.id, label: `Device · ${modelName(m.id)}` })),
        ...sensorModels.data.map((m) => ({ value: m.id, label: `Sensor · ${modelName(m.id)}` })),
      ],
      required: true,
    },
    {
      key: 'supply',
      label: 'Supply',
      type: 'select',
      options: enumOptions('quote_lines', 'supply'),
    },
    { key: 'qty', label: 'Qty', type: 'number', required: true },
    { key: 'min_term_months', label: 'Min. term (months)', type: 'number' },
  ];
  const lineActions = (l: QuoteLinesRow) =>
    readOnly ? null : (
      <span style={{ display: 'inline-flex', gap: 2 }}>
        <IconButton
          icon="edit"
          label="Change line"
          onClick={() =>
            setLineForm({ row: l, isNew: false, kind: l.kind as 'Product' | 'Hardware' })
          }
        />
        <IconButton
          icon="trash"
          label="Remove line"
          onClick={() => del.mutate('quote_lines', { id: l.id }, { onError })}
        />
      </span>
    );
  const addSuggested = (g: (typeof groups)[number]) => {
    const s = g.suggestion;
    if (!s?.device) return;
    let next = Number(/(\d+)$/.exec(nextId('QL', lines.data!))?.[1] ?? 1);
    const rows = [
      { item_id: s.device, qty: g.qty },
      ...s.sensors.map((x) => ({ item_id: x.sensorModelId, qty: g.qty })),
      ...s.gateways.map((gw) => ({ item_id: gw, qty: 1 })),
    ].map((r) => ({
      ...r,
      id: `QL${String(next++).padStart(3, '0')}`,
      quote_id: id,
      kind: 'Hardware' as const,
      supply: 'Sold' as const,
    }));
    batch.mutate(
      { upserts: [{ table: 'quote_lines', rows }] },
      { onSuccess: () => toast('Suggested hardware added'), onError },
    );
  };

  return (
    <>
      <Stack justify="flex-end">
        <Stack gap={8}>
          <StatusChip status={q.status} />
          <Chip>Price list: Dealer → Company</Chip>
          {market && <Chip tone="blue">Market: {market}</Chip>}
          {minTerm > 0 && <Chip tone="amber">Minimum term {minTerm} months</Chip>}
          {!auth.support && q.status === 'Draft' && (
            <Button onClick={() => setStatus('Sent')}>Mark as sent</Button>
          )}
          {!auth.support && (q.status === 'Draft' || q.status === 'Sent') && (
            <Button
              variant="primary"
              disabled={batch.isPending || !pl.length || missingNeeds.length > 0}
              onClick={accept}
            >
              Accept → create subscriptions
            </Button>
          )}
          {!auth.support && q.status === 'Sent' && (
            <Button onClick={() => setStatus('Lost')}>Lost</Button>
          )}
        </Stack>
      </Stack>
      <TableRecordCard
        key={q.id + q.status}
        config={{
          table: 'quotes',
          noun: 'Quote',
          label: (x) => `Quote ${x.id} · v${x.version ?? 1}`,
          fields: [
            {
              key: 'company_id',
              label: 'Company',
              type: 'select',
              options: { table: 'companies', label: name, filter: { dealer_id: dealer } },
            },
            { key: 'crm_id', label: 'CRM id' },
            { key: 'valid_until', label: 'Valid until', type: 'date' },
            { key: 'version', label: 'Version', type: 'number' },
          ],
          ownRows: [['quote_lines', 'quote_id']],
        }}
        row={q}
        readOnly={readOnly}
        onDeleted={() => navigate('/quotes')}
      />
      {missingNeeds.map((m) => (
        <Note key={m}>{m}</Note>
      ))}
      {clash.map((m) => (
        <Note key={m}>{m}</Note>
      ))}
      {certs.length > 0 && (
        <Note>
          Certified hardware required: {certs.join(', ')}. Each vehicle needs its own certificate.
        </Note>
      )}

      <Card
        title="Products (recurring)"
        actions={
          !readOnly && (
            <Stack gap={8} align="flex-end">
              <div style={{ minWidth: 240 }}>
                <SelectField
                  label="Add product"
                  value={addProduct}
                  placeholder="Choose a product"
                  options={allowed.map((p) => ({ value: p, label: rules.node(p)?.name ?? p }))}
                  onChange={setAddProduct}
                />
              </div>
              <Button
                size="sm"
                variant="primary"
                disabled={!addProduct}
                onClick={() =>
                  save.mutate(
                    'quote_lines',
                    {
                      id: nextId('QL', lines.data!),
                      quote_id: id,
                      kind: 'Product',
                      item_id: addProduct,
                      qty: 1,
                    },
                    { onSuccess: () => setAddProduct(''), onError },
                  )
                }
              >
                Add
              </Button>
            </Stack>
          )
        }
      >
        <Table<QuoteLinesRow>
          bare
          label="Product lines"
          rows={pl}
          empty="No products yet."
          columns={[
            {
              header: 'Product',
              cell: (l) => (
                <span>
                  <b>
                    {rules.node(l.item_id)?.kind === 'Add-on' ? '+ ' : ''}
                    {rules.node(l.item_id)?.name ?? l.item_id}
                  </b>
                  <br />
                  <small className="ui-muted">{rules.node(l.item_id)?.kind}</small>
                </span>
              ),
            },
            { header: 'Tier', cell: 'tier' },
            { header: 'Qty', cell: 'qty', align: 'right' },
            {
              header: 'Unit / month',
              cell: (l) => {
                const c = lineCalc(rules, l, isSensor);
                return (
                  <span>
                    {money(c.unit, c.currency)}
                    <br />
                    <small className="ui-muted">
                      {c.live ? 'live' : 'saved'} · {c.applied}
                    </small>
                  </span>
                );
              },
            },
            {
              header: 'Total / month',
              cell: (l) => <b>{money(lineCalc(rules, l, isSensor).recurring)}</b>,
              align: 'right',
            },
            { header: '', cell: lineActions, align: 'right' },
          ]}
        />
      </Card>

      <Card
        title="Hardware (one-time, or monthly when rented)"
        actions={
          !readOnly && (
            <Button
              size="sm"
              icon="plus"
              onClick={() =>
                setLineForm({
                  row: { quote_id: id, kind: 'Hardware', supply: 'Sold', qty: 1 },
                  isNew: true,
                  kind: 'Hardware',
                })
              }
            >
              Add hardware
            </Button>
          )
        }
      >
        {groups.map((g) =>
          g.suggestion?.device ? (
            <Note key={g.root} tone="green">
              Suggested for <b>{g.name}</b> ({g.qty}): {modelName(g.suggestion.device)}
              {g.suggestion.sensors.length > 0 &&
                ` + ${g.suggestion.sensors.map((s) => modelName(s.sensorModelId)).join(', ')}`}
              {g.suggestion.gateways.length > 0 &&
                ` + site gateway ${g.suggestion.gateways.map(modelName).join(', ')}`}
              .{' '}
              {!readOnly && (
                <Button size="sm" onClick={() => addSuggested(g)}>
                  Add suggested hardware
                </Button>
              )}
            </Note>
          ) : g.suggestion ? (
            <Note key={g.root}>No single device model supports everything {g.name} needs.</Note>
          ) : null,
        )}
        <Table<QuoteLinesRow>
          bare
          label="Hardware lines"
          rows={hl}
          empty="No hardware yet."
          columns={[
            { header: 'Model', cell: (l) => <b>{modelName(l.item_id)}</b> },
            { header: 'Supply', cell: 'supply' },
            { header: 'Qty', cell: 'qty', align: 'right' },
            {
              header: 'Unit',
              cell: (l) => {
                const c = lineCalc(rules, l, isSensor);
                return (
                  <span>
                    {money(c.unit, c.currency)}{' '}
                    {c.applied && <small className="ui-muted">· {c.applied}</small>}
                  </span>
                );
              },
            },
            {
              header: 'Total',
              cell: (l) => {
                const c = lineCalc(rules, l, isSensor);
                return <b>{c.recurring ? `${money(c.recurring)} / month` : money(c.oneTime)}</b>;
              },
              align: 'right',
            },
            { header: '', cell: lineActions, align: 'right' },
          ]}
        />
      </Card>

      <Card>
        <Stack justify="space-between">
          <b>Totals</b>
          <span data-testid="quote-totals">
            One-time <b>{money(oneTime)}</b> · Monthly <b>{money(recurring)}</b>
          </span>
        </Stack>
      </Card>

      {lineForm && (
        <RecordFormModal
          title={`${lineForm.isNew ? 'New' : 'Change'} · ${lineForm.kind} line`}
          config={{
            table: 'quote_lines',
            idPrefix: 'QL',
            fields: lineForm.kind === 'Product' ? productFields : hardwareFields,
          }}
          initial={lineForm.row}
          isNew={lineForm.isNew}
          onClose={() => setLineForm(null)}
        />
      )}
    </>
  );
}
