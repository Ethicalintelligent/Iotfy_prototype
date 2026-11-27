// IT-0055 (Heeba's approved prototype): the History Filter's ONE date field, under the Date toggle,
// for every mode. Today / Yesterday / Last 7 days: it shows the period and is disabled. Custom: it
// opens one compact calendar dropdown (From Date | To Date, From Time | To Time in 15-minute steps,
// a Monday-first month, no future days, at most 7 days) under the field (above it, or moved up, when
// there is no room). Done sets the filter's From / To. Styles: .hf-* in it0055.css.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const pad = (n: number) => (n < 10 ? '0' : '') + n;
const parseDay = (s: string) => {
  const [y = 1970, m = 1, d = 1] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDay = (d: Date) => `${pad(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const clock12 = (hm: string) => {
  const h = +hm.slice(0, 2),
    m = hm.slice(3, 5);
  return `${pad(h % 12 || 12)}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
};

/** "21 Nov – 27 Nov 2026 · 12:00 AM – 04:12 PM" (the year once when both dates are in one year). */
export function periodText(fromDay: string, toDay: string, ft: string, tt: string) {
  const f = parseDay(fromDay),
    t = parseDay(toDay),
    same = fromDay === toDay,
    f1 = f.getFullYear() === t.getFullYear() ? fmtDay(f).slice(0, -5) : fmtDay(f);
  return `${same ? fmtDay(f) : `${f1} – ${fmtDay(t)}`} · ${clock12(ft)} – ${clock12(tt)}`;
}

const Svg = ({ s, children }: { s: number; children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width={s}
    height={s}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', flex: 'none' }}
    aria-hidden="true"
  >
    {children}
  </svg>
);
const Cal = ({ s }: { s: number }) => (
  <Svg s={s}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Svg>
);
const Chev = ({ s }: { s: number }) => (
  <Svg s={s}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
const Clock = () => (
  <Svg s={14}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Svg>
);

function timeOptions(sel: string) {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 15) out.push(`${pad(h)}:${pad(m)}`);
  if (!out.includes(sel)) out.push(sel);
  return out;
}

type St = {
  from: Date;
  to: Date;
  ft: string;
  tt: string;
  which: 'from' | 'to';
  view: Date;
  picks: number;
};

export function HistoryDateField({
  custom,
  fromDay,
  toDay,
  fromTime,
  toTime,
  today,
  maxDays = 7,
  onDone,
}: {
  custom: boolean;
  fromDay: string;
  toDay: string;
  fromTime: string;
  toTime: string;
  today: string;
  maxDays?: number;
  onDone: (fd: string, ft: string, td: string, tt: string) => void;
}) {
  const [st, setSt] = useState<St | null>(null),
    wrap = useRef<HTMLDivElement>(null),
    pop = useRef<HTMLDivElement>(null),
    text = periodText(fromDay, toDay, fromTime, toTime),
    todayD = parseDay(today);
  useEffect(() => {
    if (!custom) setSt(null);
  }, [custom]);
  // A click outside the dropdown (and its field) or Esc closes it.
  const isOpen = !!st;
  useEffect(() => {
    if (!isOpen) return;
    const down = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setSt(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSt(null);
    };
    document.addEventListener('mousedown', down, true);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down, true);
      document.removeEventListener('keydown', key);
    };
  }, [isOpen]);
  // Under the field; above it when there is no room below; else moved up to stay on screen.
  useLayoutEffect(() => {
    const p = pop.current,
      w = wrap.current;
    if (!p || !w) return;
    p.style.top = '';
    p.style.bottom = '';
    const r = w.getBoundingClientRect(),
      zoom = r.height / (w.offsetHeight || 1) || 1,
      h = p.getBoundingClientRect().height,
      vh = window.innerHeight;
    if (r.bottom + 4 * zoom + h > vh - 8) {
      if (r.top - 4 * zoom - h >= 8) {
        p.style.top = 'auto';
        p.style.bottom = 'calc(100% + 4px)';
      } else p.style.top = `${(Math.max(8, vh - 8 - h) - r.top) / zoom}px`;
    }
  }, [st]);
  const open = () => {
    const f = parseDay(fromDay),
      t = parseDay(toDay);
    setSt({
      from: f,
      to: t,
      ft: fromTime,
      tt: toTime,
      which: 'from',
      view: new Date(t.getFullYear(), t.getMonth(), 1),
      picks: 0,
    });
  };
  let body = null;
  if (st) {
    const s = st,
      set = (p: Partial<St>) => setSt({ ...s, ...p }),
      y = s.view.getFullYear(),
      mo = s.view.getMonth(),
      lead = (new Date(y, mo, 1).getDay() + 6) % 7,
      n = new Date(y, mo + 1, 0).getDate(),
      span = maxDays - 1,
      maxTo = s.picks === 1 ? addDays(s.from, span) : null,
      minTo = s.picks === 1 ? addDays(s.from, -span) : null,
      cells: ReactNode[] = [];
    for (let i = 0; i < lead; i++) cells.push(<span key={`b${i}`} />);
    for (let d = 1; d <= n; d++) {
      const dt = new Date(y, mo, d),
        iso = isoDay(dt),
        off = dt > todayD || (!!maxTo && (dt > maxTo || dt < minTo!)),
        isF = iso === isoDay(s.from),
        isT = iso === isoDay(s.to),
        inR = dt > s.from && dt < s.to;
      cells.push(
        <button
          key={iso}
          type="button"
          data-d={iso}
          disabled={off}
          className={`${isF || isT ? 'sel ' : ''}${inR ? 'in ' : ''}${iso === today ? 'now' : ''}`}
          onClick={() => {
            if (s.which === 'to' && s.picks === 0) {
              let from = s.from,
                to = dt;
              if (dt < from) {
                to = from;
                from = dt;
              }
              if ((to.getTime() - from.getTime()) / 864e5 > span) from = addDays(to, -span);
              set({ from, to });
            } else if (s.picks === 0) set({ from: dt, to: dt, picks: 1, which: 'to' });
            else if (dt < s.from) set({ from: dt, to: s.from, picks: 0 });
            else set({ to: dt, picks: 0 });
          }}
        >
          {d}
        </button>,
      );
    }
    const nextOff = new Date(y, mo + 1, 1) > todayD,
      days = Math.round((s.to.getTime() - s.from.getTime()) / 864e5) + 1,
      label = (w: 'from' | 'to', title: string, d: Date) => (
        <label
          className={s.which === w ? 'on' : ''}
          onClick={() => {
            const base = w === 'from' ? s.from : s.to;
            set({ which: w, view: new Date(base.getFullYear(), base.getMonth(), 1) });
          }}
        >
          <span>{title}</span>
          <b>
            <Cal s={14} />
            {fmtDay(d)}
          </b>
        </label>
      ),
      time = (title: string, v: string, k: 'ft' | 'tt') => (
        <label>
          <span>{title}</span>
          <div className="hf-sel">
            <Clock />
            <span className="hf-tv">{clock12(v)}</span>
            <select
              value={v}
              aria-label={title}
              onChange={(e) => set(k === 'ft' ? { ft: e.target.value } : { tt: e.target.value })}
            >
              {timeOptions(v).map((o) => (
                <option key={o} value={o}>
                  {clock12(o)}
                </option>
              ))}
            </select>
            <Chev s={13} />
          </div>
        </label>
      );
    body = (
      <div ref={pop} className="hf-pop" role="dialog" aria-label="Choose dates">
        <div className="hf-row">
          {label('from', 'From Date', s.from)}
          {label('to', 'To Date', s.to)}
        </div>
        <div className="hf-row">
          {time('From Time', s.ft, 'ft')}
          {time('To Time', s.tt, 'tt')}
        </div>
        <div className="hf-cal">
          <div className="hf-mh">
            <button
              type="button"
              className="hf-nav"
              aria-label="Previous month"
              onClick={() => set({ view: new Date(y, mo - 1, 1) })}
            >
              <Svg s={14}>
                <path d="m15 18-6-6 6-6" />
              </Svg>
            </button>
            <b>
              {MONL[mo]} {y}
            </b>
            <button
              type="button"
              className="hf-nav"
              aria-label="Next month"
              disabled={nextOff}
              onClick={() => set({ view: new Date(y, mo + 1, 1) })}
            >
              <Svg s={14}>
                <path d="m9 18 6-6-6-6" />
              </Svg>
            </button>
          </div>
          <div className="hf-wk">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="hf-days">{cells}</div>
        </div>
        <div className="hf-foot">
          <small>
            {s.picks === 1
              ? `Pick the end date (up to ${maxDays} days)`
              : days === 1
                ? 'Single date · pick another for a range'
                : `${days} days selected`}
          </small>
          <button
            type="button"
            className="hf-clear"
            onClick={() =>
              set({
                from: new Date(todayD),
                to: new Date(todayD),
                ft: '00:00',
                tt: '23:59',
                picks: 0,
                which: 'from',
                view: new Date(todayD.getFullYear(), todayD.getMonth(), 1),
              })
            }
          >
            Clear
          </button>
          <button
            type="button"
            className="hf-done"
            onClick={() => {
              setSt(null);
              onDone(isoDay(s.from), s.ft, isoDay(s.to), s.tt);
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }
  return (
    <div ref={wrap} className="hf-wrap">
      <button
        type="button"
        className={`hf-field ${st ? 'open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={!!st}
        disabled={!custom}
        title={custom ? 'Choose the dates' : 'Pick Custom to change the dates'}
        onClick={() => (st ? setSt(null) : open())}
      >
        <Cal s={15} />
        <span>{text}</span>
        <Chev s={14} />
      </button>
      {body}
    </div>
  );
}
