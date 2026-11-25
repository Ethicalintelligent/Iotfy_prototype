// IT-0036. One list module of Manage (original `IH` for Vehicle, Device, SIM Card, Operator): the
// grid with its columns, add / edit drawer, Multi-Edit (vehicles), delete confirmation and toasts.
import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '../../smart-track/kit';
import { DataGrid, type GridColumn, type GridLayout } from '../grid/DataGrid';
import { ModuleForm } from '../form/ModuleForm';
import {
  moduleById,
  type ColumnDef,
  type ModuleDef,
  type ModuleSource,
  type Row,
} from '../form/types';
import { Confirm, Pill, Toast, errText } from '../ui';

const STATUS_TONE: Record<string, string> = {
  Active: 'green',
  Maintenance: 'amber',
  Inactive: 'gray',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const showDate = (v: unknown) => {
  const s = v == null ? '' : String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : s;
};
const cellText = (c: ColumnDef, r: Row) => {
  const v = r[c.key];
  return v == null || v === '' ? '' : c.kind === 'date' ? showDate(v) : String(v);
};
const done = (noun: string, what: string) =>
  `${noun.replace(/\b\w/g, (x) => x.toUpperCase())} ${what} Successfully`;

function toColumn(c: ColumnDef): GridColumn<Row> {
  return {
    key: c.key,
    label: c.label,
    width: c.width,
    strong: c.strong,
    noServerFilter: c.noServerFilter,
    value: (r) => cellText(c, r),
    sortValue: (r) =>
      c.kind === 'date' ? String(r[c.key] ?? '') : cellText(c, r).replace(/,/g, ''),
    render:
      c.kind === 'status'
        ? (r) => {
            const v = cellText(c, r);
            return v ? (
              <Pill tone={STATUS_TONE[v] || 'gray'}>{v}</Pill>
            ) : (
              <span className="td-mg__text">—</span>
            );
          }
        : c.image
          ? (r) => {
              const v = cellText(c, r);
              if (!v) return <span className="td-mg__text">—</span>;
              const src = r[c.image!] as string | undefined;
              return (
                <span className="td-entity">
                  {src ? (
                    <img
                      className="td-img td-tl__img"
                      src={src}
                      alt={v}
                      width={34}
                      height={22}
                      decoding="async"
                    />
                  ) : (
                    <span className="td-vthumb" style={{ width: 28, height: 20 }}>
                      <Icon name="Truck" size={12.4} strokeWidth={1.6} />
                    </span>
                  )}
                  <span>{v}</span>
                </span>
              );
            }
          : undefined,
  };
}

export function ListModule({
  modules,
  moduleId,
  source,
  picker,
  upload,
  layout,
  onLayout,
}: {
  modules: ModuleDef[];
  moduleId: string;
  source: ModuleSource;
  picker: ReactNode;
  upload?: ReactNode;
  layout: GridLayout;
  onLayout: (l: GridLayout) => void;
}) {
  const m = moduleById(modules, moduleId);
  const canEdit = source.canEdit(m.id);
  const multiEdit = canEdit && m.multiEdit === true;
  const [form, setForm] = useState<{ id: string | null } | null>(null);
  const [deleting, setDeleting] = useState<{
    row: Row;
    busy?: boolean;
    error?: string | null;
  } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [multi, setMulti] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast((x) => (x === t ? null : x)), 3500);
  };
  const columns = useMemo(() => m.columns.map(toColumn), [m]);
  const data = source.rows(m.id);
  const remove = async () => {
    if (!deleting) return;
    const { row } = deleting;
    setDeleting((d) => d && { ...d, busy: true, error: null });
    try {
      await source.remove(m.id, row.id);
      setSelected((s) => new Set([...s].filter((k) => k !== row.id)));
      setDeleting(null);
      flash(done(m.noun, 'Deleted'));
    } catch (e) {
      setDeleting((d) => d && { ...d, busy: false, error: errText(e) });
    }
  };
  return (
    <DataGrid
      picker={picker}
      upload={upload}
      selection={multiEdit ? { selected, onChange: setSelected } : undefined}
      actions={
        multiEdit ? (
          <button
            type="button"
            className={`td-manage__icon ${selected.size ? 'is-on' : ''}`}
            disabled={selected.size < 2}
            onClick={() => setMulti(true)}
            aria-label={selected.size ? `Multi-Edit (${selected.size} selected)` : 'Multi-Edit'}
            title={
              selected.size < 2
                ? `Multi-Edit: tick two or more ${m.plural.toLowerCase()} to edit them together`
                : 'Multi-Edit'
            }
          >
            <Icon name="MultiEdit" size={17} />
            {selected.size > 0 && <em aria-hidden="true">{selected.size}</em>}
          </button>
        ) : undefined
      }
      rows={data.rows}
      rowKey={(r) => r.id}
      rowLabel={(r) => m.name(r) || r.id}
      columns={columns}
      plural={m.plural}
      searchPlaceholder={m.search}
      addLabel={m.addLabel}
      onAdd={canEdit ? () => setForm({ id: null }) : undefined}
      onEdit={canEdit ? (r) => setForm({ id: r.id }) : undefined}
      onDelete={canEdit ? (r) => setDeleting({ row: r }) : undefined}
      loading={data.loading}
      error={data.error}
      onRetry={source.refresh}
      layout={layout}
      onLayout={onLayout}
    >
      {form && (
        <ModuleForm
          key={`${m.id}:${form.id}`}
          modules={modules}
          module={m.id}
          id={form.id}
          source={source}
          readOnly={!canEdit}
          onClose={() => setForm(null)}
          onSaved={(_, added) => {
            setForm(null);
            flash(done(m.noun, added ? 'Added' : 'Updated'));
          }}
        />
      )}
      {multi && (
        <ModuleForm
          modules={modules}
          module={m.id}
          id={null}
          source={source}
          onClose={() => setMulti(false)}
          onSaved={() => {}}
          multi={{
            ids: [...selected],
            onPartial: source.refresh,
            onSaved: (n) => {
              setMulti(false);
              setSelected(new Set());
              flash(`${n} ${m.plural.toLowerCase()} updated.`);
            },
          }}
        />
      )}
      {deleting && (
        <Confirm
          title={`Delete this ${m.noun.toLowerCase()}?`}
          message={`This will permanently remove ${m.name(deleting.row) || 'this record'} from ${m.removeFrom ?? m.plural.toLowerCase()}. This action cannot be undone.`}
          busy={deleting.busy}
          error={deleting.error}
          onConfirm={() => void remove()}
          onCancel={() => setDeleting(null)}
        />
      )}
      {toast && <Toast>{toast}</Toast>}
    </DataGrid>
  );
}
