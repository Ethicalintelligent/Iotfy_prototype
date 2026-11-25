// IT-0036. The add / edit / Multi-Edit drawer of the Manage modules (original `mD` with its field
// renderer `MH`): sections, stepper, required / pattern checks, "+ Add" choices, nested forms
// (e.g. Add Operator from the vehicle form), Reset, and Neon's exact error text on a failed save.
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Icon } from '../../smart-track/kit';
import {
  AddLink,
  Banner,
  Drawer,
  Fieldset,
  FileInput,
  Files,
  FormSection,
  Fx,
  MultiSelect,
  Radios,
  Select,
  Stepper,
  Tree,
  errText,
  treeOrder,
  type FileRef,
} from '../ui';
import {
  fieldsOf,
  moduleById,
  strList,
  type FieldDef,
  type FormContext,
  type ListItem,
  type Lists,
  type ModuleDef,
  type ModuleSource,
  type Values,
} from './types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_LISTS: Record<string, (string | ListItem)[]> = {
  years: Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i)),
  assetStatus: ['Active', 'Maintenance', 'Inactive'],
  reminders: [
    { id: '1-weekbefore', label: '1 week before' },
    { id: '2-weekbefore', label: '2 weeks before' },
    { id: '1-monthbefore', label: '1 month before' },
    { id: '2-monthbefore', label: '2 months before' },
  ],
};
const asItems = (l: (string | ListItem)[]) =>
  l.map((x) => (typeof x === 'string' ? { id: x, label: x } : x));

/** Half-width fields are paired in one grid cell (original `TH`). */
function pairUp(fields: FieldDef[]): (FieldDef | FieldDef[])[] {
  const out: (FieldDef | FieldDef[])[] = [];
  for (const f of fields) {
    const last = out[out.length - 1];
    if (f.half && Array.isArray(last) && last.length < 2) last.push(f);
    else out.push(f.half ? [f] : f);
  }
  return out;
}

export function ModuleForm({
  modules,
  module: moduleId,
  id,
  source,
  onClose,
  onSaved,
  level = 0,
  readOnly,
  multi,
}: {
  modules: ModuleDef[];
  module: string;
  id: string | null;
  source: ModuleSource;
  onClose: () => void;
  onSaved: (saved: { id: string }, added: boolean) => void;
  level?: number;
  readOnly?: boolean;
  multi?: { ids: string[]; onSaved: (n: number) => void; onPartial: () => void };
}) {
  const m = moduleById(modules, moduleId);
  const formId = `td-form-${m.id}-${level}`;
  const initial = useMemo<Values>(
    () => ({ ...m.empty?.(), ...(id ? source.get(m.id, id) : {}) }),
    [m, id],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nested, setNested] = useState<{ module: string; field: string; multi?: boolean } | null>(
    null,
  );
  const [added, setAdded] = useState<Lists>({});
  const touched = useRef(new Set<string>());
  const [ids, setIds] = useState(multi?.ids ?? []);
  const body = useRef<HTMLDivElement>(null);

  const lists: Lists = useMemo(() => {
    const base = source.options(m.id);
    const out: Lists = { ...base };
    for (const [k, extra] of Object.entries(added)) {
      const have = out[k] ?? asItems(m.lists?.[k] ?? DEFAULT_LISTS[k] ?? []);
      out[k] = [...have.filter((x) => !extra.some((e) => e.id === x.id)), ...extra];
    }
    return out;
  }, [source, m, added]);

  const editable = readOnly ? [] : (source.editable?.(m.id) ?? null);
  const can = (k: string) => editable === null || editable.includes(k);
  const isRequired = (f: FieldDef) =>
    can(f.key) && !(id && f.keepOnEdit) && (!multi || touched.current.has(f.key)) && !!f.required;
  const greyed = !readOnly && editable !== null && fieldsOf(m).some((f) => !can(f.key));

  const set = (k: string, v: unknown) => {
    touched.current.add(k);
    setValues((old) => {
      const next = { ...old, [k]: v };
      // A child list (e.g. model under make) is cleared when its parent changes.
      fieldsOf(m)
        .filter((f) => f.parent === k)
        .forEach((f) => {
          if (!(lists[f.list!] ?? []).some((o) => o.id === next[f.key] && o.parent === v))
            next[f.key] = '';
        });
      return next;
    });
    setErrors((e) => (e[k] ? { ...e, [k]: null } : e));
  };
  const optionsFor = (f: FieldDef): ListItem[] => {
    const all = lists[f.list!] ?? asItems(m.lists?.[f.list!] ?? DEFAULT_LISTS[f.list!] ?? []);
    return f.parent ? all.filter((o) => !values[f.parent!] || o.parent === values[f.parent!]) : all;
  };
  const addChoice = async (f: FieldDef, text: string, under?: string) => {
    const parent = f.parent
      ? String(values[f.parent] ?? '')
      : f.type === 'tree'
        ? under
        : undefined;
    if (f.parent && !parent) {
      const p = fieldsOf(m).find((x) => x.key === f.parent);
      throw new Error(`Pick the ${(p?.label ?? f.parent).toLowerCase()} first.`);
    }
    const item = await source.addOption(m.id, f.list!, text, parent);
    setAdded((a) => ({
      ...a,
      [f.list!]: [...(a[f.list!] ?? []).filter((x) => x.id !== item.id), item],
    }));
    set(f.key, item.id);
  };
  const canNest = (mod: string) => modules.some((x) => x.id === mod) && source.canEdit(mod);

  const validate = () => {
    const out: Record<string, string> = {};
    fieldsOf(m)
      .filter((f) => can(f.key) && (!multi || touched.current.has(f.key)))
      .forEach((f) => {
        const v = values[f.key];
        const empty = v == null || v === '' || (Array.isArray(v) && !v.length);
        if (isRequired(f) && empty) out[f.key] = `${f.label} is required`;
        else if (
          !empty &&
          f.pattern &&
          !new RegExp(`^${f.pattern}$`).test(String(v).replace(/\s+/g, ''))
        )
          out[f.key] = `${f.label} must be ${f.hint || 'valid'}`;
        else if (!empty && f.type === 'number' && !(Number(v) >= 0))
          out[f.key] = `${f.label} must be a number of 0 or more`;
        else if (!empty && f.inputType === 'email' && !EMAIL.test(String(v)))
          out[f.key] = 'Enter a valid e-mail address';
      });
    return out;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const found = validate();
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      body.current
        ?.querySelector(`[data-field="${first}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (multi && !touched.current.size) {
      setBanner('Change at least one field to save.');
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      if (multi) {
        const patch = Object.fromEntries([...touched.current].map((k) => [k, values[k]]));
        let saved = 0;
        const failed: { id: string; message: string }[] = [];
        for (const rid of ids) {
          let label = rid;
          try {
            const current = source.get(m.id, rid);
            label = m.name(current) || rid;
            await source.save(m.id, rid, { ...current, ...patch });
            saved++;
          } catch (err) {
            failed.push({ id: rid, message: `${label}: ${errText(err)}` });
          }
        }
        if (!failed.length) return multi.onSaved(saved);
        setIds(failed.map((f) => f.id));
        setBanner(
          `${saved} saved, ${failed.length} not. Save again to retry those. ${failed
            .slice(0, 5)
            .map((f) => f.message)
            .join(' · ')}`,
        );
        body.current?.scrollTo({ top: 0, behavior: 'smooth' });
        if (saved) multi.onPartial();
        return;
      }
      const res = await source.save(m.id, id, values);
      onSaved(res, !id);
    } catch (err) {
      setBanner(errText(err));
      body.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const ctx: FormContext = {
    values,
    set,
    lists,
    can,
    canNest,
    multi: !!multi,
    openNested: (module, field, many) => setNested({ module, field, multi: many }),
  };
  const steps = useMemo(() => m.sections.map((s) => ({ id: s.id, label: s.step ?? s.title })), [m]);
  const title = multi
    ? `Edit ${ids.length} ${m.plural}`
    : readOnly
      ? m.label
      : id
        ? `Edit ${m.label}`
        : (m.formTitle ?? m.addLabel);
  const submitLabel = multi
    ? `Save ${ids.length} ${m.plural}`
    : id
      ? 'Save Changes'
      : m.submitLabel || m.addLabel;
  const subtitle = multi
    ? 'Only the fields you change here are saved; the rest stay as each one has them.'
    : id
      ? `${readOnly ? '' : 'Update '}${m.label.toLowerCase()} ${m.name(values) || ''}`.trim()
      : m.formSubtitle;

  return (
    <>
      <Drawer
        title={title}
        subtitle={subtitle}
        icon={multi ? 'Pencil' : id ? (readOnly ? m.icon : 'Pencil') : 'Plus'}
        onClose={onClose}
        onReset={() => {
          touched.current.clear();
          setValues(initial);
          setErrors({});
          setBanner(null);
        }}
        submitLabel={submitLabel}
        submitting={saving}
        formId={formId}
        level={level}
        footer={readOnly ? null : undefined}
        nav={m.stepper ? <Stepper sections={steps} body={body} /> : null}
      >
        <div ref={body} className="td-form__scroll">
          <form id={formId} className="td-form" onSubmit={(e) => void submit(e)} noValidate>
            {banner && <Banner>{banner}</Banner>}
            {greyed && <p className="gp-hint">Greyed-out fields are not saved yet.</p>}
            {m.sections.map((s) => (
              <FormSection
                key={s.id}
                id={`${formId}-${s.id}`}
                step={s.id}
                title={s.title}
                icon={s.icon}
                cols={s.cols || 3}
                after={
                  s.render && (
                    <Fieldset disabled={s.lockedUnless !== undefined && !can(s.lockedUnless)}>
                      {s.render(ctx)}
                    </Fieldset>
                  )
                }
              >
                {s.fields &&
                  pairUp(s.fields.filter((f) => !multi || !f.perRecord)).map((f) => {
                    const one = (x: FieldDef) => (
                      <FieldInput
                        key={x.key}
                        field={x}
                        value={values[x.key]}
                        error={errors[x.key]}
                        recordId={id}
                        disabled={!can(x.key) || !!readOnly}
                        required={isRequired(x)}
                        options={x.list ? optionsFor(x) : null}
                        onChange={(v) => set(x.key, v)}
                        onAdd={
                          can(x.key) && !readOnly
                            ? x.add === true
                              ? (t, under) => addChoice(x, t, under)
                              : x.add && canNest(x.add)
                                ? () => setNested({ module: x.add as string, field: x.key })
                                : null
                            : null
                        }
                      />
                    );
                    return Array.isArray(f) ? (
                      <div key={f[0]!.key} className="td-form__pair">
                        {f.map(one)}
                      </div>
                    ) : (
                      one(f)
                    );
                  })}
              </FormSection>
            ))}
          </form>
        </div>
      </Drawer>
      {nested && (
        <ModuleForm
          modules={modules}
          module={nested.module}
          id={null}
          source={source}
          level={level + 1}
          onClose={() => setNested(null)}
          onSaved={(saved) => {
            const { field, multi: many } = nested;
            setNested(null);
            set(field, many ? [...strList(values[field]), saved.id] : saved.id);
          }}
        />
      )}
    </>
  );
}

/** One form field by type (original `MH`). */
function FieldInput({
  field: f,
  value,
  error,
  options,
  onChange,
  onAdd,
  recordId,
  disabled,
  required,
}: {
  field: FieldDef;
  value: unknown;
  error?: string | null;
  options: ListItem[] | null;
  onChange: (v: unknown) => void;
  onAdd: ((text: string, under?: string) => Promise<void>) | (() => void) | null;
  recordId: string | null;
  disabled: boolean;
  required: boolean;
}) {
  const id = `td-f-${f.key}`;
  const style = {
    gridColumn: f.span ? `span ${f.span}` : undefined,
    gridRow: f.rowSpan ? `span ${f.rowSpan}` : undefined,
  };
  const text = value == null ? '' : String(value);
  const extra =
    onAdd &&
    (f.add === true ? (
      <AddLink
        name={f.label}
        onAdd={onAdd as (t: string, u?: string) => Promise<void>}
        parents={f.type === 'tree' ? treeOrder(options ?? []) : undefined}
      />
    ) : (
      <AddLink name={f.label} onOpen={onAdd as () => void} />
    ));
  let input;
  switch (f.type) {
    case 'select': {
      const opts = (options ?? []).map((o) => {
        const used = !!o.usedBy && o.usedBy !== recordId;
        return { value: o.id, label: `${o.label}${used ? ' (in use)' : ''}`, disabled: used };
      });
      if (text && typeof f.add !== 'string' && !opts.some((o) => o.value === text))
        opts.unshift({ value: text, label: text, disabled: false });
      const ph =
        f.parent && !opts.length
          ? f.add && !disabled
            ? 'None yet — use + Add'
            : 'None yet'
          : f.placeholder || '';
      const select = (
        <Select
          id={id}
          value={text}
          onChange={onChange}
          options={opts}
          placeholder={ph}
          disabled={disabled}
        />
      );
      if (f.iconPicker) {
        const image = options?.find((o) => o.id === text)?.image;
        input = (
          <div className="td-fx__row">
            {select}
            <span className="td-fx__icon" title={f.iconPicker.title}>
              {image ? (
                <img
                  className="td-img "
                  src={image}
                  alt=""
                  width={28}
                  height={28}
                  decoding="async"
                />
              ) : (
                <Icon name={f.iconPicker.icons?.[text] || f.iconPicker.fallback} size={16} />
              )}
            </span>
          </div>
        );
      } else input = select;
      break;
    }
    case 'multiselect':
      input = (
        <MultiSelect
          id={id}
          value={strList(value)}
          onChange={onChange}
          options={(options ?? []).map((o) => ({ value: o.id, label: o.label }))}
          placeholder={f.placeholder}
          disabled={disabled}
          aria-label={f.label}
        />
      );
      break;
    case 'radio':
      input = (
        <Radios
          name={id}
          value={text}
          onChange={onChange}
          options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
          disabled={disabled}
          aria-label={f.label}
        />
      );
      break;
    case 'files':
      input = (
        <Files
          value={(value as FileRef[]) || []}
          onChange={onChange}
          disabled={disabled}
          maxMb={f.maxMb}
          images={f.images}
        />
      );
      break;
    case 'file':
      input = (
        <FileInput value={(value as FileRef) || null} onChange={onChange} disabled={disabled} />
      );
      break;
    case 'tree':
      input = (
        <Tree
          id={id}
          options={options ?? []}
          value={text}
          onChange={onChange}
          disabled={disabled}
        />
      );
      break;
    default:
      input = (
        <input
          type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : f.inputType || 'text'}
          value={text}
          placeholder={recordId && f.keepOnEdit ? f.keepOnEdit : f.placeholder}
          inputMode={f.inputMode}
          step={f.type === 'number' ? 'any' : undefined}
          min={f.type === 'number' ? 0 : undefined}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
  }
  return (
    <Fx
      label={f.label}
      required={required}
      error={error}
      extra={extra}
      id={id}
      group={f.type === 'radio' || f.type === 'tree'}
      className={`td-fx--${f.type || 'text'}`}
      style={style}
      field={f.key}
    >
      {input}
    </Fx>
  );
}
