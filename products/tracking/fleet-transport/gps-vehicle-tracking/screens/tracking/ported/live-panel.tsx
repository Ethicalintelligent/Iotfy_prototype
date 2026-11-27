// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Icon } from '../icon';
import { MOVING_KMH, formatLatLng, localIso } from './format';
import { GAUGE_COLORS, GAUGE_STATUS_LABEL, Speedometer, gaugeColor, gaugeStatus } from './speedometer';

export const PANEL_WIDTH = 716;

export const PANEL_WIDTH_COMPACT = 664;

export const PANEL_MIN = 250;

/** IT-0055: the redesigned card (plate column added) needs about this much room. */
export const PANEL_WIDTH_CARD = 760;

export const PANEL_FONT =
  "'Instrument Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const PANEL_MONTHS: any = [
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

export const pad = (e?: any) => String(e).padStart(2, '0');

export const formatHoursMinutes = (e?: any) => {
  const t = Math.max(0, Math.round(e || 0));
  return `${Math.floor(t / 60)} h ${pad(t % 60)} m`;
};

export function splitDateTime(e?: any) {
  const t = e instanceof Date ? e : new Date(e);
  if (isNaN(t.getTime()))
    return {
      datePart: String(e ?? ''),
      timePart: '',
    };
  const [n = 1970, r = 1, i = 1, s = 0, a = 0, l = 0] = localIso(t).split(/[-T:]/).map(Number),
    c = s >= 12 ? 'PM' : 'AM',
    f = s % 12 || 12;
  return {
    datePart: `${pad(i)} ${PANEL_MONTHS[r - 1]} ${n}`,
    timePart: `${pad(f)}:${pad(a)}:${pad(l)} ${c}`,
  };
}

export const LEVEL_GRADIENTS: any = {
  red: 'linear-gradient(90deg,#FF1414 0%,#FF6A6A 100%)',
  orange: 'linear-gradient(90deg,#FF5A14 0%,#FF9447 100%)',
  yellow: 'linear-gradient(90deg,#F5A70A 0%,#FFD15C 100%)',
  green: 'linear-gradient(90deg,#009863 0%,#03AD86 100%)',
  grey: 'linear-gradient(90deg,#7C8798 0%,#AEB5C0 100%)',
};

export const BATTERY_LEVELS: any = {
  'very high': 'green',
  high: 'yellow',
  medium: 'orange',
  low: 'red',
};

export const batteryLevel = (e?: any) => {
  const t = e ? BATTERY_LEVELS[e.trim().toLowerCase()] : undefined;
  return t && e
    ? {
        key: t,
        name: e.trim(),
      }
    : {
        key: 'grey',
        name: 'Not Available',
      };
};

export const percentLevel = (e?: any) =>
  e == null
    ? {
        key: 'grey',
        name: 'Not Available',
      }
    : e < 25
      ? {
          key: 'red',
          name: 'Low',
        }
      : e < 50
        ? {
            key: 'orange',
            name: 'Medium',
          }
        : e < 80
          ? {
              key: 'yellow',
              name: 'High',
            }
          : {
              key: 'green',
              name: 'Very High',
            };

export const gsmLevel = (e?: any) =>
  e == null
    ? {
        key: 'grey',
        name: 'Not Available',
      }
    : e <= 10
      ? {
          key: 'red',
          name: 'Low',
        }
      : e <= 20
        ? {
            key: 'yellow',
            name: 'Medium',
          }
        : {
            key: 'green',
            name: 'High',
          };

export const maskUrl = (e?: any) =>
  `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000">' + e + '</svg>')}") center / contain no-repeat`;

export const BATTERY_MASK = maskUrl(
  '<rect x="7" y="4" width="10" height="18" rx="2"/><rect x="10" y="2" width="4" height="3" rx="1"/>',
);

export const SIGNAL_MASK = maskUrl('<path d="M21 3v18H3z"/>');

export const SENSOR_ON = '#12955F';

export const SENSOR_ALERT = '#FF4D4F';

export const SENSOR_OFF = '#B3B9C0';

export const SENSOR_BLUE = '#1E88E5';

export const DOOR_COLORS: any = {
  open: '#F76C09',
  closed: '#0E7F5E',
  notconfigured: '#B3B9C0',
};

export const DOOR_LABELS: any = {
  open: 'Open',
  closed: 'Closed',
  notconfigured: 'Not configured',
};

export const FuelIcon = ({ pct }: any) => {
  const t = pct == null ? 0 : (Math.max(0, Math.min(100, pct)) / 100) * 5;
  return (
    <svg
      viewBox="0 0 12 12"
      width="12"
      height="12"
      style={
        {
          display: 'block',
        } as any
      }
      aria-hidden="true"
    >
      <path d="M1 5V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3ZM0 10h8v1H0Z" fill="currentColor" />
      <rect
        x="1"
        y="5"
        width="6"
        height="5"
        fill="currentColor"
        fillOpacity={pct == null ? 1 : 0.3}
      />
      {t > 0 && <rect data-level="" x="1" y={10 - t} width="6" height={t} fill="currentColor" />}
      <rect x="2" y="2" width="4" height="2" fill="#fff" fillOpacity=".85" />
      <path
        d="M7 7.5h2.5a1 1 0 0 0 1-1V3.5L9 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const DoorIcon = ({ back }: any) => (
  <svg
    viewBox="0 0 24 24"
    width="12"
    height="12"
    style={
      {
        display: 'block',
      } as any
    }
    aria-hidden="true"
  >
    <g transform={back ? 'matrix(-1 0 0 1 24 0)' : undefined}>
      <path
        d="M2 22V10.2c0-.5.2-1 .5-1.3L8.4 2.6c.4-.4.9-.6 1.4-.6H20a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2Z"
        fill="currentColor"
      />
      <path d="M6 9.5 9.6 5.5H19v4Z" fill="#fff" fillOpacity=".85" />
    </g>
  </svg>
);

export const STATE_TILES: any = {
  running: {
    label: 'Running',
    bg: 'var(--eit-active-gradient)',
    ring: '#03AD86',
  },
  stop: {
    label: 'Stopped',
    bg: 'linear-gradient(90deg, #F90507 0%, #FF8887 100%)',
    ring: '#FF8887',
  },
  idle: {
    label: 'Idle',
    bg: 'linear-gradient(90deg, #0363FF 0%, #74AAFF 100%)',
    ring: '#74AAFF',
  },
};

/** The time badge's fill for a gauge status: the Running / Stopped / Idle tiles' own gradients,
 * the speedometer's colours for the others (Overspeed, Towed, No Transmit, Yet to Transmit). */
export const stampBackground = (k?: any) =>
  STATE_TILES[k]?.bg ??
  `linear-gradient(90deg, ${GAUGE_COLORS[k]?.c2 ?? '#009863'} 0%, ${GAUGE_COLORS[k]?.c1 ?? '#009863'} 100%)`;

/** IT-0055: the date tab in the status gradients of the vehicle cards (one status colour per card). */
export const CARD_TAB_GRADIENT: any = {
  running: 'linear-gradient(90deg,#005965 0%,#009863 100%)',
  stop: 'linear-gradient(90deg,#F90507 0%,#FF8887 100%)',
  idle: 'linear-gradient(90deg,#0363FF 0%,#74AAFF 100%)',
  notrans: 'linear-gradient(90deg,#1F2328 0%,#3A4048 55%,#6B7280 100%)',
  overspeed: 'linear-gradient(90deg,#FF5A14 0%,#FF9447 100%)',
  towed: 'linear-gradient(90deg,#2B98A5 0%,#86D0D6 100%)',
  ytt: 'linear-gradient(90deg,#7C8798 0%,#C3C9D2 100%)',
};

/** IT-0055: the minimised card's speed colour (the cards' status dots). */
export const MINI_COLOR: any = {
  running: '#009863',
  stop: '#F90507',
  idle: '#0363FF',
  notrans: '#1F2328',
  overspeed: '#FF6B2C',
  towed: '#4BA9B5',
  ytt: '#9AA3B2',
};

/** IT-0055: vehicle pictures with their blank border cut away, so each fills its box the same way. */
const TRIMMED: Record<string, string> = {};
function trimPicture(src: string, done: (url: string) => void) {
  if (TRIMMED[src]) return done(TRIMMED[src]);
  const im = new Image();
  im.onload = () => {
    let url = src;
    try {
      const w = im.naturalWidth,
        h = im.naturalHeight,
        c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const x = c.getContext('2d')!;
      x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, w, h).data;
      let x0 = w,
        y0 = h,
        x1 = -1,
        y1 = -1;
      for (let y = 0; y < h; y++)
        for (let i = 0; i < w; i++) {
          const k = (y * w + i) * 4;
          if (d[k + 3]! > 24 && !(d[k]! > 238 && d[k + 1]! > 238 && d[k + 2]! > 238)) {
            if (i < x0) x0 = i;
            if (i > x1) x1 = i;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      if (x1 > x0 && y1 > y0 && (x1 - x0 < w - 4 || y1 - y0 < h - 4)) {
        const o = document.createElement('canvas');
        o.width = x1 - x0 + 1;
        o.height = y1 - y0 + 1;
        o.getContext('2d')!.drawImage(im, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
        url = o.toDataURL('image/png');
      }
    } catch {
      /* keep the original picture */
    }
    TRIMMED[src] = url;
    done(url);
  };
  im.onerror = () => done(src);
  im.src = src;
}

export function TrimmedImg({ src, style }: any) {
  const [url, setUrl] = useState<string | null>(() => TRIMMED[src] ?? null);
  useEffect(() => {
    let live = true;
    trimPicture(src, (u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [src]);
  return (
    <img
      src={url ?? src}
      alt=""
      style={
        {
          width: 62,
          height: 34,
          objectFit: 'contain',
          margin: '0 0 4px 6px',
          visibility: url ? undefined : 'hidden',
          ...style,
        } as any
      }
    />
  );
}

export const CAPTION: any = {
  fontSize: 11,
  lineHeight: '13px',
  fontWeight: 400,
  color: '#6B7685',
};

export const VALUE: any = {
  fontSize: 12,
  lineHeight: '15px',
  fontWeight: 600,
};

export function PlaybackPanel(e?: any) {
  const t = gaugeStatus(e.status),
    n = t === 'notrans' || t === 'ytt',
    r = (e.historyDates?.length ?? 0) > 1,
    i = e.mode === 'history',
    { datePart: s, timePart: a } = splitDateTime(e.date),
    [l, c] = useState<any>(null),
    // IT-0055: the redesigned card (noVehicle) keeps the Live Track spacing in Track History too.
    f = i && !e.noVehicle
      ? {
          gridGap: 24,
          gaugeMargin: '0 12px 0 14px',
          rightPad: '0 0 0 16px',
          cardMin: 56,
        }
      : {
          gridGap: 20,
          gaugeMargin: '0 8px 0 10px',
          rightPad: '0 0 0 12px',
          cardMin: 56,
        },
    p = n ? 0 : e.gpsSatellites,
    h = n ? undefined : e.gsm,
    A = e.batteryPct == null ? batteryLevel(e.batteryLevel) : percentLevel(e.batteryPct),
    v = gsmLevel(h),
    y = e.externalPower === false,
    g: any = {
      gps: p == null ? SENSOR_OFF : p === 0 ? SENSOR_ALERT : SENSOR_ON,
      power: y
        ? SENSOR_ALERT
        : e.vehicleBatteryV == null && e.externalPower == null
          ? SENSOR_OFF
          : '#0E7F5E',
      ign: e.ignition == null ? SENSOR_OFF : e.ignition ? SENSOR_ON : SENSOR_ALERT,
      ac: e.ac ? SENSOR_BLUE : SENSOR_OFF,
    },
    E = e.frontDoor ?? 'notconfigured',
    b = e.backDoor ?? 'notconfigured',
    w: any = {
      gps: p == null ? 'GPS: Not Available' : p === 0 ? 'GPS: No fix' : `GPS: ${p} satellites`,
      battery:
        e.batteryPct == null
          ? `Battery: ${A.name}`
          : `Battery: ${e.batteryPct}%
Status: ${A.name}`,
      power: y
        ? `Vehicle battery: Disconnected${e.vehicleBatteryV == null ? '' : ` (${e.vehicleBatteryV.toFixed(1)} V)`}`
        : e.vehicleBatteryV != null
          ? `Vehicle battery: ${e.vehicleBatteryV.toFixed(1)} V`
          : e.externalPower
            ? 'Vehicle battery: Connected'
            : 'Vehicle battery: Not Available',
      gsm:
        h == null
          ? `GSM Signal: —
Status: Not Available`
          : `GSM Signal: ${h}
Status: ${v.name}`,
      ign:
        e.ignition == null
          ? 'Ignition: Not Available'
          : e.ignition
            ? 'Ignition: On'
            : 'Ignition: Off',
      ac: e.ac == null ? 'AC: Not configured' : e.ac ? 'AC: On' : 'AC: Off',
      fuel: e.fuelPct == null ? 'Fuel: Not configured' : `Fuel: ${Math.round(e.fuelPct)}%`,
      front: `Front door: ${DOOR_LABELS[E]}`,
      back: `Back door: ${DOOR_LABELS[b]}`,
    },
    x: any = {
      running: e.runningMin,
      stop: e.stoppedMin,
      idle: e.idleMin,
    },
    S = e.operator && e.operator.trim() ? e.operator : 'Unassigned',
    W = e.location ? formatLatLng(e.location[0], e.location[1]) : null,
    O = (J?: any) => (
      <div
        style={
          {
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            ...J,
          } as any
        }
      >
        <span style={CAPTION as any}>Date</span>
        <span
          style={
            {
              ...VALUE,
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
            } as any
          }
        >
          {s}{' '}
          <span
            style={
              {
                fontWeight: 500,
                color: '#6B7685',
              } as any
            }
          >
            {a}
          </span>
        </span>
      </div>
    ),
    C = (J?: any) => (
      <div
        style={
          {
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 0,
            ...J,
          } as any
        }
      >
        <span style={CAPTION as any}>Operator</span>
        <span
          style={
            {
              ...VALUE,
              maxWidth: 150,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            } as any
          }
          title={S}
        >
          {S}
        </span>
        <span
          style={
            {
              ...CAPTION,
              whiteSpace: 'nowrap',
            } as any
          }
        >
          <span
            style={
              {
                fontWeight: 700,
              } as any
            }
          >
            ID:
          </span>{' '}
          {e.operatorId || '—'}
        </span>
      </div>
    ),
    k: any = {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    };
  return (
    <div
      className={e.className}
      style={
        {
          position: 'relative',
          width: e.compact ? '100%' : r || e.noVehicle ? 'fit-content' : PANEL_WIDTH,
          // IT-0055: the redesigned card is 104px tall (date tab on top, plate column)
          height: e.compact ? 'auto' : e.noVehicle ? 104 : 94,
          boxSizing: 'border-box',
          background: '#fff',
          borderRadius: 16,
          boxShadow:
            '0 12px 32px rgba(1,29,50,.16), 0 2px 6px rgba(1,29,50,.06), inset 0 0 0 1px #E9ECEF',
          display: 'flex',
          flexWrap: e.compact ? 'wrap' : 'nowrap',
          alignItems: 'center',
          justifyContent: e.compact ? 'center' : 'flex-start',
          rowGap: 6,
          padding: e.noVehicle ? '4px 34px 4px 16px' : '4px 34px 4px 14px',
          fontFamily: PANEL_FONT,
          color: '#0B1B2B',
          ...e.style,
        } as any
      }
    >
      {e.noVehicle ? (
        <>
          <div
            title={`Date: ${s} ${a}`}
            style={
              {
                position: 'absolute',
                left: 0,
                top: 0,
                height: 18,
                boxSizing: 'border-box',
                padding: '0 10px 0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                borderRadius: '14px 0 10px 0',
                // IT-0041 round 5 (the developer's request): in Track History the time badge takes
                // the vehicle's status colour at the playback moment, as the speedometer does.
                // IT-0055: Live Track too: one status colour for the whole card (date tab,
                // speedometer, pin ring and ripple), in the cards' status gradients.
                background: CARD_TAB_GRADIENT[t] ?? stampBackground(t),
                transition: 'background .2s',
                color: '#fff',
                textShadow: '0 1px 2px rgba(1,21,44,.32)',
                fontSize: 11,
                lineHeight: '13px',
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
              } as any
            }
          >
            <span
              style={
                {
                  fontWeight: 600,
                } as any
              }
            >
              {s}
            </span>
            <span
              style={
                {
                  fontWeight: 500,
                } as any
              }
            >
              {a}
            </span>
          </div>
          {/* IT-0055: first column: the vehicle picture, "Plate Number" and the plate. */}
          <div
            className="td-card-platecol"
            style={
              {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: 1,
                flexShrink: 0,
                marginRight: 22,
                alignSelf: 'stretch',
                paddingTop: 20,
              } as any
            }
          >
            {e.img && <TrimmedImg src={e.img} />}
            <span style={{ fontSize: 11, lineHeight: '13px', color: '#6B7685' } as any}>
              Plate Number
            </span>
            <span
              style={
                {
                  fontSize: 13,
                  lineHeight: '17px',
                  fontWeight: 700,
                  color: '#0B1B2B',
                  whiteSpace: 'nowrap',
                } as any
              }
            >
              {e.plate}
            </span>
          </div>
          {/* IT-0055: operator and ID a little higher, a clear gap above the location (dark). */}
          <div
            style={
              {
                width: 'max-content',
                maxWidth: 190,
                alignSelf: 'stretch',
                boxSizing: 'border-box',
                paddingTop: 18,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 1,
                flexShrink: 0,
                minWidth: 0,
              } as any
            }
          >
            <span
              style={
                {
                  fontSize: 11,
                  lineHeight: '13px',
                  color: '#6B7685',
                } as any
              }
            >
              Operator
            </span>
            <span
              title={S}
              style={
                {
                  ...k,
                  fontSize: 13,
                  lineHeight: '17px',
                  fontWeight: 700,
                  color: '#0B1B2B',
                } as any
              }
            >
              {S}
            </span>
            <span
              style={
                {
                  ...k,
                  fontSize: 11,
                  lineHeight: '14px',
                  color: '#3D4A5C',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                } as any
              }
            >
              <span>
                <b style={{ fontWeight: 700, color: '#3D4A5C' } as any}>ID:</b>{' '}
                {e.operatorId?.trim() || '—'}
              </span>
            </span>
            {W && e.location && (
              <a
                href={`https://www.google.com/maps?q=${e.location[0]},${e.location[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Location: ${W}`}
                style={
                  {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    minWidth: 0,
                    marginTop: 7,
                    fontSize: 11,
                    lineHeight: '14px',
                    color: '#0B1B2B',
                    fontWeight: 500,
                    textDecoration: 'none',
                    fontVariantNumeric: 'tabular-nums',
                  } as any
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="#6B7685"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={
                    {
                      display: 'block',
                      flexShrink: 0,
                    } as any
                  }
                  aria-hidden="true"
                >
                  <path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span style={k as any}>{W}</span>
              </a>
            )}
          </div>
        </>
      ) : (
        <div
          style={
            {
              display: 'grid',
              gridTemplateColumns: 'auto auto',
              gridTemplateRows: '44px auto',
              columnGap: f.gridGap,
              rowGap: 4,
              alignItems: 'start',
              alignContent: 'center',
              alignSelf: 'center',
              flexShrink: 0,
            } as any
          }
        >
          <img
            src={e.img}
            alt={e.model || e.plate}
            style={
              {
                width: 60,
                height: 42,
                objectFit: 'contain',
                display: 'block',
                justifySelf: 'center',
                alignSelf: 'end',
                transform: 'translateY(6px)',
              } as any
            }
          />
          {O({
            paddingBottom: 2,
            alignSelf: 'end',
            transform: 'translateY(-4px)',
          })}
          <div
            style={
              {
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                transform: 'translateY(6px)',
              } as any
            }
          >
            <span
              style={
                {
                  ...CAPTION,
                  whiteSpace: 'nowrap',
                } as any
              }
            >
              Plate Number
            </span>
            <span
              style={
                {
                  ...VALUE,
                  whiteSpace: 'nowrap',
                } as any
              }
            >
              {e.plate}
            </span>
          </div>
          {C({
            transform: 'translateY(-4px)',
          })}
        </div>
      )}
      {r && (
        <>
          <div
            style={
              {
                // IT-0055: the card's dates column has its own left border (.pp-dates)
                display: e.compact || e.noVehicle ? 'none' : undefined,
                width: 1,
                alignSelf: 'stretch',
                margin: '12px 0 12px 12px',
                background: '#E3E6EA',
                flexShrink: 0,
              } as any
            }
          />
          <div
            style={
              {
                width: 'max-content',
                flexShrink: 0,
                alignSelf: 'stretch',
                maxHeight: e.compact ? 86 : undefined,
                boxSizing: 'border-box',
                padding: '3px 0 2px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minHeight: 0,
                // IT-0055: 'Selected History Dates' column of the redesigned card
                ...(e.noVehicle
                  ? {
                      padding: '8px 10px 8px 12px',
                      marginLeft: 4,
                      borderLeft: '1px solid #E3E6EA',
                    }
                  : {}),
              } as any
            }
          >
            <div
              style={
                {
                  display: 'flex',
                  alignItems: 'center',
                  gap: e.noVehicle ? 5 : 6,
                  flexShrink: 0,
                } as any
              }
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="#6B7685"
                strokeWidth={e.noVehicle ? 2 : 2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={
                  {
                    display: 'block',
                    flexShrink: 0,
                  } as any
                }
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span
                style={
                  {
                    ...CAPTION,
                    whiteSpace: 'nowrap',
                  } as any
                }
              >
                Selected History Dates
              </span>
            </div>
            <div
              style={
                {
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  paddingRight: 4,
                  scrollbarGutter: e.noVehicle ? 'stable' : undefined,
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#C3CAD3 transparent',
                } as any
              }
            >
              {e.historyDates.map((J?: any, G?: any) => {
                const $ = !e.mergedDates && !J.noData && G === (e.activeDateIndex ?? 0),
                  Z = $ ? '#EAF7F1' : l === G && !J.noData ? '#F4F6F8' : 'transparent';
                return (
                  <button
                    key={G}
                    type="button"
                    title={`${J.day} ${J.noData ? '· No data' : J.range}`}
                    disabled={J.noData}
                    aria-pressed={$}
                    onClick={() => {
                      return e.onSelectDate?.(G);
                    }}
                    onDoubleClick={() => {
                      return e.onPlayDate?.(G);
                    }}
                    onMouseEnter={() => c(G)}
                    onMouseLeave={() => c(null)}
                    style={
                      {
                        flexShrink: 0,
                        height: 20,
                        boxSizing: 'border-box',
                        padding: '0 6px',
                        border: 'none',
                        borderRadius: 6,
                        background: Z,
                        boxShadow: $ ? 'inset 0 0 0 1px #92DBCB' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: J.noData ? 'default' : 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 11,
                        lineHeight: '14px',
                        whiteSpace: 'nowrap',
                        textAlign: 'left',
                      } as any
                    }
                  >
                    {J.color && !e.noVehicle && (
                      <span
                        style={
                          {
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: J.color,
                            flexShrink: 0,
                          } as any
                        }
                      />
                    )}
                    <span
                      style={
                        {
                          fontWeight: 500,
                          color: J.noData ? '#94A0AF' : '#0B1B2B',
                        } as any
                      }
                    >
                      {J.day}
                    </span>
                    <span
                      style={
                        {
                          fontWeight: 400,
                          color: J.noData ? '#94A0AF' : '#6B7685',
                        } as any
                      }
                    >
                      {J.noData ? 'No data' : J.range}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      <div
        style={
          {
            position: 'relative',
            width: 126,
            height: 82,
            flexShrink: 0,
            margin: f.gaugeMargin,
          } as any
        }
      >
        <Speedometer
          speed={e.speed}
          status={e.status}
          width={124}
          badgeStyle="playback"
          style={
            {
              position: 'absolute',
              left: 1,
              top: -2.7,
            } as any
          }
        />
      </div>
      <div
        style={
          {
            display: e.compact ? 'none' : undefined,
            width: 1,
            alignSelf: 'stretch',
            margin: '12px 0',
            background: '#E3E6EA',
            flexShrink: 0,
          } as any
        }
      />
      <div
        style={
          {
            flex: e.compact ? '0 1 auto' : 1,
            minWidth: 0,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 8,
            padding: f.rightPad,
          } as any
        }
      >
        <div
          style={
            {
              display: 'flex',
              alignItems: 'stretch',
              gap: 16,
            } as any
          }
        >
          <div
            style={
              {
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                flexShrink: 0,
              } as any
            }
          >
            <span style={CAPTION as any}>Odometer</span>
            <span
              style={
                {
                  ...VALUE,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                } as any
              }
            >
              {e.odometerKm == null ? '—' : `${Math.round(e.odometerKm)} km`}
            </span>
          </div>
          <div
            style={
              {
                width: 1,
                background: '#E3E6EA',
                flexShrink: 0,
              } as any
            }
          />
          <div
            style={
              {
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                minWidth: 0,
              } as any
            }
          >
            <span
              style={
                {
                  ...CAPTION,
                  whiteSpace: 'nowrap',
                } as any
              }
            >
              Vehicle Sensors:
            </span>
            <div
              style={
                {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                } as any
              }
            >
              <span
                title={w.gps}
                style={
                  {
                    display: 'grid',
                    placeItems: 'center',
                    width: 12,
                    height: 12,
                    color: g.gps,
                  } as any
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={
                    {
                      display: 'block',
                    } as any
                  }
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="7" />
                  <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
              </span>
              <span
                title={w.battery}
                style={
                  {
                    display: 'block',
                    width: 12,
                    height: 12,
                    background: LEVEL_GRADIENTS[A.key],
                    WebkitMask: BATTERY_MASK,
                    mask: BATTERY_MASK,
                  } as any
                }
              />
              <span
                title={w.power}
                style={
                  {
                    display: 'grid',
                    placeItems: 'center',
                    width: 12,
                    height: 12,
                    color: g.power,
                  } as any
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="currentColor"
                  stroke="none"
                  style={
                    {
                      display: 'block',
                    } as any
                  }
                  aria-hidden="true"
                >
                  <rect x="2" y="7" width="20" height="13" rx="2" fill="currentColor" />
                  <path
                    d="M6 7V5h3v2M15 7V5h3v2"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M5.5 13.5h4M16 11.5v4M14 13.5h4"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span
                title={w.gsm}
                style={
                  {
                    display: 'block',
                    width: 12,
                    height: 12,
                    background: LEVEL_GRADIENTS[v.key],
                    WebkitMask: SIGNAL_MASK,
                    mask: SIGNAL_MASK,
                  } as any
                }
              />
              <span
                title={w.ign}
                style={
                  {
                    display: 'grid',
                    placeItems: 'center',
                    width: 12,
                    height: 12,
                    color: g.ign,
                  } as any
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={
                    {
                      display: 'block',
                    } as any
                  }
                  aria-hidden="true"
                >
                  <circle cx="7.5" cy="15.5" r="4.5" />
                  <path d="m10.7 12.3 9.3-9.3M17 6l3 3M15 8l2 2" />
                </svg>
              </span>
              <span
                title={w.ac}
                style={
                  {
                    display: 'grid',
                    placeItems: 'center',
                    width: 12,
                    height: 12,
                    color: g.ac,
                  } as any
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={
                    {
                      display: 'block',
                    } as any
                  }
                  aria-hidden="true"
                >
                  <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" />
                </svg>
              </span>
              <span
                title={w.fuel}
                style={
                  {
                    display: 'grid',
                    placeItems: 'center',
                    width: 12,
                    height: 12,
                    color: e.fuelPct == null ? DOOR_COLORS.notconfigured : '#0E7F5E',
                  } as any
                }
              >
                <FuelIcon pct={e.fuelPct} />
              </span>
              <span
                title={w.front}
                style={
                  {
                    display: 'grid',
                    placeItems: 'center',
                    width: 12,
                    height: 12,
                    color: DOOR_COLORS[E],
                  } as any
                }
              >
                <DoorIcon />
              </span>
              <span
                title={w.back}
                style={
                  {
                    display: 'grid',
                    placeItems: 'center',
                    width: 12,
                    height: 12,
                    color: DOOR_COLORS[b],
                  } as any
                }
              >
                <DoorIcon back={true} />
              </span>
            </div>
          </div>
        </div>
        <div
          style={
            {
              display: 'flex',
              gap: 8,
            } as any
          }
        >
          {['running', 'stop', 'idle'].map((J?: any) => (
            <div
              key={J}
              title={`${STATE_TILES[J].label}: ${formatHoursMinutes(x[J])}`}
              style={
                {
                  flex: '1 1 0',
                  minWidth: f.cardMin,
                  maxWidth: 66,
                  height: 30,
                  boxSizing: 'border-box',
                  borderRadius: 9,
                  background: STATE_TILES[J].bg,
                  boxShadow: `inset 0 0 0 1.5px ${STATE_TILES[J].ring}`,
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textShadow: '0 1px 2px rgba(1,29,50,.35)',
                } as any
              }
            >
              <span
                style={
                  {
                    fontSize: 10.5,
                    lineHeight: 1.2,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  } as any
                }
              >
                {formatHoursMinutes(x[J])}
              </span>
              <span
                style={
                  {
                    fontSize: 9.5,
                    lineHeight: 1.2,
                    fontWeight: 400,
                    whiteSpace: 'nowrap',
                  } as any
                }
              >
                {STATE_TILES[J].label}
              </span>
            </div>
          ))}
        </div>
      </div>
      {e.onMinimize && (
        <button
          type="button"
          onClick={e.onMinimize}
          title="Minimize"
          aria-label="Minimize details"
          style={
            {
              position: 'absolute',
              right: 8,
              top: 8,
              width: 20,
              height: 20,
              border: 'none',
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 2px 6px rgba(1,29,50,.18), inset 0 0 0 1px #EEF0F2',
              color: '#3D4A5C',
              display: 'grid',
              placeItems: 'center',
              padding: 0,
              cursor: 'pointer',
            } as any
          }
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={
              {
                display: 'block',
              } as any
            }
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function Kpis({ items }: any) {
  return (
    <div className="td-trk__kpis">
      {items.map((t?: any) => (
        <div key={t.label} className={`td-trk__kpi tone-${t.tone}`}>
          <span className="td-badge td-badge--sm">
            <Icon name={t.icon} size={13} />
          </span>
          <small>{t.label}</small>
          <b>{t.value}</b>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, text, children }: any) {
  return (
    <div className="td-trk__empty">
      <span className="td-badge td-badge--xl">
        <Icon name={icon} size={22} />
      </span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

export function LivePanel({ speed, limit, tone, status, panel, children }: any) {
  const [a, l] = useState<any>(() => {
      return !!panel && (window.matchMedia?.call(window, COMPACT_QUERY).matches ?? false);
    }),
    [c, f] = useState<any>(null),
    p = useFits(
      c,
      (panel != null && panel.noVehicle ? PANEL_WIDTH_CARD : PANEL_WIDTH) +
        ((panel?.historyDates?.length ?? 0) > 1 ? PANEL_MIN : 0),
    ),
    h = useIsPhone();
  // IT-0055: the minimised card keeps the card's look and shows the speed in the status colour,
  // with an expand button.
  if (panel?.noVehicle && a)
    return (
      <div ref={f} className="td-live__panel">
        <div
          style={
            {
              position: 'relative',
              width: 'fit-content',
              height: 36,
              boxSizing: 'border-box',
              background: '#fff',
              borderRadius: 16,
              boxShadow:
                '0 12px 32px rgba(1,29,50,.16), 0 2px 6px rgba(1,29,50,.06), inset 0 0 0 1px #E9ECEF',
              display: 'flex',
              alignItems: 'center',
              padding: '0 34px 0 14px',
              fontFamily: PANEL_FONT,
              color: '#0B1B2B',
            } as any
          }
        >
          <span
            title={`${GAUGE_STATUS_LABEL[gaugeStatus(panel.status)]} · ${panel.speed} km/h`}
            style={
              {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
                color: MINI_COLOR[gaugeStatus(panel.status)],
              } as any
            }
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m12 14 4-4" />
              <path d="M3.34 19a10 10 0 1 1 17.32 0" />
            </svg>
            <b style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' } as any}>
              {panel.speed}
            </b>
            <small style={{ fontSize: 11, color: '#6B7685' } as any}>km/h</small>
          </span>
          <button
            type="button"
            onClick={() => l(false)}
            title="Show details"
            aria-label="Show details"
            style={
              {
                position: 'absolute',
                right: 8,
                top: 5,
                width: 20,
                height: 20,
                border: 'none',
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 2px 6px rgba(1,29,50,.18), inset 0 0 0 1px #EEF0F2',
                color: '#3D4A5C',
                display: 'grid',
                placeItems: 'center',
                padding: 0,
                cursor: 'pointer',
              } as any
            }
          >
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ display: 'block' } as any}
              aria-hidden="true"
            >
              <path d="M15 3h6v6" />
              <path d="M9 21H3v-6" />
              <path d="M21 3l-7 7" />
              <path d="M3 21l7-7" />
            </svg>
          </button>
        </div>
      </div>
    );
  return panel && !a ? (
    <div ref={f} className={`td-live__panel ${p ? '' : 'is-compact'}`}>
      <PlaybackPanel {...panel} compact={!p} onMinimize={() => l(true)} />
    </div>
  ) : (
    <section
      className={`td-live__hud tone-${tone} ${a ? 'is-min' : ''} ${panel ? 'has-panel' : ''}`}
      style={
        (panel
          ? {
              '--tone': gaugeColor(status),
            }
          : undefined) as any
      }
    >
      {a ? (
        <span className={`td-live__mini ${panel ? '' : `tone-${speedTone(speed, limit)}`}`}>
          <Icon name="Gauge" size={16} />
          <b>{speed}</b>
          <small>km/h</small>
        </span>
      ) : (
        <>
          <Speedometer speed={speed} status={status} width={h} badgeStyle="playback" />
          {children}
        </>
      )}
      <button
        type="button"
        className="td-live__hudbtn"
        aria-expanded={!a}
        aria-label={a ? 'Show speedometer' : 'Minimise speedometer'}
        title={a ? 'Show speedometer' : 'Minimise'}
        onClick={() => l((v?: any) => !v)}
      >
        <Icon name={a ? 'Expand' : 'Minus'} size={13} />
      </button>
    </section>
  );
}

export function speedTone(e?: any, t?: any) {
  return e < MOVING_KMH ? 'gray' : e < t * 0.75 ? 'green' : e < t ? 'amber' : 'red';
}

export const PANEL_STATUS: any = {
  moving: 'running',
  stopped: 'stopped',
  idle: 'idle',
  overspeed: 'overspeed',
  towed: 'towed',
  offline: 'notrans',
  never: 'ytt',
};

export const panelStatus = (e?: any) => PANEL_STATUS[e];

export const pointStatus = (e?: any, t?: any, n?: any) =>
  e > n ? 'overspeed' : t ? 'running' : 'stopped';

export const COMPACT_QUERY = '(max-width: 1023px)';

export function useFits(e?: any, t?: any) {
  const [n, r] = useState<any>(true);
  useLayoutEffect(() => {
    const i = e?.parentElement;
    if (!i) return;
    const s = () => r(i.clientWidth >= t + 16);
    if ((s(), typeof ResizeObserver > 'u')) return;
    const a = new ResizeObserver(s);
    a.observe(i);
    return () => a.disconnect();
  }, [e, t]);
  return n;
}

export const PHONE_QUERY = '(max-width: 639px)';

export function useIsPhone() {
  const [e, t] = useState<any>(() => {
    return window.matchMedia?.call(window, PHONE_QUERY).matches ?? false;
  });
  useEffect(() => {
    const n = window.matchMedia?.(PHONE_QUERY);
    if (!n) return;
    const r = () => t(n.matches);
    n.addEventListener('change', r);
    return () => n.removeEventListener('change', r);
  }, []);
  return e ? 82 : 124;
}
