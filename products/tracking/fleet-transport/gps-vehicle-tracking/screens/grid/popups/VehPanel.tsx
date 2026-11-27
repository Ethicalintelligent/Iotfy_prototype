// IT-0055. The vehicle info card on the Live Monitor and Nearby maps (prototype vehPanel): the same
// markup as the Tracking page's live panel, redesigned: date tab top-left in the status gradient,
// plate column with the picture, operator + ID, location in dark font, speedometer in the status
// colours, odometer, sensors, duration tiles; minimised it shows the speed in the status colour.
// In Track History with 2+ dates it has a "Selected History Dates" column.
import { useEffect, useId, useRef } from 'react';
import {
  GREEN,
  NEUTRAL,
  RED,
} from '../model';
import { I, IC, Pic, stopMap, gaugeOf, hasDriver, hm, opId, rng, st, type PV } from './kit';

export interface DateItem {
  day: string;
  range: string;
  active: boolean;
  noData?: boolean;
}

const FONT = '"Instrument Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const SENS_BOX = { display: 'grid', placeItems: 'center', width: 12, height: 12 } as const;
const maskOf = (svg: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}") center center / contain no-repeat`;
const BATT_MASK = maskOf(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000"><rect x="7" y="4" width="10" height="18" rx="2"/><rect x="10" y="2" width="4" height="3" rx="1"/></svg>',
);
const GSM_MASK = maskOf('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000"><path d="M21 3v18H3z"/></svg>');
/** masked icons: red and grey keep the Tracking panel's gradients */
const fillOf = (c: string) =>
  c === RED
    ? 'linear-gradient(90deg, rgb(255, 20, 20) 0%, rgb(255, 106, 106) 100%)'
    : c === NEUTRAL
      ? 'linear-gradient(90deg, rgb(124, 135, 152) 0%, rgb(174, 181, 192) 100%)'
      : c;

function Sensors({ v }: { v: PV }) {
  const val = (k: string) => v.ind[k] ?? '—';
  const col = (k: string) => v.indColor[k] ?? NEUTRAL;
  const svg = (inner: string, filled = false, vb = '0 0 24 24') => (
    <svg
      viewBox={vb}
      width={12}
      height={12}
      aria-hidden="true"
      style={{ display: 'block' }}
      {...(filled
        ? { fill: 'currentColor', stroke: 'none' }
        : vb === '0 0 24 24'
          ? { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }
          : {})}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
  const DOOR =
    '<path d="M2 22V10.2c0-.5.2-1 .5-1.3L8.4 2.6c.4-.4.9-.6 1.4-.6H20a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2Z" fill="currentColor"></path><path d="M6 9.5 9.6 5.5H19v4Z" fill="#fff" fill-opacity=".85"></path>';
  const doorSvg = (inner: string) => (
    <svg viewBox="0 0 24 24" width={12} height={12} aria-hidden="true" style={{ display: 'block' }} dangerouslySetInnerHTML={{ __html: inner }} />
  );
  const ac = val('ac');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span title={`GPS: ${val('gps')}`} style={{ ...SENS_BOX, color: col('gps') === GREEN ? 'rgb(18, 149, 95)' : col('gps') }}>
        {svg('<circle cx="12" cy="12" r="7"></circle><circle cx="12" cy="12" r="2.5" fill="currentColor"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path>')}
      </span>
      <span
        title={`Battery: ${val('internal battery')}`}
        style={{ display: 'block', width: 12, height: 12, background: fillOf(col('internal battery')), WebkitMask: BATT_MASK, mask: BATT_MASK }}
      />
      <span title={`Vehicle battery: ${val('external power')}`} style={{ ...SENS_BOX, color: col('external power') }}>
        {svg(
          '<rect x="2" y="7" width="20" height="13" rx="2" fill="currentColor"></rect><path d="M6 7V5h3v2M15 7V5h3v2" stroke="currentColor" stroke-width="2" fill="none"></path><path d="M5.5 13.5h4M16 11.5v4M14 13.5h4" stroke="#fff" stroke-width="2" stroke-linecap="round"></path>',
          true,
        )}
      </span>
      <span
        title={`GSM Signal: ${val('gsm')}`}
        style={{ display: 'block', width: 12, height: 12, background: fillOf(col('gsm')), WebkitMask: GSM_MASK, mask: GSM_MASK }}
      />
      <span title={`Ignition: ${val('ignition')}`} style={{ ...SENS_BOX, color: col('ignition') === GREEN ? 'rgb(18, 149, 95)' : col('ignition') }}>
        {svg('<circle cx="7.5" cy="15.5" r="4.5"></circle><path d="m10.7 12.3 9.3-9.3M17 6l3 3M15 8l2 2"></path>')}
      </span>
      <span title={`AC: ${ac}`} style={{ ...SENS_BOX, color: ac === 'On' ? 'rgb(30, 136, 229)' : 'rgb(179, 185, 192)' }}>
        {svg('<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5"></path>')}
      </span>
      <span title="Fuel: Not configured" style={{ ...SENS_BOX, color: 'rgb(179, 185, 192)' }}>
        {svg(
          '<path d="M1 5V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3ZM0 10h8v1H0Z" fill="currentColor"></path><rect x="1" y="5" width="6" height="5" fill="currentColor" fill-opacity="1"></rect><rect x="2" y="2" width="4" height="2" fill="#fff" fill-opacity=".85"></rect><path d="M7 7.5h2.5a1 1 0 0 0 1-1V3.5L9 2" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></path>',
          false,
          '0 0 12 12',
        )}
      </span>
      <span title={`Front door: ${val('front door')}`} style={{ ...SENS_BOX, color: col('front door') }}>
        {doorSvg(`<g>${DOOR}</g>`)}
      </span>
      <span title={`Back door: ${val('back door')}`} style={{ ...SENS_BOX, color: col('back door') }}>
        {doorSvg(`<g transform="matrix(-1 0 0 1 24 0)">${DOOR}</g>`)}
      </span>
    </div>
  );
}

const TICKS = [
  [31.5, 87.76, 26.74, 89.3],
  [29.63, 64.02, 24.69, 63.24],
  [38.74, 42.02, 34.7, 39.08],
  [56.85, 26.56, 54.58, 22.1],
  [80, 21, 80, 16],
  [103.15, 26.56, 105.42, 22.1],
  [121.26, 42.02, 125.3, 39.08],
  [130.37, 64.02, 135.31, 63.24],
  [128.5, 87.76, 133.26, 89.3],
];
function Speedo({ s, status }: { s: number; status: string }) {
  const P = gaugeOf(status);
  const id = useId().replace(/:/g, '');
  const f = Math.min(s, 200) / 200;
  const dash = `${f * 100}, 101`;
  return (
    <div style={{ position: 'relative', width: 126, height: 82, flexShrink: 0, margin: '0px 8px 0px 10px' }}>
      <div
        title={`Status: ${status} · ${s} km/hr`}
        role="img"
        aria-label={`Speed ${s} km/hr, status ${status}`}
        style={{ position: 'absolute', width: 124, height: 86.8, flexShrink: 0, left: 1, top: -2.7 }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, width: 160, height: 112, transform: 'scale(0.775)', transformOrigin: '0px 0px' }}>
          <svg viewBox="0 0 160 112" width="160" height="112" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id={`spd-arc-${id}`} gradientUnits="userSpaceOnUse" x1="19" y1="92" x2="125" y2="10">
                <stop offset="0" stopColor={P.light} stopOpacity="0.35" />
                <stop offset="0.55" stopColor={P.c1} stopOpacity="0.85" />
                <stop offset="1" stopColor={P.c1} />
              </linearGradient>
              <linearGradient id={`spd-wedge-${id}`} gradientUnits="userSpaceOnUse" x1="112" y1="10" x2="22" y2="100">
                <stop offset="0" stopColor={P.shadeA} stopOpacity="0.3" />
                <stop offset="1" stopColor={P.shadeB} stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path
              d="M 51.95 81.12 A 29.5 29.5 0 1 1 108.05 81.12"
              pathLength={100}
              fill="none"
              stroke={`url(#spd-wedge-${id})`}
              strokeWidth="58"
              style={{ strokeDasharray: dash, transition: 'stroke-dasharray 0.4s' }}
            />
            <path d="M 19.13 91.78 A 64 64 0 1 1 140.87 91.78" fill="none" stroke="#E6E9ED" strokeWidth="9" strokeLinecap="round" />
            <path
              d="M 19.13 91.78 A 64 64 0 1 1 140.87 91.78"
              pathLength={100}
              fill="none"
              stroke={`url(#spd-arc-${id})`}
              strokeWidth="9"
              strokeLinecap="round"
              style={{ strokeDasharray: dash, transition: 'stroke-dasharray 0.4s' }}
            />
            {TICKS.map((t, i) => (
              <line
                key={i}
                x1={t[0]}
                y1={t[1]}
                x2={t[2]}
                y2={t[3]}
                stroke={i * 25 <= s && s > 0 ? P.c1 : '#4A5568'}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            ))}
            <g fill="#3D4A5C" fontSize="9" fontWeight="500" textAnchor="middle" dominantBaseline="middle">
              <text x="40.06" y="84.98">0</text>
              <text x="46.02" y="47.3">50</text>
              <text x="80" y="30">100</text>
              <text x="113.98" y="47.3">150</text>
              <text x="119.94" y="84.98">200</text>
            </g>
            <g style={{ transformOrigin: '80px 72px', transform: `rotate(${-108 + f * 216}deg)`, transition: 'transform 0.4s' }}>
              <path d="M80 17 L86 4.5 L74 4.5 Z" fill={P.c2} stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
            </g>
          </svg>
          <div
            style={{
              position: 'absolute',
              left: 50.32,
              top: 50.32,
              width: 59.35,
              height: 59.35,
              boxSizing: 'border-box',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${P.c1} 0%, ${P.c2} 100%)`,
              boxShadow: `inset 0 0 0 2px ${P.ring}, 0 6px 14px ${P.glow}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgb(255, 255, 255)',
              transition: 'background 0.3s',
              textShadow: 'rgba(1, 29, 50, 0.35) 0px 1px 2px',
              fontFamily: FONT,
            }}
          >
            <span style={{ fontSize: 21, lineHeight: 1.1, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s}</span>
            <span style={{ fontSize: 11.6, lineHeight: 1.2, fontWeight: 400 }}>km/hr</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const TILE = {
  flex: '1 1 0px',
  minWidth: 56,
  maxWidth: 66,
  height: 30,
  boxSizing: 'border-box',
  borderRadius: 9,
  color: 'rgb(255, 255, 255)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textShadow: 'rgba(1, 29, 50, 0.35) 0px 1px 2px',
} as const;
const LAB = { fontSize: 11, lineHeight: '13px', color: 'rgb(107, 118, 133)' } as const;

export function VehPanel({
  v,
  speed,
  status,
  stamp,
  loc,
  mini,
  onMini,
  dates,
  onPickDate,
  onPlayDate,
}: {
  v: PV;
  speed: number;
  /** the status shown (playback status in Track History) */
  status: string;
  stamp: { d: string; t: string };
  loc: [number, number];
  mini: boolean;
  onMini: (mini: boolean) => void;
  dates?: DateItem[];
  onPickDate?: (i: number) => void;
  onPlayDate?: (i: number) => void;
}) {
  const r = rng(v.plate + 'lt');
  const running = v.status === 'Running' || v.status === 'Overspeed';
  const run = running ? 60 + r() * 400 : 0;
  const stp = 20 + r() * 300;
  const idl = v.status === 'Idle' ? 20 + r() * 60 : r() * 20;
  const op = hasDriver(v) ? v.operator : '—';
  const ll = loc[0].toFixed(5) + ', ' + loc[1].toFixed(5);
  const list = useRef<HTMLDivElement>(null);
  // keep the active date in view
  useEffect(() => {
    const l = list.current;
    const on = l?.querySelector<HTMLElement>('.on');
    if (l && on && (on.offsetTop < l.scrollTop || on.offsetTop + on.offsetHeight > l.scrollTop + l.clientHeight))
      l.scrollTop = Math.max(0, on.offsetTop - 2);
  }, [dates]);
  return (
    <div className="td-live__panel pp-livecard" ref={stopMap}>
      <div
        className={mini ? 'pp-mini' : undefined}
        style={{
          position: 'relative',
          width: 'fit-content',
          height: 104,
          boxSizing: 'border-box',
          background: 'rgb(255, 255, 255)',
          borderRadius: 16,
          boxShadow: 'rgba(1, 29, 50, 0.16) 0px 12px 32px, rgba(1, 29, 50, 0.06) 0px 2px 6px, rgb(233, 236, 239) 0px 0px 0px 1px inset',
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: 'flex-start',
          rowGap: 6,
          padding: '4px 34px 4px 16px',
          fontFamily: FONT,
          color: 'rgb(11, 27, 43)',
        }}
      >
        <div
          title={`Date: ${stamp.d} ${stamp.t}`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: 18,
            boxSizing: 'border-box',
            padding: '0px 10px 0px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            borderRadius: '14px 0px 10px',
            background: st(status).grad,
            transition: 'background 0.2s',
            color: 'rgb(255, 255, 255)',
            fontSize: 11,
            lineHeight: '13px',
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span style={{ fontWeight: 600 }}>{stamp.d}</span>
          <span style={{ fontWeight: 500 }}>{stamp.t}</span>
        </div>
        <div
          className="pp-platecol"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 1,
            flexShrink: 0,
            marginRight: 22,
            alignSelf: 'stretch',
            paddingTop: 20,
          }}
        >
          {v.img && <Pic src={v.img} style={{ width: 62, height: 34, objectFit: 'contain', margin: '0 0 4px 6px' }} />}
          <span style={LAB}>Plate Number</span>
          <span style={{ fontSize: 13, lineHeight: '17px', fontWeight: 700, color: '#0B1B2B', whiteSpace: 'nowrap' }}>{v.plate}</span>
        </div>
        <div
          style={{
            width: 'max-content',
            maxWidth: 190,
            alignSelf: 'stretch',
            boxSizing: 'border-box',
            paddingTop: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            flexShrink: 0,
            minWidth: 0,
            justifyContent: 'center',
          }}
        >
          <span style={LAB}>Operator</span>
          <span
            title={op}
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13, lineHeight: '17px', fontWeight: 700, color: 'rgb(11, 27, 43)' }}
          >
            {op}
          </span>
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: 11,
              lineHeight: '14px',
              color: '#3D4A5C',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>
              <b style={{ fontWeight: 700, color: '#3D4A5C' }}>ID:</b> {opId(v)}
            </span>
          </span>
          <a
            href={`https://www.google.com/maps?q=${loc[0]},${loc[1]}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`Location: ${ll}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              minWidth: 0,
              fontSize: 11,
              lineHeight: '14px',
              color: '#0B1B2B',
              fontWeight: 500,
              textDecoration: 'none',
              fontVariantNumeric: 'tabular-nums',
              marginTop: 7,
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#6B7685" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
              <path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ll}</span>
          </a>
        </div>
        {dates && dates.length >= 2 && (
          <div className="pp-dates">
            <div className="pp-dh">
              <I d={IC.cal2} size={12} />
              <span>Selected History Dates</span>
            </div>
            <div className="pp-dl" ref={list}>
              {dates.map((x, i) => (
                <button
                  key={i}
                  type="button"
                  className={x.active ? 'on' : ''}
                  disabled={x.noData}
                  title={`${x.day} ${x.noData ? '· No data' : x.range}`}
                  aria-pressed={x.active}
                  onClick={() => onPickDate?.(i)}
                  onDoubleClick={() => onPlayDate?.(i)}
                >
                  <b>{x.day}</b>
                  <span>{x.noData ? 'No data' : x.range}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <Speedo s={speed} status={status} />
        <div style={{ width: 1, alignSelf: 'stretch', margin: '12px 0px', background: 'rgb(227, 230, 234)', flexShrink: 0 }} />
        <div style={{ flex: '1 1 0%', minWidth: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: '0px 0px 0px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
              <span style={{ ...LAB, fontWeight: 400 }}>Odometer</span>
              <span style={{ fontSize: 12, lineHeight: '15px', fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{v.odometer}</span>
            </div>
            <div style={{ width: 1, background: 'rgb(227, 230, 234)', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span style={{ ...LAB, fontWeight: 400, whiteSpace: 'nowrap' }}>Vehicle Sensors:</span>
              <Sensors v={v} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(
              [
                ['Running', run, 'var(--eit-active-gradient)', 'rgb(3, 173, 134)'],
                ['Stopped', stp, 'linear-gradient(90deg, rgb(249, 5, 7) 0%, rgb(255, 136, 135) 100%)', 'rgb(255, 136, 135)'],
                ['Idle', idl, 'linear-gradient(90deg, rgb(3, 99, 255) 0%, rgb(116, 170, 255) 100%)', 'rgb(116, 170, 255)'],
              ] as const
            ).map(([n, m, bg, ring]) => (
              <div key={n} title={`${n}: ${hm(m)}`} style={{ ...TILE, background: bg, boxShadow: `${ring} 0px 0px 0px 1.5px inset` }}>
                <span style={{ fontSize: 10.5, lineHeight: 1.2, fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{hm(m)}</span>
                <span style={{ fontSize: 9.5, lineHeight: 1.2, fontWeight: 400, whiteSpace: 'nowrap' }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          title={mini ? 'Show details' : 'Minimize'}
          aria-label={mini ? 'Show details' : 'Minimize details'}
          onClick={() => onMini(!mini)}
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            width: 20,
            height: 20,
            border: 'none',
            borderRadius: '50%',
            background: 'rgb(255, 255, 255)',
            boxShadow: 'rgba(1, 29, 50, 0.18) 0px 2px 6px, rgb(238, 240, 242) 0px 0px 0px 1px inset',
            color: 'rgb(61, 74, 92)',
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
            aria-hidden="true"
            style={{ display: 'block' }}
            dangerouslySetInnerHTML={{
              __html: mini
                ? '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>'
                : '<path d="M5 12h14"/>',
            }}
          />
        </button>
        <span className="pp-minispd" style={{ color: st(status).dot }} title={`${status} · ${speed} km/h`}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 14 4-4" />
            <path d="M3.34 19a10 10 0 1 1 17.32 0" />
          </svg>
          <b>{speed}</b>
          <small>km/h</small>
        </span>
      </div>
    </div>
  );
}
