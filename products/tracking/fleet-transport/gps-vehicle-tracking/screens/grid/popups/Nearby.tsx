// IT-0055. Nearby Vehicles popup (prototype openNearby, Vehicle Overview design): light Esri street
// map with the vehicle's info card, and the 300px Vehicle Overview panel: selected vehicle with ‹ ›,
// Search Radius slider (5 / 10 / 20 / 50 / 100 km), Nearby Vehicles list (selected card outlined),
// "Show nearby vehicles on map" toggle; the panel collapses to a round button. Distances are demo.
import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Frame, type PopupKind } from './Frame';
import { VehPanel } from './VehPanel';
import {
  I,
  IC,
  IcoDetails,
  IcoNearby,
  Pic,
  PopupMap,
  TintChip,
  fmtDay,
  hasDriver,
  home,
  pinMarker,
  rng,
  st,
  useToast,
  type PV,
} from './kit';

const NB_STEPS = [5, 10, 20, 50, 100];
let MINI = false;
const fmtD = (d: number) => (d < 0.1 ? Math.round(d * 1000) + ' m' : d.toFixed(1) + ' km');
function pool(all: PV[], sel: PV) {
  const c = home(sel);
  const r = rng(sel.plate + 'n');
  return all
    .filter((x) => x.plate !== sel.plate)
    .map((x) => {
      const d = Math.pow(r(), 1.5) * 14;
      const a = r() * 6.28;
      return { v: x, d, ll: [c[0] + (Math.cos(a) * d) / 111, c[1] + (Math.sin(a) * d) / 101] as [number, number] };
    });
}

export function NearbyPopup({
  v,
  all,
  onNav,
  onClose,
}: {
  v: PV;
  all: PV[];
  onNav: (k: PopupKind, v: PV) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [idx, setIdx] = useState(() => Math.max(0, all.findIndex((x) => x.plate === v.plate)));
  const [stepI, setStepI] = useState(1);
  const [show, setShow] = useState(false);
  const [selNear, setSelNear] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [map, setMap] = useState<L.Map | null>(null);
  const [mini, setMini] = useState(MINI);
  const sel = all[idx] ?? v;
  const km = NB_STEPS[stepI]!;
  const list = useMemo(
    () =>
      pool(all, sel)
        .filter((p) => p.d <= km)
        .sort((a, b) => a.d - b.d),
    [all, sel, km],
  );
  const markers = useRef<Map<string, L.Marker>>(new Map());
  const pending = useRef<{ plate: string; ll: [number, number] } | null>(null);
  const listBox = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!map) return;
    const layers: L.Layer[] = [];
    markers.current = new Map();
    const c = home(sel);
    const me = pinMarker(c, sel, true, { zIndexOffset: 1000 })
      .addTo(map)
      .bindTooltip(`<span class="nb-lab"><i style="background:${st(sel.status).dot}"></i>${sel.plate}</span>`, {
        permanent: true,
        direction: 'top',
        offset: [0, -16],
        className: 'nb-tt',
      });
    layers.push(me);
    if (show) {
      const circle = L.circle(c, {
        radius: km * 1000,
        color: '#009863',
        weight: 2,
        dashArray: '6 6',
        fillColor: '#009863',
        fillOpacity: 0.04,
      }).addTo(map);
      layers.push(circle);
      list.forEach((p) => {
        const m = pinMarker(p.ll, p.v, false)
          .addTo(map)
          .bindTooltip(p.v.plate + ' · ' + fmtD(p.d) + ' away');
        m.on('click', () => {
          setSelNear(p.v.plate);
          listBox.current
            ?.querySelector(`[data-plate="${CSS.escape(p.v.plate)}"]`)
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          m.openTooltip();
        });
        markers.current.set(p.v.plate, m);
        layers.push(m);
      });
      map.fitBounds(circle.getBounds(), { paddingTopLeft: [20, 20], paddingBottomRight: [20, 120] });
    } else map.setView(c, 12);
    const go = pending.current;
    if (go) {
      pending.current = null;
      map.setView(go.ll, 15);
      markers.current.get(go.plate)?.openTooltip();
    }
    return () => {
      layers.forEach((l) => map.removeLayer(l));
    };
  }, [map, sel, km, show, list]);

  useEffect(() => {
    if (map) {
      const t = window.setTimeout(() => map.invalidateSize(), 220);
      return () => window.clearTimeout(t);
    }
  }, [open, map]);

  const pick = (p: (typeof list)[number]) => {
    setSelNear(p.v.plate);
    if (!show) {
      pending.current = { plate: p.v.plate, ll: p.ll };
      setShow(true);
    } else {
      map?.setView(p.ll, 15);
      markers.current.get(p.v.plate)?.openTooltip();
    }
  };
  const setStep = (i: number) => setStepI(Math.max(0, Math.min(4, i)));
  const fromX = (x: number) => {
    const rc = track.current!.getBoundingClientRect();
    return Math.round(((x - rc.left) / rc.width) * 4);
  };
  const step = (d: number) => {
    setIdx((i) => (i + d + all.length) % all.length);
    setSelNear(null);
  };
  const pct = (stepI / 4) * 100 + '%';

  return (
    <Frame
      kind="nearby"
      head={v}
      navV={sel}
      icon={<IcoNearby size={16} tone="white" />}
      title="Nearby Vehicles"
      onNav={onNav}
      onClose={onClose}
      bodyClass={open ? undefined : 'nb-collapsed'}
    >
      <PopupMap
        className="pp-map nb-map"
        center={home(sel)}
        zoom={12}
        opts={{ light: true, center: () => home(sel) }}
        onMap={setMap}
      >
        <VehPanel
          v={sel}
          speed={parseInt(sel.speed, 10) || 0}
          status={sel.status}
          stamp={{
            d: fmtDay(now),
            t: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          }}
          loc={home(sel)}
          mini={mini}
          onMini={(m) => {
            MINI = m;
            setMini(m);
          }}
        />
      </PopupMap>
      <aside className={'nb-ov' + (open ? '' : ' hide')}>
        <div className="nb-ovh">
          <span className="nb-tile">
            <IcoDetails size={24} tone="white" />
          </span>
          <div>
            <b>Vehicle Overview</b>
            <small>Nearby vehicles and details</small>
          </div>
          <button type="button" className="nb-min" title="Minimise" onClick={() => setOpen(false)}>
            <I d={IC.minus} size={12} />
          </button>
        </div>
        <div className="nb-scroll">
          <div className="nb-card nb-veh">
            <button type="button" className="nb-arr" data-d="-1" aria-label="Previous vehicle" onClick={() => step(-1)}>
              <I d={IC.chevL} />
            </button>
            {sel.img && <Pic src={sel.img} />}
            <div className="nb-pl">
              <b className="nb-plate" title={sel.name}>
                {sel.plate}
              </b>
              <span
                className="nb-gpill"
                style={{
                  background: st(sel.status).grad,
                  boxShadow: `inset 0 0 0 1px ${st(sel.status).ring},0 3px 8px rgba(1,29,50,.15)`,
                }}
              >
                <i />
                {sel.status}
              </span>
            </div>
            <button type="button" className="nb-arr" data-d="1" aria-label="Next vehicle" onClick={() => step(1)}>
              <I d={IC.chevR} />
            </button>
          </div>
          <div className="nb-card">
            <div className="nb-row1">
              <span className="nb-ic">
                <I d={IC.radar} size={18} />
              </span>
              <b>Search Radius</b>
              <b className="nb-km" style={{ marginLeft: 'auto' }}>
                {km} km
              </b>
            </div>
            <div className="nb-slider">
              <div
                className="nb-track"
                ref={track}
                onPointerDown={(e) => {
                  setStep(fromX(e.clientX));
                  const mv = (ev: PointerEvent) => setStep(fromX(ev.clientX));
                  const up = () => {
                    document.removeEventListener('pointermove', mv);
                    document.removeEventListener('pointerup', up);
                  };
                  document.addEventListener('pointermove', mv);
                  document.addEventListener('pointerup', up);
                }}
              >
                <i className="nb-fill" style={{ width: pct }} />
                {NB_STEPS.map((s, i) => (
                  <span key={s} className="nb-tick" style={{ left: (i / 4) * 100 + '%' }} />
                ))}
                <button
                  type="button"
                  className="nb-thumb"
                  aria-label="Search radius"
                  style={{ left: pct }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') setStep(stepI + 1);
                    if (e.key === 'ArrowLeft') setStep(stepI - 1);
                  }}
                />
              </div>
              <div className="nb-steps">
                {NB_STEPS.map((s, i) => (
                  <button key={s} type="button" data-i={i} className={i === stepI ? 'on' : ''} onClick={() => setStep(i)}>
                    {s + (i === 4 ? ' km' : '')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="nb-card nb-ncard">
            <div className="nb-row1">
              <span className="nb-ic">
                <IcoNearby size={18} tone="green" />
              </span>
              <b>Nearby Vehicles</b>
              <small className="nb-cnt" style={{ marginLeft: 'auto' }}>
                {list.length} vehicle{list.length === 1 ? '' : 's'} within {km} km
              </small>
            </div>
            <div className="nb-row1" style={{ margin: '10px 0 4px' }}>
              <span style={{ color: '#3A4654' }}>Show nearby vehicles on map</span>
              <button
                type="button"
                className={'pp-sw nb-show' + (show ? ' on' : '')}
                style={{ marginLeft: 'auto' }}
                aria-label="Show nearby vehicles on map"
                onClick={() => setShow(!show)}
              />
            </div>
            <div className="nb-list" ref={listBox}>
              {list.length ? (
                list.map((p) => (
                  <div
                    key={p.v.plate}
                    data-plate={p.v.plate}
                    className={'nb-item' + (p.v.plate === selNear ? ' is-active' : '')}
                    onClick={() => pick(p)}
                  >
                    {p.v.img ? <Pic src={p.v.img} /> : <span style={{ width: 52 }} />}
                    <div className="t">
                      <b>{p.v.plate}</b>
                      <small>
                        <I d={IC.shield} size={12} />
                        {hasDriver(p.v) ? p.v.operator : 'Unassigned'}
                      </small>
                      <TintChip s={p.v.status} />
                    </div>
                    <div className="r">
                      <span>{fmtD(p.d)} away</span>
                      <button
                        type="button"
                        className="nb-call"
                        title="Call operator"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast('Calling the operator (demo)');
                        }}
                      >
                        <I d={IC.phone} size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#6B7685', padding: '18px 6px' }}>No vehicles within {km} km.</div>
              )}
            </div>
          </div>
        </div>
      </aside>
      <button type="button" className={'nb-fab' + (open ? ' on' : '')} title="Vehicle Overview" onClick={() => setOpen(!open)}>
        <I d={IC.truck} size={18} />
      </button>
    </Frame>
  );
}
