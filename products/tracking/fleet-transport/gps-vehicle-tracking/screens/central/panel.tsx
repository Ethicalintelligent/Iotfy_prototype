// IT-0036. The vehicle panel shown over the overview's map (original: nU, inline styles kept) and the
// speed HUD that holds it (original: K7).
import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '../smart-track/kit';
import { latLngText, type LatLng } from './analysis';
import { SpeedGauge, cssVars } from './parts';

const PANEL_W = 716;
const PANEL_W_NO_VEHICLE = 664;
const DATES_W = 250;
const FONT = "'Instrument Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (min: number | undefined) => {
  const t = Math.max(0, Math.round(min || 0));
  return `${Math.floor(t / 60)} h ${pad(t % 60)} m`;
};
function stamp(v: string | number | Date) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return { datePart: String(v ?? ''), timePart: '' };
  const h = d.getHours();
  return {
    datePart: `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    timePart: `${pad(h % 12 || 12)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${h >= 12 ? 'PM' : 'AM'}`,
  };
}
const GRADIENT: Record<string, string> = {
  red: 'linear-gradient(90deg,#FF1414 0%,#FF6A6A 100%)',
  orange: 'linear-gradient(90deg,#FF5A14 0%,#FF9447 100%)',
  yellow: 'linear-gradient(90deg,#F5A70A 0%,#FFD15C 100%)',
  green: 'linear-gradient(90deg,#009863 0%,#03AD86 100%)',
  grey: 'linear-gradient(90deg,#7C8798 0%,#AEB5C0 100%)',
};
const LEVEL: Record<string, string> = {
  'very high': 'green',
  high: 'yellow',
  medium: 'orange',
  low: 'red',
};
const batteryLevel = (v?: string) => {
  const k = v ? LEVEL[v.trim().toLowerCase()] : undefined;
  return k && v ? { key: k, name: v.trim() } : { key: 'grey', name: 'Not Available' };
};
const batteryPct = (p: number | null | undefined) =>
  p == null
    ? { key: 'grey', name: 'Not Available' }
    : p < 25
      ? { key: 'red', name: 'Low' }
      : p < 50
        ? { key: 'orange', name: 'Medium' }
        : p < 80
          ? { key: 'yellow', name: 'High' }
          : { key: 'green', name: 'Very High' };
const gsmLevel = (g: number | null | undefined) =>
  g == null
    ? { key: 'grey', name: 'Not Available' }
    : g <= 10
      ? { key: 'red', name: 'Low' }
      : g <= 20
        ? { key: 'yellow', name: 'Medium' }
        : { key: 'green', name: 'High' };
const mask = (svg: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000">${svg}</svg>`)}") center / contain no-repeat`;
const BATTERY_MASK = mask(
  '<rect x="7" y="4" width="10" height="18" rx="2"/><rect x="10" y="2" width="4" height="3" rx="1"/>',
);
const GSM_MASK = mask('<path d="M21 3v18H3z"/>');
const OK = '#12955F';
const BAD = '#FF4D4F';
const NONE = '#B3B9C0';
const AC_ON = '#1E88E5';
const DOOR_COLOR: Record<string, string> = {
  open: '#F76C09',
  closed: '#0E7F5E',
  notconfigured: '#B3B9C0',
};
const DOOR_TEXT: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
  notconfigured: 'Not configured',
};
const BOXES = {
  running: { label: 'Running', bg: 'var(--eit-active-gradient)', ring: '#03AD86' },
  stop: {
    label: 'Stopped',
    bg: 'linear-gradient(90deg, #F90507 0%, #FF8887 100%)',
    ring: '#FF8887',
  },
  idle: { label: 'Idle', bg: 'linear-gradient(90deg, #0363FF 0%, #74AAFF 100%)', ring: '#74AAFF' },
} as const;
const LABEL: CSSProperties = {
  fontSize: 11,
  lineHeight: '13px',
  fontWeight: 400,
  color: '#6B7685',
};
const VALUE: CSSProperties = { fontSize: 12, lineHeight: '15px', fontWeight: 600 };
const ELLIPSIS: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
const STATUS_KIND: Record<string, string> = {
  running: 'running',
  stopped: 'stop',
  stop: 'stop',
  idle: 'idle',
  overspeed: 'overspeed',
  towed: 'towed',
  notrans: 'notrans',
  'no transmit': 'notrans',
  ytt: 'ytt',
  'yet to transmit': 'ytt',
};
const kindOf = (s: string) =>
  STATUS_KIND[
    String(s ?? 'running')
      .trim()
      .toLowerCase()
  ] ?? 'running';
const STATUS_COLOR: Record<string, string> = {
  running: '#009863',
  stop: '#F90507',
  idle: '#0363FF',
  overspeed: '#F76C09',
  towed: '#07B1B4',
  notrans: '#2B333C',
  ytt: '#8D99A8',
};

function FuelIcon({ pct }: { pct?: number | null }) {
  const lvl = pct == null ? 0 : (Math.max(0, Math.min(100, pct)) / 100) * 5;
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" style={{ display: 'block' }} aria-hidden="true">
      <path d="M1 5V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3ZM0 10h8v1H0Z" fill="currentColor" />
      <rect
        x="1"
        y="5"
        width="6"
        height="5"
        fill="currentColor"
        fillOpacity={pct == null ? 1 : 0.3}
      />
      {lvl > 0 && (
        <rect data-level="" x="1" y={10 - lvl} width="6" height={lvl} fill="currentColor" />
      )}
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
}
function DoorIcon({ back }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" style={{ display: 'block' }} aria-hidden="true">
      <g transform={back ? 'matrix(-1 0 0 1 24 0)' : undefined}>
        <path
          d="M2 22V10.2c0-.5.2-1 .5-1.3L8.4 2.6c.4-.4.9-.6 1.4-.6H20a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2Z"
          fill="currentColor"
        />
        <path d="M6 9.5 9.6 5.5H19v4Z" fill="#fff" fillOpacity=".85" />
      </g>
    </svg>
  );
}

export interface HistoryDate {
  day: string;
  range: string;
  noData: boolean;
  color?: string;
}

export interface PanelInfo {
  plate: string;
  img?: string;
  model?: string;
  operator?: string;
  operatorId?: string;
  mode: 'live' | 'history';
  date: string | number;
  status: string;
  speed: number;
  ignition?: boolean;
  runningMin?: number;
  stoppedMin?: number;
  idleMin?: number;
  noVehicle?: boolean;
  location?: LatLng;
  odometerKm?: number;
  gpsSatellites?: number;
  gsm?: number;
  batteryLevel?: string;
  batteryPct?: number;
  vehicleBatteryV?: number;
  externalPower?: boolean;
  ac?: boolean;
  fuelPct?: number;
  frontDoor?: string;
  backDoor?: string;
  historyDates?: HistoryDate[];
  activeDateIndex?: number;
  mergedDates?: boolean;
  onSelectDate?: (i: number) => void;
  onPlayDate?: (i: number) => void;
}

export function VehiclePanel(e: PanelInfo & { compact?: boolean; onMinimize?: () => void }) {
  const kind = kindOf(e.status);
  const silent = kind === 'notrans' || kind === 'ytt';
  const multi = (e.historyDates?.length ?? 0) > 1;
  const history = e.mode === 'history';
  const { datePart, timePart } = stamp(e.date);
  const [hover, setHover] = useState<number | null>(null);
  const m = history
    ? { gridGap: 24, gaugeMargin: '0 12px 0 14px', rightPad: '0 0 0 16px', cardMin: 56 }
    : { gridGap: 20, gaugeMargin: '0 8px 0 10px', rightPad: '0 0 0 12px', cardMin: 56 };
  const sats = silent ? 0 : e.gpsSatellites;
  const gsm = silent ? undefined : e.gsm;
  const bat = e.batteryPct == null ? batteryLevel(e.batteryLevel) : batteryPct(e.batteryPct);
  const sig = gsmLevel(gsm);
  const cut = e.externalPower === false;
  const color = {
    gps: sats == null ? NONE : sats === 0 ? BAD : OK,
    power: cut ? BAD : e.vehicleBatteryV == null && e.externalPower == null ? NONE : '#0E7F5E',
    ign: e.ignition == null ? NONE : e.ignition ? OK : BAD,
    ac: e.ac ? AC_ON : NONE,
  };
  const front = e.frontDoor ?? 'notconfigured';
  const back = e.backDoor ?? 'notconfigured';
  const tip = {
    gps:
      sats == null ? 'GPS: Not Available' : sats === 0 ? 'GPS: No fix' : `GPS: ${sats} satellites`,
    battery:
      e.batteryPct == null
        ? `Battery: ${bat.name}`
        : `Battery: ${e.batteryPct}%\nStatus: ${bat.name}`,
    power: cut
      ? `Vehicle battery: Disconnected${e.vehicleBatteryV == null ? '' : ` (${e.vehicleBatteryV.toFixed(1)} V)`}`
      : e.vehicleBatteryV != null
        ? `Vehicle battery: ${e.vehicleBatteryV.toFixed(1)} V`
        : e.externalPower
          ? 'Vehicle battery: Connected'
          : 'Vehicle battery: Not Available',
    gsm:
      gsm == null
        ? 'GSM Signal: —\nStatus: Not Available'
        : `GSM Signal: ${gsm}\nStatus: ${sig.name}`,
    ign:
      e.ignition == null
        ? 'Ignition: Not Available'
        : e.ignition
          ? 'Ignition: On'
          : 'Ignition: Off',
    ac: e.ac == null ? 'AC: Not configured' : e.ac ? 'AC: On' : 'AC: Off',
    fuel: e.fuelPct == null ? 'Fuel: Not configured' : `Fuel: ${Math.round(e.fuelPct)}%`,
    front: `Front door: ${DOOR_TEXT[front]}`,
    back: `Back door: ${DOOR_TEXT[back]}`,
  };
  const minutes = { running: e.runningMin, stop: e.stoppedMin, idle: e.idleMin };
  const operator = e.operator && e.operator.trim() ? e.operator : 'Unassigned';
  const where = e.location ? latLngText(e.location) : null;
  const dateBlock = (style: CSSProperties) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, ...style }}>
      <span style={LABEL}>Date</span>
      <span style={{ ...VALUE, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {datePart} <span style={{ fontWeight: 500, color: '#6B7685' }}>{timePart}</span>
      </span>
    </div>
  );
  const operatorBlock = (style: CSSProperties) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, ...style }}>
      <span style={LABEL}>Operator</span>
      <span style={{ ...VALUE, maxWidth: 150, ...ELLIPSIS }} title={operator}>
        {operator}
      </span>
      <span style={{ ...LABEL, whiteSpace: 'nowrap' }}>
        <span style={{ fontWeight: 700 }}>ID:</span> {e.operatorId || '—'}
      </span>
    </div>
  );
  const sq = (title: string, c: string, child: ReactNode) => (
    <span
      title={title}
      style={{ display: 'grid', placeItems: 'center', width: 12, height: 12, color: c }}
    >
      {child}
    </span>
  );
  const masked = (title: string, bg: string, mk: string) => (
    <span
      title={title}
      style={{ display: 'block', width: 12, height: 12, background: bg, WebkitMask: mk, mask: mk }}
    />
  );
  return (
    <div
      style={{
        position: 'relative',
        width: e.compact ? '100%' : multi || e.noVehicle ? 'fit-content' : PANEL_W,
        height: e.compact ? 'auto' : 94,
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
        padding: '4px 34px 4px 14px',
        fontFamily: FONT,
        color: '#0B1B2B',
      }}
    >
      {e.noVehicle ? (
        <>
          <div
            title={`Date: ${datePart} ${timePart}`}
            style={{
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
              background: BOXES.running.bg,
              color: '#fff',
              fontSize: 11,
              lineHeight: '13px',
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ fontWeight: 600 }}>{datePart}</span>
            <span style={{ fontWeight: 500 }}>{timePart}</span>
          </div>
          <div
            style={{
              width: 'max-content',
              maxWidth: 194,
              alignSelf: 'stretch',
              boxSizing: 'border-box',
              paddingTop: 21,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              flexShrink: 0,
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: 11, lineHeight: '13px', color: '#6B7685' }}>Operator</span>
            <span
              title={operator}
              style={{
                ...ELLIPSIS,
                fontSize: 13,
                lineHeight: '17px',
                fontWeight: 600,
                color: '#0B1B2B',
              }}
            >
              {operator}
            </span>
            <span style={{ ...ELLIPSIS, fontSize: 11, lineHeight: '14px', color: '#6B7685' }}>
              ID: {e.operatorId?.trim() || '—'}
            </span>
            {where && e.location && (
              <a
                href={`https://www.google.com/maps?q=${e.location[0]},${e.location[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Location: ${where}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  minWidth: 0,
                  fontSize: 11,
                  lineHeight: '14px',
                  color: '#3D4A5C',
                  textDecoration: 'none',
                  fontVariantNumeric: 'tabular-nums',
                }}
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
                  style={{ display: 'block', flexShrink: 0 }}
                  aria-hidden="true"
                >
                  <path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span style={ELLIPSIS}>{where}</span>
              </a>
            )}
          </div>
        </>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto',
            gridTemplateRows: '44px auto',
            columnGap: m.gridGap,
            rowGap: 4,
            alignItems: 'start',
            alignContent: 'center',
            alignSelf: 'center',
            flexShrink: 0,
          }}
        >
          <img
            src={e.img}
            alt={e.model || e.plate}
            style={{
              width: 60,
              height: 42,
              objectFit: 'contain',
              display: 'block',
              justifySelf: 'center',
              alignSelf: 'end',
              transform: 'translateY(6px)',
            }}
          />
          {dateBlock({ paddingBottom: 2, alignSelf: 'end', transform: 'translateY(-4px)' })}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              transform: 'translateY(6px)',
            }}
          >
            <span style={{ ...LABEL, whiteSpace: 'nowrap' }}>Plate Number</span>
            <span style={{ ...VALUE, whiteSpace: 'nowrap' }}>{e.plate}</span>
          </div>
          {operatorBlock({ transform: 'translateY(-4px)' })}
        </div>
      )}
      {multi && (
        <>
          <div
            style={{
              display: e.compact ? 'none' : undefined,
              width: 1,
              alignSelf: 'stretch',
              margin: '12px 0 12px 12px',
              background: '#E3E6EA',
              flexShrink: 0,
            }}
          />
          <div
            style={{
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
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="#6B7685"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'block', flexShrink: 0 }}
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span style={{ ...LABEL, whiteSpace: 'nowrap' }}>Selected History Dates</span>
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                paddingRight: 4,
                scrollbarWidth: 'thin',
                scrollbarColor: '#C3CAD3 transparent',
              }}
            >
              {e.historyDates!.map((d, i) => {
                const on = !e.mergedDates && !d.noData && i === (e.activeDateIndex ?? 0);
                const bg = on ? '#EAF7F1' : hover === i && !d.noData ? '#F4F6F8' : 'transparent';
                return (
                  <button
                    key={i}
                    type="button"
                    title={`${d.day} ${d.noData ? '· No data' : d.range}`}
                    disabled={d.noData}
                    aria-pressed={on}
                    onClick={() => e.onSelectDate?.(i)}
                    onDoubleClick={() => e.onPlayDate?.(i)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      flexShrink: 0,
                      height: 20,
                      boxSizing: 'border-box',
                      padding: '0 6px',
                      border: 'none',
                      borderRadius: 6,
                      background: bg,
                      boxShadow: on ? 'inset 0 0 0 1px #92DBCB' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: d.noData ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 11,
                      lineHeight: '14px',
                      whiteSpace: 'nowrap',
                      textAlign: 'left',
                    }}
                  >
                    {d.color && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: d.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span style={{ fontWeight: 500, color: d.noData ? '#94A0AF' : '#0B1B2B' }}>
                      {d.day}
                    </span>
                    <span style={{ fontWeight: 400, color: d.noData ? '#94A0AF' : '#6B7685' }}>
                      {d.noData ? 'No data' : d.range}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      <div
        style={{
          position: 'relative',
          width: 126,
          height: 82,
          flexShrink: 0,
          margin: m.gaugeMargin,
        }}
      >
        <SpeedGauge
          speed={e.speed}
          status={e.status}
          width={124}
          badgeStyle="playback"
          style={{ position: 'absolute', left: 1, top: -2.7 }}
        />
      </div>
      <div
        style={{
          display: e.compact ? 'none' : undefined,
          width: 1,
          alignSelf: 'stretch',
          margin: '12px 0',
          background: '#E3E6EA',
          flexShrink: 0,
        }}
      />
      <div
        style={{
          flex: e.compact ? '0 1 auto' : 1,
          minWidth: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 8,
          padding: m.rightPad,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            <span style={LABEL}>Odometer</span>
            <span style={{ ...VALUE, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {e.odometerKm == null ? '—' : `${Math.round(e.odometerKm)} km`}
            </span>
          </div>
          <div style={{ width: 1, background: '#E3E6EA', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span style={{ ...LABEL, whiteSpace: 'nowrap' }}>Vehicle Sensors:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              {sq(
                tip.gps,
                color.gps,
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: 'block' }}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="7" />
                  <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>,
              )}
              {masked(tip.battery, GRADIENT[bat.key]!, BATTERY_MASK)}
              {sq(
                tip.power,
                color.power,
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="currentColor"
                  stroke="none"
                  style={{ display: 'block' }}
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
                </svg>,
              )}
              {masked(tip.gsm, GRADIENT[sig.key]!, GSM_MASK)}
              {sq(
                tip.ign,
                color.ign,
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: 'block' }}
                  aria-hidden="true"
                >
                  <circle cx="7.5" cy="15.5" r="4.5" />
                  <path d="m10.7 12.3 9.3-9.3M17 6l3 3M15 8l2 2" />
                </svg>,
              )}
              {sq(
                tip.ac,
                color.ac,
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: 'block' }}
                  aria-hidden="true"
                >
                  <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" />
                </svg>,
              )}
              {sq(
                tip.fuel,
                e.fuelPct == null ? DOOR_COLOR.notconfigured! : '#0E7F5E',
                <FuelIcon pct={e.fuelPct} />,
              )}
              {sq(tip.front, DOOR_COLOR[front]!, <DoorIcon />)}
              {sq(tip.back, DOOR_COLOR[back]!, <DoorIcon back />)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['running', 'stop', 'idle'] as const).map((k) => (
            <div
              key={k}
              title={`${BOXES[k].label}: ${hhmm(minutes[k])}`}
              style={{
                flex: '1 1 0',
                minWidth: m.cardMin,
                maxWidth: 66,
                height: 30,
                boxSizing: 'border-box',
                borderRadius: 9,
                background: BOXES[k].bg,
                boxShadow: `inset 0 0 0 1.5px ${BOXES[k].ring}`,
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textShadow: '0 1px 2px rgba(1,29,50,.35)',
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  lineHeight: 1.2,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {hhmm(minutes[k])}
              </span>
              <span
                style={{ fontSize: 9.5, lineHeight: 1.2, fontWeight: 400, whiteSpace: 'nowrap' }}
              >
                {BOXES[k].label}
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
          style={{
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
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ display: 'block' }}
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** True while the panel's parent is wide enough for the full panel (original: lU). */
function useFits(el: HTMLElement | null, need: number) {
  const [fits, setFits] = useState(true);
  useLayoutEffect(() => {
    const parent = el?.parentElement;
    if (!parent) return;
    const check = () => setFits(parent.clientWidth >= need + 16);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [el, need]);
  return fits;
}
const PHONE = '(max-width: 639px)';
function useGaugeWidth() {
  const [phone, setPhone] = useState(() => window.matchMedia?.(PHONE).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(PHONE);
    if (!mq) return;
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone ? 82 : 124;
}
const NARROW = '(max-width: 1023px)';
const speedTone = (kmh: number, limit: number) =>
  kmh < 5 ? 'gray' : kmh < limit * 0.75 ? 'green' : kmh < limit ? 'amber' : 'red';

/** The speedometer over the map; with vehicle info it shows the vehicle panel instead (original: K7). */
export function SpeedHud({
  speed,
  limit,
  tone,
  status,
  panel,
  children,
}: {
  speed: number;
  limit: number;
  tone: string;
  status: string;
  panel?: PanelInfo | null;
  children?: ReactNode;
}) {
  const [min, setMin] = useState(() => !!panel && (window.matchMedia?.(NARROW).matches ?? false));
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const fits = useFits(
    box,
    (panel?.noVehicle ? PANEL_W_NO_VEHICLE : PANEL_W) +
      ((panel?.historyDates?.length ?? 0) > 1 ? DATES_W : 0),
  );
  const gauge = useGaugeWidth();
  if (panel && !min)
    return (
      <div ref={setBox} className={`td-live__panel ${fits ? '' : 'is-compact'}`}>
        <VehiclePanel {...panel} compact={!fits} onMinimize={() => setMin(true)} />
      </div>
    );
  return (
    <section
      className={`td-live__hud tone-${tone} ${min ? 'is-min' : ''} ${panel ? 'has-panel' : ''}`}
      style={panel ? cssVars({ '--tone': STATUS_COLOR[kindOf(status)]! }) : undefined}
    >
      {min ? (
        <span className={`td-live__mini ${panel ? '' : `tone-${speedTone(speed, limit)}`}`}>
          <Icon name="Gauge" size={16} />
          <b>{speed}</b>
          <small>km/h</small>
        </span>
      ) : (
        <>
          <SpeedGauge speed={speed} status={status} width={gauge} badgeStyle="playback" />
          {children}
        </>
      )}
      <button
        type="button"
        className="td-live__hudbtn"
        aria-expanded={!min}
        aria-label={min ? 'Show speedometer' : 'Minimise speedometer'}
        title={min ? 'Show speedometer' : 'Minimise'}
        onClick={() => setMin((x) => !x)}
      >
        <Icon name={min ? 'Expand' : 'Minus'} size={13} />
      </button>
    </section>
  );
}
