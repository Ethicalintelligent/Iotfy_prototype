// IT-0055. Vehicle Report data grid (prototype rgMount): search, Freeze Columns (sticky first
// column), Columns (show / hide, first column fixed), CSV download, drag a header to group rows
// (removable chip), ⋮ column menu (sort, clear, group, hide), header click sorts, filter row, rows per
// page 5 / 10 / 20 / 50 and First / Back / pages / Next / Last.
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { I, IC, useToast } from './kit';

export interface GridRow {
  /** cell contents as shown */
  c: ReactNode[];
  /** cell text (search, filters, grouping, CSV) */
  t: string[];
  /** sort keys */
  k: (number | string)[];
}

export function DataGrid({ title, cols, rows }: { title: string; cols: string[]; rows: GridRow[] }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [f, setF] = useState<string[]>(() => cols.map(() => ''));
  const [hide, setHide] = useState<Record<number, boolean>>({});
  const [freeze, setFreeze] = useState(false);
  const [sort, setSort] = useState<{ i: number; d: 1 | -1 } | null>(null);
  const [group, setGroup] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [per, setPer] = useState(10);
  const [pop, setPop] = useState<'cols' | number | null>(null);
  const [over, setOver] = useState(false);

  // a click anywhere else closes the open menu
  useEffect(() => {
    if (pop == null) return;
    const off = () => setPop(null);
    document.addEventListener('click', off);
    return () => document.removeEventListener('click', off);
  }, [pop]);

  const vis = cols.map((_, i) => i).filter((i) => !hide[i]);
  const ql = q.trim().toLowerCase();
  let list = rows.filter((r) => {
    if (ql && !r.t.some((x) => x.toLowerCase().includes(ql))) return false;
    return f.every((fv, i) => !fv || r.t[i]!.toLowerCase().includes(fv.toLowerCase()));
  });
  if (sort) {
    const { i, d } = sort;
    list = list.slice().sort((a, b) => {
      const x = a.k[i]!;
      const y = b.k[i]!;
      return (x > y ? 1 : x < y ? -1 : 0) * d;
    });
  }
  const pages = Math.max(1, Math.ceil(list.length / per));
  const cur = Math.min(page, pages - 1);
  const slice = list.slice(cur * per, cur * per + per);
  const frz = (n: number) => (freeze && n === 0 ? 'rg-frz' : undefined);
  const rowEl = (r: GridRow, key: number) => (
    <tr key={key}>
      {vis.map((i, n) => (
        <td key={i} className={frz(n)}>
          {r.c[i]}
        </td>
      ))}
    </tr>
  );
  let body: ReactNode;
  if (group != null) {
    const groups = new Map<string, GridRow[]>();
    slice.forEach((r) => {
      const g = r.t[group]!;
      groups.set(g, [...(groups.get(g) ?? []), r]);
    });
    body = [...groups].map(([g, rs]) => (
      <Fragment key={g}>
        <tr className="rg-grp">
          <td colSpan={vis.length}>
            <I d={IC.chev} size={13} />
            <b>{cols[group]}:</b> {g} <span>({rs.length})</span>
          </td>
        </tr>
        {rs.map(rowEl)}
      </Fragment>
    ));
  } else body = slice.map(rowEl);

  const csv = () => {
    const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const text = [vis.map((i) => cols[i]!), ...list.map((r) => vis.map((i) => r.t[i]!))]
      .map((l) => l.map(cell).join(','))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = title.replace(/\s+/g, '-').toLowerCase() + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`${title} · CSV downloaded (${list.length} rows, demo)`);
  };
  const go = (g: string | number) =>
    setPage(g === 'first' ? 0 : g === 'back' ? cur - 1 : g === 'next' ? cur + 1 : g === 'last' ? pages - 1 : +g);

  return (
    <div className="rg-wrap">
      <div className="rg-bar">
        <label className="rg-search">
          <I d={IC.search} size={15} />
          <input
            type="search"
            placeholder="Search days"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <button type="button" className={'rg-tbtn rg-freeze' + (freeze ? ' on' : '')} onClick={() => setFreeze(!freeze)}>
          <I d={IC.freeze} size={15} />
          Freeze Columns
        </button>
        <div className="rg-colwrap">
          <button
            type="button"
            className="rg-tbtn rg-cols"
            onClick={(e) => {
              e.stopPropagation();
              setPop(pop === 'cols' ? null : 'cols');
            }}
          >
            <I d={IC.sliders} size={15} />
            Columns
          </button>
          {pop === 'cols' && (
            <div className="rg-pop" onClick={(e) => e.stopPropagation()}>
              {cols.map((c, i) => (
                <label key={c}>
                  <input
                    type="checkbox"
                    checked={!hide[i]}
                    disabled={i === 0}
                    onChange={(e) => setHide({ ...hide, [i]: !e.target.checked })}
                  />
                  {c}
                </label>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="rg-tbtn rg-ico rg-dl" title="Download CSV" onClick={csv}>
          <I d={IC.download} />
        </button>
      </div>
      <div className="pp-card rg-card">
        <div
          className={'rg-drop' + (group != null ? ' on' : '') + (over ? ' over' : '')}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const i = parseInt(e.dataTransfer.getData('text/plain'), 10);
            if (!isNaN(i)) setGroup(i);
          }}
        >
          <I d={IC.stack} size={15} />
          {group != null ? (
            <span className="rg-gchip">
              Grouped by <b>{cols[group]}</b>
              <button type="button" className="rg-ungroup" title="Remove grouping" onClick={() => setGroup(null)}>
                <I d={IC.close} size={12} />
              </button>
            </span>
          ) : (
            <span>Drag a column header here to group rows</span>
          )}
        </div>
        <div className="rg-scroll">
          <table className="rg-tbl">
            <thead>
              <tr>
                {vis.map((i, n) => {
                  const s = sort && sort.i === i ? (sort.d > 0 ? ' ↑' : ' ↓') : '';
                  return (
                    <th
                      key={i}
                      draggable
                      data-i={i}
                      className={frz(n)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(i));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('.rg-dots, .rg-pop')) return;
                        setSort(sort && sort.i === i ? (sort.d > 0 ? { i, d: -1 } : null) : { i, d: 1 });
                      }}
                    >
                      <span>
                        {cols[i]}
                        {s}
                      </span>
                      <button
                        type="button"
                        className="rg-dots"
                        aria-label="Column menu"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPop(pop === i ? null : i);
                        }}
                      >
                        <I d={IC.dots} size={15} />
                      </button>
                      {pop === i && (
                        <div
                          className="rg-pop rg-cmenu"
                          onClick={(e) => {
                            e.stopPropagation();
                            const a = (e.target as HTMLElement).closest('button')?.dataset.a;
                            if (!a) return;
                            if (a === 'asc') setSort({ i, d: 1 });
                            else if (a === 'desc') setSort({ i, d: -1 });
                            else if (a === 'clear') setSort(null);
                            else if (a === 'group') setGroup(i);
                            else if (a === 'hide') setHide({ ...hide, [i]: true });
                            setPop(null);
                          }}
                        >
                          <button type="button" data-a="asc">
                            Sort ascending
                          </button>
                          <button type="button" data-a="desc">
                            Sort descending
                          </button>
                          {sort && sort.i === i && (
                            <button type="button" data-a="clear">
                              Clear sort
                            </button>
                          )}
                          <button type="button" data-a="group">
                            Group by this column
                          </button>
                          {i > 0 && (
                            <button type="button" data-a="hide">
                              Hide column
                            </button>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
              <tr className="rg-frow">
                {vis.map((i, n) => (
                  <th key={i} className={frz(n)}>
                    <input
                      value={f[i]}
                      aria-label={`Filter ${cols[i]}`}
                      onChange={(e) => {
                        const nf = f.slice();
                        nf[i] = e.target.value;
                        setF(nf);
                        setPage(0);
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.length ? (
                body
              ) : (
                <tr>
                  <td className="rg-none" colSpan={vis.length}>
                    No rows match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="rg-foot">
          <span className="rg-count">
            Page <b>{cur + 1}</b> of <b>{pages}</b> · {list.length} total
          </span>
          <span className="rg-per">
            Rows per page{' '}
            <label>
              {per}
              <I d={IC.chev} size={13} />
              <select
                value={per}
                onChange={(e) => {
                  setPer(+e.target.value);
                  setPage(0);
                }}
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </span>
          <span className="rg-pager">
            <button type="button" disabled={!cur} onClick={() => go('first')}>
              « First
            </button>
            <button type="button" disabled={!cur} onClick={() => go('back')}>
              ‹ Back
            </button>
            {Array.from({ length: pages }, (_, k) => (
              <button key={k} type="button" className={k === cur ? 'on' : ''} onClick={() => go(k)}>
                {k + 1}
              </button>
            ))}
            <button type="button" disabled={cur >= pages - 1} onClick={() => go('next')}>
              Next ›
            </button>
            <button type="button" disabled={cur >= pages - 1} onClick={() => go('last')}>
              Last »
            </button>
          </span>
        </div>
        <div className="rg-demo">Demo data</div>
      </div>
    </div>
  );
}
