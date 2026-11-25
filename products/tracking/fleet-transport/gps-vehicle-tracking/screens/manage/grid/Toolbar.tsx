// IT-0036. The Manage tool bar pieces: module picker, Freeze Columns, Columns and Export menus
// (original `hH`, `gH`, `yH`, `bH`).
import { Icon } from '../../smart-track/kit';
import { Check, PopSearch, SEARCH_FROM, matches, usePop } from '../ui';
import { useState } from 'react';

export interface ModuleChoice {
  id: string;
  label: string;
  icon: string;
}

export function ModulePicker({
  modules,
  value,
  onChange,
}: {
  modules: ModuleChoice[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { open, setOpen, ref } = usePop();
  const [q, setQ] = useState('');
  const current = modules.find((m) => m.id === value) ?? modules[0];
  if (!current) return null;
  const withSearch = modules.length > SEARCH_FROM;
  const shown = modules.filter((m) => matches(m.label, q));
  return (
    <div className="td-manage__module">
      <span className="td-manage__module-k">Manage Module</span>
      <div className="td-pop" ref={ref}>
        <button
          type="button"
          className="td-manage__picker"
          onClick={() => {
            setQ('');
            setOpen((o) => !o);
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Icon name={current.icon} size={16} className="td-manage__picker-icon" />
          <span>{current.label}</span>
          <Icon name="ChevronDown" size={15} />
        </button>
        {open && (
          <div className={`td-pop__menu ${withSearch ? 'has-search' : ''}`}>
            {withSearch && <PopSearch value={q} onChange={setQ} label="Search Manage module" />}
            <ul className="td-pop__list" role="listbox" aria-label="Manage module">
              {shown.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={m.id === value}
                    className={m.id === value ? 'is-active' : ''}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                  >
                    <Icon name={m.icon} size={16} />
                    {m.label}
                    {m.id === value && <Icon name="Check" size={15} className="td-pop__check" />}
                  </button>
                </li>
              ))}
              {!shown.length && <li className="td-pop__none">No results found</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function FreezeMenu({
  columns,
  frozen,
  onChange,
}: {
  columns: { key: string }[];
  frozen: string[];
  onChange: (f: string[]) => void;
}) {
  const { open, setOpen, ref } = usePop();
  const n = columns.filter((c) => frozen.includes(c.key)).length;
  const max = Math.max(0, columns.length - 1);
  const set = (k: number) =>
    onChange(columns.slice(0, Math.max(0, Math.min(max, k))).map((c) => c.key));
  return (
    <div className="td-pop" ref={ref}>
      <button
        type="button"
        className={`td-manage__tool ${n ? 'is-on' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {/* lucide class name kept: the stylesheet hides this button beside the Geo Association map */}
        <Icon name="PanelLeft" size={16} className="lucide-panel-left" />
        <span>{n ? `Freeze ${n} Col${n > 1 ? 's' : ''}` : 'Freeze Columns'}</span>
      </button>
      {open && (
        <div className="td-pop__menu td-pop__menu--freeze" role="group" aria-label="Freeze columns">
          <span className="td-freeze__k">Freeze columns</span>
          <div className="td-freeze__row">
            <span>Columns frozen from left</span>
            <span className="td-freeze__stepper">
              <button
                type="button"
                className="td-freeze__step"
                aria-label="Freeze one column less"
                disabled={n === 0}
                onClick={() => set(n - 1)}
              >
                –
              </button>
              <output className="td-freeze__n" aria-live="polite">
                {n}
              </output>
              <button
                type="button"
                className="td-freeze__step"
                aria-label="Freeze one more column"
                disabled={n >= max}
                onClick={() => set(n + 1)}
              >
                +
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ColumnsMenu({
  columns,
  hidden,
  onChange,
  onResetOrder,
}: {
  columns: { key: string; label: string }[];
  hidden: string[];
  onChange: (h: string[]) => void;
  onResetOrder?: () => void;
}) {
  const { open, setOpen, ref } = usePop();
  const [q, setQ] = useState('');
  const toggle = (k: string) => {
    const next = hidden.includes(k) ? hidden.filter((h) => h !== k) : [...hidden, k];
    if (next.length < columns.length) onChange(next);
  };
  const shown = columns.filter((c) => matches(c.label, q));
  return (
    <div className="td-pop" ref={ref}>
      <button
        type="button"
        className={`td-manage__tool ${hidden.length ? 'is-on' : ''}`}
        onClick={() => {
          setQ('');
          setOpen((o) => !o);
        }}
        aria-expanded={open}
      >
        <Icon name="SlidersVertical" size={16} />
        <span>Columns</span>
        {hidden.length > 0 && (
          <em>
            {columns.length - hidden.length}/{columns.length}
          </em>
        )}
      </button>
      {open && (
        <div
          className="td-pop__menu td-pop__menu--checks"
          role="group"
          aria-label="Visible columns"
        >
          {columns.length > SEARCH_FROM && (
            <PopSearch value={q} onChange={setQ} label="Search columns" />
          )}
          {!shown.length && <span className="td-pop__none">No results found</span>}
          {shown.map((c) => (
            <Check
              key={c.key}
              checked={!hidden.includes(c.key)}
              onChange={() => toggle(c.key)}
              disabled={!hidden.includes(c.key) && hidden.length === columns.length - 1}
            >
              {c.label}
            </Check>
          ))}
          {hidden.length > 0 && (
            <button type="button" className="td-link" onClick={() => onChange([])}>
              <Icon name="RotateCcw" size={12} />
              Show all
            </button>
          )}
          {onResetOrder && (
            <button type="button" className="td-link" onClick={onResetOrder}>
              <Icon name="RotateCcw" size={12} />
              Reset column order
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ExportMenu({
  busy,
  disabled,
  onExcel,
  onPdf,
}: {
  busy: boolean;
  disabled: boolean;
  onExcel: () => void;
  onPdf: () => void;
}) {
  const { open, setOpen, ref } = usePop();
  const run = (f: () => void) => () => {
    setOpen(false);
    f();
  };
  return (
    <div className="td-pop" ref={ref}>
      <button
        type="button"
        className="td-manage__icon"
        title="Export"
        aria-label="Export"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={busy}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="Download" size={17} />
      </button>
      {open && (
        <div className="td-pop__menu td-pop__menu--export" role="menu" aria-label="Export">
          <button type="button" role="menuitem" onClick={run(onExcel)}>
            <Icon name="FileSpreadsheet" size={16} />
            Excel<small>.xlsx</small>
          </button>
          <button type="button" role="menuitem" onClick={run(onPdf)}>
            <Icon name="FileText" size={16} />
            PDF<small>Save as PDF</small>
          </button>
        </div>
      )}
    </div>
  );
}
