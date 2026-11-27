// IT-0055. Vehicle Details / Vehicle Report charts: the Dashboard's own cards (markup, classes,
// sizes and stylesheet from screens/dash, wrapped in .st-dash), filled with the selected vehicle's
// seeded demo data, as in the approved prototype (dashActivity, dashAlerts, dashOdo, dashSpeed,
// dashDrivers). Each function draws from the shared random source in the prototype's order.
import rank1 from '../../dash/assets/rank/rank_1.png';
import rank2 from '../../dash/assets/rank/rank_2.png';
import rank3 from '../../dash/assets/rank/rank_3.png';
import { DASH } from './dashIcons';
import { IC, I, hasDriver, iso, last7, opId, pad, short, type PV, type Rnd } from './kit';

const MEDALS = [rank1, rank2, rank3];
const LEGEND = [
  ['green', 'Running'],
  ['red', 'Stopped'],
  ['blue', 'Idle'],
  ['orange', 'Overspeed'],
  ['teal', 'Towed'],
  ['dark', 'No Transmit'],
  ['gray', 'Yet to Transmit'],
] as const;
const HOURS = Array.from({ length: 12 }, (_, i) => pad(i * 2) + ':00');
const html = (s: string) => ({ __html: s });
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function DashHead({
  k,
  tone,
  title,
  sub,
  period,
}: {
  k: keyof typeof DASH.head;
  tone: string;
  title: string;
  sub: string;
  period?: string;
}) {
  return (
    <header className="td-card__head">
      <span className={`td-badge td-badge--solid tone-${tone}`} dangerouslySetInnerHTML={html(DASH.head[k])} />
      <div className="td-card__titles">
        <h2 className="td-card__title ">{title}</h2>
        <p className="td-card__sub">{sub}</p>
      </div>
      {period && (
        <div className="td-card__right">
          <span
            className="td-ddl td-ddl--period"
            title="Period"
            dangerouslySetInnerHTML={html(DASH.ddlIcon + `<span class="td-ddl__label">${esc(period)}</span>`)}
          />
        </div>
      )}
    </header>
  );
}
const dashDur = (m: number) => {
  m = Math.round(m);
  return Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm';
};
const dashClock = (m: number) => {
  m = Math.min(m, 1439);
  return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
};

/* Alert Summary: same heat table, this vehicle's alerts */
export function dashAlerts(v: PV, r: Rnd) {
  const mul = [1, 7, 30];
  const vals = DASH.cats.map((_, i) => {
    const base = r() * (i % 3 === 0 ? 1.4 : 0.8);
    return mul.map((m, k) => Math.round(base * m * (0.6 + r() * 0.8)) + (k && i === 0 ? v.alerts : 0));
  });
  vals.forEach((x) => {
    x[1] = Math.max(x[1]!, x[0]!);
    x[2] = Math.max(x[2]!, x[1]!);
  });
  const max = [0, 1, 2].map((i) => Math.max(...vals.map((x) => x[i]!)));
  const tot = [0, 1, 2].map((i) => vals.reduce((s, x) => s + x[i]!, 0));
  const tt = ['green', 'blue', 'purple'];
  return (
    <section className="td-card td-card--fixed  vs-alerts" style={{ height: 460 }}>
      <DashHead k="alerts" tone="red" title="Alert Summary" sub="Alerts over time by category" />
      <div className="td-card__body ">
        <div className="td-heat-scroll">
          <table className="td-table td-heat">
            <thead>
              <tr>
                <th>Category</th>
                {['Yesterday', 'Last 7 days', 'Last 30 days'].map((p, i) => (
                  <th key={p} className="num">
                    <span className="th-icon" dangerouslySetInnerHTML={html(DASH.th[i]! + p)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DASH.cats.map((c, ci) => (
                <tr key={c.title}>
                  <td>
                    <span
                      className={`td-heat__cat tone-${c.tone}`}
                      title={c.title}
                      dangerouslySetInnerHTML={html(c.svg + `<span>${c.title}</span>`)}
                    />
                  </td>
                  {vals[ci]!.map((x, i) => (
                    <td key={i} className="num td-heat__td">
                      <span
                        className={`td-heat__cell tone-${c.tone}`}
                        style={{ ['--heat' as string]: max[i] ? (0.25 + (0.75 * x) / max[i]!).toFixed(2) : 0 }}
                      >
                        {x}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total Alerts</td>
                {tot.map((t, i) => (
                  <td key={i} className={`num tone-${tt[i]} td-total`}>
                    {t}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

/* Vehicle Activity Overview: same timeline, one row per day for this vehicle */
export function dashActivity(
  v: PV,
  r: Rnd,
  o: { days?: Date[]; title?: string; sub?: string; period?: string } = {},
) {
  const todayIso = iso(new Date());
  const days = o.days ?? last7().reverse();
  const quiet = v.status === 'Yet to Transmit';
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  const rows = days.map((d) => {
    let segs: [string, number, number][] = [];
    if (!quiet) {
      let t = 300 + Math.floor(r() * 120);
      while (t < 1260) {
        const k = r();
        let len = 15 + Math.floor(r() * 90);
        const s = k < 0.5 ? 'Running' : k < 0.62 ? 'Overspeed' : k < 0.78 ? 'Idle' : 'Stopped';
        if (s === 'Overspeed') len = 5 + Math.floor(r() * 15);
        len = Math.min(len, 1440 - t);
        segs.push([s, t, t + len]);
        t += len;
      }
      if (iso(d) === todayIso) {
        segs = segs.filter((x) => x[1] < nowM);
        const lastSeg = segs[segs.length - 1];
        if (lastSeg) lastSeg[2] = Math.min(lastSeg[2], nowM);
      }
    }
    return { d, segs };
  });
  const tone: Record<string, string> = { Running: 'green', Stopped: 'red', Idle: 'blue', Overspeed: 'orange' };
  const period = o.period ?? 'Last 7 days';
  return (
    <section className="td-card td-card--fixed td-tlcard vs-act" style={{ height: 460 }}>
      <DashHead
        k="act"
        tone="blue"
        title={o.title ?? 'Vehicle Activity Overview'}
        sub={o.sub ?? 'Track vehicle movement and status'}
        period={period}
      />
      <div className="td-card__body ">
        <div className="td-tl__legend">
          <span className="td-tl__axis-label">Time (Hours)</span>
          {LEGEND.map(([t, l]) => (
            <span key={t} className={'tone-' + t}>
              <i className="td-dot" />
              {l}
            </span>
          ))}
        </div>
        <div className="td-tl-scroll is-paged">
          <div className="td-tl">
            <div className="td-tl__head">
              <span>Date</span>
              <div className="td-tl__hours">
                {HOURS.map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
            </div>
            <div className="td-tl__body  is-paged" style={{ ['--rows' as string]: Math.max(1, rows.length) }}>
              {rows.map((rw, i) => (
                <div key={i} className="td-tl__row">
                  <span className="td-tl__who">
                    <span className="td-badge td-badge--round td-badge--sm tone-blue pp-tlday">
                      <I d={IC.cal2} size={13} />
                    </span>
                    <span>
                      <strong>{iso(rw.d) === todayIso ? 'Today' : short(rw.d)}</strong>
                      <small>{rw.d.toLocaleDateString('en-GB', { weekday: 'long' })}</small>
                    </span>
                  </span>
                  <div className="td-tl__track ">
                    {rw.segs.map((x, j) => (
                      <i
                        key={j}
                        className={`tone-${tone[x[0]]}`}
                        title={`${x[0]} · ${dashDur(x[2] - x[1]).replace(/^0h /, '')} (${dashClock(x[1])} – ${dashClock(x[2])})`}
                        style={{ left: `${x[1] / 14.4}%`, width: `${(x[2] - x[1]) / 14.4}%` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="td-tl__foot">
          <small>
            {period} · {v.plate}
          </small>
        </div>
      </div>
    </section>
  );
}

/* Odometer Summary: same KPI strip and bar chart; bars are this vehicle's km per day */
export function dashOdo(v: PV, r: Rnd) {
  const days = last7();
  const quiet = v.status === 'Yet to Transmit';
  const km = days.map(() => (quiet ? 0 : Math.round(20 + r() * 160)));
  const odo = parseInt(String(v.odometer).replace(/\D/g, ''), 10) || 0;
  const total = km.reduce((a, b) => a + b, 0);
  const lo = Math.min(...km);
  const hi = Math.max(...km);
  const nice = Math.max(10, Math.ceil((hi * 1.4) / 20) * 20);
  const W = 590;
  const n = km.length;
  const slot = W / n;
  const base = 202;
  const area = 166;
  const kpi: [string | number, string, string][] = [
    [odo ? odo.toLocaleString('en') : '—', 'Km', 'Total Odometer'],
    [Math.round(total / 7).toLocaleString('en'), 'Km', 'Avg. per Day (km)'],
    [lo, 'Km', 'Lowest Day'],
    [hi, 'Km', 'Highest Day'],
  ];
  return (
    <section className="td-card td-card--fixed  vs-odo" style={{ height: 400 }}>
      <DashHead k="odo" tone="brand" title="Odometer Summary" sub="Distance driven per day by this vehicle" period="Last 7 days" />
      <div className="td-card__body ">
        <div className="td-kpistrip">
          {kpi.map((k, i) => (
            <div key={i}>
              <span className="td-badge td-badge--round tone-green" dangerouslySetInnerHTML={html(DASH.kpi[i]!)} />
              <span>
                <strong>
                  {k[0]}
                  <em>{k[1]}</em>
                </strong>
                <small>{k[2]}</small>
              </span>
            </div>
          ))}
        </div>
        <div className="td-chart">
          <svg width="100%" height="244" viewBox={`0 0 ${W} 244`} preserveAspectRatio="none" role="img" aria-label="Odometer Summary">
            {km.map((x, i) => {
              const h = Math.max(14, (x / nice) * area);
              const top = base - h;
              const x0 = slot * i + 3;
              const x1 = slot * (i + 1) - 3;
              const cx = slot * i + slot / 2;
              const op = (0.45 + 0.55 * (hi ? x / hi : 0)).toFixed(2);
              return (
                <g key={i}>
                  <rect x={slot * i} y="36" width={slot} height="166" className="c-hit " />
                  <g>
                    <title>{`${short(days[i]!)}: ${x} km`}</title>
                    <path
                      d={`M${x0},${base}V${top + 6}Q${x0},${top} ${x0 + 6},${top}H${x1 - 6}Q${x1},${top} ${x1},${top + 6}V${base}Z`}
                      className="c-bar tone-green"
                      opacity={op}
                    />
                    <circle cx={cx} cy="202" r="4.25" className="c-basedot" fill="none" />
                    <circle cx={cx} cy="202" r="1.5" className="c-basedot__pip" fill="none" />
                    <text x={cx} y={top - 22} textAnchor="middle" className="c-val">
                      {x}
                    </text>
                    <g transform={`translate(${cx - 7.5} ${top - 19})`} className="c-marker" dangerouslySetInnerHTML={html(DASH.marker)} />
                  </g>
                  <text x={cx} y="219" textAnchor="middle" className="c-cat">
                    {i === n - 1 ? 'Today' : short(days[i]!)}
                  </text>
                </g>
              );
            })}
            <line x1="0" x2={W} y1="202" y2="202" className="c-axis" />
          </svg>
        </div>
        <p className="td-chart__xtitle">Distance per Day (km) · {total.toLocaleString('en')} km this week</p>
      </div>
    </section>
  );
}

/* Speedometer Summary: same ranges bar list; counts are this vehicle's trips by top speed */
export function dashSpeed(v: PV, r: Rnd) {
  const ranges = ['0-20', '20-40', '40-60', '60-80', '80-100', '100-120', '120+'];
  const quiet = v.status === 'Yet to Transmit';
  const n = ranges.map((_, i) => (quiet ? 0 : Math.max(0, Math.round((i < 2 ? 1 : i < 5 ? 4 : 1.2) * r() * 3))));
  const mx = Math.max(...n, 1);
  return (
    <section className="td-card td-card--fixed  vs-speed" style={{ height: 400 }}>
      <DashHead k="speed" tone="orange" title="Speedometer Summary" sub="Trips of this vehicle by speed ranges" period="Last 7 days" />
      <div className="td-card__body ">
        <h3 className="td-subhead td-subhead--lg">Trips by Highest Recorded Speed (km/h)</h3>
        <div className="td-hbars">
          <div className="td-hbars__axis" aria-hidden="true">
            <span>Lower Speed</span>
            <i />
            <span>Higher Speed</span>
          </div>
          <ul>
            {ranges.map((x, i) => (
              <li key={x} title={`${x} km/h: ${n[i]} trip${n[i] === 1 ? '' : 's'}`}>
                <span className="td-hbars__label">{x}</span>
                <span className="td-badge td-badge--round td-badge--sm tone-orange" dangerouslySetInnerHTML={html(DASH.hbadge)} />
                <span className="td-hbars__track">
                  <i style={{ width: `${(n[i]! / mx) * 100}%` }} />
                </span>
                <b>{n[i]}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* Top Drivers: same ranking table; the operators who drove this vehicle */
export function dashDrivers(v: PV, r: Rnd) {
  const pool = ['Shiju V', 'Yousef Saleh', 'Omar Haddad', 'Murugan S', 'Prakash P', 'Bilal Rahman', 'Mohammed Farook'];
  const names: string[] = [];
  if (hasDriver(v)) names.push(v.operator);
  while (names.length < 3) {
    const p = pool[Math.floor(r() * pool.length)]!;
    if (names.indexOf(p) < 0) names.push(p);
  }
  const rows = names
    .map((nm, i) => {
      const s = 78 + Math.floor(r() * 21);
      return {
        nm,
        id: i === 0 && hasDriver(v) ? opId(v) : 'TAG-10' + (10 + Math.floor(r() * 80)),
        min: (i === 0 ? 900 : 120) + Math.floor(r() * 600),
        hb: Math.floor(r() * 3),
        os: Math.floor(r() * 3),
        s,
      };
    })
    .sort((a, b) => b.s - a.s);
  const tag = (s: number) => (s >= 95 ? 'Excellent' : s >= 90 ? 'Very Good' : s >= 80 ? 'Good' : 'Needs Review');
  return (
    <section className="td-card td-card--fixed  vs-rank" style={{ height: 380 }}>
      <DashHead
        k="drivers"
        tone="blue"
        title="Operator Performance"
        sub={`Operators who drove ${v.plate}, ranked by safety score`}
        period="Last 7 days"
      />
      <div className="td-card__body ">
        <div className="td-table-wrap td-rank-scroll">
          <table className="td-table td-rank-table">
            <thead>
              <tr>
                <th className="center">Rank</th>
                <th className="">Driver Details</th>
                <th className="center">Driving Hours</th>
                <th className="center">Harsh Braking</th>
                <th className="center">Overspeed</th>
                <th className="center">Safety Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x, i) => {
                const ini = x.nm
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <tr key={x.nm}>
                    <td className="center">
                      {MEDALS[i] ? <img src={MEDALS[i]} alt={`Rank ${i + 1}`} width="30" height="30" /> : i + 1}
                    </td>
                    <td className="">
                      <span className="td-entity">
                        <span className="td-avatar tone-green" style={{ width: 38, height: 38, fontSize: 13.68 }}>
                          {ini}
                        </span>
                        <span>
                          <strong>{x.nm}</strong>
                          <small>ID: {x.id}</small>
                        </span>
                      </span>
                    </td>
                    <td className="center">
                      <span>{dashDur(x.min)}</span>
                    </td>
                    <td className="center">
                      <span>{x.hb}</span>
                    </td>
                    <td className="center">
                      <span>{x.os}</span>
                    </td>
                    <td className="center">
                      <span className="td-score">
                        <b>{x.s}%</b>
                        <em className="td-tag tone-green">{tag(x.s)}</em>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
