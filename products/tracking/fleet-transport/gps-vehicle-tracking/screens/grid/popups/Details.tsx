// IT-0055. Vehicle Details popup (prototype openDetails): Vehicle Info | Live Location | Alerts
// (330px | 1fr | 330px), Device & Health + Sensors, then the Dashboard's chart cards. Name, plate,
// status, operator, odometer, location and picture are the vehicle's; the rest is seeded demo data.
import { useMemo } from 'react';
import { dashActivity, dashAlerts, dashDrivers, dashOdo, dashSpeed } from './dash';
import { Frame, type PopupKind } from './Frame';
import {
  I,
  IC,
  IcoDetails,
  Pic,
  PopupMap,
  Row,
  SectionHead,
  TintChip,
  clock12,
  contactOf,
  hasDriver,
  home,
  lastUpdateText,
  modelOf,
  opId,
  pinMarker,
  rng,
  typeOf,
  type PV,
  type Rnd,
} from './kit';

const ATYPES = [
  { n: 'Device Offline', ic: IC.offline, bg: '#1F2328', d: 'No data for 30 min (limit 30 min)' },
  { n: 'Overspeed', ic: IC.gauge, bg: '#F90507', d: '132 km/h in a 120 km/h limit' },
  { n: 'Harsh Braking', ic: IC.warn, bg: '#FF5A1F', d: 'Speed dropped 42 km/h in 2 s' },
  { n: 'Geofence Exit', ic: IC.pin, bg: '#0363FF', d: 'Left Riyadh Depot' },
];
function todayAlerts(v: PV) {
  const r = rng(v.plate + 'ta');
  const out: { ty: (typeof ATYPES)[number]; t: number }[] = [];
  let t = 9 * 60;
  for (let i = 0; i < v.alerts; i++) {
    t -= 40 + Math.floor(r() * 120);
    out.push({ ty: v.status === 'No Transmit' ? ATYPES[0]! : ATYPES[Math.floor(r() * ATYPES.length)]!, t });
  }
  return out;
}

function deviceHealth(v: PV, r: Rnd) {
  const ind = v.ind;
  const sat = ((ind.gps || '').match(/(\d+)\s*satellite/) || [0, '—'])[1];
  const tone = (k: string, val: string) => {
    val = val || '—';
    if (/not configured|^—$/i.test(val)) return 'na';
    if (k === 'engine') return /^on/i.test(val) ? 'ok' : 'bad';
    if (/not available|no signal|disconnected|low|unfastened|open/i.test(val))
      return k === 'seatbelt' || k === 'door' ? 'off' : 'bad';
    if (/off/i.test(val)) return 'off';
    return 'ok';
  };
  const find = (re: RegExp) => {
    const k = Object.keys(ind).find((x) => re.test(x));
    return k ? ind[k]! : '—';
  };
  const items: [string, string, string, string][] = [
    ['GPS', IC.gps, find(/^gps/), 'gps'],
    ['GSM', IC.gsm, find(/^gsm/), 'gsm'],
    ['Internal Battery', IC.batt, find(/internal battery/), 'int'],
    ['External Battery', IC.power, find(/external/), 'ext'],
    ['AC', IC.snow, find(/^ac$/), 'ac'],
    ['Seatbelt', IC.seat, find(/seat/), 'seatbelt'],
    ['Front Door', IC.door, find(/front door/), 'door'],
    ['Back Door', IC.door, find(/back door/), 'door'],
    ['Engine', IC.key, find(/ignition/), 'engine'],
  ];
  const imei = '3584' + String(Math.floor(r() * 1e11)).padStart(11, '0');
  return (
    <div className="pp-card dt-dev">
      <SectionHead
        icon={<I d={IC.chip} />}
        tone="teal"
        title="Device & Health"
        sub={'Reported ' + (v.last && v.last !== '—' ? v.last.replace('Last report ', '') : 'just now')}
        extra={
          <span className="pp-gchip" style={{ marginLeft: 'auto' }}>
            <i />
            Not set from the platform
          </span>
        }
      />
      <div className="pp-rows">
        <Row ic={IC.barcode} label="IMEI" value={imei} />
        <Row ic={IC.chipS} label="Model · protocol" value="FMB920 · TELTONIKA_FMB" />
        <Row ic={IC.radar} label="Satellites" value={sat ?? '—'} />
      </div>
      <div className="dt-hgrid">
        {items.map((x) => (
          <div key={x[0]} className={`dt-h ${tone(x[3], x[2])}`} title={`${x[0]}: ${x[2]}`}>
            <I d={x[1]} />
            <div>
              <small>{x[0]}</small>
              <b>{x[2].replace(/^./, (c) => c.toUpperCase())}</b>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function sensors(v: PV, r: Rnd) {
  const list = [
    ['Temp 1', 'Temperature', '-10 – 40 °C', '°C'],
    ['Temp 2', 'Temperature', '-10 – 40 °C', '°C'],
    ['Temp 3', 'Temperature', '-10 – 40 °C', '°C'],
    ['Temp 4', 'Temperature', '-10 – 40 °C', '°C'],
    ['Fuel 1', 'Fuel level', '0 – 100 %', '%'],
    ['Load 1', 'Load weight', '0 – 5000 kg', 'kg'],
    ['Humidity 1', 'Humidity', '20 – 80 %', '%'],
    ['Door 1', 'Cargo door', 'Open / Closed', ''],
    ['Pressure 1', 'Tyre pressure', '28 – 36 psi', 'psi'],
  ];
  const live = ['Running', 'Idle', 'Stopped', 'Overspeed'].includes(v.status);
  const vals = list.map((s) =>
    !live || r() < 0.3
      ? '—'
      : s[3] === '°C'
        ? (2 + r() * 30).toFixed(1) + ' °C'
        : s[3] === '%'
          ? Math.round(20 + r() * 70) + ' %'
          : s[3] === 'kg'
            ? Math.round(r() * 4000) + ' kg'
            : s[3] === 'psi'
              ? (29 + r() * 6).toFixed(1) + ' psi'
              : r() > 0.5
                ? 'Closed'
                : 'Open',
  );
  return (
    <div className="pp-card dt-sens">
      <SectionHead icon={<I d={IC.thermo} />} tone="orange" title="Sensors" sub={list.length + ' readings'} />
      <div className="dt-slist">
        {list.map((s, i) => (
          <div key={s[0]} className="dt-s">
            <span className="ic">
              <I d={IC.thermo} size={14} />
            </span>
            <div>
              <small>
                {s[0]} · {s[1]}
              </small>
              <b>{vals[i]}</b>
              <em>Range {s[2]}</em>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailsPopup({
  v,
  onNav,
  onClose,
}: {
  v: PV;
  onNav: (k: PopupKind, v: PV) => void;
  onClose: () => void;
}) {
  const c = home(v);
  const top = useMemo(() => {
    const r = rng(v.plate + 'd');
    const moved = ['Running', 'Idle', 'Overspeed', 'Stopped'].includes(v.status);
    const first = moved ? clock12(6 * 60 + 40 + Math.floor(r() * 60)) : null;
    const lastStop = moved && v.status !== 'Running' ? clock12(9 * 60 + Math.floor(r() * 40)) : null;
    const year = 2019 + Math.floor(r() * 6);
    const colour = ['White', 'Silver', 'Blue'][Math.floor(r() * 3)]!;
    return { first, lastStop, year, colour };
  }, [v.plate, v.status]);
  const extras = useMemo(() => {
    const r = rng(v.plate + 'dx');
    const device = deviceHealth(v, r);
    const sens = sensors(v, r);
    const act = dashActivity(v, r);
    const alerts = dashAlerts(v, r);
    const odo = dashOdo(v, r);
    const speed = dashSpeed(v, r);
    const drivers = dashDrivers(v, r);
    return { device, sensors: sens, act, alerts, odo, speed, drivers };
  }, [v]);
  const al = todayAlerts(v);
  const spd = parseInt(v.speed, 10) || 0;
  return (
    <Frame
      kind="details"
      head={v}
      icon={<IcoDetails size={16} tone="white" />}
      title="Vehicle Details"
      extra={<TintChip s={v.status} />}
      onNav={onNav}
      onClose={onClose}
    >
      <div className="dt-top">
        <div className="pp-card" style={{ overflow: 'auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '6px 4px 12px',
              borderBottom: '1px solid #EEF0F2',
            }}
          >
            {v.img && <Pic src={v.img} style={{ width: 66, height: 46, objectFit: 'contain' }} />}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{v.name}</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{modelOf(v)}</div>
              <div style={{ color: '#6B7685', marginTop: 2 }}>{typeOf(v.name)}</div>
            </div>
          </div>
          <div className="pp-rows">
            <Row ic={IC.hash} label="Vehicle No" value={v.plate} />
            <Row ic={IC.tag} label="Name" value={v.name} />
            <Row ic={IC.box} label="Type" value={typeOf(v.name)} />
            <Row ic={IC.fuel} label="Fuel type" value="Diesel" />
            <Row ic={IC.cal} label="Model year" value={top.year} />
            <Row ic={IC.palette} label="Colour" value={top.colour} />
            <Row ic={IC.sign} label="Total odometer" value={v.odometer} />
            <Row ic={IC.user} label="Operator" value={hasDriver(v) ? v.operator : '—'} />
            <Row ic={IC.idcard} label="Operator ID" value={opId(v)} />
            <Row ic={IC.phone} label="Contact No." value={contactOf(v)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 14, marginTop: 12 }}>
            <div>
              <span className="pp-chipg">First Start: {top.first || '—'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                <I d={IC.pin} size={13} />
                {top.first ? (v.location !== '—' ? v.location : 'Depot') : 'No trip yet today'}
              </div>
            </div>
            <span style={{ background: '#EEF0F2' }} />
            <div>
              <span className="pp-chipg">Last Stop: {top.lastStop || '—'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, color: '#0E7F5E' }}>
                <I d={IC.pin} size={13} />
                <span style={{ color: '#0B1B2B' }}>{top.lastStop ? v.location : '—'}</span>
              </div>
            </div>
          </div>
          <div className="dt-tiles">
            <div className="dt-t grey">
              <span className="ic">
                <I d={IC.gauge} />
              </span>
              <div>
                <small>Speed</small>
                <b>{spd} km/h</b>
                <em>Limit 100 km/h</em>
              </div>
            </div>
          </div>
        </div>
        <div className="pp-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="pp-ch">
            <span className="pp-ctile green">
              <I d={IC.pin} />
            </span>
            <div>
              <b>Live Location</b>
              <small>Updated {lastUpdateText(v)}</small>
            </div>
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#4E5A6B', fontSize: 13 }}>
              {c[0].toFixed(5)}, {c[1].toFixed(5)}
            </span>
          </div>
          <PopupMap
            center={c}
            zoom={17}
            style={{ flex: 1, minHeight: 300 }}
            onMap={(m) => m && pinMarker(c, v, true).addTo(m)}
          />
        </div>
        <div className="pp-card" style={{ overflow: 'auto' }}>
          <div className="pp-ch">
            <span className="pp-ctile red">
              <I d={IC.bell} />
            </span>
            <div>
              <b>Alerts</b>
              <small>Today</small>
            </div>
            {al.length > 0 && <span className="pp-badge">{al.length}</span>}
          </div>
          {al.length ? (
            al.map((a, i) => (
              <div key={i} className="pp-alert">
                <span className="pp-aic" style={{ background: a.ty.bg }}>
                  <I d={a.ty.ic} size={17} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b>{a.ty.n}</b>
                  <small>{a.ty.d}</small>
                </div>
                <em>
                  <I d={IC.clock} size={13} />
                  {clock12(a.t)}
                </em>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: '#6B7685', padding: '40px 10px' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#EAF7F1',
                  color: '#0E7F5E',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 8px',
                }}
              >
                <I d={IC.bell} size={20} />
              </div>
              No alerts today
            </div>
          )}
        </div>
      </div>
      <div className="dt-row2">
        {extras.device}
        {extras.sensors}
      </div>
      <div className="st-dash pp-dash">
        <div className="pp-dash-grid">
          {extras.act}
          {extras.alerts}
          {extras.odo}
          {extras.speed}
          <div className="pp-dash-wide">{extras.drivers}</div>
        </div>
      </div>
      <div className="dt-demo">Charts, device readings and sensors: demo data</div>
      {/* the prototype's (empty) chart tooltip box: it adds the same space at the end of the body */}
      <div className="dt-tip" role="tooltip" />
    </Frame>
  );
}
