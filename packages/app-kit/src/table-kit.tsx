// Table-and-record kit for catalogue pages (admin console; partner portal in Step 8).
// A page describes its core table: list columns, fields, children. The kit gives:
//   - the list with search and "+ Add" beside it (actions next to the content);
//   - the chosen record on a card: read-only until Edit, Save / Cancel in place, Delete in
//     Edit mode, confirmed, refused with Neon's reason (RecordCard);
//   - child lists (e.g. a device model's interfaces): Add / edit in a pop-up form whose Save
//     writes at once, remove after confirming.
// Option lists come from the schema (CHECK values), the lookups table, or another table.
import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  CheckboxField,
  ColorField,
  DateField,
  FieldGrid,
  IconButton,
  Modal,
  Note,
  SearchInput,
  SelectField,
  Table,
  TextField,
  type Column,
  type SelectOption,
} from '@iotify/ui';
import {
  TABLES,
  VALUES,
  useDeleteRecord,
  useNextIds,
  useLookups,
  useSaveBatch,
  useSaveRecord,
  useTable,
  useUpdateRecord,
  type Filter,
  type RowOf,
  type TableName,
} from '@iotify/data';
import { RecordCard, useRecordEdit } from './edit';
import { useDetailTitle } from './detail-title';
import { nextId } from './rules-data';

/**
 * gps tables (IT-0040) number their own ids, and some need a public_id: a new record gets both
 * from the database / the browser. Other tables keep text ids made from a prefix (A56 after A55).
 */
const autoNumbered = (table: TableName) => !!(TABLES[table] as { auto?: boolean }).auto;
const hasPublicId = (table: TableName) =>
  (TABLES[table].columns as readonly string[]).includes('public_id');
import { Toolbar } from './screens/demo-screens';

// ------------------------------------------------------------------ fields

export type FieldType = 'text' | 'number' | 'select' | 'yesno' | 'date' | 'color' | 'textarea';

export interface FieldDef<R> {
  key: keyof R & string;
  label: string;
  type?: FieldType;
  /** For select: fixed options, a lookups list ("Feature Group"), or another table. */
  options?:
    | SelectOption[]
    | { lookup: string }
    | {
        table: TableName;
        label: (row: Record<string, unknown>) => string;
        /** Only rows with these values, e.g. { type: 'Group' }. */
        filter?: Record<string, unknown>;
      };
  /** Read-only even in Edit mode. */
  readOnly?: boolean;
  hint?: string;
  /** Required when adding. */
  required?: boolean;
  /** Empty choice label for selects (default "—"). Use null for no empty choice. */
  placeholder?: string | null;
}

const asOptions = (values: readonly string[]): SelectOption[] =>
  values.map((v) => ({ value: v, label: v }));

/** Allowed values of a column from its CHECK constraint, as options. */
export function enumOptions(table: TableName, column: string): SelectOption[] {
  const v = (VALUES as Record<string, Record<string, readonly string[]>>)[table]?.[column];
  return v ? asOptions(v) : [];
}

/** Resolves every field's options (lookups and other tables are read from Neon). */
function useFieldOptions<R>(fields: FieldDef<R>[]) {
  const lookups = useLookups();
  const tables = [
    ...new Set(fields.flatMap((f) => (f.options && 'table' in f.options ? [f.options.table] : []))),
  ];
  // One query per referenced table (the list of tables is fixed for a page).
  const q0 = useTable(tables[0] ?? 'lookups', undefined, { enabled: !!tables[0] });
  const q1 = useTable(tables[1] ?? 'lookups', undefined, { enabled: !!tables[1] });
  const q2 = useTable(tables[2] ?? 'lookups', undefined, { enabled: !!tables[2] });
  const q3 = useTable(tables[3] ?? 'lookups', undefined, { enabled: !!tables[3] });
  const byTable: Record<string, Record<string, unknown>[] | undefined> = {};
  [q0, q1, q2, q3].forEach((q, i) => {
    if (tables[i]) byTable[tables[i]!] = q.data as Record<string, unknown>[] | undefined;
  });
  const loading = lookups.isLoading || [q0, q1, q2, q3].some((q, i) => tables[i] && q.isLoading);
  return (f: FieldDef<R>, current: unknown): SelectOption[] => {
    const o = f.options;
    let list: SelectOption[] = [];
    if (Array.isArray(o)) list = o;
    else if (o && 'lookup' in o)
      list = (lookups.data ?? [])
        .filter((r) => r.list === o.lookup && r.active !== false)
        .sort(
          (a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.value).localeCompare(String(b.value)),
        )
        .map((r) => ({ value: r.value ?? '', label: r.value ?? '' }));
    else if (o && 'table' in o) {
      const rows = byTable[o.table] ?? [];
      const filt = o.filter as Record<string, unknown> | undefined;
      list = rows
        .filter(
          (r) =>
            !filt ||
            Object.entries(filt).every(([k, v]) =>
              Array.isArray(v) ? v.includes(r[k]) : r[k] === v,
            ),
        )
        .map((r) => ({ value: String(r.id), label: o.label(r) }));
    }
    // A value that's no longer in the list still shows.
    const cur = current == null ? '' : String(current);
    if (cur && !list.some((x) => x.value === cur))
      // (Still loading: show the value as it is, not as "not in list".)
      list = [...list, { value: cur, label: loading ? cur : `${cur} (not in list)` }];
    return list;
  };
}

/** The value as shown in a list cell (option labels for selects). */
export function useCellText<R>(fields: FieldDef<R>[]) {
  const optionsFor = useFieldOptions(fields);
  return (f: FieldDef<R>, row: R): ReactNode => {
    const v = row[f.key];
    if (v == null || v === '') return '—';
    if (f.type === 'yesno') return v ? 'Yes' : 'No';
    if (f.type === 'select')
      return optionsFor(f, v).find((o) => o.value === String(v))?.label ?? String(v);
    return String(v);
  };
}

/** Inputs for a set of fields. `get` / `set` read and write the draft; `readOnly` until Edit. */
export function FieldInputs<R>({
  fields,
  get,
  set,
  readOnly,
}: {
  fields: FieldDef<R>[];
  get: (k: keyof R & string) => unknown;
  set: (k: keyof R & string, v: unknown) => void;
  readOnly: boolean;
}) {
  const optionsFor = useFieldOptions(fields);
  return (
    <FieldGrid>
      {fields.map((f) => {
        const ro = readOnly || !!f.readOnly;
        const v = get(f.key);
        const common = { key: f.key, label: f.label, hint: f.hint, readOnly: ro, name: f.key };
        switch (f.type ?? 'text') {
          case 'number':
            return (
              <TextField
                {...common}
                type="number"
                value={v as number | null}
                onChange={(s) => set(f.key, s === '' ? null : Number(s))}
              />
            );
          case 'select':
            return (
              <SelectField
                {...common}
                value={v == null ? '' : String(v)}
                placeholder={f.placeholder === undefined ? '—' : (f.placeholder ?? undefined)}
                options={optionsFor(f, v)}
                onChange={(s) => set(f.key, s === '' ? null : s)}
              />
            );
          case 'yesno':
            return (
              <CheckboxField
                key={f.key}
                label={f.label}
                name={f.key}
                checked={v === true}
                readOnly={ro}
                onChange={(b) => set(f.key, b)}
              />
            );
          case 'date':
            return (
              <DateField
                {...common}
                value={v == null ? '' : String(v).slice(0, 10)}
                onChange={(s) => set(f.key, s || null)}
              />
            );
          case 'color':
            return (
              <ColorField
                {...common}
                value={(v as string) ?? null}
                onChange={(s) => set(f.key, s)}
              />
            );
          default:
            return (
              <TextField
                {...common}
                value={v as string | null}
                onChange={(s) => set(f.key, s === '' ? null : s)}
              />
            );
        }
      })}
    </FieldGrid>
  );
}

// ------------------------------------------------------------------ record card for any table

export interface RecordConfig<T extends TableName> {
  table: T;
  fields: FieldDef<RowOf<T>>[];
  /** Name of a record ("Fleet Management"). */
  label: (row: RowOf<T>) => string;
  /** What the record is called ("App feature"). */
  noun: string;
  /** No Delete (e.g. dealers). */
  noDelete?: boolean;
  /**
   * Rows that belong to the record and go with it (e.g. a device model's interfaces):
   * [table, column pointing at the record]. Deleted in the same transaction, so if anything
   * else still uses the record, Neon refuses and nothing is removed.
   */
  ownRows?: [TableName, string][];
}

/** A record of a core table on a card: Edit → Save / Cancel, Delete in Edit mode. */
export function TableRecordCard<T extends TableName>({
  config,
  row,
  readOnly,
  onDeleted,
  children,
  actions,
}: {
  config: RecordConfig<T>;
  row: RowOf<T>;
  readOnly?: boolean;
  onDeleted?: () => void;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const update = useUpdateRecord();
  const del = useSaveBatch();
  const name = config.label(row);
  const e = useRecordEdit<RowOf<T>>(row, {
    label: `${config.noun} ${name}`,
    readOnly,
    onSave: (changes) => update.mutateAsync(config.table, changes),
  });
  return (
    <RecordCard
      title={name}
      edit={e}
      actions={actions}
      deleteLabel={`Delete ${name}`}
      onDelete={
        config.noDelete
          ? undefined
          : async () => {
              const id = (row as { id: string }).id;
              await del.mutateAsync({
                deleteWhere: (config.ownRows ?? []).map(([table, key]) => ({
                  table,
                  filter: { [key]: id } as Filter<TableName>,
                })),
                deletes: [{ table: config.table, keys: [{ id }] as Partial<RowOf<TableName>>[] }],
              });
              onDeleted?.();
            }
      }
    >
      <FieldInputs
        fields={config.fields}
        get={(k) => e.value(k as keyof RowOf<T>)}
        set={(k, v) => e.set(k as keyof RowOf<T>, v as never)}
        readOnly={e.readOnly}
      />
      {children}
    </RecordCard>
  );
}

// ------------------------------------------------------------------ pop-up form (Save writes at once)

export function RecordFormModal<T extends TableName>({
  title,
  config,
  initial,
  onClose,
  onSaved,
  isNew,
}: {
  title: string;
  config: { table: T; fields: FieldDef<RowOf<T>>[]; idPrefix?: string };
  initial: Partial<RowOf<T>>;
  onClose: () => void;
  onSaved?: (id: string) => void;
  isNew: boolean;
}) {
  const save = useSaveRecord();
  const update = useUpdateRecord();
  const nextIds = useNextIds();
  const auto = autoNumbered(config.table);
  const existing = useTable(config.table, undefined, { enabled: isNew && !auto });
  const [row, setRow] = useState<Partial<RowOf<T>>>(initial);
  const [error, setError] = useState<string | null>(null);
  const missing = config.fields.filter(
    (f) => f.required && (row[f.key] == null || row[f.key] === ''),
  );
  const busy = save.isPending || update.isPending;
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      badge={(row as { id?: string | number }).id == null ? undefined : String((row as { id?: string | number }).id)}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={busy || missing.length > 0}
            onClick={async () => {
              setError(null);
              try {
                let id: string | number | undefined = (row as { id?: string | number }).id;
                if (isNew) {
                  id = auto
                    ? (await nextIds(config.table))[0]!
                    : nextId(config.idPrefix ?? '', (existing.data ?? []) as { id: string }[]);
                  await save.mutateAsync(config.table, {
                    ...row,
                    id,
                    ...(hasPublicId(config.table) ? { public_id: crypto.randomUUID() } : {}),
                  } as Partial<RowOf<T>>);
                } else await update.mutateAsync(config.table, row);
                onSaved?.(String(id));
                onClose();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <FieldInputs
        fields={config.fields}
        get={(k) => row[k as keyof RowOf<T>]}
        set={(k, v) => setRow((r) => ({ ...r, [k]: v }))}
        readOnly={false}
      />
      {missing.length > 0 && (
        <span className="ui-muted">Fill in: {missing.map((f) => f.label).join(', ')}.</span>
      )}
      {error && (
        <Note tone="red" role="alert">
          <b>Not saved.</b> {error}
        </Note>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ child lists

export interface ChildConfig<T extends TableName> {
  table: T;
  title: string;
  /** Column that points at the parent ("device_model_id"). */
  parentKey: keyof RowOf<T> & string;
  idPrefix: string;
  /** Columns shown and edited (the parent key is set automatically). */
  fields: FieldDef<RowOf<T>>[];
  /** Extra fixed filter (e.g. model_kind = 'Device'). */
  fixed?: Partial<RowOf<T>>;
  addLabel?: string;
}

/**
 * Rows of a child table under a record. Add, change (pop-up form) and remove save at once.
 * Hidden in view-only mode.
 */
export function ChildGrid<T extends TableName>({
  config,
  parentId,
  readOnly,
}: {
  config: ChildConfig<T>;
  parentId: string;
  readOnly?: boolean;
}) {
  const filter = { ...config.fixed, [config.parentKey]: parentId } as Filter<T>;
  const rows = useTable(config.table, filter);
  const del = useDeleteRecord();
  const cellText = useCellText(config.fields);
  const [form, setForm] = useState<{ row: Partial<RowOf<T>>; isNew: boolean } | null>(null);
  const [removing, setRemoving] = useState<RowOf<T> | null>(null);
  const columns: Column<RowOf<T>>[] = [
    ...config.fields.map((f) => ({ header: f.label, cell: (r: RowOf<T>) => cellText(f, r) })),
    ...(readOnly
      ? []
      : [
          {
            header: '',
            align: 'right' as const,
            width: 90,
            cell: (r: RowOf<T>) => (
              <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', gap: 2 }}>
                <IconButton
                  icon="edit"
                  label={`Change ${config.title} row`}
                  onClick={() => setForm({ row: r, isNew: false })}
                />
                <IconButton
                  icon="trash"
                  label={`Remove ${config.title} row`}
                  onClick={() => {
                    del.reset();
                    setRemoving(r);
                  }}
                />
              </span>
            ),
          },
        ]),
  ];
  return (
    <div className="ak-child">
      <div className="ak-child__head">
        <b>{config.title}</b>
        <span className="ui-muted">{rows.data?.length ?? 0}</span>
        <span className="ak-toolbar__grow" />
        {!readOnly && (
          <Button
            size="sm"
            icon="plus"
            onClick={() =>
              setForm({
                row: { ...config.fixed, [config.parentKey]: parentId } as Partial<RowOf<T>>,
                isNew: true,
              })
            }
          >
            {config.addLabel ?? 'Add'}
          </Button>
        )}
      </div>
      <Table<RowOf<T>>
        bare
        label={config.title}
        rows={rows.data ?? []}
        columns={columns}
        empty={rows.isLoading ? 'Loading…' : 'None yet.'}
      />
      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove from ${config.title}?`}
        maxWidth={440}
        footer={
          <>
            <Button onClick={() => setRemoving(null)}>{del.error ? 'Close' : 'Cancel'}</Button>
            {!del.error && (
              <Button
                variant="danger"
                disabled={del.isPending}
                onClick={() =>
                  del.mutate(
                    config.table,
                    { id: (removing as { id: string }).id } as unknown as Partial<RowOf<T>>,
                    { onSuccess: () => setRemoving(null) },
                  )
                }
              >
                {del.isPending ? 'Removing…' : 'Remove'}
              </Button>
            )}
          </>
        }
      >
        {del.error ? (
          <Note>
            <b>Can't remove.</b> {del.error.message}
          </Note>
        ) : (
          <p className="ui-muted" style={{ margin: 0 }}>
            This removes the row from the Neon database for everyone. It can't be undone.
          </p>
        )}
      </Modal>
      {form && (
        <RecordFormModal
          title={`${form.isNew ? 'New' : 'Change'} · ${config.title}`}
          config={config}
          initial={form.row}
          isNew={form.isNew}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ list page

export interface TablePageConfig<T extends TableName> extends RecordConfig<T> {
  idPrefix: string;
  /** Route base, e.g. "/features" (the chosen record is /features/:id). */
  path: string;
  /** List columns (field keys, or custom). Default: the first four fields. */
  columns?: (keyof RowOf<T> & string)[];
  /** Fields asked when adding (default: required ones and the first two). */
  addFields?: (keyof RowOf<T> & string)[];
  defaults?: Partial<RowOf<T>>;
  /** Only these rows (e.g. a dealer's companies). */
  filter?: Filter<T>;
  /** Searchable text of a row. */
  search?: (row: RowOf<T>) => string;
  /** Sort the list (default: by label). */
  sort?: (a: RowOf<T>, b: RowOf<T>) => number;
  /** Child lists on the record card (each for its own table). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: ChildConfig<any>[];
  /** Anything else on the record card. */
  extra?: (row: RowOf<T>) => ReactNode;
  /** Computed list columns shown after the field columns (e.g. counts from other tables). */
  extraColumns?: { header: string; cell: (row: RowOf<T>) => ReactNode }[];
  /** Opens your own add form (e.g. a Drawer) instead of the small New dialog. */
  onAdd?: () => void;
}

/** List with search and "+ Add" beside it; the chosen record on a card below. */
export function TablePage<T extends TableName>({
  config,
  readOnly,
  toolbar,
}: {
  config: TablePageConfig<T>;
  readOnly?: boolean;
  toolbar?: ReactNode;
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const rows = useTable(config.table, config.filter);
  const cellText = useCellText(config.fields);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const shownCols = (config.columns ?? config.fields.slice(0, 4).map((f) => f.key))
    .map((k) => config.fields.find((f) => f.key === k)!)
    .filter(Boolean);
  const search =
    config.search ?? ((r: RowOf<T>) => shownCols.map((f) => String(r[f.key] ?? '')).join(' '));
  const list = [...(rows.data ?? [])]
    .filter((r) => !q || search(r).toLowerCase().includes(q.toLowerCase()))
    .sort(config.sort ?? ((a, b) => config.label(a).localeCompare(config.label(b))));
  // The address holds the id as text (gps ids are numbers).
  const selected = rows.data?.find((r) => String((r as { id: string | number }).id) === id);
  useDetailTitle(selected ? config.label(selected) : null);
  const addFields = config.addFields
    ? config.fields.filter((f) => config.addFields!.includes(f.key))
    : config.fields.filter((f, i) => f.required || i < 2);

  return (
    <>
      <Toolbar
        search={
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={`Search ${config.noun.toLowerCase()}s`}
          />
        }
      >
        {toolbar}
        {!readOnly && (
          <Button
            size="sm"
            variant="primary"
            icon="plus"
            onClick={() => (config.onAdd ? config.onAdd() : setAdding(true))}
          >
            {config.noun}
          </Button>
        )}
      </Toolbar>
      <Table<RowOf<T>>
        label={config.noun + 's'}
        rows={list}
        empty={rows.isLoading ? 'Loading…' : 'Nothing here yet.'}
        onRowClick={(r) => navigate(`${config.path}/${(r as { id: string }).id}`)}
        columns={[
          ...shownCols.map((f, i) => ({
            header: f.label,
            cell: (r: RowOf<T>) => (i === 0 ? <b>{cellText(f, r)}</b> : cellText(f, r)),
          })),
          ...(config.extraColumns ?? []),
        ]}
      />
      {selected && (
        <TableRecordCard
          key={(selected as { id: string }).id}
          config={config}
          row={selected}
          readOnly={readOnly}
          onDeleted={() => navigate(config.path)}
        >
          {config.children?.map((c) => (
            <ChildGrid
              key={c.table}
              config={c}
              parentId={(selected as { id: string }).id}
              readOnly={readOnly}
            />
          ))}
          {config.extra?.(selected)}
        </TableRecordCard>
      )}
      {adding && (
        <RecordFormModal
          title={`New · ${config.noun}`}
          config={{ table: config.table, fields: addFields, idPrefix: config.idPrefix }}
          initial={
            {
              ...config.defaults,
              // fixed values of the list's filter (not "one of these" lists)
              ...Object.fromEntries(
                Object.entries(config.filter ?? {}).filter(([, v]) => !Array.isArray(v)),
              ),
            } as Partial<RowOf<T>>
          }
          isNew
          onClose={() => setAdding(false)}
          onSaved={(newId) => navigate(`${config.path}/${newId}`)}
        />
      )}
    </>
  );
}
