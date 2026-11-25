// IT-0036. Controls of the overview's Track History view, inline styles as in the original:
// the History Filter form (WU, with its time picker Dx), its floating pop-up (UU/Iq), the
// map filter button (Mq) and the playback buttons beside the map (s9).
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { usePortalRoot } from '../smart-track/kit';
import { BTN_ICONS, FONT, MapButton, SIZES } from './map';

export const STATUSES = ['Stopped', 'Idle', 'Running', 'Overspeed', 'Towed'];
const STOP_OPTIONS = ['3', '5', '10', '15', '20', '30', '60'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GRAD = 'var(--eit-active-gradient)';
const LINE = 'inset 0 0 0 1px #E3E6EA';
const FOCUS = 'inset 0 0 0 1.5px #03AD86';
const SOFT = 'inset 0 0 0 1px #D7D8DB';
const FIELD_BG = '#F9F9FB';
const POP_SHADOW = '0 12px 32px rgba(1,29,50,.18), inset 0 0 0 1px #E9ECEF';
const pad = (n: number) => String(n).padStart(2, '0');
const localIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const daysFromNow = (n: number, h: number, m: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d;
};
const dayText = (v: string) => {
  const [y, m, d] = v.slice(0, 10).split('-').map(Number);
  return y && m && d ? `${pad(d)} ${MONTHS[m - 1]} ${y}` : v;
};
const shift = (day: string, n: number) => {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
};
const spanDays = (a: string, b: string) => {
  const [y1 = 1970, m1 = 1, d1 = 1] = a.split('-').map(Number);
  const [y2 = 1970, m2 = 1, d2 = 1] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5) + 1;
};

export interface FilterValue {
  mode: 'today' | 'yesterday' | 'custom';
  from: string;
  to: string;
  stopLimit: string;
  statuses: string[];
  trip: string;
  operators?: string[];
}
const fallback = (): FilterValue => ({
  mode: 'custom',
  from: localIso(daysFromNow(-2, 8, 9)),
  to: localIso(daysFromNow(0, 20, 9)),
  stopLimit: '10',
  statuses: ['Stopped', 'Running', 'Overspeed'],
  trip: '',
});

function Svg({
  s,
  w = 2,
  style,
  children,
}: {
  s: number;
  w?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={s}
      height={s}
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
const Cal = ({ s = 13 }: { s?: number }) => (
  <Svg s={s}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Svg>
);
const Chevron = ({ open, color = '#6B7685' }: { open?: boolean; color?: string }) => (
  <span style={{ color, display: 'block' }}>
    <Svg s={11} w={2.6} style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  </span>
);
const Badge = ({ children }: { children: ReactNode }) => (
  <span
    style={{
      width: 28,
      height: 28,
      borderRadius: 8,
      background: '#E6F5EF',
      color: '#0B9467',
      display: 'grid',
      placeItems: 'center',
      flexShrink: 0,
    }}
  >
    {children}
  </span>
);
const Box = ({ state }: { state: 'on' | 'off' | 'some' }) => (
  <span
    style={{
      width: 18,
      height: 18,
      flexShrink: 0,
      boxSizing: 'border-box',
      borderRadius: 6,
      display: 'grid',
      placeItems: 'center',
      background: state === 'off' ? '#fff' : GRAD,
      boxShadow: state === 'off' ? 'inset 0 0 0 1.5px #D7D8DB' : 'none',
      color: '#fff',
      textShadow: '0 1px 2px rgba(1,29,50,.35)',
    }}
  >
    {state === 'on' && (
      <Svg s={12} w={2.5}>
        <path d="M20 6 9 17l-5-5" />
      </Svg>
    )}
    {state === 'some' && (
      <span style={{ width: 9, height: 2.5, borderRadius: 2, background: '#fff' }} />
    )}
  </span>
);
const Row = ({
  icon,
  label,
  children,
  top = 9,
  h = 29,
}: {
  icon: ReactNode;
  label: string;
  children?: ReactNode;
  top?: number;
  h?: number;
}) => (
  <div style={{ marginTop: top, height: h, display: 'flex', alignItems: 'center', gap: 10 }}>
    <Badge>{icon}</Badge>
    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
    {children}
  </div>
);

function TimePick({
  value,
  onChange,
  open,
  onToggle,
  error,
  align,
}: {
  value: string;
  onChange: (v: string) => void;
  open: boolean;
  onToggle: () => void;
  error: boolean;
  align: 'left' | 'right';
}) {
  const [h = 0, m = 0] = (value || '00:00').split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const set = (hh: number, mm: number, a: string) =>
    onChange(`${pad((hh % 12) + (a === 'PM' ? 12 : 0))}:${pad(mm)}`);
  const cell = (label: string, on: boolean, click: () => void) => (
    <button
      key={label}
      type="button"
      onClick={click}
      style={{
        height: 26,
        flexShrink: 0,
        border: 'none',
        borderRadius: 6,
        background: on ? GRAD : 'transparent',
        boxShadow: on ? FOCUS : 'none',
        color: on ? '#fff' : '#0B1B2B',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: on ? 700 : 500,
        cursor: 'pointer',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {label}
    </button>
  );
  const col = (children: ReactNode) => (
    <div
      style={{
        maxHeight: 150,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {children}
    </div>
  );
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 34,
          padding: '0 10px',
          boxSizing: 'border-box',
          border: 'none',
          borderRadius: 8,
          background: '#fff',
          boxShadow: open ? FOCUS : error ? 'inset 0 0 0 1.5px #D92D20' : LINE,
          fontFamily: 'inherit',
          fontSize: 12,
          fontWeight: 600,
          color: '#0B1B2B',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ color: '#6B7685' }}>
          <Svg s={13}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </Svg>
        </span>
        <span
          style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
        >
          {pad(h12)}:{pad(m)} {ap}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            [align]: 0,
            top: 'calc(100% + 4px)',
            zIndex: 12,
            width: 168,
            boxSizing: 'border-box',
            padding: 6,
            borderRadius: 10,
            background: '#fff',
            boxShadow: POP_SHADOW,
            display: 'grid',
            gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
            gap: 4,
          }}
        >
          {col(
            Array.from({ length: 12 }, (_, i) => i + 1).map((x) =>
              cell(pad(x), x === h12, () => set(x, m, ap)),
            ),
          )}
          {col(
            Array.from({ length: 60 }, (_, i) => i).map((x) =>
              cell(pad(x), x === m, () => set(h12, x, ap)),
            ),
          )}
          {col(['AM', 'PM'].map((x) => cell(x, x === ap, () => set(h12, m, x))))}
        </div>
      )}
    </div>
  );
}

interface CalState {
  y: number;
  m: number;
  from: string;
  to: string;
  fromT: string;
  toT: string;
}

/** The overview's History Filter form (original: WU). */
export function HistoryFilterForm({
  value,
  today,
  maxDays,
  defaultValue,
  operators,
  onApply,
  onDismiss,
}: {
  value: FilterValue;
  today: string;
  maxDays: number;
  defaultValue: FilterValue;
  operators?: string[];
  onApply: (v: FilterValue) => void;
  onDismiss: () => void;
}) {
  const [v, setV] = useState<FilterValue>(() => ({ ...fallback(), ...value }));
  const patch = (p: Partial<FilterValue>) => setV((x) => ({ ...x, ...p }));
  const [cal, setCal] = useState<CalState | null>(null);
  const [timeOpen, setTimeOpen] = useState<'from' | 'to' | null>(null);
  const [stopOpen, setStopOpen] = useState(false);
  const [opOpen, setOpOpen] = useState(false);
  const [opQ, setOpQ] = useState('');
  const fixed = v.mode !== 'custom';
  const tooLong = (a?: string, b?: string) =>
    !!maxDays && !!a && !!b && spanDays(a.slice(0, 10), b.slice(0, 10)) > maxDays;
  const error =
    !v.from || !v.to
      ? 'Select both From and To.'
      : v.to < v.from
        ? 'To cannot be earlier than From.'
        : tooLong(v.from, v.to)
          ? `Pick at most ${maxDays} days.`
          : '';
  const W = 185;
  const day = (n: number) => shift(today, n);
  const pickMode = (mode: FilterValue['mode']) => {
    patch(
      mode === 'today'
        ? { mode, from: `${day(0)}T00:00`, to: `${day(0)}T23:59`, trip: '' }
        : mode === 'yesterday'
          ? { mode, from: `${day(-1)}T00:00`, to: `${day(-1)}T23:59`, trip: '' }
          : { mode },
    );
    setCal(null);
  };
  const toggleCal = () => {
    if (cal) {
      setCal(null);
      setTimeOpen(null);
      return;
    }
    const f = v.from.slice(0, 10);
    const t = v.to.slice(0, 10);
    const [y = 1970, m = 1] = (t || f).split('-').map(Number);
    setCal({
      y,
      m: m - 1,
      from: f,
      to: t,
      fromT: v.from.slice(11, 16) || '00:00',
      toT: v.to.slice(11, 16) || '23:59',
    });
    setStopOpen(false);
    setOpOpen(false);
  };
  const pickDay = (d: string) =>
    setCal(
      (c) =>
        c &&
        (!c.from || c.from !== c.to || d === c.from
          ? { ...c, from: d, to: d }
          : d < c.from
            ? { ...c, from: d }
            : { ...c, to: d }),
    );
  const month = (n: number) =>
    setCal((c) => {
      if (!c) return c;
      const d = new Date(c.y, c.m + n, 1);
      return { ...c, y: d.getFullYear(), m: d.getMonth() };
    });
  const done = () => {
    if (cal && cal.from)
      patch({
        from: `${cal.from}T${cal.fromT || '00:00'}`,
        to: `${cal.to || cal.from}T${cal.toT || '23:59'}`,
        trip: '',
      });
    setCal(null);
    setTimeOpen(null);
  };
  const f0 = v.from.slice(0, 10);
  const t0 = v.to.slice(0, 10);
  const rangeText = f0 === t0 ? dayText(f0) : `${dayText(f0)} – ${dayText(t0)}`;

  let calendar: ReactNode = null;
  if (cal) {
    const first = new Date(cal.y, cal.m, 1);
    const lead = (first.getDay() + 6) % 7;
    const len = new Date(cal.y, cal.m + 1, 0).getDate();
    const { from, to } = cal;
    const single = !!from && from === to;
    const focus = from && !single ? 'none' : single ? 'to' : 'from';
    const badTime = !!from && (!to || to === from) && cal.toT < cal.fromT;
    const long = tooLong(from, to);
    const cells: ReactNode[] = [];
    for (let i = 0; i < lead; i++) cells.push(<div key={`x${i}`} />);
    for (let d = 1; d <= len; d++) {
      const iso = `${cal.y}-${pad(cal.m + 1)}-${pad(d)}`;
      const end = iso === from || iso === to;
      const inside = !!from && !!to && iso > from && iso < to;
      const future = iso > today;
      const col = (lead + d - 1) % 7;
      const band = !!from && !!to && from !== to && (inside || end);
      const l = iso === from || col === 0 || d === 1 ? '6px' : '0';
      const r = iso === to || col === 6 || d === len ? '6px' : '0';
      cells.push(
        <div
          key={iso}
          style={{
            background: band ? 'rgba(3,173,134,.12)' : 'transparent',
            borderRadius: band ? `${l} ${r} ${r} ${l}` : 0,
          }}
        >
          <button
            type="button"
            onClick={() => pickDay(iso)}
            disabled={future}
            style={{
              width: '100%',
              height: 24,
              border: 'none',
              borderRadius: 6,
              background: end ? GRAD : 'transparent',
              boxShadow: end ? FOCUS : iso === today ? 'inset 0 0 0 1px #D5D9DE' : 'none',
              color: end ? '#fff' : future ? '#C3CAD3' : inside ? '#005965' : '#0B1B2B',
              fontFamily: 'inherit',
              fontSize: 11.5,
              fontWeight: end ? 800 : 600,
              cursor: future ? 'default' : 'pointer',
            }}
          >
            {d}
          </button>
        </div>,
      );
    }
    const box = (d: string, on: boolean) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 34,
          padding: '0 10px',
          borderRadius: 8,
          boxShadow: on ? FOCUS : LINE,
          fontSize: 12,
          fontWeight: 600,
          color: d ? '#0B1B2B' : '#94A0AF',
        }}
      >
        <span style={{ color: '#6B7685' }}>
          <Cal />
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {d ? dayText(d) : 'dd/mm/yyyy'}
        </span>
      </div>
    );
    const cap = (t: string) => (
      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#748093' }}>{t}</span>
    );
    const hint = from
      ? badTime
        ? 'To time must be after from time'
        : long
          ? `At most ${maxDays} days`
          : single
            ? 'Single date · pick another for a range'
            : 'Date range selected'
      : 'Select a date';
    const nav = (n: number, label: string, d: string) => (
      <button
        type="button"
        onClick={() => month(n)}
        aria-label={label}
        style={{
          width: 26,
          height: 26,
          border: 'none',
          borderRadius: 6,
          background: '#F7F8FA',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          color: '#0B1B2B',
        }}
      >
        <Svg s={12} w={2.4}>
          <path d={d} />
        </Svg>
      </button>
    );
    calendar = (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 'calc(100% + 4px)',
          zIndex: 10,
          width: 290,
          boxSizing: 'border-box',
          background: '#fff',
          borderRadius: 12,
          boxShadow: POP_SHADOW,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {cap('From Date')}
            {box(from, focus === 'from')}
            {cap('From Time')}
            <TimePick
              value={cal.fromT}
              onChange={(x) => setCal({ ...cal, fromT: x })}
              open={timeOpen === 'from'}
              onToggle={() => setTimeOpen((t) => (t === 'from' ? null : 'from'))}
              error={badTime}
              align="left"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {cap('To Date')}
            {box(to, focus === 'to')}
            {cap('To Time')}
            <TimePick
              value={cal.toT}
              onChange={(x) => setCal({ ...cal, toT: x })}
              open={timeOpen === 'to'}
              onToggle={() => setTimeOpen((t) => (t === 'to' ? null : 'to'))}
              error={badTime}
              align="right"
            />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            borderRadius: 10,
            boxShadow: 'inset 0 0 0 1px #E9ECEF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {nav(-1, 'Previous month', 'm15 18-6-6 6-6')}
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>
              {first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
            {nav(1, 'Next month', 'm9 18 6-6-6-6')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', rowGap: 2 }}>
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <span
                key={d}
                style={{
                  textAlign: 'center',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#748093',
                  padding: '2px 0',
                }}
              >
                {d}
              </span>
            ))}
            {cells}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingTop: 8,
            borderTop: '1px solid #EEF0F2',
          }}
        >
          <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#748093' }}>{hint}</span>
          <button
            type="button"
            onClick={() => setCal({ ...cal, from: '', to: '' })}
            style={{
              height: 30,
              padding: '0 12px',
              border: 'none',
              borderRadius: 8,
              background: '#F7F8FA',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 700,
              color: '#0B1B2B',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={done}
            disabled={!from || badTime || long}
            style={{
              height: 30,
              padding: '0 14px',
              border: 'none',
              borderRadius: 8,
              background: GRAD,
              boxShadow: FOCUS,
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
              opacity: !from || badTime || long ? 0.5 : 1,
              textShadow: '0 1px 2px rgba(1,29,50,.35)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  let operatorRow: ReactNode = null;
  if (operators) {
    const picked = v.operators ?? [];
    const q = opQ.trim().toLowerCase();
    const shown = operators.filter((o) => !q || o.toLowerCase().includes(q));
    const all = shown.length > 0 && shown.every((o) => picked.includes(o));
    const state = all ? 'on' : shown.some((o) => picked.includes(o)) ? 'some' : 'off';
    const label = picked.length
      ? picked.length === 1
        ? picked[0]
        : `${picked.length} operators selected`
      : 'Select Operator';
    operatorRow = (
      <div
        style={{
          marginTop: 10,
          position: 'relative',
          height: 29,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Badge>
          <Svg s={15}>
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </Svg>
        </Badge>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>Operator</span>
        <button
          type="button"
          onClick={() => {
            setOpOpen((o) => !o);
            setCal(null);
            setTimeOpen(null);
            setStopOpen(false);
          }}
          aria-label="Select operator"
          aria-expanded={opOpen}
          title={picked.join(', ') || undefined}
          style={{
            position: 'relative',
            width: W,
            height: 29,
            flexShrink: 0,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px 0 11px',
            border: 'none',
            borderRadius: 8,
            background: '#fff',
            boxShadow: opOpen ? FOCUS : LINE,
            fontFamily: 'inherit',
            fontSize: 12,
            color: picked.length ? '#0B1B2B' : '#6B7685',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </span>
          <span style={{ position: 'absolute', right: 10, top: 9 }}>
            <Chevron open={opOpen} />
          </span>
        </button>
        {opOpen && (
          <>
            <div
              onClick={() => setOpOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 11 }}
            />
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 33,
                zIndex: 12,
                width: 272,
                boxSizing: 'border-box',
                padding: 8,
                background: '#fff',
                borderRadius: 10,
                boxShadow: POP_SHADOW,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 30,
                  padding: '0 10px',
                  boxSizing: 'border-box',
                  borderRadius: 8,
                  background: FIELD_BG,
                  boxShadow: SOFT,
                  color: '#748093',
                }}
              >
                <Svg s={14}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </Svg>
                <input
                  value={opQ}
                  onChange={(e) => setOpQ(e.target.value)}
                  placeholder="Search operators..."
                  aria-label="Search operators"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    color: '#0B1B2B',
                  }}
                />
              </div>
              <div
                style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  boxSizing: 'border-box',
                  padding: 6,
                  borderRadius: 10,
                  border: '1px solid #D7D8DB',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {shown.length > 0 && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={state === 'on' ? true : state === 'some' ? 'mixed' : false}
                    onClick={() =>
                      patch({
                        operators: all
                          ? picked.filter((o) => !shown.includes(o))
                          : [...new Set([...picked, ...shown])],
                      })
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      height: 28,
                      flexShrink: 0,
                      padding: '0 8px 0 4px',
                      border: 'none',
                      borderRadius: 6,
                      background: '#F2F4F6',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ width: 18, flexShrink: 0 }} />
                    <Box state={state} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#0B1B2B',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Select all
                    </span>
                  </button>
                )}
                {shown.map((o) => {
                  const on = picked.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      title={o}
                      onClick={() =>
                        patch({ operators: on ? picked.filter((x) => x !== o) : [...picked, o] })
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        height: 26,
                        flexShrink: 0,
                        padding: '0 8px 0 30px',
                        border: 'none',
                        borderRadius: 6,
                        background: 'transparent',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <Box state={on ? 'on' : 'off'} />
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 12,
                          fontWeight: 500,
                          color: '#0B1B2B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {o}
                      </span>
                    </button>
                  );
                })}
                {!shown.length && (
                  <span
                    style={{
                      padding: '6px 8px 6px 30px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#748093',
                    }}
                  >
                    No operators found
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#748093' }}>
                  {picked.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setOpOpen(false)}
                  style={{
                    height: 28,
                    padding: '0 14px',
                    border: 'none',
                    borderRadius: 8,
                    background: GRAD,
                    boxShadow: FOCUS,
                    fontFamily: 'inherit',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                    cursor: 'pointer',
                    textShadow: '0 1px 2px rgba(1,29,50,.35)',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="History Filter"
      style={{
        width: 362,
        boxSizing: 'border-box',
        padding: '13px 11px 12px',
        background: '#fff',
        borderRadius: 14,
        boxShadow:
          '0 14px 36px rgba(1,29,50,.18), 0 2px 6px rgba(1,29,50,.06), inset 0 0 0 1px #E9ECEF',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT,
        color: '#0B1B2B',
      }}
    >
      <div
        style={{
          height: 25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 12.5,
            lineHeight: '15px',
            fontWeight: 700,
            paddingLeft: 4,
            whiteSpace: 'nowrap',
          }}
        >
          History Filter
        </span>
        <button
          type="button"
          onClick={onDismiss}
          title="Close"
          aria-label="Close filter"
          style={{
            width: 26,
            height: 26,
            border: 'none',
            borderRadius: 8,
            background: '#fff',
            boxShadow: '0 2px 6px rgba(1,29,50,.16), inset 0 0 0 1px #EEF0F2',
            color: '#3D4A5C',
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <Svg s={13}>
            <path d="M18 6 6 18M6 6l12 12" />
          </Svg>
        </button>
      </div>
      {operatorRow}
      <Row
        top={operators ? 9 : 10}
        icon={
          <Svg s={14}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </Svg>
        }
        label="Date"
      >
        <div
          role="radiogroup"
          aria-label="Date range"
          style={{ display: 'flex', alignItems: 'center', gap: 14 }}
        >
          {(
            [
              ['today', 'Today'],
              ['yesterday', 'Yesterday'],
              ['custom', 'Custom'],
            ] as const
          ).map(([id, label]) => {
            const on = v.mode === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pickMode(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  color: '#6B7685',
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    boxSizing: 'border-box',
                    borderRadius: '50%',
                    boxShadow: `inset 0 0 0 1.5px ${on ? '#0B9467' : '#9AA3AE'}`,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: on ? '#0B9467' : 'transparent',
                    }}
                  />
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </Row>
      <div
        style={{
          marginTop: 10,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 11.5, lineHeight: '13px', color: '#1F2937' }}>Date range</span>
        <button
          type="button"
          onClick={toggleCal}
          disabled={fixed}
          aria-label="Select date range"
          style={{
            height: 30,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 10px',
            border: 'none',
            borderRadius: 8,
            background: fixed ? '#F7F8FA' : '#fff',
            boxShadow: cal ? FOCUS : LINE,
            fontFamily: 'inherit',
            fontSize: 12,
            color: fixed ? '#94A0AF' : '#3D4A5C',
            cursor: fixed ? 'default' : 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ color: '#6B7685' }}>
            <Cal />
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {rangeText}
          </span>
          <Chevron open={!!cal} />
        </button>
        {calendar}
      </div>
      {error && <span style={{ marginTop: 4, fontSize: 10.5, color: '#E0161A' }}>{error}</span>}
      <Row
        top={6}
        icon={
          <Svg s={13}>
            <rect x="5" y="5" width="14" height="14" rx="3" />
          </Svg>
        }
        label="Stop limit"
      >
        <div style={{ position: 'relative', width: W, height: 29, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => {
              setStopOpen((o) => !o);
              setCal(null);
              setOpOpen(false);
            }}
            aria-label="Stop limit in minutes"
            aria-haspopup="listbox"
            aria-expanded={stopOpen}
            style={{
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              padding: '0 10px 0 11px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              border: 'none',
              borderRadius: 8,
              backgroundColor: FIELD_BG,
              boxShadow: stopOpen ? FOCUS : SOFT,
              fontFamily: 'inherit',
              fontWeight: 600,
              color: '#011D32',
              cursor: 'pointer',
              outline: 'none',
              textAlign: 'left',
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>{v.stopLimit}</span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 400,
                color: '#6B7685',
              }}
            >
              min
              <Chevron open={stopOpen} />
            </span>
          </button>
          {stopOpen && (
            <>
              <div
                onClick={() => setStopOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 11 }}
              />
              <div
                role="listbox"
                aria-label="Stop limit options"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 33,
                  zIndex: 12,
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: 6,
                  background: '#fff',
                  borderRadius: 10,
                  boxShadow: POP_SHADOW,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {STOP_OPTIONS.map((o) => {
                  const on = v.stopLimit === o;
                  return (
                    <div
                      key={o}
                      role="option"
                      aria-selected={on}
                      onClick={() => {
                        patch({ stopLimit: o });
                        setStopOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: 28,
                        flexShrink: 0,
                        padding: '0 10px',
                        borderRadius: 6,
                        background: on ? '#E6F5EF' : 'transparent',
                        color: on ? '#005965' : '#0B1B2B',
                        fontSize: 12,
                        fontWeight: on ? 700 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span>{o} min</span>
                      {on && (
                        <span style={{ color: '#0B9467' }}>
                          <Svg s={12} w={2.5}>
                            <path d="M20 6 9 17l-5-5" />
                          </Svg>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </Row>
      <Row
        h={28}
        icon={
          <Svg s={14}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </Svg>
        }
        label="Vehicle Status"
      />
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        {STATUSES.map((s) => {
          const on = v.statuses.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() =>
                patch({ statuses: on ? v.statuses.filter((x) => x !== s) : [...v.statuses, s] })
              }
              style={{
                height: 30,
                flex: '1 1 auto',
                minWidth: 0,
                boxSizing: 'border-box',
                padding: '0 8px',
                border: 'none',
                borderRadius: 8,
                background: on ? '#BFEBDA' : '#fff',
                boxShadow: on ? 'inset 0 0 0 1.5px #8ED9BE' : LINE,
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: on ? 600 : 400,
                color: on ? '#011D32' : '#6B7685',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {s}
            </button>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 8,
          display: 'grid',
          gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setV(defaultValue ?? fallback());
            setCal(null);
          }}
          style={{
            height: 33,
            border: 'none',
            borderRadius: 8,
            background: '#fff',
            boxShadow: LINE,
            fontFamily: 'inherit',
            fontSize: 12.5,
            fontWeight: 700,
            color: '#3D4A5C',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => !error && onApply(v)}
          disabled={!!error}
          style={{
            height: 33,
            border: 'none',
            borderRadius: 8,
            background: GRAD,
            boxShadow: FOCUS,
            fontFamily: 'inherit',
            fontSize: 12.5,
            fontWeight: 700,
            color: '#fff',
            cursor: 'pointer',
            opacity: error ? 0.5 : 1,
            textShadow: '0 1px 2px rgba(1,29,50,.35)',
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
}

/** The filter pop-up placed beside its button, on the page body (original: UU with Iq). */
export function FilterPop({
  anchor,
  onClose,
  children,
}: {
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const portal = usePortalRoot();
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxHeight?: number } | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const w = el?.offsetWidth ?? 0;
      const h = el?.scrollHeight ?? 0;
      const room = vh - 16;
      const leftHalf = r.left + r.width / 2 < vw / 2;
      let left = leftHalf ? r.right + 8 : r.left - 8 - w;
      let top = r.top;
      if (left < 8 || left + w > vw - 8) {
        top = r.bottom + 8;
        left = leftHalf ? r.left : r.right - w;
      }
      const next = {
        left: Math.round(Math.max(8, Math.min(left, vw - 8 - w))),
        top: Math.round(Math.max(8, Math.min(top, vh - 8 - h))),
        maxHeight: h >= room ? room : undefined,
      };
      setPos((p) =>
        p && p.left === next.left && p.top === next.top && p.maxHeight === next.maxHeight
          ? p
          : next,
      );
    };
    place();
    const mo = new MutationObserver(place);
    const ro = new ResizeObserver(place);
    if (el) {
      mo.observe(el, { childList: true, subtree: true });
      ro.observe(el);
    }
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor, el]);
  useEffect(() => {
    const down = (e: Event) => {
      const t = e.target as Node | null;
      if (!t || el?.contains(t) || anchor.current?.contains(t)) return;
      close.current();
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key);
    };
  }, [anchor, el]);
  if (!portal) return null;
  const style: CSSProperties = pos
    ? {
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        maxHeight: pos.maxHeight,
        overflowY: pos.maxHeight ? 'auto' : undefined,
        zIndex: 1200,
      }
    : { position: 'fixed', top: 0, left: 0, visibility: 'hidden', zIndex: 1200 };
  return createPortal(
    <div ref={setEl} className="td-hfilter-pop" style={style}>
      {children}
    </div>,
    portal,
  );
}

/** The green filter button with its count (original: Mq). */
export function MapFilterButton({
  count = 0,
  open = false,
  onClick,
  title = 'Filters',
  size,
}: {
  count?: number;
  open?: boolean;
  onClick: () => void;
  title?: string;
  size?: number;
}) {
  const has = count > 0;
  const lit = has || open;
  const sized = size != null;
  const look = lit
    ? {
        bg: 'var(--eit-active-gradient)',
        shadow: '0 0 0 1.5px #03AD86, 0 0 10px rgba(3,173,134,.45)',
        icon: '#fff',
        gap: has ? 5 : 3,
      }
    : { bg: '#E8F5EF', shadow: 'inset 0 0 0 1.5px #A9D8C3', icon: '#12955F', gap: 7 };
  return (
    <button
      type="button"
      onClick={onClick}
      title={has ? `${title} (${count} applied)` : title}
      aria-label={title}
      aria-pressed={open}
      style={{
        position: sized ? 'relative' : undefined,
        flexShrink: 0,
        width: sized ? size : 44,
        height: sized ? size : 26,
        boxSizing: 'border-box',
        border: 'none',
        borderRadius: sized && size! >= 32 ? 9 : 8,
        background: look.bg,
        boxShadow: look.shadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: look.gap,
        padding: 0,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 700,
        color: lit ? '#fff' : '#0B6E58',
        transition: 'background .15s ease, box-shadow .15s ease',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke={look.icon}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'block', flexShrink: 0 }}
        aria-hidden="true"
      >
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
      </svg>
      {has && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: 16,
            height: 16,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            overflow: 'hidden',
            ...(sized
              ? {
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  background: '#fff',
                  color: '#005965',
                  boxShadow: '0 0 0 1.5px #03AD86, 0 1px 3px rgba(1,29,50,.25)',
                }
              : { background: 'rgba(255,255,255,.22)', color: '#fff' }),
          }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

/** The replay buttons on the map's right side (original: s9). */
export function PlaybackControls(p: {
  filterButton: ReactNode;
  playing: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  speed: number;
  onSpeed: () => void;
  distanceOn: boolean;
  onDistance: () => void;
  alertsOn: boolean;
  onAlerts?: () => void;
}) {
  const size = 32;
  const n = SIZES[size]!;
  const col = (gap: number, children: ReactNode, extra?: CSSProperties) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap, ...extra }}>
      {children}
    </div>
  );
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: n.gap,
        fontFamily: FONT,
        position: 'absolute',
        right: 8,
        top: 8,
        zIndex: 4,
      }}
    >
      {p.filterButton}
      {col(
        n.cg,
        <>
          <MapButton
            title={p.playing ? 'Pause' : 'Play'}
            size={size}
            on={p.playing}
            onClick={p.onTogglePlay}
          >
            {(p.playing ? BTN_ICONS.pause : BTN_ICONS.play)(n.i)}
          </MapButton>
          <MapButton title="Stop" size={size} on={false} onClick={p.onStop}>
            {BTN_ICONS.stop(n.i)}
          </MapButton>
          <MapButton title="Playback speed" size={size} on={false} onClick={p.onSpeed}>
            <span
              style={{
                fontSize: n.fs,
                lineHeight: '14px',
                fontWeight: 700,
                letterSpacing: '-.01em',
              }}
            >{`${p.speed || 1}x`}</span>
          </MapButton>
        </>,
      )}
      {col(
        n.cg,
        <>
          <MapButton
            title="Distance & Duration"
            size={size}
            on={p.distanceOn}
            onClick={p.onDistance}
          >
            {BTN_ICONS.timer(n.ti)}
          </MapButton>
          {p.onAlerts && (
            <MapButton title="Alerts" size={size} on={p.alertsOn} onClick={p.onAlerts}>
              {BTN_ICONS.bell(n.ti)}
            </MapButton>
          )}
        </>,
        { marginTop: n.mt },
      )}
    </div>
  );
}
