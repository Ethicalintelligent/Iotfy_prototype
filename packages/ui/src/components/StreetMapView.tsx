// The Leaflet part of StreetMap (see StreetMap.tsx), loaded only when a map is shown.
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ICONS, type IconName } from '../icons';
import { cx } from '../cx';
import type { Hue } from './basics';
import { MapToolButton, type MapMarker, type StreetMapProps } from './StreetMap';

const RIYADH: [number, number] = [24.7136, 46.6753];
const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const CLUSTER_PX = 46;
const HUE_ORDER: Hue[] = [
  'green',
  'red',
  'blue',
  'black',
  'orange',
  'teal',
  'grey',
  'slate',
  'purple',
  'amber',
];

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const svg = (name: IconName, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

function pinIcon(m: MapMarker, labels: boolean, selected: boolean) {
  const hue = m.hue ?? 'green';
  const label =
    labels && m.label
      ? `<span class="ui-smap-pin__label"><i></i>${esc(m.label)}${m.detail ? ` <em>${esc(m.detail)}</em>` : ''}</span>`
      : '';
  return L.divIcon({
    className: 'ui-smap-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div class="${cx('ui-smap-pin', `ui-hue--${hue}`, m.pulse && 'is-pulse', selected && 'is-selected')}"><span class="ui-smap-pin__dot">${svg(m.icon ?? 'vehicles')}</span>${label}</div>`,
  });
}

function clusterIcon(items: MapMarker[]) {
  const counts = new Map<Hue, number>();
  for (const m of items) counts.set(m.hue ?? 'green', (counts.get(m.hue ?? 'green') ?? 0) + 1);
  let at = 0;
  const stops = HUE_ORDER.filter((h) => counts.has(h)).map((h) => {
    const from = (at / items.length) * 100;
    at += counts.get(h)!;
    return `var(--hue-${h}) ${from.toFixed(1)}% ${((at / items.length) * 100).toFixed(1)}%`;
  });
  return L.divIcon({
    className: 'ui-smap-icon',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<div class="ui-smap-cluster" style="background:conic-gradient(${stops.join(',')})"><b>${items.length}</b></div>`,
  });
}

/** Street map with vehicle markers, geofences and a route (Leaflet + OpenStreetMap). */
export default function StreetMapView({
  label,
  markers = [],
  fences = [],
  route,
  cluster = true,
  labels = false,
  selected = null,
  onSelect,
  center = RIYADH,
  zoom = 11,
  fitKey,
  wheelZoom = false,
  height,
  overlay,
  footer,
  tools,
  className,
}: StreetMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ fences: L.LayerGroup; route: L.LayerGroup; pins: L.LayerGroup } | null>(
    null,
  );
  const fitted = useRef<string | number | undefined | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [showFences, setShowFences] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(zoom);

  // Create the map once.
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, {
      center,
      zoom,
      zoomControl: false,
      scrollWheelZoom: wheelZoom,
      attributionControl: true,
    });
    L.tileLayer(OSM, {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    layers.current = {
      fences: L.layerGroup().addTo(m),
      route: L.layerGroup().addTo(m),
      pins: L.layerGroup().addTo(m),
    };
    m.on('zoomend', () => setZoomLevel(m.getZoom()));
    map.current = m;
    // A new map hasn't been fitted yet (React may create it twice in development).
    fitted.current = null;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      layers.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geofences.
  useEffect(() => {
    const g = layers.current?.fences;
    if (!g) return;
    g.clearLayers();
    if (!showFences) return;
    for (const f of fences) {
      const opts = { className: cx('ui-smap-fence', `ui-hue--${f.hue ?? 'purple'}`) };
      const shape =
        f.shape === 'circle' && f.lat != null && f.lng != null
          ? L.circle([f.lat, f.lng], { ...opts, radius: f.radiusM ?? 300 })
          : f.points?.length
            ? L.polygon(f.points, opts)
            : null;
      shape?.bindTooltip(esc(f.name), { sticky: true, className: 'ui-smap-tip' }).addTo(g);
    }
  }, [fences, showFences]);

  // Route.
  useEffect(() => {
    const g = layers.current?.route;
    if (!g) return;
    g.clearLayers();
    if (!route?.points.length) return;
    L.polyline(route.points, { className: 'ui-smap-route' }).addTo(g);
    for (const s of route.stops ?? [])
      L.marker(s, {
        interactive: false,
        icon: L.divIcon({
          className: 'ui-smap-icon',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          html: `<div class="ui-smap-stop">${svg('quotes', 11)}</div>`,
        }),
      }).addTo(g);
  }, [route]);

  // Markers (regrouped on every zoom).
  useEffect(() => {
    const m = map.current;
    const g = layers.current?.pins;
    if (!m || !g) return;
    g.clearLayers();
    const groups: { at: L.Point; items: MapMarker[] }[] = [];
    for (const mk of markers) {
      const at = m.latLngToLayerPoint([mk.lat, mk.lng]);
      const near =
        cluster && mk.id !== selected && zoomLevel < 16
          ? groups.find((x) => x.items[0]!.id !== selected && x.at.distanceTo(at) < CLUSTER_PX)
          : undefined;
      if (near) near.items.push(mk);
      else groups.push({ at, items: [mk] });
    }
    for (const { items } of groups) {
      if (items.length === 1) {
        const mk = items[0]!;
        L.marker([mk.lat, mk.lng], {
          icon: pinIcon(mk, labels, mk.id === selected),
          title: mk.label ? `${mk.label}${mk.detail ? ' · ' + mk.detail : ''}` : undefined,
          riseOnHover: true,
          zIndexOffset: mk.id === selected ? 1000 : 0,
        })
          .on('click', () => onSelectRef.current?.(mk.id))
          .addTo(g);
      } else {
        const b = L.latLngBounds(items.map((x) => [x.lat, x.lng] as [number, number]));
        L.marker(b.getCenter(), {
          icon: clusterIcon(items),
          title: `${items.length} vehicles: zoom in`,
          riseOnHover: true,
        })
          .on('click', () =>
            b.getNorthEast().equals(b.getSouthWest())
              ? m.setView(b.getCenter(), m.getZoom() + 2)
              : m.fitBounds(b, { padding: [60, 60], maxZoom: m.getZoom() + 3 }),
          )
          .addTo(g);
      }
    }
  }, [markers, cluster, labels, selected, zoomLevel]);

  // Fit to the content on first data and when fitKey changes.
  const fitAll = () => {
    const m = map.current;
    if (!m) return false;
    const pts: [number, number][] = [
      ...markers.map((x) => [x.lat, x.lng] as [number, number]),
      ...(route?.points ?? []),
      ...fences.flatMap((f) =>
        f.lat != null && f.lng != null ? [[f.lat, f.lng] as [number, number]] : (f.points ?? []),
      ),
    ];
    if (!pts.length) return false;
    if (pts.length === 1) m.setView(pts[0]!, 14);
    else m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
    return true;
  };
  useEffect(() => {
    if (fitted.current === (fitKey ?? 'first')) return;
    if (fitAll()) fitted.current = fitKey ?? 'first';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, markers.length > 0, route?.points.length, fences.length > 0]);

  // Keep the selected marker in view.
  useEffect(() => {
    const m = map.current;
    const mk = markers.find((x) => x.id === selected);
    if (m && mk && !m.getBounds().pad(-0.1).contains([mk.lat, mk.lng])) m.panTo([mk.lat, mk.lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div
      className={cx('ui-smap', className)}
      style={height != null ? { height } : undefined}
      role="region"
      aria-label={label}
    >
      <div ref={el} className="ui-smap__canvas" />
      <div className="ui-smap__tools">
        <MapToolButton icon="plus" label="Zoom in" onClick={() => map.current?.zoomIn()} />
        <MapToolButton icon="minus" label="Zoom out" onClick={() => map.current?.zoomOut()} />
        <MapToolButton icon="crosshair" label="Show everything" onClick={() => fitAll()} />
        {fences.length > 0 && (
          <MapToolButton
            icon="layers"
            label={showFences ? 'Hide geofences' : 'Show geofences'}
            active={!showFences}
            onClick={() => setShowFences((v) => !v)}
          />
        )}
        {tools}
      </div>
      {overlay && <div className="ui-smap__overlay">{overlay}</div>}
      {footer && <div className="ui-smap__footer">{footer}</div>}
    </div>
  );
}
