// IT-0055. Vehicle Settings popup (prototype openSettings): Odometer / Hours tabs with value + Push,
// Watch Mode with its toggles, Eco Driving Configuration table + Push, and the I/O note. Pushes are
// demo: nothing is sent to a device.
import { useState } from 'react';
import { Frame, type PopupKind } from './Frame';
import { I, IC, useToast, type PV } from './kit';

const WATCH = ['Power Cut', 'Engine Turned On', 'SOS'];
const ECO = ['Harsh Acceleration', 'Harsh Braking', 'Harsh Cornering'];

export function SettingsPopup({ v, onNav, onClose }: { v: PV; onNav: (k: PopupKind, v: PV) => void; onClose: () => void }) {
  const toast = useToast();
  const odo = parseInt(String(v.odometer).replace(/\D/g, ''), 10) || 10;
  const [tab, setTab] = useState<'odo' | 'hrs'>('odo');
  const [val, setVal] = useState(String(odo));
  const [watch, setWatch] = useState(true);
  const [sw, setSw] = useState<Record<string, boolean>>({});
  const [eco, setEco] = useState(() => ECO.map(() => '0.0'));
  const bad = (x: string) => x === '' || +x < 0 || +x > 10;
  return (
    <Frame kind="settings" head={v} icon={<I d={IC.sliders} size={14} />} title="Vehicle Settings" onNav={onNav} onClose={onClose}>
      <div className="pp-sgrid">
        <div className="pp-card">
          <div className="pp-tabs2">
            {(
              [
                ['odo', IC.gauge, 'Odometer'],
                ['hrs', IC.clock, 'Hours'],
              ] as const
            ).map(([k, ic, l]) => (
              <button
                key={k}
                type="button"
                data-t={k}
                className={tab === k ? 'on' : ''}
                onClick={() => {
                  setTab(k);
                  setVal(k === 'odo' ? String(odo) : '0');
                }}
              >
                <I d={ic} size={14} />
                {l}
              </button>
            ))}
          </div>
          <span className="pp-lbl pp-vlab" style={{ fontWeight: 600, color: '#8A94A6' }}>
            {tab === 'odo' ? 'Value (km)' : 'Value (hours)'}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="pp-in pp-val" type="number" min="0" value={val} onChange={(e) => setVal(e.target.value)} style={{ flex: 1, height: 30 }} />
            <button
              type="button"
              className="pp-btn pri pp-push1"
              onClick={() => {
                if (val === '' || +val < 0) return toast('Enter a value of 0 or more');
                toast((tab === 'odo' ? 'Odometer ' + val + ' km' : 'Engine hours ' + val + ' h') + ' sent to the device');
              }}
            >
              Push
            </button>
          </div>
        </div>
        <div className="pp-card">
          <div className="pp-swrow" style={{ borderBottom: '1px solid #EEF0F2', paddingBottom: 6, marginBottom: 4 }}>
            <b style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
              <span style={{ color: '#0E7F5E' }}>
                <I d={IC.eye} />
              </span>
              Watch Mode
            </b>
            <button
              type="button"
              className={'pp-sw pp-watch' + (watch ? ' on' : '')}
              aria-label="Watch Mode"
              onClick={() => {
                setWatch(!watch);
                toast('Watch Mode' + (!watch ? ' on' : ' off'));
              }}
            />
          </div>
          <div className="pp-watchrows" style={{ opacity: watch ? 1 : 0.45 }}>
            {WATCH.map((n) => (
              <div key={n} className="pp-swrow">
                <span>{n}</span>
                <button
                  type="button"
                  className={'pp-sw' + (sw[n] ? ' on' : '')}
                  aria-label={n}
                  onClick={() => {
                    setSw({ ...sw, [n]: !sw[n] });
                    toast(n + (!sw[n] ? ' on' : ' off'));
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pp-card" style={{ marginTop: 6 }}>
        <div className="pp-ch">
          <span style={{ color: '#0E7F5E' }}>
            <I d={IC.sliders} />
          </span>
          <b style={{ fontSize: 13.5 }}>Eco Driving Configuration</b>
        </div>
        <table className="pp-eco" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ borderRadius: '8px 0 0 8px' }}>Event</th>
              <th style={{ borderRadius: '0 8px 8px 0', width: '58%' }}>Level (0–10)</th>
            </tr>
          </thead>
          <tbody>
            {ECO.map((n, i) => (
              <tr key={n}>
                <td style={{ fontWeight: 600 }}>{n}</td>
                <td>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={eco[i]}
                    className={bad(eco[i]!) ? 'bad' : undefined}
                    onChange={(e) => setEco(eco.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            type="button"
            className="pp-btn pri pp-push2"
            onClick={() => toast(eco.some(bad) ? 'Levels must be between 0 and 10' : 'Eco driving levels sent to the device')}
          >
            Push
          </button>
        </div>
      </div>
      <div style={{ color: '#6B7685', marginTop: 6, padding: '0 4px' }}>
        Digital and analog I/O and temperature sensors are set in the vehicle form: Manage → Vehicle → Tracking Options.
      </div>
    </Frame>
  );
}
