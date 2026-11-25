// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import { portalRoot } from '../runtime';
import React, { useState, useRef, useEffect, createElement, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { formatNumber } from './kit';

export const markerStatusKey = (e?: any) => {
  const t = String(e ?? 'running')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return t.startsWith('notrans')
    ? 'notrans'
    : t === 'stopped'
      ? 'stop'
      : t in MARKER_COLORS
        ? t
        : 'running';
};

export const MARKER_COLORS: any = {
  running: '#009863',
  stop: '#F90507',
  idle: '#0363FF',
  overspeed: '#F76C09',
  towed: '#07B1B4',
  notrans: '#2B333C',
};

export const MARKER_MOVING: any = {
  running: true,
  overspeed: true,
  towed: true,
};

export const MARKER_STATUS_KEYS: any = {
  running: 'running',
  stop: 'stop',
  idle: 'idle',
  overspeed: 'overspeed',
  towed: 'towed',
  notrans: 'notrans',
};

export const MARKER_FALLBACK_TYPES: any = [
  'dumptruck',
  'tanker-truck',
  'concrete-mixer',
  'pickup',
  'van',
  'minibus',
  'sedan',
];

export function markerFallbackImage(e?: any, t: any = '/assets/vehicles/') {
  const n = String(e || '')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase();
  let r = 7;
  for (const i of n) r = (r * 31 + i.charCodeAt(0)) >>> 0;
  return t + MARKER_FALLBACK_TYPES[r % MARKER_FALLBACK_TYPES.length] + '.png';
}

export const MARKER_FONT =
  "'Instrument Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const MARKER_TIP_PLACEMENT: any = {
  top: {
    left: '50%',
    right: 'auto',
    top: 'auto',
    bottom: '26px',
    transform: 'translateX(-50%)',
  },
  bottom: {
    left: '50%',
    right: 'auto',
    top: '26px',
    bottom: 'auto',
    transform: 'translateX(-50%)',
  },
  right: {
    left: '22px',
    right: 'auto',
    top: '-11px',
    bottom: 'auto',
    transform: 'none',
  },
  left: {
    left: 'auto',
    right: '22px',
    top: '-11px',
    bottom: 'auto',
    transform: 'none',
  },
};

export const MARKER_FALLBACK_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 8.38A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

export function markerLook(e?: any) {
  const t = markerStatusKey(e.status),
    n = MARKER_COLORS[t],
    r = MARKER_MOVING[t] ? Math.max(0, Math.round(Number(e.speed) || 0)) : 0;
  return {
    k: t,
    color: n,
    halo: n + '2E',
    speed: r,
    img: e.img || markerFallbackImage(e.plate, e.imageBasePath),
    showLabel: e.showLabel !== false,
    showSpeed: e.showSpeed !== false,
    pos: MARKER_TIP_PLACEMENT[e.labelPos || 'top'],
    title: `${e.plate} · ${MARKER_STATUS_KEYS[t]}`,
  };
}

export function markerHtml(e?: any) {
  const t = markerLook(e),
    n = (a?: any) =>
      String(a).replace(
        /[&<>"']/g,
        (l?: any) =>
          (
            ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#39;',
            }) as Record<string, string>
          )[l] ?? '',
      ),
    r = t.pos,
    i = t.showLabel
      ? `<div style="position:absolute;left:${r.left};right:${r.right};top:${r.top};bottom:${r.bottom};transform:${r.transform};z-index:1;display:flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:6px;background:#fff;white-space:nowrap;box-shadow:0 3px 10px rgba(1,29,50,.22),inset 0 0 0 1px #E9ECEF;font-size:11px;font-weight:700;color:#0B1B2B"><span style="width:7px;height:7px;border-radius:50%;background:${t.color}"></span>${n(e.plate)}${t.showSpeed ? `<span style="font-weight:400;color:#6B7685">${t.speed} km/h</span>` : ''}</div>`
      : '',
    s = `<span style="width:24px;height:24px;border-radius:50%;background:${t.color};color:#fff;display:grid;place-items:center;text-shadow:0 1px 2px rgba(1,29,50,.35)">${MARKER_FALLBACK_SVG}</span>`;
  return `${i}<div style="position:absolute;left:-25px;top:-25px;width:50px;height:50px;border-radius:50%;background:${t.halo}"></div><div style="position:absolute;left:-17px;top:-17px;width:34px;height:34px;box-sizing:border-box;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 2.5px ${t.color},0 2px 8px rgba(1,29,50,.35);display:grid;place-items:center;overflow:hidden"><img src="${n(t.img)}" alt="${n(e.plate)}" style="width:26px;height:20px;object-fit:contain;display:block;pointer-events:none" data-fallback="${n(s)}" onerror="this.outerHTML=this.getAttribute('data-fallback')"></div>`;
}

export function createMarkerElement(e?: any) {
  const t = document.createElement('div');
  t.style.cssText = `position:relative;width:0;height:0;font-family:${MARKER_FONT}`;
  updateMarkerElement(t, e);
  return t;
}

export function updateMarkerElement(e?: any, t?: any) {
  e.title = markerLook(t).title;
  e.innerHTML = markerHtml(t);
}

export const CONTROL_SIZES: any = {
  36: {
    b: 36,
    r: 10,
    i: 14,
    ti: 16,
    fs: 13,
    cg: 6,
    gap: 10,
    mt: 8,
  },
  32: {
    b: 32,
    r: 9,
    i: 14,
    ti: 15,
    fs: 12,
    cg: 5,
    gap: 8,
    mt: 6,
  },
  28: {
    b: 28,
    r: 8,
    i: 12,
    ti: 13,
    fs: 11,
    cg: 4,
    gap: 6,
    mt: 2,
  },
  24: {
    b: 24,
    r: 7,
    i: 12,
    ti: 12,
    fs: 10,
    cg: 4,
    gap: 5,
    mt: 4,
  },
};

export const CONTROL_FONT =
  "'Instrument Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const CONTROL_SHADOW = '0 3px 10px rgba(2,27,58,.18), 0 1px 3px rgba(2,27,58,.12)';

export const CONTROL_GRADIENT = 'var(--eit-active-gradient)';

export const CONTROL_LOOK_DEFAULT: any = {
  bg: '#FFFFFF',
  sh: `${CONTROL_SHADOW}, inset 0 0 0 1px #DCE5E1`,
  fg: '#021B3A',
};

export const CONTROL_LOOK_SOFT: any = {
  bg: '#E6F7EF',
  sh: `${CONTROL_SHADOW}, inset 0 0 0 1px #00B368`,
  fg: '#00B368',
};

export const CONTROL_LOOK_HOVER: any = {
  bg: '#E6F7EF',
  fg: '#007A47',
};

export const CONTROL_LOOK_ON: any = {
  bg: CONTROL_GRADIENT,
  sh: '0 0 0 1.5px #03AD86, 0 0 10px rgba(3,173,134,.45)',
  fg: '#FFFFFF',
};

export const CONTROL_LOOK_ACTIVE: any = {
  bg: CONTROL_GRADIENT,
  sh: CONTROL_SHADOW,
  fg: '#FFFFFF',
};

export const ControlSvg = ({ size, children, overflow }: any) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={
      {
        display: 'block',
        overflow: overflow ? 'visible' : undefined,
      } as any
    }
  >
    {children}
  </svg>
);

export const CONTROL_ICONS: any = {
  plus: (e?: any) => (
    <ControlSvg size={e}>
      <path d="M12 5v14M5 12h14" />
    </ControlSvg>
  ),
  minus: (e?: any) => (
    <ControlSvg size={e}>
      <path d="M5 12h14" />
    </ControlSvg>
  ),
  recenter: (e?: any) => (
    <ControlSvg size={e}>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22" />
    </ControlSvg>
  ),
  layers: (e?: any) => (
    <ControlSvg size={e}>
      <path d="m12 2 9.5 5-9.5 5-9.5-5L12 2Z" />
      <path d="m2.5 12 9.5 5 9.5-5" />
      <path d="m2.5 17 9.5 5 9.5-5" />
    </ControlSvg>
  ),
  expand: (e?: any) => (
    <ControlSvg size={e}>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </ControlSvg>
  ),
  shrink: (e?: any) => (
    <ControlSvg size={e}>
      <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
    </ControlSvg>
  ),
  nearby: (e?: any) => (
    <ControlSvg size={e} overflow={true}>
      <path
        strokeWidth={1.5}
        d="M16 11c0 2.4-2.6 4.8-3.3 5.4a1 1 0 0 1-1.4 0C10.6 15.8 8 13.4 8 11a4 4 0 0 1 8 0Z"
      />
      <circle cx="12" cy="11" r="1" fill="currentColor" stroke="none" />
      <path strokeWidth={1.5} d="M10.01 2.2A10 10 0 0 0 3.25 7.15" />
      <path strokeWidth={1.5} d="M2.2 13.99A10 10 0 0 0 7.15 20.75" />
      <path strokeWidth={1.5} d="M13.99 21.8A10 10 0 0 0 20.75 16.85" />
      <path strokeWidth={1.5} d="M21.8 10.01A10 10 0 0 0 16.85 3.25" />
      <circle strokeWidth={1.5} cx="12" cy="2" r="2" />
      <circle strokeWidth={1.5} cx="22" cy="12" r="2" />
      <circle strokeWidth={1.5} cx="12" cy="22" r="2" />
      <circle strokeWidth={1.5} cx="2" cy="12" r="2" />
    </ControlSvg>
  ),
  play: (e?: any) => (
    <ControlSvg size={e}>
      <path d="M7 4.5v15l12-7.5-12-7.5Z" />
    </ControlSvg>
  ),
  pause: (e?: any) => (
    <ControlSvg size={e}>
      <path d="M8 5v14M16 5v14" />
    </ControlSvg>
  ),
  stop: (e?: any) => (
    <ControlSvg size={e}>
      <rect x="5" y="5" width="14" height="14" rx="2.5" />
    </ControlSvg>
  ),
  timer: (e?: any) => (
    <ControlSvg size={e}>
      <path d="M10 2h4M12 2v3" />
      <circle cx="13" cy="14" r="7.5" />
      <path d="m13 14 3-3" />
      <path d="M2 12h3M1.5 15.5h4M2.5 19h3.5" />
    </ControlSvg>
  ),
  bell: (e?: any) => (
    <ControlSvg size={e}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </ControlSvg>
  ),
  filter: (e?: any) => (
    <ControlSvg size={e}>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </ControlSvg>
  ),
};

export function ControlButton({
  title,
  size,
  on: n,
  look,
  radius,
  hoverable = true,
  onClick,
  children,
  style,
  popup,
  expanded,
}: any) {
  const h = CONTROL_SIZES[size],
    [A, v] = useState<any>(false),
    y = look ?? (n ? CONTROL_LOOK_SOFT : CONTROL_LOOK_DEFAULT),
    g = A && hoverable;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={popup || n === undefined ? undefined : n}
      aria-haspopup={popup ? 'menu' : undefined}
      aria-expanded={popup ? !!expanded : undefined}
      onClick={(E?: any) => onClick?.(E.currentTarget)}
      onMouseEnter={() => v(true)}
      onMouseLeave={() => v(false)}
      style={
        {
          width: h.b,
          height: h.b,
          flexShrink: 0,
          boxSizing: 'border-box',
          border: 'none',
          borderRadius: radius ?? h.r,
          display: 'grid',
          placeItems: 'center',
          padding: 0,
          cursor: 'pointer',
          fontFamily: CONTROL_FONT,
          transition:
            'background .15s ease, box-shadow .15s ease, transform .15s ease, color .15s ease',
          background: g ? CONTROL_LOOK_HOVER.bg : y.bg,
          boxShadow: y.sh,
          color: g ? CONTROL_LOOK_HOVER.fg : y.fg,
          filter: !hoverable && A ? 'brightness(.96)' : undefined,
          ...style,
        } as any
      }
    >
      {children}
    </button>
  );
}

export function MapControlStack(e?: any) {
  const t = e.size ?? 32,
    n = CONTROL_SIZES[t],
    r = [
      {
        title: 'Zoom in',
        icon: CONTROL_ICONS.plus(n.i),
        onClick: e.onZoomIn,
      },
      {
        title: 'Zoom out',
        icon: CONTROL_ICONS.minus(n.i),
        onClick: e.onZoomOut,
      },
      {
        title: 'Recenter to default view',
        icon: CONTROL_ICONS.recenter(n.i),
        onClick: e.onRecenter,
      },
      e.onLayers
        ? {
            title: 'Map layers',
            icon: CONTROL_ICONS.layers(n.i),
            on: e.satellite,
            onClick: e.onLayers,
            popup: true,
            expanded: e.layersOpen,
          }
        : {
            title: e.satellite ? 'Standard map' : 'Satellite view',
            icon: CONTROL_ICONS.layers(n.i),
            on: e.satellite,
            onClick: () => {
              return e.onToggleSatellite?.();
            },
          },
    ];
  if (e.onToggleFullscreen) {
    r.push({
      title: e.isFullscreen ? 'Exit fullscreen' : 'Fullscreen',
      icon: (e.isFullscreen ? CONTROL_ICONS.shrink : CONTROL_ICONS.expand)(n.i),
      on: !!e.isFullscreen,
      onClick: e.onToggleFullscreen,
    });
  }
  if (e.showNearby && !e.nearbySeparate) {
    r.push({
      title: 'Nearby Vehicles',
      icon: CONTROL_ICONS.nearby(n.i),
      on: !!e.nearbyOn,
      onClick: () => {
        return e.onNearby?.();
      },
    });
  }
  return (
    <div
      className={e.className}
      style={
        {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: n.gap,
          fontFamily: CONTROL_FONT,
          ...e.style,
        } as any
      }
    >
      <div
        style={
          {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: n.cg,
          } as any
        }
      >
        {r.map((i?: any, s?: any) => (
          <ControlButton
            key={s}
            title={i.title}
            size={t}
            on={!!i.on}
            onClick={i.onClick}
            popup={i.popup}
            expanded={i.expanded}
          >
            {i.icon}
          </ControlButton>
        ))}
        {e.extra}
      </div>
      {e.showNearby && e.nearbySeparate && (
        <ControlButton
          title="Nearby Vehicles"
          size={t}
          radius={10}
          hoverable={false}
          on={!!e.nearbyOn}
          look={e.nearbyOn ? CONTROL_LOOK_ACTIVE : CONTROL_LOOK_SOFT}
          onClick={() => {
            return e.onNearby?.();
          }}
          style={
            {
              marginTop: -2,
            } as any
          }
        >
          {CONTROL_ICONS.nearby(16)}
        </ControlButton>
      )}
    </div>
  );
}

export function MapControlRow(e?: any) {
  const t = e.size ?? 32,
    n = CONTROL_SIZES[t];
  return (
    <div
      className={e.className}
      style={
        {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: n.gap,
          fontFamily: CONTROL_FONT,
          ...e.style,
        } as any
      }
    >
      {e.filterButton ??
        (!e.hideFilter && e.onFilter && (
          <ControlButton
            title="History Filter"
            size={t}
            hoverable={false}
            look={e.filterOpen ? CONTROL_LOOK_ON : CONTROL_LOOK_DEFAULT}
            on={!!e.filterOpen}
            onClick={e.onFilter}
          >
            {CONTROL_ICONS.filter(14)}
          </ControlButton>
        ))}
      <div
        style={
          {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: n.cg,
          } as any
        }
      >
        <ControlButton
          title={e.playing ? 'Pause' : 'Play'}
          size={t}
          on={e.playing}
          onClick={e.onTogglePlay}
        >
          {(e.playing ? CONTROL_ICONS.pause : CONTROL_ICONS.play)(n.i)}
        </ControlButton>
        <ControlButton title="Stop" size={t} on={false} onClick={e.onStop}>
          {CONTROL_ICONS.stop(n.i)}
        </ControlButton>
        <ControlButton title="Playback speed" size={t} on={false} onClick={e.onSpeed}>
          <span
            style={
              {
                fontSize: n.fs,
                lineHeight: '14px',
                fontWeight: 700,
                letterSpacing: '-.01em',
              } as any
            }
          >{`${e.speed || 1}x`}</span>
        </ControlButton>
      </div>
      <div
        style={
          {
            marginTop: n.mt,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: n.cg,
          } as any
        }
      >
        <ControlButton
          title="Distance & Duration"
          size={t}
          on={!!e.distanceOn}
          onClick={e.onDistance}
        >
          {CONTROL_ICONS.timer(n.ti)}
        </ControlButton>
        {e.onAlerts && (
          <ControlButton title="Alerts" size={t} on={!!e.alertsOn} onClick={e.onAlerts}>
            {CONTROL_ICONS.bell(n.ti)}
          </ControlButton>
        )}
      </div>
    </div>
  );
}

export const SHARE_POS_LEFT: any = {
  position: 'absolute',
  left: 8,
  top: 8,
  zIndex: 4,
};

export const SHARE_POS_RIGHT: any = {
  position: 'absolute',
  right: 8,
  top: 8,
  zIndex: 4,
};

export const SHARE_GRADIENT = 'var(--eit-active-gradient)';

export const SHARE_LOOK: any = {
  bg: '#FFFFFF',
  sh: '0 3px 10px rgba(2,27,58,.18), 0 1px 3px rgba(2,27,58,.12), inset 0 0 0 1px #DCE5E1',
  fg: '#021B3A',
};

export const SHARE_LOOK_ON: any = {
  bg: SHARE_GRADIENT,
  sh: '0 0 0 1.5px #03AD86, 0 0 10px rgba(3,173,134,.45)',
  fg: '#FFFFFF',
};

export const SHARE_FONT =
  "'Instrument Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const ShareSvg = ({ s, w = 2, children }: any) => (
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
      } as any
    }
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const ShareIcon = ({ s }: any) => (
  <ShareSvg s={s}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
  </ShareSvg>
);

export function ShareLocation({
  plate,
  lat,
  lng,
  statusLine,
  placement = 'right',
  size = 32,
  className,
}: any) {
  const [l, c] = useState<any>(false),
    [f, p] = useState<any>(false),
    h = useRef<any>();
  useEffect(() => () => window.clearTimeout(h.current), []);
  const A = `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`,
    v = ['EIT Track · ' + plate, statusLine].filter(Boolean).join(`
`),
    y = encodeURIComponent,
    g: any = {
      whatsapp:
        'https://wa.me/?text=' +
        y(
          v +
            `
` +
            A,
        ),
      email:
        'mailto:?subject=' +
        y('EIT Track · ' + plate) +
        '&body=' +
        y(
          v +
            `
` +
            A,
        ),
      sms:
        'sms:?&body=' +
        y(
          v +
            `
` +
            A,
        ),
      telegram: 'https://t.me/share/url?url=' + y(A) + '&text=' + y(v),
    },
    E = () => {
      const S = () => {
        p(true);
        window.clearTimeout(h.current);
        h.current = window.setTimeout(() => p(false), 1800);
      };
      if (navigator.clipboard) {
        navigator.clipboard
          .writeText(
            v +
              `
` +
              A,
          )
          .then(S, S);
      } else {
        S();
      }
    },
    b = l ? SHARE_LOOK_ON : SHARE_LOOK,
    w = () => c(false),
    x = (S?: any, W?: any, O?: any, C?: any, k?: any) => (
      <a
        href={S}
        target={k ? '_blank' : undefined}
        rel={k ? 'noopener' : undefined}
        onClick={w}
        style={
          {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            textDecoration: 'none',
            color: '#021B3A',
            fontSize: 9.5,
            fontWeight: 600,
          } as any
        }
      >
        <span
          style={
            {
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: W,
              color: '#FFFFFF',
            } as any
          }
        >
          {C}
        </span>
        {O}
      </a>
    );
  return (
    <div
      className={className}
      style={
        {
          position: 'relative',
          width: size,
          height: size,
          fontFamily: SHARE_FONT,
        } as any
      }
    >
      <button
        type="button"
        title="Share"
        aria-label="Share"
        aria-pressed={l}
        aria-haspopup="dialog"
        onClick={(S?: any) => {
          S.stopPropagation();
          c((W?: any) => !W);
          p(false);
        }}
        style={
          {
            width: size,
            height: size,
            boxSizing: 'border-box',
            border: 'none',
            borderRadius: 10,
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            cursor: 'pointer',
            background: b.bg,
            boxShadow: b.sh,
            color: b.fg,
            transition: 'background .15s ease, box-shadow .15s ease',
          } as any
        }
      >
        <ShareIcon s={14} />
      </button>
      {l && (
        <>
          <div
            onClick={w}
            style={
              {
                position: 'fixed',
                inset: 0,
                zIndex: 5,
              } as any
            }
          />
          <div
            role="dialog"
            aria-label={'Share ' + plate}
            style={
              {
                position: 'absolute',
                top: 0,
                zIndex: 6,
                width: 232,
                boxSizing: 'border-box',
                padding: 12,
                ...(placement === 'right'
                  ? {
                      left: 'calc(100% + 8px)',
                    }
                  : {
                      right: 'calc(100% + 8px)',
                    }),
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                background: '#FFFFFF',
                borderRadius: 10,
                boxShadow:
                  '0 12px 32px rgba(2,27,58,.24), 0 2px 6px rgba(2,27,58,.12), inset 0 0 0 1px #DCE5E1',
                color: '#021B3A',
                fontSize: 11,
                lineHeight: '14px',
              } as any
            }
          >
            <div
              style={
                {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                } as any
              }
            >
              <div
                style={
                  {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    minWidth: 0,
                    flex: 1,
                  } as any
                }
              >
                <span
                  style={
                    {
                      fontSize: 12,
                      fontWeight: 700,
                    } as any
                  }
                >
                  Share tracking
                </span>
                <span
                  style={
                    {
                      fontSize: 10,
                      color: '#5B6676',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    } as any
                  }
                >
                  {plate}
                </span>
              </div>
              <button
                type="button"
                onClick={w}
                title="Close"
                aria-label="Close share"
                style={
                  {
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    border: 'none',
                    borderRadius: 6,
                    padding: 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: '#F2F4F6',
                    color: '#3D4A5C',
                    cursor: 'pointer',
                  } as any
                }
              >
                <ShareSvg s={12} w={2.5}>
                  <path d="M6 6l12 12M18 6L6 18" />
                </ShareSvg>
              </button>
            </div>
            <div
              style={
                {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 4px 4px 8px',
                  borderRadius: 8,
                  background: '#F5F7F9',
                  boxShadow: 'inset 0 0 0 1px #E3E6EA',
                } as any
              }
            >
              <span
                title={A}
                style={
                  {
                    flex: 1,
                    minWidth: 0,
                    fontSize: 10,
                    color: '#3D4A5C',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  } as any
                }
              >
                {A}
              </span>
              <button
                type="button"
                onClick={E}
                style={
                  {
                    flexShrink: 0,
                    height: 24,
                    padding: '0 10px',
                    border: 'none',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 10,
                    fontWeight: 700,
                    background: f ? '#E6F7EF' : '#021B3A',
                    color: f ? '#007A47' : '#FFFFFF',
                  } as any
                }
              >
                <ShareSvg s={11} w={2.6}>
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                </ShareSvg>
                {f ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <div
              style={
                {
                  display: 'flex',
                  justifyContent: 'space-between',
                } as any
              }
            >
              {x(
                g.whatsapp,
                '#25D366',
                'WhatsApp',
                <ShareSvg s={18}>
                  <path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.3l-4.5 1.2Z" />
                  <path d="M9 8.5c0 3.3 3.2 6.5 6.5 6.5l1-1.6-2-1-1 .9c-1-.4-2.4-1.8-2.8-2.8l.9-1-1-2L9 8.5Z" />
                </ShareSvg>,
                true,
              )}
              {x(
                g.email,
                '#EA4335',
                'Email',
                <ShareSvg s={17}>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </ShareSvg>,
                false,
              )}
              {x(
                g.sms,
                '#2B7BFF',
                'SMS',
                <ShareSvg s={17}>
                  <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
                </ShareSvg>,
                false,
              )}
              {x(
                g.telegram,
                '#229ED9',
                'Telegram',
                <ShareSvg s={17}>
                  <path d="M21 4L3 11l6 2 2 6 3-4 5 4 2-15Z" />
                  <path d="M9 13l8-6" />
                </ShareSvg>,
                true,
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const CARTO_ATTRIBUTION = `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions">CARTO</a>`;

export const ARCGIS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services';

export const googleTiles = (e?: any) => `https://mt{s}.google.com/vt/lyrs=${e}&x={x}&y={y}&z={z}`;

export const GOOGLE_ATTRIBUTION = 'Map data &copy; Google';

export const MAP_LAYERS: any = [
  {
    id: 'street',
    name: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM_ATTRIBUTION,
  },
  {
    id: 'satellite',
    name: 'Satellite',
    url: `${ARCGIS_URL}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Imagery &copy; Esri',
    dark: true,
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    url: `${ARCGIS_URL}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Imagery &copy; Esri',
    dark: true,
    overlays: [
      `${ARCGIS_URL}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`,
      `${ARCGIS_URL}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    ],
  },
  {
    id: 'voyager',
    name: 'Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: CARTO_ATTRIBUTION,
    subdomains: 'abcd',
    maxNativeZoom: 20,
  },
  {
    id: 'light',
    name: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: CARTO_ATTRIBUTION,
    subdomains: 'abcd',
    maxNativeZoom: 20,
  },
  {
    id: 'dark',
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: CARTO_ATTRIBUTION,
    subdomains: 'abcd',
    maxNativeZoom: 20,
    dark: true,
  },
  {
    id: 'humanitarian',
    name: 'Humanitarian',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: `${OSM_ATTRIBUTION}, tiles by HOT`,
  },
  {
    id: 'cycle',
    name: 'Cycle (CyclOSM)',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: `${OSM_ATTRIBUTION}, CyclOSM`,
  },
  {
    id: 'topo',
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: `${OSM_ATTRIBUTION}, SRTM | &copy; OpenTopoMap (CC-BY-SA)`,
    subdomains: 'abc',
    maxNativeZoom: 17,
  },
  {
    id: 'esri-street',
    name: 'Esri Street',
    url: `${ARCGIS_URL}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Tiles &copy; Esri',
  },
  {
    id: 'esri-topo',
    name: 'Esri Topographic',
    url: `${ARCGIS_URL}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Tiles &copy; Esri',
  },
  {
    id: 'esri-gray',
    name: 'Esri Light Gray',
    url: `${ARCGIS_URL}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Tiles &copy; Esri',
    maxNativeZoom: 16,
  },
  {
    id: 'natgeo',
    name: 'National Geographic',
    url: `${ARCGIS_URL}/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Tiles &copy; Esri, National Geographic',
    maxNativeZoom: 16,
  },
  {
    id: 'google-roadmap',
    name: 'Google Maps',
    url: googleTiles('m'),
    attribution: GOOGLE_ATTRIBUTION,
    subdomains: '0123',
    maxNativeZoom: 20,
  },
  {
    id: 'google-satellite',
    name: 'Google Satellite',
    url: googleTiles('s'),
    attribution: GOOGLE_ATTRIBUTION,
    subdomains: '0123',
    maxNativeZoom: 20,
    dark: true,
  },
  {
    id: 'google-hybrid',
    name: 'Google Hybrid',
    url: googleTiles('y'),
    attribution: GOOGLE_ATTRIBUTION,
    subdomains: '0123',
    maxNativeZoom: 20,
    dark: true,
  },
  {
    id: 'google-terrain',
    name: 'Google Terrain',
    url: googleTiles('p'),
    attribution: GOOGLE_ATTRIBUTION,
    subdomains: '0123',
    maxNativeZoom: 20,
  },
  {
    id: 'google-traffic',
    name: 'Google Traffic',
    url: googleTiles('m,traffic'),
    attribution: GOOGLE_ATTRIBUTION,
    subdomains: '0123',
    maxNativeZoom: 20,
  },
];

export const mapLayer = (e?: any) => MAP_LAYERS.find((t?: any) => t.id === e) ?? MAP_LAYERS[0];

export const MAP_LAYER_KEY = 'gp.map.layer';

export let savedLayerId = (() => {
  try {
    return mapLayer(window.localStorage.getItem(MAP_LAYER_KEY) ?? undefined).id;
  } catch {
    return MAP_LAYERS[0].id;
  }
})();

export const layerListeners = new Set<any>();

export function saveMapLayer(e?: any) {
  savedLayerId = mapLayer(e).id;
  try {
    window.localStorage.setItem(MAP_LAYER_KEY, savedLayerId);
  } catch {}
  layerListeners.forEach((t?: any) => t());
}

export const subscribeMapLayer = (e?: any) => (
  layerListeners.add(e),
  () => {
    layerListeners.delete(e);
  }
);

export const useSavedMapLayer = () =>
  mapLayer(useSyncExternalStore(subscribeMapLayer, () => savedLayerId));

export let lastMapCenter: any = [0, 0];

export function useLeafletMap(e?: any, { layer, onClick, zoom = 11 }: any = {}) {
  const i = useSavedMapLayer(),
    s = layer ? mapLayer(layer) : i,
    a = useRef<any>(null),
    l = useRef<any>(null),
    c = useRef<any>(onClick);
  c.current = onClick;
  const [f, p] = useState<any>(false),
    h = useRef<any>(zoom);
  useEffect(() => {
    if (!e.current) return;
    const A = L.map(e.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView(lastMapCenter, h.current);
    A.on('click', (y?: any) => {
      return c.current?.([+y.latlng.lat.toFixed(6), +y.latlng.lng.toFixed(6)]);
    });
    a.current = A;
    const v = new ResizeObserver(() => A.invalidateSize());
    v.observe(e.current);
    p(true);
    return () => {
      v.disconnect();
      A.remove();
      a.current = null;
      l.current = null;
      p(false);
    };
  }, [e]);
  useEffect(() => {
    var y: any;
    const A = a.current;
    if (!f || !A) return;
    if (!((y = l.current) == null)) {
      y.remove();
    }
    const v: any = {
      maxZoom: 19,
      maxNativeZoom: s.maxNativeZoom ?? 19,
      subdomains: s.subdomains ?? 'abc',
    };
    l.current = L.layerGroup([
      L.tileLayer(s.url, {
        ...v,
        attribution: s.attribution,
      }),
      ...(s.overlays ?? []).map((g?: any) => L.tileLayer(g, v)),
    ]).addTo(A);
  }, [s, f]);
  return {
    map: a,
    ready: f,
    layer: s,
  };
}

export function fitMap(e?: any, t?: any, n: any = 16) {
  const r = Array.isArray(t) ? (t.length ? L.latLngBounds(t) : null) : t.getBounds?.();
  if (r && r.isValid()) {
    e.fitBounds(r.pad(0.2), {
      maxZoom: n,
      animate: false,
    });
  }
}

export function markerTooltip(e?: any, t?: any) {
  const n = document.createElement('span');
  n.className = 'gp-tip';
  const r = document.createElement('b');
  r.textContent = e;
  n.append(r);
  {
    const i = document.createElement('small');
    i.textContent = t;
    n.append(i);
  }
  return n;
}

export function VehicleMarkerElement({ plate, status, speed, img, label = false }: any) {
  const s = createMarkerElement({
    plate,
    status,
    speed,
    img,
    imageBasePath: '/assets/vehicles/',
    showLabel: label,
  });
  s.removeAttribute('title');
  return s;
}

export function VehicleMarker({ plate, status, speed, img }: any) {
  const i = useRef<any>(null);
  useEffect(() => {
    var s: any;
    if (!((s = i.current) == null)) {
      s.replaceChildren(
        VehicleMarkerElement({
          plate,
          status,
          speed,
          img,
        }),
      );
    }
  }, [plate, status, speed, img]);
  return <span ref={i} className="td-vmarker" aria-hidden="true" />;
}

export const CLUSTER_MAX_ZOOM = 16;

export const CLUSTER_CELL = 64;

export function clusterIcon(e?: any) {
  const t = e.length,
    n = t < 10 ? 36 : t < 100 ? 42 : 50,
    r = new globalThis.Map<any, any>();
  e.forEach((a?: any) => r.set(a, (r.get(a) ?? 0) + 1));
  let i = 0;
  const s = [...r].map(([a, l]: any) => {
    const c = i;
    i += (l / t) * 100;
    return `var(--${a}) ${c.toFixed(2)}% ${i.toFixed(2)}%`;
  });
  return L.divIcon({
    className: 'gp-pin-box',
    html: `<span class="gp-cluster" style="width:${n}px;height:${n}px;background:conic-gradient(${s.join(',')})"><b>${formatNumber(t)}</b></span>`,
    iconSize: [n, n],
    iconAnchor: [n / 2, n / 2],
  });
}

export function clusterMarkers(
  e: any,
  t: any,
  n: any,
  { enabled = true, alone, toneOf, title }: any,
) {
  const l = e.getZoom(),
    c = new globalThis.Map<any, any>();
  if (enabled && l < CLUSTER_MAX_ZOOM)
    for (const [h, A] of t) {
      if (alone != null && alone(h)) continue;
      const v = e.project(A.getLatLng(), l),
        y = `${Math.floor(v.x / CLUSTER_CELL)}:${Math.floor(v.y / CLUSTER_CELL)}`,
        g = c.get(y);
      if (g) {
        g.push(h);
      } else {
        c.set(y, [h]);
      }
    }
  const f = new Set<any>();
  n.clearLayers();
  for (const h of c.values()) {
    if (h.length < 2) continue;
    h.forEach((g?: any) => f.add(g));
    const A = L.latLngBounds(h.map((g?: any) => t.get(g).getLatLng())),
      v = h.map((g?: any) => {
        const E = toneOf(g);
        return E && /^[a-z]+$/.test(E) ? E : 'gray';
      }),
      y = title(h.length);
    L.marker(A.getCenter(), {
      icon: clusterIcon(v),
      keyboard: true,
      title: y,
      zIndexOffset: 500,
    })
      .bindTooltip(markerTooltip(y, 'Click to zoom in'), {
        direction: 'top',
        offset: [0, -16],
      })
      .on('click', () =>
        e.fitBounds(A.pad(0.3), {
          maxZoom: CLUSTER_MAX_ZOOM,
        }),
      )
      .addTo(n);
  }
  let p = false;
  for (const [h, A] of t) {
    const v = e.hasLayer(A);
    if (f.has(h) && v) {
      {
        A.remove();
        p = true;
      }
    } else {
      if (!f.has(h) && !v) {
        {
          A.addTo(e);
          p = true;
        }
      }
    }
  }
  return p;
}

export function tileUrl(e: any, t: any, [n, r]: any, i?: any) {
  const s = 2 ** i,
    a = (Math.max(-85, Math.min(85, n)) * Math.PI) / 180,
    l = Math.floor((((((r + 180) % 360) + 360) % 360) / 360) * s),
    c = Math.floor(((1 - Math.log(Math.tan(a) + 1 / Math.cos(a)) / Math.PI) / 2) * s);
  return e
    .replace('{s}', (t ?? 'abc')[0])
    .replace('{r}', '')
    .replace('{z}', String(i))
    .replace('{x}', String(l))
    .replace('{y}', String(c));
}

export function LayerThumb({ layer, view }: any) {
  return (
    <span className="gp-layers__thumb">
      <img
        src={tileUrl(
          layer.url,
          layer.subdomains,
          view.center,
          Math.min(view.zoom, layer.maxNativeZoom ?? 19),
        )}
        alt=""
        loading="lazy"
      />
      {layer.overlays?.map((r?: any) => (
        <img key={r} src={tileUrl(r, undefined, view.center, view.zoom)} alt="" loading="lazy" />
      ))}
    </span>
  );
}

export const isDarkLayer = (e?: any) => /satellite|hybrid/.test(e.id);

export function useLayerPicker({ map, value, onPick }: any) {
  const r = useSavedMapLayer(),
    i = value ? mapLayer(value) : r,
    s = useRef<any>(null),
    a = useRef<any>(null),
    [l, c] = useState<any>(null),
    [f, p] = useState<any>({
      center: lastMapCenter,
      zoom: 3,
    });
  useEffect(() => {
    var x: any;
    if (!l) return;
    const y = (S?: any) => {
        var W: any, O: any;
        return (
          !((W = a.current) != null && W.contains(S.target)) &&
          !((O = s.current) != null && O.contains(S.target))
        );
      },
      g = (S?: any) => y(S) && c(null),
      E = (S?: any) => {
        var W: any;
        if (S.key === 'Escape') {
          {
            c(null);
            if (!((W = s.current) == null)) {
              W.focus();
            }
          }
        }
      },
      b = () => c(null);
    document.addEventListener('pointerdown', g, true);
    document.addEventListener('keydown', E);
    document.addEventListener('scroll', g, true);
    window.addEventListener('resize', b);
    if (!((x = a.current?.querySelector('[aria-checked=true]')) == null)) {
      x.focus();
    }
    return () => {
      document.removeEventListener('pointerdown', g, true);
      document.removeEventListener('keydown', E);
      document.removeEventListener('scroll', g, true);
      window.removeEventListener('resize', b);
    };
  }, [l]);
  const h = (y?: any) => {
      if (((s.current = y), l)) {
        c(null);
        return;
      }
      const g = map?.current;
      if (g) {
        const x = g.getCenter();
        p({
          center: [x.lat, x.lng],
          zoom: Math.max(2, Math.min(13, Math.round(g.getZoom()))),
        });
      }
      const E = y.getBoundingClientRect(),
        b = E.left + E.width / 2 > window.innerWidth / 2,
        w = Math.max(8, Math.min(E.top, window.innerHeight - 320));
      c({
        top: w,
        maxHeight: window.innerHeight - w - 8,
        ...(b
          ? {
              right: window.innerWidth - E.left + 8,
            }
          : {
              left: E.right + 8,
            }),
      });
    },
    A = (y?: any) => {
      var g: any;
      saveMapLayer(y);
      if (!(onPick == null)) {
        onPick(y);
      }
      c(null);
      if (!((g = s.current) == null)) {
        g.focus();
      }
    },
    v =
      l &&
      createPortal(
        <div
          ref={a}
          className="gp-layers"
          role="menu"
          aria-label="Map layers"
          style={l as any}
          onClick={(y?: any) => y.stopPropagation()}
        >
          <strong className="gp-layers__head">Map layer</strong>
          <div className="gp-layers__grid">
            {MAP_LAYERS.map((y?: any) => (
              <button
                key={y.id}
                type="button"
                role="menuitemradio"
                aria-checked={y.id === i.id}
                className="gp-layers__item"
                onClick={() => A(y.id)}
              >
                <LayerThumb layer={y} view={f} />
                <span>{y.name}</span>
              </button>
            ))}
          </div>
        </div>,
        portalRoot(),
      );
  return {
    current: i,
    open: !!l,
    toggle: h,
    menu: v,
  };
}

export function MapControls({ map, onRecenter, layer, onLayer, size, share }: any) {
  const a = useLayerPicker({
    map,
    value: layer,
    onPick: onLayer,
  });
  return (
    <div
      style={
        {
          display: 'contents',
        } as any
      }
      onClick={(l?: any) => l.stopPropagation()}
    >
      <MapControlStack
        className="gp-mapctl"
        style={SHARE_POS_LEFT as any}
        size={size}
        onZoomIn={() => {
          return map.current?.zoomIn();
        }}
        onZoomOut={() => {
          return map.current?.zoomOut();
        }}
        onRecenter={onRecenter}
        satellite={isDarkLayer(a.current)}
        onLayers={a.toggle}
        layersOpen={a.open}
        extra={
          share && (
            <ShareLocation key={share.plate} {...share} size={size ?? 32} placement="right" />
          )
        }
      />
      {a.menu}
    </div>
  );
}

export function TrackMap({
  className = '',
  pins = [],
  lines = [],
  progress,
  fit,
  fitKey,
  follow,
  layer,
  onLayer,
  overlay,
  maxFitZoom = 15,
  cluster = false,
  clusterTitle = (y?: any) => `${y} items`,
  share,
}: any) {
  const y = useRef<any>(null),
    {
      map: g,
      ready: E,
      layer: b,
    } = useLeafletMap(y, {
      layer,
      zoom: 12,
    }),
    w = useRef<any>(new globalThis.Map<any, any>()),
    x = useRef<any>(new globalThis.Map<any, any>()),
    S = useRef<any>(null),
    W = useRef<any>(null),
    O = useRef<any>(null),
    C = useRef<any>(null),
    [k, z] = useState<any>({});
  pins.forEach((P?: any) => x.current.set(P.id, P.onClick));
  const B = () => {
      const P: any = {};
      for (const [H, Y] of w.current) {
        const te = Y.getElement();
        if (te) {
          P[H] = te;
        }
      }
      z(P);
    },
    J = useRef<any>(() => false);
  J.current = () => {
    if (!g.current || !S.current) return false;
    const P = new globalThis.Map<any, any>(pins.map((H?: any) => [H.id, H]));
    return clusterMarkers(g.current, w.current, S.current, {
      enabled: cluster,
      alone: (H?: any) => {
        var Y: any;
        return !!((Y = P.get(H)) != null && Y.top);
      },
      toneOf: (H?: any) => {
        return /(?:^|\s)tone-([a-z]+)/.exec(P.get(H)?.className ?? '')?.[1];
      },
      title: clusterTitle,
    });
  };
  useEffect(() => {
    const P = g.current;
    if (!E || !P) return;
    S.current = L.layerGroup().addTo(P);
    const H = () => {
      if (J.current()) {
        B();
      }
    };
    P.on('zoomend', H);
    return () => {
      var Y: any;
      P.off('zoomend', H);
      if (!((Y = S.current) == null)) {
        Y.remove();
      }
      S.current = null;
    };
  }, [E, g]);
  useEffect(() => {
    const P = g.current;
    if (!E || !P) return;
    const H = new Set<any>();
    let Y = false;
    for (const te of pins) {
      H.add(te.id);
      const j = w.current.get(te.id);
      if (j) {
        const fe = j.getLatLng();
        if (fe.lat !== te.at[0] || fe.lng !== te.at[1]) {
          j.setLatLng(te.at);
        }
        if ((j.options.zIndexOffset ?? 0) !== (te.top ? 1e3 : 0)) {
          j.setZIndexOffset(te.top ? 1e3 : 0);
        }
      } else {
        const fe = L.marker(te.at, {
          icon: L.divIcon({
            className: 'td-avd__pin-box',
            html: '',
            iconSize: [30, 30],
          }),
          keyboard: false,
          zIndexOffset: te.top ? 1e3 : 0,
        }).on('click', () => {
          return x.current.get(te.id)?.();
        });
        w.current.set(te.id, fe);
        Y = true;
      }
    }
    for (const [te, j] of w.current) H.has(te) || (j.remove(), w.current.delete(te), (Y = true));
    if (J.current()) {
      Y = true;
    }
    if (Y) {
      B();
    }
  }, [pins, cluster, E, g]);
  useEffect(() => {
    const P = w.current;
    return () => {
      P.forEach((H?: any) => H.remove());
      P.clear();
    };
  }, []);
  useEffect(() => {
    var Y: any, te: any;
    const P = g.current;
    if (!E || !P) return;
    if (!((Y = W.current) == null)) {
      Y.remove();
    }
    const H = L.featureGroup();
    for (const j of lines)
      j.points.length > 1 &&
        L.polyline(j.points, {
          className: `gp-route ${j.className}`,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(H);
    W.current = H.addTo(P);
    if (!((te = O.current) == null)) {
      te.bringToFront();
    }
  }, [lines, E, g]);
  useEffect(() => {
    var H: any;
    const P = g.current;
    if (!(!E || !P)) {
      if (!progress || progress.length < 2) {
        if (!((H = O.current) == null)) {
          H.remove();
        }
        O.current = null;
        return;
      }
      if (O.current) {
        O.current.setLatLngs(progress);
      } else {
        O.current = L.polyline(progress, {
          className: 'gp-route is-done',
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(P);
      }
    }
  }, [progress, E, g]);
  useEffect(
    () => () => {
      O.current = null;
    },
    [],
  );
  const G = () => fit ?? [...lines.flatMap((P?: any) => P.points), ...pins.map((P?: any) => P.at)],
    $ = () => {
      const P = g.current;
      if (!P) return;
      const H = G();
      if (H.length === 1) {
        P.setView(H[0], maxFitZoom);
      } else {
        if (H.length) {
          fitMap(P, H, maxFitZoom);
        }
      }
    };
  useEffect(() => {
    if (!(!E || C.current === fitKey || !G().length)) {
      {
        C.current = fitKey;
        $();
      }
    }
  }, [fitKey, pins, lines, E]);
  const Z = follow?.[0],
    Q = follow?.[1];
  useEffect(() => {
    const P = g.current;
    if (!(!E || !P || Z == null || Q == null || P.getBounds().pad(-0.15).contains([Z, Q]))) {
      P.panTo([Z, Q], {
        animate: true,
      });
    }
  }, [Z, Q, E, g]);
  return (
    <div className={`td-map gp-lmap ${b.dark ? 'is-satellite' : ''} ${className}`}>
      <div ref={y} className="td-avd__leaflet" />
      {pins.map((P?: any) => {
        const H = k[P.id];
        return H
          ? createPortal(
              <span className={`td-marker ${P.className}`} tabIndex={0}>
                {P.children}
              </span>,
              H,
              P.id,
            )
          : null;
      })}
      <MapControls map={g} onRecenter={$} layer={layer} onLayer={onLayer} share={share} />
      {overlay}
    </div>
  );
}
