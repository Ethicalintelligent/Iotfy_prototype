// IT-0036. The map of the vehicle overview's Live Track / Track History views (original: X7) with
// React-drawn pins, and the map's Share control (original: m9, inline styles kept).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import type { LatLng } from './analysis';
import {
  FONT,
  MapControls,
  fitAll,
  useLeafletMap,
  vehicleMarkerElement,
  type VehicleMarker,
} from './map';

export interface ShareInfo {
  plate: string;
  lat: number;
  lng: number;
  statusLine: string;
}

function Ico({ s, w = 2, children }: { s: number; w?: number; children: ReactNode }) {
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
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
const SHARE_OFF = {
  bg: '#FFFFFF',
  sh: '0 3px 10px rgba(2,27,58,.18), 0 1px 3px rgba(2,27,58,.12), inset 0 0 0 1px #DCE5E1',
  fg: '#021B3A',
};
const SHARE_ON = {
  bg: 'var(--eit-active-gradient)',
  sh: '0 0 0 1.5px #03AD86, 0 0 10px rgba(3,173,134,.45)',
  fg: '#FFFFFF',
};

export function ShareControl({
  plate,
  lat,
  lng,
  statusLine,
  size = 32,
}: ShareInfo & { size?: number }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const link = `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
  const text = [`EIT Track · ${plate}`, statusLine].filter(Boolean).join('\n');
  const v = encodeURIComponent;
  const href = {
    whatsapp: `https://wa.me/?text=${v(`${text}\n${link}`)}`,
    email: `mailto:?subject=${v(`EIT Track · ${plate}`)}&body=${v(`${text}\n${link}`)}`,
    sms: `sms:?&body=${v(`${text}\n${link}`)}`,
    telegram: `https://t.me/share/url?url=${v(link)}&text=${v(text)}`,
  };
  const copy = () => {
    const done = () => {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(`${text}\n${link}`).then(done, done);
    else done();
  };
  const look = open ? SHARE_ON : SHARE_OFF;
  const close = () => setOpen(false);
  const app = (to: string, bg: string, label: string, icon: ReactNode, external: boolean) => (
    <a
      href={to}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener' : undefined}
      onClick={close}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        textDecoration: 'none',
        color: '#021B3A',
        fontSize: 9.5,
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: bg,
          color: '#FFFFFF',
        }}
      >
        {icon}
      </span>
      {label}
    </a>
  );
  return (
    <div style={{ position: 'relative', width: size, height: size, fontFamily: FONT }}>
      <button
        type="button"
        title="Share"
        aria-label="Share"
        aria-pressed={open}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
          setCopied(false);
        }}
        style={{
          width: size,
          height: size,
          boxSizing: 'border-box',
          border: 'none',
          borderRadius: 10,
          display: 'grid',
          placeItems: 'center',
          padding: 0,
          cursor: 'pointer',
          background: look.bg,
          boxShadow: look.sh,
          color: look.fg,
          transition: 'background .15s ease, box-shadow .15s ease',
        }}
      >
        <Ico s={14}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
        </Ico>
      </button>
      {open && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
          <div
            role="dialog"
            aria-label={`Share ${plate}`}
            style={{
              position: 'absolute',
              top: 0,
              zIndex: 6,
              width: 232,
              boxSizing: 'border-box',
              padding: 12,
              left: 'calc(100% + 8px)',
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
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}
              >
                <span style={{ fontSize: 12, fontWeight: 700 }}>Share tracking</span>
                <span
                  style={{
                    fontSize: 10,
                    color: '#5B6676',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {plate}
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                title="Close"
                aria-label="Close share"
                style={{
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
                }}
              >
                <Ico s={12} w={2.5}>
                  <path d="M6 6l12 12M18 6L6 18" />
                </Ico>
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 4px 4px 8px',
                borderRadius: 8,
                background: '#F5F7F9',
                boxShadow: 'inset 0 0 0 1px #E3E6EA',
              }}
            >
              <span
                title={link}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 10,
                  color: '#3D4A5C',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {link}
              </span>
              <button
                type="button"
                onClick={copy}
                style={{
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
                  background: copied ? '#E6F7EF' : '#021B3A',
                  color: copied ? '#007A47' : '#FFFFFF',
                }}
              >
                <Ico s={11} w={2.6}>
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                </Ico>
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {app(
                href.whatsapp,
                '#25D366',
                'WhatsApp',
                <Ico s={18}>
                  <path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.3l-4.5 1.2Z" />
                  <path d="M9 8.5c0 3.3 3.2 6.5 6.5 6.5l1-1.6-2-1-1 .9c-1-.4-2.4-1.8-2.8-2.8l.9-1-1-2L9 8.5Z" />
                </Ico>,
                true,
              )}
              {app(
                href.email,
                '#EA4335',
                'Email',
                <Ico s={17}>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </Ico>,
                false,
              )}
              {app(
                href.sms,
                '#2B7BFF',
                'SMS',
                <Ico s={17}>
                  <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
                </Ico>,
                false,
              )}
              {app(
                href.telegram,
                '#229ED9',
                'Telegram',
                <Ico s={17}>
                  <path d="M21 4L3 11l6 2 2 6 3-4 5 4 2-15Z" />
                  <path d="M9 13l8-6" />
                </Ico>,
                true,
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** A vehicle marker drawn inside a React pin (original: FM). */
export function VehicleMarkerIcon(m: VehicleMarker) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    ref.current?.replaceChildren(vehicleMarkerElement(m));
  }, [m.plate, m.status, m.speed, m.img]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className="td-vmarker" aria-hidden="true" />;
}

export interface TrackerPin {
  id: string;
  at: LatLng;
  className: string;
  children: ReactNode;
  top?: boolean;
  onClick?: () => void;
}

export function TrackerMap({
  className = '',
  pins = [],
  lines = [],
  progress,
  fit,
  fitKey,
  follow,
  overlay,
  maxFitZoom = 15,
  share,
}: {
  className?: string;
  pins?: TrackerPin[];
  lines?: { id: string; className: string; points: LatLng[] }[];
  progress?: LatLng[];
  fit?: LatLng[];
  fitKey: string;
  follow?: LatLng | null;
  overlay?: ReactNode;
  maxFitZoom?: number;
  share?: ShareInfo | null;
}) {
  const el = useRef<HTMLDivElement>(null);
  const { map, ready, layer } = useLeafletMap(el, 12);
  const markers = useRef(new Map<string, L.Marker>());
  const clicks = useRef(new Map<string, (() => void) | undefined>());
  const routes = useRef<L.FeatureGroup | null>(null);
  const done = useRef<L.Polyline | null>(null);
  const fitted = useRef<string | null>(null);
  const [hosts, setHosts] = useState<Record<string, HTMLElement>>({});
  pins.forEach((p) => clicks.current.set(p.id, p.onClick));
  const collect = () => {
    const out: Record<string, HTMLElement> = {};
    for (const [id, mk] of markers.current) {
      const e = mk.getElement();
      if (e) out[id] = e;
    }
    setHosts(out);
  };

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const seen = new Set<string>();
    let changed = false;
    for (const p of pins) {
      seen.add(p.id);
      const mk = markers.current.get(p.id);
      if (mk) {
        const ll = mk.getLatLng();
        if (ll.lat !== p.at[0] || ll.lng !== p.at[1]) mk.setLatLng(p.at);
        if ((mk.options.zIndexOffset ?? 0) !== (p.top ? 1000 : 0))
          mk.setZIndexOffset(p.top ? 1000 : 0);
      } else {
        const n = L.marker(p.at, {
          icon: L.divIcon({ className: 'td-avd__pin-box', html: '', iconSize: [30, 30] }),
          keyboard: false,
          zIndexOffset: p.top ? 1000 : 0,
        })
          .on('click', () => clicks.current.get(p.id)?.())
          .addTo(m);
        markers.current.set(p.id, n);
        changed = true;
      }
    }
    for (const [id, mk] of markers.current)
      if (!seen.has(id)) {
        mk.remove();
        markers.current.delete(id);
        changed = true;
      }
    if (changed) collect();
  }, [pins, ready, map]);
  useEffect(() => {
    const all = markers.current;
    return () => {
      all.forEach((m) => m.remove());
      all.clear();
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    routes.current?.remove();
    const g = L.featureGroup();
    for (const l of lines)
      if (l.points.length > 1)
        L.polyline(l.points, {
          className: `gp-route ${l.className}`,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(g);
    routes.current = g.addTo(m);
    done.current?.bringToFront();
  }, [lines, ready, map]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    if (!progress || progress.length < 2) {
      done.current?.remove();
      done.current = null;
      return;
    }
    if (done.current) done.current.setLatLngs(progress);
    else
      done.current = L.polyline(progress, {
        className: 'gp-route is-done',
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }).addTo(m);
  }, [progress, ready, map]);

  const points = () => fit ?? [...lines.flatMap((l) => l.points), ...pins.map((p) => p.at)];
  const recenter = () => {
    const m = map.current;
    if (!m) return;
    const pts = points();
    if (pts.length === 1) m.setView(pts[0]!, maxFitZoom);
    else if (pts.length) fitAll(m, pts, maxFitZoom);
  };
  useEffect(() => {
    if (!ready || fitted.current === fitKey || !points().length) return;
    fitted.current = fitKey;
    recenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, pins, lines, ready]);
  const fLat = follow?.[0];
  const fLng = follow?.[1];
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || fLat == null || fLng == null) return;
    if (!m.getBounds().pad(-0.15).contains([fLat, fLng])) m.panTo([fLat, fLng], { animate: true });
  }, [fLat, fLng, ready, map]);

  return (
    <div className={`td-map gp-lmap ${layer.dark ? 'is-satellite' : ''} ${className}`}>
      <div ref={el} className="td-avd__leaflet" />
      {pins.map((p) => {
        const host = hosts[p.id];
        return host
          ? createPortal(
              <span className={`td-marker ${p.className}`} tabIndex={0}>
                {p.children}
              </span>,
              host,
              p.id,
            )
          : null;
      })}
      <MapControls
        map={map}
        onRecenter={recenter}
        extra={share && <ShareControl key={share.plate} {...share} size={32} />}
      />
      {overlay}
    </div>
  );
}
