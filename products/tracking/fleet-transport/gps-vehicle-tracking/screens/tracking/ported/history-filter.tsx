// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import React, { useLayoutEffect, useRef, useState } from 'react';

export const ALL_STATUSES: any = ['Stopped', 'Idle', 'Running', 'Overspeed', 'Towed'];

export const STOP_LIMITS: any = ['3', '5', '10', '15', '20', '30', '60'];

export const FILTER_MONTHS: any = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const GRADIENT = 'var(--eit-active-gradient)';

export const BORDER = 'inset 0 0 0 1px #E3E6EA';

export const BORDER_ACTIVE = 'inset 0 0 0 1.5px #03AD86';

export const BORDER_SOFT = 'inset 0 0 0 1px #D7D8DB';

export const SOFT_BG = '#F9F9FB';

export const POPUP_SHADOW = '0 12px 32px rgba(1,29,50,.18), inset 0 0 0 1px #E9ECEF';

export const FILTER_FONT =
  "'Instrument Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const two = (e?: any) => String(e).padStart(2, '0');

/** IT-0041 (bug sheet 23-11-2026, Track History #1/#4): the current time (HH:MM) and 12 h labels. */
export const nowTime = () => {
  const d = new Date();
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
};
export const clock12 = (hhmm?: any) => {
  const [h = 0, m = 0] = String(hhmm || '00:00').split(':').map(Number);
  return `${two(h % 12 || 12)}:${two(m)} ${h < 12 ? 'AM' : 'PM'}`;
};

export const toLocalInput = (e?: any) =>
  `${e.getFullYear()}-${two(e.getMonth() + 1)}-${two(e.getDate())}T${two(e.getHours())}:${two(e.getMinutes())}`;

export const dayAt = (e?: any, t?: any, n?: any) => {
  const r = new Date();
  r.setDate(r.getDate() + e);
  r.setHours(t, n, 0, 0);
  return r;
};

export const formatInputDay = (e?: any) => {
  const [t, n, r] = e.slice(0, 10).split('-').map(Number);
  return t && n && r ? `${two(r)} ${FILTER_MONTHS[n - 1]} ${t}` : e;
};

export const shiftDay = (e?: any, t?: any) => {
  const [n = 1970, r = 1, i = 1] = e.split('-').map(Number),
    s = new Date(Date.UTC(n, r - 1, i + t));
  return `${s.getUTCFullYear()}-${two(s.getUTCMonth() + 1)}-${two(s.getUTCDate())}`;
};

export const daysBetween = (e?: any, t?: any) => {
  const [n = 1970, r = 1, i = 1] = e.split('-').map(Number),
    [s = 1970, a = 1, l = 1] = t.split('-').map(Number);
  return Math.round((Date.UTC(s, a - 1, l) - Date.UTC(n, r - 1, i)) / 864e5) + 1;
};

export const defaultFilter = () => ({
  mode: 'custom',
  from: toLocalInput(dayAt(-2, 8, 9)),
  to: toLocalInput(dayAt(0, 20, 9)),
  stopLimit: '10',
  statuses: ['Stopped', 'Running', 'Overspeed'],
  trip: '',
});

export const Svg = ({ s, w = 2, style, children }: any) => (
  <svg
    viewBox="0 0 24 24"
    width={s}
    height={s}
    fill="none"
    stroke="currentColor"
    strokeWidth={w}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={
      {
        display: 'block',
        flexShrink: 0,
        ...style,
      } as any
    }
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const CalendarIcon = ({ s = 13 }: any) => (
  <Svg s={s}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Svg>
);

export const Chevron = ({ open, color = '#6B7685' }: any) => (
  <span
    style={
      {
        color,
        display: 'block',
      } as any
    }
  >
    <Svg
      s={11}
      w={2.6}
      style={
        {
          transform: open ? 'rotate(180deg)' : 'none',
        } as any
      }
    >
      <path d="m6 9 6 6 6-6" />
    </Svg>
  </span>
);

export const RowIcon = ({ children }: any) => (
  <span
    style={
      {
        width: 28,
        height: 28,
        borderRadius: 8,
        background: '#E6F5EF',
        color: '#0B9467',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      } as any
    }
  >
    {children}
  </span>
);

export const TickBox = ({ state }: any) => (
  <span
    style={
      {
        width: 18,
        height: 18,
        flexShrink: 0,
        boxSizing: 'border-box',
        borderRadius: 6,
        display: 'grid',
        placeItems: 'center',
        background: state === 'off' ? '#fff' : GRADIENT,
        boxShadow: state === 'off' ? 'inset 0 0 0 1.5px #D7D8DB' : 'none',
        color: '#fff',
        textShadow: '0 1px 2px rgba(1,29,50,.35)',
      } as any
    }
  >
    {state === 'on' && (
      <Svg s={12} w={2.5}>
        <path d="M20 6 9 17l-5-5" />
      </Svg>
    )}
    {state === 'some' && (
      <span
        style={
          {
            width: 9,
            height: 2.5,
            borderRadius: 2,
            background: '#fff',
          } as any
        }
      />
    )}
  </span>
);

export const FilterRow = ({ icon, label, children, top = 9, h = 29 }: any) => (
  <div
    style={
      {
        marginTop: top,
        height: h,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      } as any
    }
  >
    <RowIcon>{icon}</RowIcon>
    <span
      style={
        {
          flex: 1,
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        } as any
      }
    >
      {label}
    </span>
    {children}
  </div>
);

export function TimePicker({ value, onChange, open, onToggle, error, align }: any) {
  // IT-0041 (Track History #1): the lists open scrolled to the chosen hour and minute.
  const lists = useRef<any>(null);
  useLayoutEffect(() => {
    if (!open) return;
    lists.current?.querySelectorAll('[data-on="true"]').forEach((b?: any) => {
      const col = b.parentElement;
      if (col) col.scrollTop = b.offsetTop - col.offsetTop - (col.clientHeight - b.clientHeight) / 2;
    });
  }, [open]);
  const [a = 0, l = 0] = (value || '00:00').split(':').map(Number),
    c = a >= 12 ? 'PM' : 'AM',
    f = a % 12 || 12,
    p = (v?: any, y?: any, g?: any) =>
      onChange(two((v % 12) + (g === 'PM' ? 12 : 0)) + ':' + two(y)),
    h = (v?: any, y?: any, g?: any) => (
      <button
        key={v}
        type="button"
        data-on={y ? 'true' : undefined}
        onClick={g}
        style={
          {
            height: 26,
            flexShrink: 0,
            border: 'none',
            borderRadius: 6,
            background: y ? GRADIENT : 'transparent',
            boxShadow: y ? BORDER_ACTIVE : 'none',
            color: y ? '#fff' : '#0B1B2B',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: y ? 700 : 500,
            cursor: 'pointer',
            fontVariantNumeric: 'tabular-nums',
          } as any
        }
      >
        {v}
      </button>
    ),
    A = (v?: any) => (
      <div
        style={
          {
            maxHeight: 150,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          } as any
        }
      >
        {v}
      </div>
    );
  return (
    <div
      style={
        {
          position: 'relative',
        } as any
      }
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={
          {
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
            boxShadow: open ? BORDER_ACTIVE : error ? 'inset 0 0 0 1.5px #D92D20' : BORDER,
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 600,
            color: '#0B1B2B',
            cursor: 'pointer',
            textAlign: 'left',
          } as any
        }
      >
        <span
          style={
            {
              color: '#6B7685',
            } as any
          }
        >
          <Svg s={13}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </Svg>
        </span>
        <span
          style={
            {
              flex: 1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
            } as any
          }
        >
          {two(f)}:{two(l)} {c}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div
          ref={lists}
          style={
            {
              position: 'absolute',
              [align]: 0,
              top: 'calc(100% + 4px)',
              zIndex: 12,
              width: 168,
              boxSizing: 'border-box',
              padding: 6,
              borderRadius: 10,
              background: '#fff',
              boxShadow: POPUP_SHADOW,
              display: 'grid',
              gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
              gap: 4,
            } as any
          }
        >
          {A(
            Array.from(
              {
                length: 12,
              },
              (v?: any, y?: any) => y + 1,
            ).map((v?: any) => h(two(v), v === f, () => p(v, l, c))),
          )}
          {A(
            Array.from(
              {
                length: 60,
              },
              (v?: any, y?: any) => y,
            ).map((v?: any) => h(two(v), v === l, () => p(f, v, c))),
          )}
          {A(['AM', 'PM'].map((v?: any) => h(v, v === c, () => p(f, l, v))))}
        </div>
      )}
    </div>
  );
}

export function HistoryFilter({
  value,
  trips,
  showTrips = true,
  compact,
  today,
  singleDay,
  defaultValue,
  maxDays,
  operators,
  onApply,
  onDismiss,
  className,
  style,
}: any) {
  const [v, y] = useState<any>(() => ({
      ...defaultFilter(),
      ...(value || {}),
    })),
    g = (R?: any) =>
      y((ue?: any) => ({
        ...ue,
        ...R,
      })),
    [E, b] = useState<any>(null),
    [w, x] = useState<any>(null),
    [S, W] = useState<any>(false),
    [O, C] = useState<any>(false),
    [k, z] = useState<any>(''),
    calRef = useRef<any>(null),
    timeCols = useRef<any>(null),
    J = (R?: any, ue?: any) =>
      !!maxDays && !!R && !!ue && daysBetween(R.slice(0, 10), ue.slice(0, 10)) > maxDays,
    G =
      !v.from || !v.to
        ? 'Select both From and To.'
        : v.to < v.from
          ? 'To cannot be earlier than From.'
          : J(v.from, v.to)
            ? `Pick at most ${maxDays} days.`
            : '',
    $ = compact ? 160 : 185,
    Z = (R?: any) => (today ? shiftDay(today, R) : toLocalInput(dayAt(R, 0, 0)).slice(0, 10)),
    // IT-0041 round 4 (the developer's request, 25 Nov 2026): a simpler date choice. Quick
    // choices (Today, Yesterday, Last 7 days) set the period in one click; Custom shows plain
    // From and To lines, each a date and a time. A date opens a small calendar that closes on
    // the first click, and days that would break the limit can't be picked, so there is no
    // Done step and nothing to correct afterwards.
    lastDays = Math.min(7, maxDays || 7),
    Q = (R?: any) => {
      g(
        R === 'today'
          ? {
              mode: R,
              from: Z(0) + 'T00:00',
              // IT-0041 (Track History #4): today ends now, not at 11:59 PM.
              to: Z(0) + 'T' + nowTime(),
              toNow: true,
              trip: '',
            }
          : R === 'yesterday'
            ? {
                mode: R,
                from: Z(-1) + 'T00:00',
                to: Z(-1) + 'T23:59',
                toNow: false,
                trip: '',
              }
            : R === 'last7'
              ? {
                  mode: R,
                  from: Z(1 - lastDays) + 'T00:00',
                  to: Z(0) + 'T' + nowTime(),
                  toNow: true,
                  trip: '',
                }
              : {
                  mode: R,
                },
      );
      b(null);
      x(null);
    },
    fromDay = v.from.slice(0, 10),
    toDay = v.to.slice(0, 10),
    fromTime = v.from.slice(11, 16) || '00:00',
    toTime = v.to.slice(11, 16) || '23:59',
    lastToDay = (d?: any) => (maxDays ? shiftDay(d, maxDays - 1) : '9999-12-31'),
    // Changes one end of the custom period and keeps the period valid: To never before From,
    // never more than `maxDays` days, never in the future. IT-0041 (Track History #4): a period
    // ending today ends at the latest now; an unchanged "up to now" end stays up to now.
    setRange = (patch: any) => {
      const t0 = Z(0),
        now = nowTime(),
        r: any = { fd: fromDay, ft: fromTime, td: toDay, tt: toTime, ...patch };
      if (r.fd > t0) r.fd = t0;
      if (r.td < r.fd) r.td = r.fd;
      if (r.td > lastToDay(r.fd)) r.td = lastToDay(r.fd);
      if (r.td > t0) r.td = t0;
      const keep = !('tt' in patch) && !!v.toNow,
        isToday = r.td === t0;
      if (!isToday && keep) r.tt = '23:59';
      const toNow = isToday && (r.tt > now || keep);
      g({
        mode: 'custom',
        from: `${r.fd}T${r.ft}`,
        to: `${r.td}T${toNow ? now : r.tt}`,
        toNow,
        trip: '',
      });
    },
    openCal = (which?: any) => {
      if (E?.which === which) {
        b(null);
        return;
      }
      const [yy = 1970, mm = 1] = (which === 'from' ? fromDay : toDay).split('-').map(Number);
      b({ which, y: yy, m: mm - 1 });
      x(null);
      W(false);
      C(false);
    },
    toggleTime = (which?: any) => {
      x((re?: any) => (re === which ? null : which));
      b(null);
      W(false);
      C(false);
    },
    Y = (R?: any) =>
      b((ue?: any) => {
        if (!ue) return ue;
        const Ce = new Date(ue.y, ue.m + R, 1);
        return {
          ...ue,
          y: Ce.getFullYear(),
          m: Ce.getMonth(),
        };
      }),
    timeErr = fromDay === toDay && toTime < fromTime,
    rangeText =
      fromDay === toDay
        ? `${formatInputDay(fromDay)} · ${clock12(fromTime)} – ${clock12(toTime)}`
        : `${formatInputDay(fromDay)}, ${clock12(fromTime)} – ${formatInputDay(toDay)}, ${clock12(toTime)}`,
    Ge = trips || [],
    dateField = (which?: any) => {
      const day = which === 'from' ? fromDay : toDay,
        open = E?.which === which;
      return (
        <button
          type="button"
          onClick={() => openCal(which)}
          data-datefield={which}
          aria-expanded={open}
          aria-label={which === 'from' ? 'From date' : 'To date'}
          style={
            {
              width: '100%',
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 34,
              padding: '0 10px',
              boxSizing: 'border-box',
              border: 'none',
              borderRadius: 8,
              background: '#fff',
              boxShadow: open ? BORDER_ACTIVE : BORDER,
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              color: '#0B1B2B',
              cursor: 'pointer',
              textAlign: 'left',
            } as any
          }
        >
          <span style={{ color: '#6B7685' } as any}>
            <CalendarIcon />
          </span>
          <span
            style={
              {
                flex: 1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              } as any
            }
          >
            {formatInputDay(day)}
          </span>
          <Chevron open={open} />
        </button>
      );
    },
    // IT-0058 (the developer's request, 26 Nov 2026): the From / To date opens one floating
    // picker in the format of the developer's reference: a month calendar (Sunday first, the
    // days of the months around it greyed, Clear and Today below) beside an hour and a minute
    // column. It floats over the filter, so the filter does not get taller; it closes on a click
    // outside or Esc. Days in the future or outside the 7-day limit can't be picked.
    ze = (() => {
      if (!E) return null;
      const R = new Date(E.y, E.m, 1),
        lead = R.getDay(),
        bt = today ?? toLocalInput(new Date()).slice(0, 10),
        picking = E.which === 'from' ? fromDay : toDay,
        pickTime = E.which === 'from' ? fromTime : toTime,
        [ph = 0, pm = 0] = pickTime.split(':').map(Number),
        setDay = (ce: string) => setRange(E.which === 'from' ? { fd: ce } : { td: ce }),
        setTime = (hh: number, mi: number) =>
          setRange(E.which === 'from' ? { ft: `${two(hh)}:${two(mi)}` } : { tt: `${two(hh)}:${two(mi)}` }),
        nextOff = `${E.y}-${two(E.m + 1)}-99` >= bt.slice(0, 7) + '-99',
        LINK = '#005965',
        F: any = [];
      for (let i = 0; i < 42; i++) {
        const d = new Date(E.y, E.m, 1 - lead + i),
          ce = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`,
          outside = d.getMonth() !== E.m,
          on = ce === picking,
          off = ce > bt || (E.which === 'to' && (ce < fromDay || ce > lastToDay(fromDay)));
        F.push(
          <button
            key={ce}
            type="button"
            disabled={off}
            onClick={() => {
              setDay(ce);
              if (outside) b({ ...E, y: d.getFullYear(), m: d.getMonth() });
            }}
            style={
              {
                width: '100%',
                height: 28,
                border: 'none',
                borderRadius: 4,
                background: on ? GRADIENT : 'transparent',
                boxShadow: on ? 'inset 0 0 0 2px #0B1B2B' : 'none',
                color: on ? '#fff' : off || outside ? '#B7BEC8' : '#0B1B2B',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: on ? 700 : 500,
                cursor: off ? 'default' : 'pointer',
                fontVariantNumeric: 'tabular-nums',
              } as any
            }
          >
            {d.getDate()}
          </button>,
        );
      }
      const arrow = (step: number, label: string, path: string, disabled?: boolean) => (
          <button
            type="button"
            onClick={() => Y(step)}
            disabled={disabled}
            aria-label={label}
            style={
              {
                width: 24,
                height: 24,
                border: 'none',
                background: 'transparent',
                cursor: disabled ? 'default' : 'pointer',
                display: 'grid',
                placeItems: 'center',
                color: disabled ? '#C3CAD3' : '#3D4A5C',
                padding: 0,
              } as any
            }
          >
            <Svg s={16} w={2}>
              <path d={path} />
            </Svg>
          </button>
        ),
        link = (text: string, onClick: () => void) => (
          <button
            type="button"
            onClick={onClick}
            style={
              {
                border: 'none',
                background: 'transparent',
                padding: '2px 0',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                color: LINK,
                cursor: 'pointer',
              } as any
            }
          >
            {text}
          </button>
        ),
        cell = (text: string, on: boolean, onClick: () => void) => (
          <button
            key={text}
            type="button"
            data-on={on ? 'true' : undefined}
            onClick={onClick}
            style={
              {
                height: 30,
                flexShrink: 0,
                border: 'none',
                borderRadius: 4,
                background: on ? GRADIENT : 'transparent',
                color: on ? '#fff' : '#0B1B2B',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: on ? 700 : 500,
                cursor: 'pointer',
                fontVariantNumeric: 'tabular-nums',
              } as any
            }
          >
            {text}
          </button>
        ),
        column = (label: string, items: any) => (
          <div
            aria-label={label}
            style={
              {
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minHeight: 0,
                scrollbarWidth: 'none',
              } as any
            }
          >
            {items}
          </div>
        );
      return (
        <div
          ref={calRef}
          role="dialog"
          aria-label={E.which === 'from' ? 'Choose the From date and time' : 'Choose the To date and time'}
          style={
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: E.which === 'from' ? 38 : 78,
              zIndex: 20,
              padding: 10,
              boxSizing: 'border-box',
              borderRadius: 10,
              background: '#fff',
              boxShadow: POPUP_SHADOW,
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) 1px 92px',
              columnGap: 8,
            } as any
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 } as any}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 } as any}>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' } as any}>
                {R.toLocaleDateString('en-GB', { month: 'long' })}, {E.y}
                <span style={{ fontSize: 9, marginLeft: 4, color: '#3D4A5C' } as any}>▼</span>
              </span>
              {arrow(-1, 'Previous month', 'M12 19V5m-6 6 6-6 6 6')}
              {arrow(1, 'Next month', 'M12 5v14m-6-6 6 6 6-6', nextOff)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', rowGap: 1 } as any}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((re?: any) => (
                <span
                  key={re}
                  style={
                    {
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#0B1B2B',
                      padding: '4px 0',
                    } as any
                  }
                >
                  {re}
                </span>
              ))}
              {F}
            </div>
            <div
              style={
                {
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 2,
                  padding: '0 4px',
                } as any
              }
            >
              {link('Clear', () =>
                setRange(E.which === 'from' ? { fd: bt, ft: '00:00' } : { td: bt, tt: '23:59' }),
              )}
              {link('Today', () => {
                setDay(bt);
                const [ty = 1970, tm = 1] = bt.split('-').map(Number);
                b({ ...E, y: ty, m: tm - 1 });
              })}
            </div>
          </div>
          <div style={{ background: '#E3E6EA' } as any} />
          <div
            ref={timeCols}
            style={
              {
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                columnGap: 4,
                minHeight: 0,
                height: '100%',
                overflow: 'hidden',
              } as any
            }
          >
            <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 4 } as any}>
              {column(
                'Hour',
                Array.from({ length: 24 }, (_x?: any, i?: any) => i).map((hh: number) =>
                  cell(two(hh), hh === ph, () => setTime(hh, pm)),
                ),
              )}
              {column(
                'Minute',
                Array.from({ length: 60 }, (_x?: any, i?: any) => i).map((mi: number) =>
                  cell(two(mi), mi === pm, () => setTime(ph, mi)),
                ),
              )}
            </div>
          </div>
        </div>
      );
    })(),
    se: any = {
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      padding: '0 28px 0 11px',
      fontSize: 12,
      textOverflow: 'ellipsis',
      appearance: 'none',
      WebkitAppearance: 'none',
      border: 'none',
      borderRadius: 8,
      backgroundColor: SOFT_BG,
      boxShadow: BORDER_SOFT,
      fontFamily: 'inherit',
      fontWeight: 600,
      cursor: 'pointer',
      outline: 'none',
    };
  // IT-0058: the picker's hour and minute columns open scrolled to the chosen time.
  const pickerFor = E?.which;
  useLayoutEffect(() => {
    if (!pickerFor) return;
    // Opens below its row; if that would leave the window, it opens above the row instead.
    const box = calRef.current;
    if (box && box.getBoundingClientRect().bottom > window.innerHeight - 8)
      box.style.top = `${(pickerFor === 'from' ? 0 : 40) - box.offsetHeight - 4}px`;
    timeCols.current?.querySelectorAll('[data-on="true"]').forEach((el?: any) => {
      const col = el.parentElement;
      if (col) col.scrollTop = el.offsetTop - col.offsetTop - (col.clientHeight - el.clientHeight) / 2;
    });
  }, [pickerFor]);
  // IT-0058: a click outside the picker (other than on its own date field) or Esc closes it.
  React.useEffect(() => {
    if (!pickerFor) return;
    const down = (ev: MouseEvent) => {
      const t = ev.target as any;
      if (calRef.current?.contains(t) || t?.closest?.('[data-datefield]')) return;
      b(null);
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') b(null);
    };
    document.addEventListener('mousedown', down, true);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down, true);
      document.removeEventListener('keydown', key);
    };
  }, [pickerFor]);
  return (
    <div
      className={className}
      role="dialog"
      aria-label="History Filter"
      style={
        {
          width: compact ? 320 : 362,
          boxSizing: 'border-box',
          padding: '13px 11px 12px',
          background: '#fff',
          borderRadius: 14,
          boxShadow:
            '0 14px 36px rgba(1,29,50,.18), 0 2px 6px rgba(1,29,50,.06), inset 0 0 0 1px #E9ECEF',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: FILTER_FONT,
          color: '#0B1B2B',
          ...style,
        } as any
      }
    >
      <div
        style={
          {
            height: 25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          } as any
        }
      >
        <span
          style={
            {
              fontSize: 12.5,
              lineHeight: '15px',
              fontWeight: 700,
              paddingLeft: 4,
              whiteSpace: 'nowrap',
            } as any
          }
        >
          History Filter
        </span>
        <button
          type="button"
          onClick={onDismiss}
          title="Close"
          aria-label="Close filter"
          style={
            {
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
            } as any
          }
        >
          <Svg s={13}>
            <path d="M18 6 6 18M6 6l12 12" />
          </Svg>
        </button>
      </div>
      {operators &&
        (() => {
          const R = v.operators ?? [],
            ue = k.trim().toLowerCase(),
            Ce = operators.filter((Qe?: any) => !ue || Qe.toLowerCase().includes(ue)),
            bt = Ce.length > 0 && Ce.every((Qe?: any) => R.includes(Qe)),
            q = bt ? 'on' : Ce.some((Qe?: any) => R.includes(Qe)) ? 'some' : 'off',
            De = R.length
              ? R.length === 1
                ? R[0]
                : `${R.length} operators selected`
              : 'Select Operator',
            Ue = (Qe?: any) =>
              g({
                operators: R.includes(Qe) ? R.filter((F?: any) => F !== Qe) : [...R, Qe],
              }),
            lt = () =>
              g({
                operators: bt
                  ? R.filter((Qe?: any) => !Ce.includes(Qe))
                  : [...new Set<any>([...R, ...Ce])],
              }),
            _t = () => {
              C((Qe?: any) => !Qe);
              b(null);
              x(null);
              W(false);
            };
          return (
            <div
              style={
                {
                  marginTop: 10,
                  position: 'relative',
                  height: 29,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                } as any
              }
            >
              <RowIcon>
                <Svg s={15}>
                  <circle cx="12" cy="8" r="5" />
                  <path d="M20 21a8 8 0 0 0-16 0" />
                </Svg>
              </RowIcon>
              <span
                style={
                  {
                    flex: 1,
                    fontSize: 12,
                    fontWeight: 700,
                  } as any
                }
              >
                Operator
              </span>
              <button
                type="button"
                onClick={_t}
                aria-label="Select operator"
                aria-expanded={O}
                title={R.join(', ') || undefined}
                style={
                  {
                    position: 'relative',
                    width: $,
                    height: 29,
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 28px 0 11px',
                    border: 'none',
                    borderRadius: 8,
                    background: '#fff',
                    boxShadow: O ? BORDER_ACTIVE : BORDER,
                    fontFamily: 'inherit',
                    fontSize: 12,
                    color: R.length ? '#0B1B2B' : '#6B7685',
                    cursor: 'pointer',
                    textAlign: 'left',
                  } as any
                }
              >
                <span
                  style={
                    {
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    } as any
                  }
                >
                  {De}
                </span>
                <span
                  style={
                    {
                      position: 'absolute',
                      right: 10,
                      top: 9,
                    } as any
                  }
                >
                  <Chevron open={O} />
                </span>
              </button>
              {O && (
                <>
                  <div
                    onClick={() => C(false)}
                    style={
                      {
                        position: 'fixed',
                        inset: 0,
                        zIndex: 11,
                      } as any
                    }
                  />
                  <div
                    style={
                      {
                        position: 'absolute',
                        right: 0,
                        top: 33,
                        zIndex: 12,
                        width: 272,
                        boxSizing: 'border-box',
                        padding: 8,
                        background: '#fff',
                        borderRadius: 10,
                        boxShadow: POPUP_SHADOW,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      } as any
                    }
                  >
                    <div
                      style={
                        {
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          height: 30,
                          padding: '0 10px',
                          boxSizing: 'border-box',
                          borderRadius: 8,
                          background: SOFT_BG,
                          boxShadow: BORDER_SOFT,
                          color: '#748093',
                        } as any
                      }
                    >
                      <Svg s={14}>
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                      </Svg>
                      <input
                        value={k}
                        onChange={(Qe?: any) => z(Qe.target.value)}
                        placeholder="Search operators..."
                        aria-label="Search operators"
                        style={
                          {
                            flex: 1,
                            minWidth: 0,
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            fontFamily: 'inherit',
                            fontSize: 12,
                            color: '#0B1B2B',
                          } as any
                        }
                      />
                    </div>
                    <div
                      style={
                        {
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
                        } as any
                      }
                    >
                      {Ce.length > 0 && (
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={q === 'on' ? true : q === 'some' ? 'mixed' : false}
                          onClick={lt}
                          style={
                            {
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
                            } as any
                          }
                        >
                          <span
                            style={
                              {
                                width: 18,
                                flexShrink: 0,
                              } as any
                            }
                          />
                          <TickBox state={q} />
                          <span
                            style={
                              {
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#0B1B2B',
                                whiteSpace: 'nowrap',
                              } as any
                            }
                          >
                            Select all
                          </span>
                        </button>
                      )}
                      {Ce.map((Qe?: any) => {
                        const F = R.includes(Qe);
                        return (
                          <button
                            key={Qe}
                            type="button"
                            role="checkbox"
                            aria-checked={F}
                            title={Qe}
                            onClick={() => Ue(Qe)}
                            style={
                              {
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
                              } as any
                            }
                          >
                            <TickBox state={F ? 'on' : 'off'} />
                            <span
                              style={
                                {
                                  flex: 1,
                                  minWidth: 0,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: '#0B1B2B',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                } as any
                              }
                            >
                              {Qe}
                            </span>
                          </button>
                        );
                      })}
                      {!Ce.length && (
                        <span
                          style={
                            {
                              padding: '6px 8px 6px 30px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#748093',
                            } as any
                          }
                        >
                          No operators found
                        </span>
                      )}
                    </div>
                    <div
                      style={
                        {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        } as any
                      }
                    >
                      <span
                        style={
                          {
                            flex: 1,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#748093',
                          } as any
                        }
                      >
                        {R.length}
                        {' selected'}
                      </span>
                      <button
                        type="button"
                        onClick={() => C(false)}
                        style={
                          {
                            height: 28,
                            padding: '0 14px',
                            border: 'none',
                            borderRadius: 8,
                            background: GRADIENT,
                            boxShadow: BORDER_ACTIVE,
                            fontFamily: 'inherit',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#fff',
                            cursor: 'pointer',
                            textShadow: '0 1px 2px rgba(1,29,50,.35)',
                          } as any
                        }
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      <FilterRow
        top={operators ? 9 : 10}
        icon={
          <Svg s={14}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </Svg>
        }
        label="Date"
      />
      {/* IT-0041 round 4: the page's own toggle (as Live Track | Track History) for the date choice. */}
      <div
        role="radiogroup"
        aria-label="Date"
        className="td-seg td-seg--sm"
        style={
          {
            marginTop: 6,
            display: 'grid',
            gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
            width: '100%',
            boxSizing: 'border-box',
          } as any
        }
      >
        {[
          ['today', 'Today'],
          ['yesterday', 'Yesterday'],
          ['last7', `Last ${lastDays} days`],
          ['custom', 'Custom'],
        ].map(([R, ue]: any) => {
          const Ce = v.mode === R;
          return (
            <button
              key={R}
              type="button"
              role="radio"
              aria-checked={Ce}
              className={`td-seg__btn ${Ce ? 'is-active' : ''}`}
              onClick={() => Q(R)}
              style={
                {
                  justifyContent: 'center',
                  minHeight: 28,
                  padding: '0 6px',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                } as any
              }
            >
              {ue}
            </button>
          );
        })}
      </div>
      {v.mode !== 'custom' ? (
        <div
          style={
            {
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 8,
              background: '#E6F5EF',
              fontSize: 12,
              fontWeight: 600,
              color: '#005965',
            } as any
          }
        >
          <CalendarIcon />
          <span
            style={
              {
                flex: 1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              } as any
            }
            title={rangeText}
          >
            {rangeText}
          </span>
        </div>
      ) : (
        <>
          <div
            style={
              {
                marginTop: 8,
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '30px minmax(0,1fr) 122px',
                alignItems: 'center',
                columnGap: 8,
                rowGap: 6,
              } as any
            }
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#3D4A5C' } as any}>From</span>
            {dateField('from')}
            <TimePicker
              value={fromTime}
              onChange={(re?: any) => setRange({ ft: re })}
              open={w === 'from'}
              onToggle={() => toggleTime('from')}
              error={timeErr}
              align="right"
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#3D4A5C' } as any}>To</span>
            {dateField('to')}
            <TimePicker
              value={toTime}
              onChange={(re?: any) => setRange({ tt: re })}
              open={w === 'to'}
              onToggle={() => toggleTime('to')}
              error={timeErr}
              align="right"
            />
            {ze}
          </div>
          {!G && !!maxDays && (
            <span
              style={
                {
                  marginTop: 6,
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: '#748093',
                } as any
              }
            >
              {`You can pick up to ${maxDays} days.`}
            </span>
          )}
        </>
      )}
      {G && (
        <span
          style={
            {
              marginTop: 4,
              fontSize: 10.5,
              color: '#E0161A',
            } as any
          }
        >
          {G}
        </span>
      )}
      {showTrips && (
        <FilterRow
          icon={
            <Svg s={15}>
              <circle cx="6" cy="19" r="3" />
              <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
              <circle cx="18" cy="5" r="3" />
            </Svg>
          }
          label="Trips"
        >
          <div
            style={
              {
                position: 'relative',
                width: $,
                height: 29,
                flexShrink: 0,
              } as any
            }
          >
            <select
              value={v.trip}
              onChange={(R?: any) =>
                g({
                  trip: R.target.value,
                })
              }
              disabled={!Ge.length}
              aria-label="Trip"
              style={
                {
                  ...se,
                  color: '#0B1B2B',
                  cursor: Ge.length ? 'pointer' : 'default',
                } as any
              }
            >
              <option value="">{Ge.length ? `All trips (${Ge.length})` : 'All trips'}</option>
              {Ge.map((R?: any, ue?: any) => (
                <option
                  key={R.id}
                  value={R.id}
                >{`Trip ${ue + 1} · ${R.start}–${R.end}${R.km != null ? ` · ${R.km} km` : ''}`}</option>
              ))}
            </select>
            <span
              style={
                {
                  position: 'absolute',
                  right: 10,
                  top: 9,
                  pointerEvents: 'none',
                } as any
              }
            >
              <Chevron />
            </span>
          </div>
        </FilterRow>
      )}
      <FilterRow
        top={6}
        icon={
          <Svg s={13}>
            <rect x="5" y="5" width="14" height="14" rx="3" />
          </Svg>
        }
        label="Stop limit"
      >
        <div
          style={
            {
              position: 'relative',
              width: $,
              height: 29,
              flexShrink: 0,
            } as any
          }
        >
          <button
            type="button"
            onClick={() => {
              W((R?: any) => !R);
              b(null);
              C(false);
            }}
            aria-label="Stop limit in minutes"
            aria-haspopup="listbox"
            aria-expanded={S}
            style={
              {
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
                backgroundColor: SOFT_BG,
                boxShadow: S ? BORDER_ACTIVE : BORDER_SOFT,
                fontFamily: 'inherit',
                fontWeight: 600,
                color: '#011D32',
                cursor: 'pointer',
                outline: 'none',
                textAlign: 'left',
              } as any
            }
          >
            <span
              style={
                {
                  flex: 1,
                  minWidth: 0,
                } as any
              }
            >
              {v.stopLimit}
            </span>
            <span
              style={
                {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 400,
                  color: '#6B7685',
                } as any
              }
            >
              min
              <Chevron open={S} />
            </span>
          </button>
          {S && (
            <>
              <div
                onClick={() => W(false)}
                style={
                  {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 11,
                  } as any
                }
              />
              <div
                role="listbox"
                aria-label="Stop limit options"
                style={
                  {
                    position: 'absolute',
                    right: 0,
                    top: 33,
                    zIndex: 12,
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: 6,
                    background: '#fff',
                    borderRadius: 10,
                    boxShadow: POPUP_SHADOW,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  } as any
                }
              >
                {STOP_LIMITS.map((R?: any) => {
                  const ue = v.stopLimit === R;
                  return (
                    <div
                      key={R}
                      role="option"
                      aria-selected={ue}
                      onClick={() => {
                        g({
                          stopLimit: R,
                        });
                        W(false);
                      }}
                      style={
                        {
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          height: 28,
                          flexShrink: 0,
                          padding: '0 10px',
                          borderRadius: 6,
                          background: ue ? '#E6F5EF' : 'transparent',
                          color: ue ? '#005965' : '#0B1B2B',
                          fontSize: 12,
                          fontWeight: ue ? 700 : 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        } as any
                      }
                    >
                      <span>
                        {R}
                        {' min'}
                      </span>
                      {ue && (
                        <span
                          style={
                            {
                              color: '#0B9467',
                            } as any
                          }
                        >
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
      </FilterRow>
      <FilterRow
        h={28}
        icon={
          <Svg s={14}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </Svg>
        }
        label="Vehicle Status"
      />
      <div
        style={
          {
            marginTop: 6,
            display: 'flex',
            // IT-0041 (Track History #9): the status buttons wrap instead of squeezing.
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 6,
          } as any
        }
      >
        {ALL_STATUSES.map((R?: any) => {
          const ue = v.statuses.includes(R);
          return (
            <button
              key={R}
              type="button"
              aria-pressed={ue}
              onClick={() =>
                g({
                  statuses: ue ? v.statuses.filter((Ce?: any) => Ce !== R) : [...v.statuses, R],
                })
              }
              style={
                {
                  height: 30,
                  flex: '1 1 auto',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  padding: compact ? '0 5px' : '0 8px',
                  border: 'none',
                  borderRadius: 8,
                  background: ue ? '#BFEBDA' : '#fff',
                  boxShadow: ue ? 'inset 0 0 0 1.5px #8ED9BE' : BORDER,
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: ue ? 600 : 400,
                  color: ue ? '#011D32' : '#6B7685',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                } as any
              }
            >
              {R}
            </button>
          );
        })}
      </div>
      <div
        style={
          {
            marginTop: 8,
            display: 'grid',
            gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
            gap: 8,
          } as any
        }
      >
        <button
          type="button"
          onClick={() => {
            y(defaultValue ?? defaultFilter());
            b(null);
          }}
          style={
            {
              height: 33,
              border: 'none',
              borderRadius: 8,
              background: '#fff',
              boxShadow: BORDER,
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 700,
              color: '#3D4A5C',
              cursor: 'pointer',
            } as any
          }
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            if (!G && onApply) {
              onApply(v);
            }
          }}
          disabled={!!G}
          style={
            {
              height: 33,
              border: 'none',
              borderRadius: 8,
              background: GRADIENT,
              boxShadow: BORDER_ACTIVE,
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
              opacity: G ? 0.5 : 1,
              textShadow: '0 1px 2px rgba(1,29,50,.35)',
            } as any
          }
        >
          Submit
        </button>
      </div>
    </div>
  );
}
