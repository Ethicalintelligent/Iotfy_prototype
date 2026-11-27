// IT-0055. Vehicle Immobilizer popup (prototype openImmob): red vehicle section (picture, name,
// model, type, rows), control card (state, Off / On toggle with confirmation), Location map,
// Important warning, Command history. Commands are demo: nothing is sent to a device.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Frame, type PopupKind } from './Frame';
import {
  I,
  IC,
  Pic,
  PopupMap,
  Row,
  SectionHead,
  addDays,
  contactOf,
  fmtDay,
  hasDriver,
  home,
  lastUpdateText,
  modelOf,
  opId,
  pinMarker,
  rng,
  typeOf,
  useToast,
  type PV,
} from './kit';

type Cmd = { s: 'on' | 'off'; t: Date; st: 'Sent' | 'Confirmed'; by: string };

export function ImmobPopup({ v, onNav, onClose }: { v: PV; onNav: (k: PopupKind, v: PV) => void; onClose: () => void }) {
  const toast = useToast();
  const c = home(v);
  const [state, setState] = useState<null | 'on' | 'off'>(null);
  const [hist, setHist] = useState<Cmd[]>([]);
  const [ask, setAsk] = useState<null | 'on' | 'off'>(null);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const past = useMemo(() => {
    const r = rng(v.plate + 'i');
    const list: Cmd[] = [
      { s: 'off', t: addDays(new Date(), -12), st: 'Confirmed', by: 'Company A admin' },
      { s: 'on', t: addDays(new Date(), -12.02), st: 'Confirmed', by: 'Company A admin' },
    ];
    return v.immob && r() > 0.3 ? list : [];
  }, [v]);
  const on = state === 'on';
  const title = state === null ? 'Not set from the platform' : on ? 'Engine disabled' : 'Engine enabled';
  const text =
    state === null
      ? 'No immobilizer command has been confirmed for this device yet.'
      : on
        ? 'The device confirmed the immobilizer is on. The engine cannot start.'
        : 'The device confirmed the immobilizer is off. The engine can start.';
  const tap = (s: 'on' | 'off') => {
    if ((s === 'on') === on && state !== null) return;
    if (s === 'off' && state === null) return;
    setAsk(s);
  };
  const send = (s: 'on' | 'off') => {
    setAsk(null);
    const item: Cmd = { s, t: new Date(), st: 'Sent', by: 'You' };
    setHist((h) => [item, ...h]);
    toast('Command sent to the device');
    window.setTimeout(() => {
      if (!live.current) return;
      setHist((h) => h.map((x) => (x === item ? { ...x, st: 'Confirmed' } : x)));
      setState(s);
    }, 1800);
  };
  // Esc closes the confirmation first
  useEffect(() => {
    if (!ask) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setAsk(null);
      }
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [ask]);
  const list = [...hist, ...past];
  return (
    <Frame
      kind="immob"
      head={v}
      icon={<I d={IC.lock} size={14} />}
      title="Vehicle Immobilizer"
      extra={
        <span className="pp-gchip pp-istate" style={{ background: state === null ? '#8A94A6' : on ? '#E0161B' : '#009863' }}>
          <i />
          {state === null ? 'Not set from the platform' : on ? 'Immobilized' : 'Engine enabled'}
        </span>
      }
      onNav={onNav}
      onClose={onClose}
    >
      <div className="pp-im3">
        <div className="pp-vgreen pp-vred">
          <div className="pp-vid">
            {v.img ? (
              <Pic src={v.img} />
            ) : (
              <span className="pp-ctile red">
                <I d={IC.truck} />
              </span>
            )}
            <div>
              <b>{v.name}</b>
              <span>{modelOf(v)}</span>
              <small>{typeOf(v.name)}</small>
            </div>
          </div>
          <div className="pp-rows">
            <Row ic={IC.hash} label="Vehicle number" value={v.plate} />
            <Row ic={IC.user} label="Operator" value={hasDriver(v) ? v.operator : '—'} />
            <Row ic={IC.idcard} label="Operator ID" value={opId(v)} />
            <Row ic={IC.phone} label="Contact No." value={contactOf(v)} />
            <Row ic={IC.pin} label="Last location" value={v.location !== '—' ? v.location : c[0].toFixed(5) + ', ' + c[1].toFixed(5)} />
            <Row ic={IC.crosshair} label="Coordinates" value={c[0].toFixed(5) + ', ' + c[1].toFixed(5)} />
            <Row ic={IC.clock} label="Last update" value={lastUpdateText(v)} />
          </div>
        </div>
        <div className="pp-card pp-ictl" style={{ textAlign: 'center' }}>
          <div className="pp-shield">
            <div style={{ background: state === null ? '#6B7685' : on ? '#E0161B' : '#009863' }}>
              <I d={state === null ? IC.shieldq : on ? IC.lock : IC.shieldok} size={34} />
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <div style={{ color: '#4E5A6B', fontSize: 13, fontWeight: 500, margin: '6px 16px 0', lineHeight: 1.45 }}>{text}</div>
          <div className="pp-tog">
            <button type="button" data-s="off" className={on ? '' : 'on'} onClick={() => tap('off')}>
              <I d={IC.unlock} size={15} />
              Off
            </button>
            <button type="button" data-s="on" className={on ? 'on red' : ''} onClick={() => tap('on')}>
              <I d={IC.lock} size={15} />
              On
            </button>
          </div>
          <div style={{ color: '#4E5A6B', fontSize: 13 }}>{on ? 'Turn off to enable the engine again.' : 'Turn on to disable the engine.'}</div>
        </div>
        <div className="pp-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionHead icon={<I d={IC.pin} />} tone="green" title="Location" sub={'Updated ' + lastUpdateText(v)} />
          <PopupMap center={c} zoom={17} style={{ flex: 1, minHeight: 230 }} onMap={(m) => m && pinMarker(c, v, true).addTo(m)} />
        </div>
      </div>
      <div className="pp-imp">
        <I d={IC.warn} size={30} />
        <div>
          <b>Important</b>
          <span>Make sure the vehicle is in a safe location before immobilizing it, to avoid any risk or hazard.</span>
        </div>
      </div>
      <div className="pp-card" style={{ marginTop: 6 }}>
        <SectionHead icon={<I d={IC.history} />} tone="blue" title="Command history" sub="Immobilizer commands of this device, newest first" />
        <div className="pp-hist">
          {list.length ? (
            <table className="pp-tbl">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Sent</th>
                  <th>Sent by</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((x, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: x.s === 'on' ? '#E0161B' : '#0E7F5E' }}>
                        <I d={x.s === 'on' ? IC.lock : IC.unlock} size={14} />
                        Immobilizer {x.s === 'on' ? 'on' : 'off'}
                      </span>
                    </td>
                    <td>
                      {fmtDay(x.t)}, {x.t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>{x.by}</td>
                    <td>
                      <span className="pp-lchip" style={{ height: 22, fontSize: 12 }}>
                        <i style={{ background: x.st === 'Confirmed' ? '#009863' : '#F5A70A' }} />
                        {x.st}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', color: '#6B7685', padding: 22 }}>No immobilizer commands for this device yet.</div>
          )}
        </div>
      </div>
      {ask &&
        createPortal(
          <div className="pp-confirm">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={'pp-tile' + (ask === 'on' ? ' red' : '')} style={{ width: 36, height: 36 }}>
                  <I d={ask === 'on' ? IC.lock : IC.unlock} size={18} />
                </span>
                <b style={{ fontSize: 15 }}>{ask === 'on' ? 'Turn on the immobilizer?' : 'Turn off the immobilizer?'}</b>
              </div>
              <p style={{ color: '#4E5A6B', lineHeight: 1.5, margin: '12px 0 16px' }}>
                The engine of{' '}
                <b>
                  {v.name} ({v.plate})
                </b>{' '}
                {ask === 'on'
                  ? 'will be disabled through its tracking device. Make sure the vehicle is in a safe location.'
                  : 'will be enabled again.'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="pp-btn out" style={{ height: 32 }} onClick={() => setAsk(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={'pp-btn' + (ask === 'on' ? '' : ' pri')}
                  style={{ height: 32, ...(ask === 'on' ? { background: '#E0161B', color: '#fff' } : {}) }}
                  onClick={() => send(ask)}
                >
                  {ask === 'on' ? 'Turn on' : 'Turn off'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </Frame>
  );
}
