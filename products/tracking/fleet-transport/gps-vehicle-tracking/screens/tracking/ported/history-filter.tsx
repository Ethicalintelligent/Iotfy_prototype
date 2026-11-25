// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import React, { useState } from 'react';

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
  const [a = 0, l = 0] = (value || '00:00').split(':').map(Number),
    c = a >= 12 ? 'PM' : 'AM',
    f = a % 12 || 12,
    p = (v?: any, y?: any, g?: any) =>
      onChange(two((v % 12) + (g === 'PM' ? 12 : 0)) + ':' + two(y)),
    h = (v?: any, y?: any, g?: any) => (
      <button
        key={v}
        type="button"
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
    B = v.mode !== 'custom',
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
    Q = (R?: any) => {
      g(
        R === 'today'
          ? {
              mode: R,
              from: Z(0) + 'T00:00',
              to: Z(0) + 'T23:59',
              trip: '',
            }
          : R === 'yesterday'
            ? {
                mode: R,
                from: Z(-1) + 'T00:00',
                to: Z(-1) + 'T23:59',
                trip: '',
              }
            : {
                mode: R,
              },
      );
      b(null);
    },
    P = () => {
      if (E) {
        b(null);
        x(null);
        return;
      }
      const R = v.from.slice(0, 10),
        ue = v.to.slice(0, 10),
        [Ce = 1970, bt = 1] = (ue || R).split('-').map(Number);
      b({
        y: Ce,
        m: bt - 1,
        from: R,
        to: ue,
        fromT: v.from.slice(11, 16) || '00:00',
        toT: v.to.slice(11, 16) || '23:59',
      });
      W(false);
      C(false);
    },
    H = (R?: any) =>
      b(
        (ue?: any) =>
          ue &&
          (singleDay || !ue.from || ue.from !== ue.to || R === ue.from
            ? {
                ...ue,
                from: R,
                to: R,
              }
            : R < ue.from
              ? {
                  ...ue,
                  from: R,
                }
              : {
                  ...ue,
                  to: R,
                }),
      ),
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
    te = () => {
      if (E && E.from) {
        const R = E.to || E.from;
        g({
          from: E.from + 'T' + (E.fromT || '00:00'),
          to: R + 'T' + (E.toT || '23:59'),
          trip: '',
        });
      }
      b(null);
      x(null);
    },
    j = v.from.slice(0, 10),
    fe = v.to.slice(0, 10),
    Ee = j === fe ? formatInputDay(j) : `${formatInputDay(j)} – ${formatInputDay(fe)}`,
    Ge = trips || [],
    ze = (() => {
      if (!E) return null;
      const R = new Date(E.y, E.m, 1),
        ue = (R.getDay() + 6) % 7,
        Ce = new Date(E.y, E.m + 1, 0).getDate(),
        bt = today ?? toLocalInput(new Date()).slice(0, 10),
        { from: q, to: De } = E,
        Ue = !!q && q === De,
        lt = q && !Ue ? 'none' : Ue ? 'to' : 'from',
        _t = !!q && (!De || De === q) && E.toT < E.fromT,
        Qe = J(q, De),
        F: any = [];
      for (let re = 0; re < ue; re++) F.push(<div key={'x' + re} />);
      for (let re = 1; re <= Ce; re++) {
        const ce = `${E.y}-${two(E.m + 1)}-${two(re)}`,
          we = ce === q || ce === De,
          be = !!q && !!De && ce > q && ce < De,
          Pe = !!today && ce > today,
          ge = (ue + re - 1) % 7,
          Ne = !!q && !!De && q !== De && (be || we),
          xe = ce === q || ge === 0 || re === 1 ? '6px' : '0',
          bn = ce === De || ge === 6 || re === Ce ? '6px' : '0';
        F.push(
          <div
            key={ce}
            style={
              {
                background: Ne ? 'rgba(3,173,134,.12)' : 'transparent',
                borderRadius: Ne ? `${xe} ${bn} ${bn} ${xe}` : 0,
              } as any
            }
          >
            <button
              type="button"
              onClick={() => H(ce)}
              disabled={Pe}
              style={
                {
                  width: '100%',
                  height: 24,
                  border: 'none',
                  borderRadius: 6,
                  background: we ? GRADIENT : 'transparent',
                  boxShadow: we ? BORDER_ACTIVE : ce === bt ? 'inset 0 0 0 1px #D5D9DE' : 'none',
                  color: we ? '#fff' : Pe ? '#C3CAD3' : be ? '#005965' : '#0B1B2B',
                  fontFamily: 'inherit',
                  fontSize: 11.5,
                  fontWeight: we ? 800 : 600,
                  cursor: Pe ? 'default' : 'pointer',
                } as any
              }
            >
              {re}
            </button>
          </div>,
        );
      }
      const _ = (re?: any, ce?: any) => (
          <div
            style={
              {
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 34,
                padding: '0 10px',
                borderRadius: 8,
                boxShadow: ce ? BORDER_ACTIVE : BORDER,
                fontSize: 12,
                fontWeight: 600,
                color: re ? '#0B1B2B' : '#94A0AF',
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
              {re ? formatInputDay(re) : 'dd/mm/yyyy'}
            </span>
          </div>
        ),
        oe = (re?: any) => (
          <span
            style={
              {
                fontSize: 10.5,
                fontWeight: 700,
                color: '#748093',
              } as any
            }
          >
            {re}
          </span>
        ),
        Ae = q
          ? _t
            ? 'To time must be after from time'
            : Qe
              ? `At most ${maxDays} days`
              : singleDay
                ? 'One day · set the times'
                : Ue
                  ? 'Single date · pick another for a range'
                  : 'Date range selected'
          : 'Select a date',
        ye = (re?: any, ce?: any, we?: any) => (
          <button
            type="button"
            onClick={() => Y(re)}
            aria-label={ce}
            style={
              {
                width: 26,
                height: 26,
                border: 'none',
                borderRadius: 6,
                background: '#F7F8FA',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                color: '#0B1B2B',
              } as any
            }
          >
            <Svg s={12} w={2.4}>
              <path d={we} />
            </Svg>
          </button>
        );
      return (
        <div
          style={
            {
              position: 'absolute',
              left: 0,
              top: 'calc(100% + 4px)',
              zIndex: 10,
              width: 290,
              boxSizing: 'border-box',
              background: '#fff',
              borderRadius: 12,
              boxShadow: POPUP_SHADOW,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            } as any
          }
        >
          <div
            style={
              {
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              } as any
            }
          >
            <div
              style={
                {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                } as any
              }
            >
              {oe('From Date')}
              {_(q, lt === 'from')}
              {oe('From Time')}
              <TimePicker
                value={E.fromT}
                onChange={(re?: any) =>
                  b({
                    ...E,
                    fromT: re,
                  })
                }
                open={w === 'from'}
                onToggle={() => x((re?: any) => (re === 'from' ? null : 'from'))}
                error={_t}
                align="left"
              />
            </div>
            <div
              style={
                {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                } as any
              }
            >
              {oe('To Date')}
              {_(De, lt === 'to')}
              {oe('To Time')}
              <TimePicker
                value={E.toT}
                onChange={(re?: any) =>
                  b({
                    ...E,
                    toT: re,
                  })
                }
                open={w === 'to'}
                onToggle={() => x((re?: any) => (re === 'to' ? null : 'to'))}
                error={_t}
                align="right"
              />
            </div>
          </div>
          <div
            style={
              {
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: 8,
                borderRadius: 10,
                boxShadow: 'inset 0 0 0 1px #E9ECEF',
              } as any
            }
          >
            <div
              style={
                {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                } as any
              }
            >
              {ye(-1, 'Previous month', 'm15 18-6-6 6-6')}
              <span
                style={
                  {
                    fontSize: 12.5,
                    fontWeight: 700,
                  } as any
                }
              >
                {R.toLocaleDateString('en-GB', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              {ye(1, 'Next month', 'm9 18 6-6-6-6')}
            </div>
            <div
              style={
                {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7,1fr)',
                  rowGap: 2,
                } as any
              }
            >
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((re?: any) => (
                <span
                  key={re}
                  style={
                    {
                      textAlign: 'center',
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#748093',
                      padding: '2px 0',
                    } as any
                  }
                >
                  {re}
                </span>
              ))}
              {F}
            </div>
          </div>
          <div
            style={
              {
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingTop: 8,
                borderTop: '1px solid #EEF0F2',
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
              {Ae}
            </span>
            <button
              type="button"
              onClick={() =>
                b({
                  ...E,
                  from: '',
                  to: '',
                })
              }
              style={
                {
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
                } as any
              }
            >
              Clear
            </button>
            <button
              type="button"
              onClick={te}
              disabled={!q || _t || Qe}
              style={
                {
                  height: 30,
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
                  opacity: !q || _t || Qe ? 0.5 : 1,
                  textShadow: '0 1px 2px rgba(1,29,50,.35)',
                } as any
              }
            >
              Done
            </button>
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
      >
        <div
          role="radiogroup"
          aria-label="Date range"
          style={
            {
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            } as any
          }
        >
          {[
            ['today', 'Today'],
            ['yesterday', 'Yesterday'],
            ['custom', 'Custom'],
          ].map(([R, ue]: any) => {
            const Ce = v.mode === R;
            return (
              <button
                key={R}
                type="button"
                role="radio"
                aria-checked={Ce}
                onClick={() => Q(R)}
                style={
                  {
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
                  } as any
                }
              >
                <span
                  style={
                    {
                      width: 9,
                      height: 9,
                      boxSizing: 'border-box',
                      borderRadius: '50%',
                      boxShadow: `inset 0 0 0 1.5px ${Ce ? '#0B9467' : '#9AA3AE'}`,
                      display: 'grid',
                      placeItems: 'center',
                    } as any
                  }
                >
                  <span
                    style={
                      {
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: Ce ? '#0B9467' : 'transparent',
                      } as any
                    }
                  />
                </span>
                {ue}
              </button>
            );
          })}
        </div>
      </FilterRow>
      <div
        style={
          {
            marginTop: 10,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          } as any
        }
      >
        <span
          style={
            {
              fontSize: 11.5,
              lineHeight: '13px',
              color: '#1F2937',
            } as any
          }
        >
          Date range
        </span>
        <button
          type="button"
          onClick={P}
          disabled={B}
          aria-label="Select date range"
          style={
            {
              height: 30,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 10px',
              border: 'none',
              borderRadius: 8,
              background: B ? '#F7F8FA' : '#fff',
              boxShadow: E ? BORDER_ACTIVE : BORDER,
              fontFamily: 'inherit',
              fontSize: 12,
              color: B ? '#94A0AF' : '#3D4A5C',
              cursor: B ? 'default' : 'pointer',
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
            {Ee}
          </span>
          <Chevron open={!!E} />
        </button>
        {ze}
      </div>
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
