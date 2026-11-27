// IT-0055. Live Monitor popup (prototype openLive): Live Track | Track History switch and vehicle
// switcher in the header; the map with Tracking's controls, summary chips, Live / Last known position
// chip, today's route with its stops and the vehicle info card. Track History: the timeline bar with
// play / speed controls above the map, the day's route, start / end and stop markers, date range
// picker on the map and the "Selected History Dates" column in the card when 2+ dates are chosen.
// Routes, stops and figures are the prototype's seeded demo activity (labelled).
import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Frame, type PopupKind } from './Frame';
import { VehPanel, type DateItem } from './VehPanel';
import {
  I,
  IC,
  Pic,
  PopupMap,
  TintChip,
  addDays,
  clock12,
  fmtDay,
  home,
  iso,
  pinMarker,
  rng,
  stopMap,
  useToast,
  type PV,
} from './kit';

export type LiveMode = 'live' | 'history';
let MINI_CARD = false;

const stopIcon = () =>
  L.divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div class="pp-stop"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex:none">${IC.stops}</svg></div>`,
  });

function MapStats({ d, idle, stops, max }: { d: string | number; idle: number; stops: number; max: number }) {
  return (
    <div className="pp-mstats" ref={stopMap}>
      <span>
        <em>Distance:</em> <b>{d} km</b>
      </span>
      <span>
        <em>Idle:</em> <b>{idle}</b>
      </span>
      <span>
        <em>Stops:</em> <b>{stops}</b>
      </span>
      <span>
        <em>Max speed:</em> <b>{max} km/h</b>
      </span>
    </div>
  );
}

function dayPlan(v: PV, c: [number, number], day: string) {
  const hr = rng(v.plate + 'hist' + day);
  let p = c.slice() as [number, number];
  let hd = hr() * 6.28;
  const pts: [number, number][] = [c.slice() as [number, number]];
  for (let i = 0; i < 160; i++) {
    hd += (hr() - 0.5) * 0.45;
    p = [p[0] + Math.cos(hd) * 0.0011, p[1] + Math.sin(hd) * 0.0012];
    pts.push(p.slice() as [number, number]);
  }
  const t0 = 4 * 60 + 30 + Math.floor(hr() * 120);
  const t1 = t0 + 360 + Math.floor(hr() * 300);
  return { hr, pts, t0, t1 };
}

export function LivePopup({
  v,
  all,
  mode: startMode,
  onNav,
  onClose,
}: {
  v: PV;
  all: PV[];
  mode: LiveMode;
  onNav: (k: PopupKind, v: PV, mode?: LiveMode) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const c = useMemo(() => home(v), [v]);
  const [mode, setMode] = useState<LiveMode>(startMode);
  const [map, setMap] = useState<L.Map | null>(null);
  const [mini, setMini] = useState(MINI_CARD);
  const [menu, setMenu] = useState(false);
  const running = v.status === 'Running' || v.status === 'Overspeed';
  const noTx = v.status === 'No Transmit' || v.status === 'Yet to Transmit';
  const toggleMini = (m: boolean) => {
    MINI_CARD = m;
    setMini(m);
  };

  /* ---------------- live */
  const live = useMemo(() => {
    const tr = rng(v.plate + 'today');
    const moved = running || v.status === 'Idle' || v.status === 'Stopped' || v.status === 'Overspeed';
    const r0 = rng(v.plate + 'lt');
    const run = running ? 60 + r0() * 200 : 0;
    void run;
    const tKm = moved ? +(((run / 60) * 36 + 8 + tr() * 30).toFixed(1)) : 0;
    const tTrips = moved ? 1 + Math.floor(tr() * 4) : 0;
    void tTrips;
    const tStops = moved ? 2 + Math.floor(tr() * 8) : 0;
    const tIdle = moved ? 2 + Math.floor(tr() * 30) : 0;
    const tMax = moved ? 60 + Math.floor(tr() * 50) : 0;
    const back: [number, number][] = [c.slice() as [number, number]];
    if (moved) {
      let hd = tr() * 6.28;
      for (let i = 0; i < 70; i++) {
        hd += (tr() - 0.5) * 0.5;
        const q = back[0]!;
        back.unshift([q[0] - Math.cos(hd) * 0.0011, q[1] - Math.sin(hd) * 0.0012]);
      }
    }
    return { moved, tKm, tStops, tIdle, tMax, back, r0 };
  }, [v, c, running]);
  const now = useMemo(() => new Date(), []);
  const [liveSpd, setLiveSpd] = useState(() => parseInt(v.speed, 10) || 0);
  const [livePos, setLivePos] = useState<[number, number]>(c);

  useEffect(() => {
    if (!map || mode !== 'live') return;
    const layers: L.Layer[] = [];
    const timers: number[] = [];
    if (live.moved) {
      layers.push(L.polyline(live.back, { color: '#0363FF', weight: 4, opacity: 0.9 }).addTo(map));
      const n = Math.min(live.tStops, 8);
      for (let k = 0; k < n; k++)
        layers.push(
          L.marker(live.back[Math.floor(((k + 0.5) * (live.back.length - 2)) / n)]!, { icon: stopIcon() })
            .addTo(map)
            .bindTooltip('Stop ' + (k + 1)),
        );
      const bb0 = L.latLngBounds(live.back);
      const fitOpt = { paddingTopLeft: [60, 60] as L.PointTuple, paddingBottomRight: [60, 150] as L.PointTuple, maxZoom: 16 };
      map.fitBounds(bb0, fitOpt);
      timers.push(
        window.setTimeout(() => {
          map.invalidateSize();
          map.fitBounds(bb0, fitOpt);
        }, 120),
      );
    } else map.setView(c, 17);
    const mk = pinMarker(c, v, true, { zIndexOffset: 1000 }).addTo(map);
    layers.push(mk);
    setLivePos(c);
    setLiveSpd(parseInt(v.speed, 10) || 0);
    if (running) {
      // the prototype's random source continues after the duration tiles
      const r = rng(v.plate + 'lt');
      r(); // run
      r(); // stopped
      const trail: [number, number][] = [c];
      let hd2 = r() * 6.28;
      const line = L.polyline(trail, { color: '#0363FF', weight: 4 }).addTo(map);
      layers.push(line);
      let spd = parseInt(v.speed, 10) || 0;
      timers.push(
        window.setInterval(() => {
          hd2 += (r() - 0.5) * 0.5;
          const p = trail[trail.length - 1]!;
          const nx: [number, number] = [p[0] + Math.cos(hd2) * 0.00025, p[1] + Math.sin(hd2) * 0.00028];
          trail.push(nx);
          line.setLatLngs(trail);
          mk.setLatLng(nx);
          spd = Math.max(10, Math.min(130, spd + Math.round((r() - 0.5) * 12)));
          setLiveSpd(spd);
          setLivePos(nx);
        }, 2500),
      );
    }
    return () => {
      layers.forEach((l) => map.removeLayer(l));
      timers.forEach((t) => {
        window.clearInterval(t);
        window.clearTimeout(t);
      });
    };
  }, [map, mode, live, v, c, running]);

  /* ---------------- history */
  const [hFrom, setHFrom] = useState(() => iso(new Date()) + 'T00:00');
  const [hTo, setHTo] = useState(() => iso(new Date()) + 'T23:59');
  const [hDay, setHDay] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [fromIn, setFromIn] = useState(hFrom);
  const [toIn, setToIn] = useState(hTo);
  const days = useMemo(() => {
    const out: string[] = [];
    let d = new Date(hTo.slice(0, 10) + 'T00:00');
    const f = new Date(hFrom.slice(0, 10) + 'T00:00');
    for (let k = 0; d >= f && k < 31; k++) {
      out.push(iso(d));
      d = addDays(d, -1);
    }
    return out;
  }, [hFrom, hTo]);
  const day = hDay && days.includes(hDay) ? hDay : days[0]!;
  const plan = useMemo(() => {
    const p = dayPlan(v, c, day);
    const { hr, pts } = p;
    const hStops = 3 + Math.floor(hr() * 6);
    const hIdle = 2 + Math.floor(hr() * 38);
    const hMax = 78 + Math.floor(hr() * 40);
    const stopAt: Record<number, 1> = {};
    const stopIdx: number[] = [];
    for (let sk = 0; sk < hStops; sk++) {
      const si = Math.floor(((sk + 0.5) * 158) / hStops);
      stopAt[si] = 1;
      stopIdx.push(si);
    }
    const hsp = pts.map((_, i) => (stopAt[i] || i === 0 || i === pts.length - 1 ? 0 : 25 + Math.floor(hr() * 70)));
    return { ...p, hStops, hIdle, hMax, stopIdx, hsp };
  }, [v, c, day]);
  const timeAt = (i: number) => clock12(plan.t0 + ((plan.t1 - plan.t0) * i) / (plan.pts.length - 1));
  const [idx, setIdx] = useState(0);
  const [on, setOn] = useState(false);
  const [sp, setSp] = useState(1);
  const playAfter = useRef(false);
  const hMarker = useRef<L.Marker | null>(null);
  useEffect(() => {
    setIdx(0);
    setOn(playAfter.current);
    playAfter.current = false;
  }, [plan]);
  useEffect(() => {
    if (!map || mode !== 'history') return;
    const { pts } = plan;
    const layers: L.Layer[] = [];
    const line = L.polyline(pts, { color: '#0363FF', weight: 4, opacity: 0.85 }).addTo(map);
    layers.push(line);
    layers.push(
      L.circleMarker(pts[0]!, { radius: 7, color: '#fff', weight: 3, fillColor: '#009863', fillOpacity: 1 })
        .addTo(map)
        .bindTooltip('Start · ' + timeAt(0)),
    );
    layers.push(
      L.circleMarker(pts[pts.length - 1]!, { radius: 7, color: '#fff', weight: 3, fillColor: '#F90507', fillOpacity: 1 })
        .addTo(map)
        .bindTooltip('End · ' + timeAt(pts.length - 1)),
    );
    plan.stopIdx.forEach((si, sk) =>
      layers.push(
        L.marker(pts[si]!, { icon: stopIcon() })
          .addTo(map)
          .bindTooltip('Stop ' + (sk + 1) + ' · ' + timeAt(si)),
      ),
    );
    const mk = pinMarker(pts[0]!, v, false, { zIndexOffset: 1000 }).addTo(map);
    hMarker.current = mk;
    layers.push(mk);
    const bb = line.getBounds();
    const fo = { paddingTopLeft: [60, 60] as L.PointTuple, paddingBottomRight: [60, 150] as L.PointTuple };
    map.fitBounds(bb, fo);
    const t = window.setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bb, fo);
    }, 120);
    return () => {
      window.clearTimeout(t);
      hMarker.current = null;
      layers.forEach((l) => map.removeLayer(l));
    };
    // timeAt follows plan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mode, plan, v]);
  useEffect(() => {
    hMarker.current?.setLatLng(plan.pts[idx]!);
  }, [idx, plan]);
  useEffect(() => {
    if (!on || mode !== 'history') return;
    const t = window.setInterval(() => {
      setIdx((i) => {
        if (i >= plan.pts.length - 1) {
          setOn(false);
          return i;
        }
        return i + 1;
      });
    }, 300 / sp);
    return () => window.clearInterval(t);
  }, [on, sp, plan, mode]);
  useEffect(() => {
    if (mode !== 'history') setOn(false);
  }, [mode]);
  const play = () => {
    if (on) return setOn(false);
    if (idx >= plan.pts.length - 1) setIdx(0);
    setOn(true);
  };
  const last = plan.pts.length - 1;
  const fill = (idx / last) * 100;
  const hs = plan.hsp[idx]!;
  const hStatus = hs > 120 ? 'Overspeed' : hs > 0 ? 'Running' : 'Stopped';
  const dateItems: DateItem[] = days.map((dy) => {
    const pl = dayPlan(v, c, dy);
    return { day: fmtDay(new Date(dy + 'T00:00')), range: clock12(pl.t0) + ' – ' + clock12(pl.t1), active: dy === day };
  });
  const fmtRange = () => {
    const f = new Date(hFrom);
    const t = new Date(hTo);
    return (
      fmtDay(f) +
      ', ' +
      clock12(f.getHours() * 60 + f.getMinutes()) +
      ' – ' +
      (iso(f) === iso(t) ? '' : fmtDay(t) + ', ') +
      clock12(t.getHours() * 60 + t.getMinutes())
    );
  };

  // a click outside the vehicle switcher closes its menu
  useEffect(() => {
    if (!menu) return;
    const off = (e: MouseEvent) => !(e.target as HTMLElement).closest('.pp-sel') && setMenu(false);
    document.addEventListener('click', off);
    return () => document.removeEventListener('click', off);
  }, [menu]);

  const hist = mode === 'history';
  return (
    <Frame
      kind="live"
      head={v}
      icon={<I d={hist ? IC.route : IC.send} size={14} />}
      title={hist ? 'Track History' : 'Live Tracking'}
      extra={
        <>
          <span style={{ marginLeft: 'auto', display: 'inline-flex' }}>
            <TintChip s={v.status} />
          </span>
          <div className="pp-seg">
            <button type="button" data-m="live" className={!hist ? 'on' : ''} onClick={() => setMode('live')}>
              <I d={IC.send} size={13} />
              Live Track
            </button>
            <button type="button" data-m="history" className={hist ? 'on' : ''} onClick={() => setMode('history')}>
              <I d={IC.route} size={13} />
              Track History
            </button>
          </div>
          <div className="pp-sel">
            <button
              type="button"
              className="pp-selbtn"
              onClick={(e) => {
                e.stopPropagation();
                setMenu(!menu);
              }}
            >
              <I d={IC.swap} size={13} />
              <span>{v.plate}</span>
              <I d={IC.chev} size={13} />
            </button>
            {menu && (
              <div className="pp-menu">
                {all.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    className={x.plate === v.plate ? 'on' : ''}
                    onClick={() => {
                      setMenu(false);
                      onNav('live', x, mode);
                    }}
                  >
                    {x.img && <Pic src={x.img} />}
                    <b>{x.name}</b>
                    <small>{x.plate}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      }
      closeStyle={{ marginLeft: 0 }}
      onNav={(k, nv) => onNav(k, nv)}
      onClose={onClose}
      bodyStyle={{ background: '#fff', padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      <div className="pp-lvbar" style={hist ? undefined : { display: 'none' }}>
        {hist && (
          <div className="pp-tl">
            <button
              type="button"
              className="pp-tl-back"
              title="Back to start"
              aria-label="Back to start"
              onClick={() => {
                setOn(false);
                setIdx(0);
              }}
            >
              <I d={IC.back} size={15} />
            </button>
            <button type="button" className="pp-tl-play" title={on ? 'Pause' : 'Play'} aria-label={on ? 'Pause' : 'Play'} onClick={play}>
              <I d={on ? IC.pauseT : IC.playT} size={17} />
            </button>
            <b className="pp-tl-now">{timeAt(idx)}</b>
            <div className="pp-tl-track">
              <i className="pp-tl-fill" style={{ width: fill + '%' }} />
              <span className="pp-tl-thumb" style={{ left: fill + '%' }} />
              <input
                type="range"
                min={0}
                max={last}
                value={idx}
                aria-label="Playback position"
                onChange={(e) => setIdx(+e.target.value)}
              />
            </div>
            <span className="pp-tl-end">{timeAt(last)}</span>
            <div className="pp-tl-spd">
              {[1, 2, 4, 8].map((x) => (
                <button key={x} type="button" data-s={x} className={x === sp ? 'on' : ''} onClick={() => setSp(x)}>
                  {x}×
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <PopupMap
        center={c}
        zoom={17}
        opts={{ share: true, center: () => c }}
        style={{ flex: 1, minHeight: 320, borderRadius: 12 }}
        onMap={setMap}
      >
        {!hist ? (
          <>
            <MapStats d={live.tKm} idle={live.tIdle} stops={live.tStops} max={live.tMax} />
            <span className="pp-lkp">
              {noTx ? (
                <>
                  <I d={IC.wifioff} size={15} />
                  Last known position
                </>
              ) : (
                <>
                  <i className="dot" />
                  Live
                </>
              )}
            </span>
            <VehPanel
              v={v}
              speed={liveSpd}
              status={v.status}
              stamp={{
                d: fmtDay(now),
                t: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              }}
              loc={livePos}
              mini={mini}
              onMini={toggleMini}
            />
          </>
        ) : (
          <>
            <MapStats d={(plan.pts.length * 0.13).toFixed(1)} idle={plan.hIdle} stops={plan.hStops} max={plan.hMax} />
            <VehPanel
              v={v}
              speed={hs}
              status={hStatus}
              stamp={{ d: fmtDay(new Date(day + 'T00:00')), t: timeAt(idx).replace(/^(\d\d:\d\d)/, '$1:00') }}
              loc={plan.pts[idx]!}
              mini={mini}
              onMini={toggleMini}
              dates={dateItems}
              onPickDate={(i) => setHDay(days[i]!)}
              onPlayDate={(i) => {
                playAfter.current = days[i] !== day;
                setHDay(days[i]!);
                if (days[i] === day) play();
              }}
            />
            <div className="pp-lkp pp-hdate" ref={stopMap}>
              <button type="button" className="pp-hdate-b" onClick={() => setDateOpen(!dateOpen)}>
                <I d={IC.cal2} size={14} />
                <span>{fmtRange()}</span>
                <I d={IC.chev} size={13} />
              </button>
              <div className="pp-hdate-pop" hidden={!dateOpen}>
                <label>
                  From
                  <input className="pp-in pp-hf" type="datetime-local" value={fromIn} onChange={(e) => setFromIn(e.target.value)} />
                </label>
                <label>
                  To
                  <input className="pp-in pp-ht" type="datetime-local" value={toIn} onChange={(e) => setToIn(e.target.value)} />
                </label>
                <button
                  type="button"
                  className="pp-btn pri pp-hgo"
                  onClick={() => {
                    const f = fromIn || hFrom;
                    let t = toIn || hTo;
                    if (new Date(t) < new Date(f)) t = f;
                    setHFrom(f);
                    setHTo(t);
                    setToIn(t);
                    setHDay(null);
                    toast('Route loaded for the selected period');
                  }}
                >
                  <I d={IC.search} size={14} />
                  Show route
                </button>
              </div>
            </div>
          </>
        )}
      </PopupMap>
    </Frame>
  );
}
