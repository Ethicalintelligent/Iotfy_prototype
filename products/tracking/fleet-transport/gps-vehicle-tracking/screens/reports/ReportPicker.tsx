// "Select Report": the report picker with search and the report groups.
import { Fragment, useState } from 'react';
import { Icon } from '../smart-track/kit';
import type { Report } from './definitions';
import { PopSearch, SEARCH_FROM, matches, usePop } from './ui';

function byGroup(reports: Report[]) {
  const out: { group: string; reports: Report[] }[] = [];
  for (const r of reports) {
    const g = out.find((x) => x.group === r.group);
    if (g) g.reports.push(r);
    else out.push({ group: r.group, reports: [r] });
  }
  return out;
}

export function ReportPicker({
  reports,
  value,
  onChange,
}: {
  reports: Report[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { open, setOpen, ref } = usePop();
  const [q, setQ] = useState('');
  const current = (reports.find((r) => r.id === value) ?? reports[0])!;
  const withSearch = reports.length > SEARCH_FROM;
  const groups = byGroup(reports.filter((r) => matches(r.label, q)));
  return (
    <div className="td-manage__module">
      <span className="td-manage__module-k">Select Report</span>
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
          <div className={`td-pop__menu gp-rpt__menu ${withSearch ? 'has-search' : ''}`}>
            {withSearch && (
              <PopSearch
                value={q}
                onChange={setQ}
                label="Search reports"
                placeholder="Search report…"
              />
            )}
            <ul className="td-pop__list" role="listbox" aria-label="Report">
              {!groups.length && <li className="td-pop__none">No results found</li>}
              {groups.map((g) => (
                <Fragment key={g.group}>
                  <li className="gp-rpt__section" role="presentation">
                    {g.group}
                  </li>
                  {g.reports.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={r.id === value}
                        className={r.id === value ? 'is-active' : ''}
                        onClick={() => {
                          onChange(r.id);
                          setOpen(false);
                        }}
                      >
                        <Icon name={r.icon} size={16} />
                        {r.label}
                        {r.id === value && (
                          <Icon name="Check" size={15} className="td-pop__check" />
                        )}
                      </button>
                    </li>
                  ))}
                </Fragment>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
