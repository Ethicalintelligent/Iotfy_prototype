// IT-0055. Vehicle Report popup (prototype openReport): vehicle, report type (with description),
// From / To, presets with the 7-day limit, Reset, Generate; the result: Activity summary head, seven
// KPI cards, the Dashboard's Activity Timeline card (full width, the report's days), then the data
// grid. Figures are the prototype's seeded demo data (labelled).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { dashActivity } from './dash';
import { DataGrid, type GridRow } from './DataGrid';
import { Frame, type PopupKind } from './Frame';
import { I, IC, addDays, clock12, fmtDay, fmtLong, hm, iso, rng, useToast, type PV } from './kit';

type RType = 'activity' | 'trips' | 'stops' | 'overspeed' | 'idle';
const RTYPES: Record<RType, { n: string; d: string; cols: string[] }> = {
  activity: {
    n: 'Activity summary',
    d: 'Trips, distance, running, idle and stop time per day, from the position history',
    cols: ['Date', 'Trips', 'Distance', 'Running', 'Idle', 'Stopped', 'Max speed'],
  },
  trips: {
    n: 'Trip report',
    d: 'Every trip with start and end time, places, distance and duration',
    cols: ['Date', 'Start', 'End', 'From', 'To', 'Distance', 'Duration'],
  },
  stops: {
    n: 'Stoppage report',
    d: 'Every stop longer than 5 minutes with place and duration',
    cols: ['Date', 'Stopped at', 'Resumed at', 'Duration', 'Location'],
  },
  overspeed: {
    n: 'Overspeed report',
    d: 'Every time the vehicle went over the speed limit',
    cols: ['Date', 'Time', 'Speed', 'Limit', 'Location'],
  },
  idle: {
    n: 'Idle report',
    d: 'Engine on without moving, with place and duration',
    cols: ['Date', 'Idle from', 'Idle to', 'Duration', 'Location'],
  },
};
const PLACES = [
  'Olaya St, Al Olaya',
  'King Fahd Rd, Al Muruj',
  'Industrial Area 2',
  'Al Malaz',
  'Exit 18, Eastern Ring Rd',
  'Al Sulay Depot',
  'Takhassusi St',
  'King Abdullah Rd',
  'Al Naseem',
  'Riyadh Dry Port',
];
const PRESETS: [string, string, boolean?][] = [
  ['today', 'Today'],
  ['yest', 'Yesterday'],
  ['l7', 'Last 7 days'],
  ['tw', 'This week'],
  ['lw', 'Last week'],
  ['tm', 'This month', true],
  ['lm', 'Last month', true],
  ['l30', 'Last 30 days', true],
  ['custom', 'Custom'],
];
const hmShort = (m: number) => {
  m = Math.round(m);
  const h = Math.floor(m / 60);
  return (h ? h + 'h ' : '') + (m % 60) + 'm';
};
const dayOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

interface Result {
  v: PV;
  type: RType;
  from: Date;
  to: Date;
  body: ReactNode;
  grid: { cols: string[]; rows: GridRow[] };
}

function build(v: PV, type: RType, from: Date, to: Date): Result {
  const r = rng(v.plate + type + iso(from) + iso(to));
  const quiet = v.status === 'Yet to Transmit';
  const days: { d: Date; km: number; run: number; idle: number; stop: number; trips: number; max: number }[] = [];
  for (let dd = from; dd <= to; dd = addDays(dd, 1)) {
    const run = quiet ? 0 : 60 + r() * 300;
    const idle = quiet ? 0 : 10 + r() * 50;
    days.push({
      d: dd,
      km: (run / 60) * (30 + r() * 15),
      run,
      idle,
      stop: 1440 - run - idle,
      trips: quiet ? 0 : 1 + Math.floor(r() * 6),
      max: quiet ? 0 : 70 + Math.floor(r() * 60),
    });
  }
  const tot = days.reduce(
    (a, x) => ({ km: a.km + x.km, run: a.run + x.run, idle: a.idle + x.idle, trips: a.trips + x.trips, max: Math.max(a.max, x.max) }),
    { km: 0, run: 0, idle: 0, trips: 0, max: 0 },
  );
  let grid: Result['grid'];
  if (type === 'activity') {
    grid = {
      cols: ['Day', 'Distance (km)', 'Trips', 'First start', 'Running', 'Idle', 'Stopped', 'Max speed (km/h)', 'Avg speed (km/h)'],
      rows: days.map((x) => {
        const fs0 = x.trips ? 300 + Math.floor(r() * 240) : null;
        const avg = x.run ? x.km / (x.run / 60) : 0;
        const c = [
          x.d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          x.km.toFixed(1),
          String(x.trips),
          fs0 == null ? '—' : clock12(fs0),
          hmShort(x.run),
          hmShort(x.idle),
          hmShort(x.stop),
          String(x.max),
          String(Math.round(avg)),
        ];
        return { c, t: c, k: [+x.d, x.km, x.trips, fs0 == null ? -1 : fs0, x.run, x.idle, x.stop, x.max, avg] };
      }),
    };
  } else {
    const rows: { c: ReactNode[]; t: string[] }[] = [];
    const n = quiet ? 0 : days.length * (type === 'overspeed' ? 1 : 2);
    for (let i = 0; i < n; i++) {
      const day = days[Math.floor(i / (n / days.length))]!.d;
      const t0 = 6 * 60 + Math.floor(r() * 660);
      const du = 8 + Math.floor(r() * 80);
      const pl = PLACES[Math.floor(r() * 10)]!;
      if (type === 'trips') {
        const t = [fmtDay(day), clock12(t0), clock12(t0 + du), pl, PLACES[Math.floor(r() * 10)]!, (4 + r() * 40).toFixed(1) + ' km', hm(du)];
        rows.push({ c: t, t });
      } else if (type === 'overspeed') {
        const sp = 122 + Math.floor(r() * 30);
        const t = [fmtDay(day), clock12(t0), sp + ' km/h', '120 km/h', pl];
        rows.push({ c: [t[0], t[1], <b key="s" style={{ color: '#E0161B' }}>{t[2]}</b>, t[3], t[4]], t });
      } else {
        const t = [fmtDay(day), clock12(t0), clock12(t0 + du), hm(du), pl];
        rows.push({ c: t, t });
      }
    }
    grid = {
      cols: RTYPES[type].cols,
      rows: rows.map((rw) => ({
        ...rw,
        k: rw.t.map((x) => {
          const num = parseFloat(x);
          return isNaN(num) || /[a-z]{3,}/i.test(x.replace(/km\/h|km/g, '')) ? x : num;
        }),
      })),
    };
  }
  const kpi = (l: string, val: string | number) => (
    <div key={l} className="pp-kpi">
      <span>{l}</span>
      <b>{val}</b>
    </div>
  );
  const period = fmtLong(from) + (iso(from) === iso(to) ? '' : ' – ' + fmtLong(to));
  const body = (
    <>
      <div className="pp-kpis">
        {kpi('Distance', tot.km.toFixed(1) + ' km')}
        {kpi('Trips', tot.trips)}
        {kpi('Running', hm(tot.run))}
        {kpi('Idle', hm(tot.idle))}
        {kpi('Stopped', hm(days.reduce((a, x) => a + x.stop, 0)))}
        {kpi('Max speed', tot.max + ' km/h')}
        {kpi('Active days', days.filter((x) => x.trips > 0).length + ' / ' + days.length)}
      </div>
      <div className="st-dash pp-dash rg-tl">
        {dashActivity(v, rng(v.plate + 'rtl' + iso(from) + iso(to)), {
          days: days.map((x) => x.d).reverse(),
          title: 'Activity Timeline',
          sub: 'Running, stopped, idle and overspeed through each day',
          period,
        })}
      </div>
    </>
  );
  return { v, type, from, to, body, grid };
}

export function ReportPopup({
  v: start,
  all,
  onNav,
  onClose,
}: {
  v: PV;
  all: PV[];
  onNav: (k: PopupKind, v: PV) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const today = dayOnly(new Date());
  const [v, setV] = useState(start);
  const [type, setType] = useState<RType>('activity');
  const [from, setFrom] = useState(() => addDays(today, -6));
  const [to, setTo] = useState(today);
  const [preset, setPreset] = useState('l7');
  const [out, setOut] = useState<null | 'loading' | Result>(null);
  const [shown, setShown] = useState<Result | null>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const timer = useRef(0);

  const generate = (gv = v, gt = type, gf = from, gto = to) => {
    window.clearTimeout(timer.current);
    setShown(build(gv, gt, gf, gto));
    setOut('loading');
    timer.current = window.setTimeout(() => setOut(build(gv, gt, gf, gto)), 1100);
  };
  useEffect(() => {
    generate();
    return () => window.clearTimeout(timer.current);
    // generate once on open, as the prototype
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (p: string) => {
    setPreset(p);
    const d = dayOnly(new Date());
    const dow = (d.getDay() + 6) % 7;
    if (p === 'today') {
      setFrom(d);
      setTo(d);
    } else if (p === 'yest') {
      setFrom(addDays(d, -1));
      setTo(addDays(d, -1));
    } else if (p === 'l7') {
      setFrom(addDays(d, -6));
      setTo(d);
    } else if (p === 'tw') {
      setFrom(addDays(d, -dow));
      setTo(d);
    } else if (p === 'lw') {
      setFrom(addDays(d, -dow - 7));
      setTo(addDays(d, -dow - 1));
    } else if (p === 'custom') fromRef.current?.focus();
  };
  const onDate = (fv: string, tv: string) => {
    const f = new Date(fv + 'T00:00');
    let t = new Date(tv + 'T00:00');
    if (isNaN(+f) || isNaN(+t)) return;
    if ((+t - +f) / 864e5 > 6) {
      t = addDays(f, 6);
      toast('Up to 7 days per report');
    }
    if (t < f) t = f;
    setFrom(f);
    setTo(t);
    setPreset('custom');
  };
  const n = Math.round((+to - +from) / 864e5) + 1;
  const res = out && out !== 'loading' ? out : shown;
  const head = res && (
    <div className="pp-rhead">
      <span style={{ color: '#0E7F5E' }}>
        <I d={IC.activity} size={28} />
      </span>
      <div>
        <b>{RTYPES[res.type].n}</b>
        <small>{res.v.plate}</small>
      </div>
      <span className="pp-dpill">
        <I d={IC.cal2} size={15} />
        {fmtLong(res.from) + (iso(res.from) === iso(res.to) ? '' : ' – ' + fmtLong(res.to))}
      </span>
    </div>
  );

  return (
    <Frame
      kind="report"
      head={start}
      navV={v}
      icon={<I d={IC.filechart} size={14} />}
      title="Vehicle Report"
      onNav={onNav}
      onClose={onClose}
    >
      <div className="pp-card" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: 18 }}>
          <div>
            <span className="pp-lbl">
              Vehicle <i>*</i>
            </span>
            <div className="pp-dd">
              <I d={IC.truck} />
              <span className="pp-vsel">{v.plate}</span>
              <span className="ch">
                <I d={IC.chev} size={15} />
              </span>
              <select
                className="pp-vselect"
                value={v.plate}
                onChange={(e) => setV(all.find((x) => x.plate === e.target.value) ?? v)}
              >
                {all.map((x) => (
                  <option key={x.id} value={x.plate}>
                    {x.name} · {x.plate}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <span className="pp-lbl">
              Report type <i>*</i>
            </span>
            <div className="pp-dd">
              <I d={IC.activity} />
              <span className="pp-tsel">{RTYPES[type].n}</span>
              <span className="ch">
                <I d={IC.chev} size={15} />
              </span>
              <select className="pp-tselect" value={type} onChange={(e) => setType(e.target.value as RType)}>
                {(Object.keys(RTYPES) as RType[]).map((k) => (
                  <option key={k} value={k}>
                    {RTYPES[k].n}
                  </option>
                ))}
              </select>
            </div>
            <div className="pp-tdesc" style={{ color: '#4E5A6B', marginTop: 8, lineHeight: 1.45 }}>
              {RTYPES[type].d}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span className="pp-lbl">From</span>
              <input ref={fromRef} className="pp-date pp-from" type="date" value={iso(from)} onChange={(e) => onDate(e.target.value, iso(to))} />
            </div>
            <div>
              <span className="pp-lbl">To</span>
              <input className="pp-date pp-to" type="date" value={iso(to)} onChange={(e) => onDate(iso(from), e.target.value)} />
            </div>
          </div>
        </div>
        <div className="pp-presets">
          <I d={IC.cal2} />
          {PRESETS.map(([k, l, off]) => (
            <button
              key={k}
              type="button"
              data-p={k}
              className={k === preset ? 'on' : ''}
              disabled={off}
              title={off ? 'Longer than the 7-day limit' : undefined}
              onClick={() => pick(k)}
            >
              {l}
            </button>
          ))}
          <span className="pp-days">
            {n} day{n > 1 ? 's' : ''} · max 7
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #EEF0F2', marginTop: 16, paddingTop: 16 }}>
          <span style={{ color: '#4E5A6B' }}>Reports are logged for audit each time they run.</span>
          <button
            type="button"
            className="pp-btn out pp-reset"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              setType('activity');
              pick('l7');
              window.clearTimeout(timer.current);
              setOut(null);
              setShown(null);
            }}
          >
            <I d={IC.reset} />
            Reset
          </button>
          <button type="button" className="pp-btn dark pp-gen" onClick={() => generate()}>
            <I d={IC.search} />
            Generate report
          </button>
        </div>
      </div>
      <div className="pp-out" style={{ marginTop: 6 }}>
        {out === 'loading' && (
          <>
            {head}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#4E5A6B', fontSize: 13.5, padding: '46px 0' }}>
              <span style={{ animation: 'ppS 1s linear infinite', color: '#6B7685' }}>
                <I d={IC.spin} size={20} />
              </span>
              Reading the position history...
            </div>
          </>
        )}
        {out && out !== 'loading' && (
          <>
            {head}
            {out.body}
            <DataGrid key={out.type + iso(out.from) + iso(out.to) + out.v.plate} title={RTYPES[out.type].n} cols={out.grid.cols} rows={out.grid.rows} />
          </>
        )}
      </div>
    </Frame>
  );
}
