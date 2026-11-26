// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
  createElement,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../icon';
import { api, useCan, useGroups, useOperators, useTelemetry, useVehicles } from '../runtime';
import {
  VEHICLE_PROFILE,
  ago,
  alertType,
  categoryById,
  categoryOf,
  formatDateTime,
  vehicleImageOf,
} from './format';
import { Img, SEVERITIES, SEVERITY_TONE, normalSeverity } from './kit';
import { TrackingPage } from './tracking-page';
import { STATUS_FIELD } from './vehicle-filter';

export const reportsApi: any = {
  available: (e?: any) =>
    api('/api/v1/tracking/reports', {
      query: {
        assetType: e,
      },
    }),
  scope: (e?: any) =>
    api('/api/v1/tracking/reports/scope', {
      query: {
        assetType: e,
      },
    }),
  run: (e?: any, t?: any, n?: any) =>
    api(`/api/v1/tracking/reports/${e}/run`, {
      method: 'POST',
      body: t,
      signal: n,
    }),
};

export const NO_DATA = 'No data';

export const NOT_CONFIGURED = 'Not configured';

export const indicatorNA = (e?: any, t?: any, n?: any, r: any = NO_DATA) => ({
  key: e,
  label: t,
  icon: n,
  tone: 'gray',
  state: 'unavailable',
  value: r,
});

export const indicatorOn = (e?: any, t?: any, n?: any, r?: any, i?: any) => ({
  key: e,
  label: t,
  icon: n,
  tone: r,
  state: 'active',
  value: i,
});

export const indicatorOff = (e?: any, t?: any, n?: any, r?: any, i?: any) => ({
  key: e,
  label: t,
  icon: n,
  tone: r,
  state: 'inactive',
  value: i,
});

export const formatReading = (e?: any, t: any = 1) =>
  Number(e.toFixed(t)).toLocaleString('en-IN', {
    maximumFractionDigits: t,
  });

export function batteryTone(e?: any, t?: any) {
  if (e) {
    const n = e.trim().toLowerCase();
    return n === 'very high' || n === 'high' || n === 'full'
      ? 'green'
      : n === 'medium'
        ? 'orange'
        : n === 'low' || n === 'very low'
          ? 'red'
          : 'gray';
  }
  return t == null ? null : t >= 3700 ? 'green' : t >= 3400 ? 'orange' : 'red';
}

export const BATTERY_ICONS: any = {
  green: 'BatteryFull',
  orange: 'BatteryMedium',
  red: 'BatteryLow',
};

export function indicators(e?: any, t: any = null) {
  const n = (h?: any) => e.inputs.includes(h),
    r = e.engine ?? t,
    i =
      e.gps == null
        ? indicatorNA('gps', 'GPS', 'LocateFixed')
        : e.gps
          ? indicatorOn(
              'gps',
              'GPS',
              'LocateFixed',
              'green',
              `Available${e.satellites != null ? ` · ${e.satellites} satellites` : ''}`,
            )
          : indicatorOff('gps', 'GPS', 'LocateFixed', 'red', 'Not available'),
    s =
      e.gsm == null
        ? indicatorNA('gsm', 'GSM', 'RadioTower')
        : e.gsm >= 3
          ? indicatorOn('gsm', 'GSM', 'RadioTower', 'green', `Strong signal (${e.gsm}/5)`)
          : e.gsm >= 1
            ? indicatorOn('gsm', 'GSM', 'RadioTower', 'orange', `Weak signal (${e.gsm}/5)`)
            : indicatorOff('gsm', 'GSM', 'RadioTower', 'red', 'No signal (0/5)'),
    a = batteryTone(e.internalBattery, e.internalBatteryMv),
    l = [
      e.internalBattery,
      e.internalBatteryMv != null ? `${formatReading(e.internalBatteryMv / 1e3, 2)} V` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    c =
      a == null
        ? indicatorNA('internalBattery', 'Internal Battery', 'BatteryMedium')
        : (a === 'red' ? indicatorOff : indicatorOn)(
            'internalBattery',
            'Internal Battery',
            BATTERY_ICONS[a] ?? 'BatteryMedium',
            a,
            l,
          ),
    f =
      e.externalPower == null
        ? indicatorNA('externalBattery', 'External Battery', 'BatteryCharging')
        : e.externalPower
          ? indicatorOn(
              'externalBattery',
              'External Battery',
              'BatteryCharging',
              'green',
              `Connected${e.externalPowerV != null ? ` · ${formatReading(e.externalPowerV, 2)} V` : ''}`,
            )
          : indicatorOff(
              'externalBattery',
              'External Battery',
              'BatteryCharging',
              'red',
              'Disconnected',
            ),
    p = (h?: any, A?: any, v?: any, y?: any, g?: any, E?: any) =>
      n(h)
        ? y == null
          ? indicatorNA(A, v, g[0])
          : y
            ? indicatorOn(A, v, ...g)
            : indicatorOff(A, v, ...E)
        : indicatorNA(A, v, g[0], NOT_CONFIGURED);
  return [
    i,
    s,
    c,
    f,
    p('AC', 'ac', 'AC', e.ac, ['Snowflake', 'blue', 'On'], ['Snowflake', 'gray', 'Off']),
    p(
      'SEATBELT',
      'seatbelt',
      'Seatbelt',
      e.seatbelt,
      ['Armchair', 'green', 'Fastened'],
      ['Armchair', r ? 'red' : 'gray', 'Unfastened'],
    ),
    p(
      'FRONT_DOOR',
      'frontDoor',
      'Front Door',
      e.frontDoor,
      ['DoorOpen', 'orange', 'Open'],
      ['DoorClosed', 'gray', 'Closed'],
    ),
    p(
      'BACK_DOOR',
      'backDoor',
      'Back Door',
      e.backDoor,
      ['DoorOpen', 'orange', 'Open'],
      ['DoorClosed', 'gray', 'Closed'],
    ),
    r == null
      ? indicatorNA('engine', 'Engine', 'KeyRound')
      : r
        ? indicatorOn('engine', 'Engine', 'KeyRound', 'green', 'On')
        : indicatorOff('engine', 'Engine', 'KeyRound', 'red', 'Off'),
    alertIndicator(e),
  ];
}

export function alertIndicator(e?: any) {
  if (!e.alertCount)
    return indicatorOff('alerts', 'Alerts', 'Bell', 'gray', 'No open alerts in the last 24 hours');
  const t =
      SEVERITIES.find((r?: any) => e.alerts.some((i?: any) => normalSeverity(i.severity) === r)) ??
      'LOW',
    n = [...new Set<any>(e.alerts.map((r?: any) => alertType(r.type).label))]
      .slice(0, 3)
      .join(', ');
  return {
    ...indicatorOn(
      'alerts',
      'Alerts',
      'BellRing',
      SEVERITY_TONE[t],
      `${e.alertCount} open in the last 24 hours${n ? ` · ${n}` : ''}`,
    ),
    badge: e.alertCount,
  };
}

export const outOfRange = (e?: any) =>
  e.value != null && ((e.min != null && e.value < e.min) || (e.max != null && e.value > e.max));

export const rangeText = (e?: any) =>
  e.min != null && e.max != null
    ? `${formatReading(e.min)} – ${formatReading(e.max)} ${e.unit ?? ''}`.trimEnd()
    : null;

export const rangeSuffix = (e?: any) => (rangeText(e) ? ` · range ${rangeText(e)}` : '');

export const readingText = (e?: any, t?: any) =>
  e == null ? 'No reading yet' : `${formatReading(e)} ${t ?? ''}`.trimEnd();

export const rangePct = (e?: any, t?: any, n?: any) =>
  e == null || t == null || n == null || n <= t
    ? null
    : Math.min(1, Math.max(0, (e - t) / (n - t)));

export const sensorRange = (e?: any, t?: any) => ({
  name: e.name,
  kind: t,
  range: rangeText(e),
  pct: rangePct(e.value, e.min, e.max),
});

export function sensorChips(e?: any) {
  const t: any = [];
  for (const n of e.temperatures)
    t.push({
      key: `t${n.slot}`,
      icon: 'Thermometer',
      tone: n.value == null ? 'gray' : outOfRange(n) ? 'red' : 'teal',
      short: n.value == null ? '—' : `${formatReading(n.value)} °C`,
      tip: `${n.name} (Temperature): ${readingText(n.value, '°C')}${rangeSuffix(n)}`,
      ...sensorRange(n, 'Temperature'),
    });
  for (const n of e.bluetooth) {
    t.push({
      key: `bt${n.slot}`,
      icon: 'Bluetooth',
      tone: n.value == null ? 'gray' : outOfRange(n) ? 'red' : 'blue',
      short: n.value == null ? '—' : `${formatReading(n.value)} °C`,
      tip: `${n.name} (Bluetooth): ${readingText(n.value, '°C')}${rangeSuffix(n)}`,
      ...sensorRange(n, 'Bluetooth temp.'),
    });
    if (n.humidity != null) {
      t.push({
        key: `h${n.slot}`,
        icon: 'Droplets',
        tone: 'teal',
        short: `${formatReading(n.humidity, 0)} %`,
        tip: `${n.name} (Humidity): ${formatReading(n.humidity, 0)} %`,
        name: n.name,
        kind: 'Humidity',
        range: '0 – 100 %',
        pct: rangePct(n.humidity, 0, 100),
      });
    }
  }
  for (const n of e.loads)
    t.push({
      key: `l${n.slot}`,
      icon: 'Weight',
      tone: n.value == null ? 'gray' : outOfRange(n) ? 'orange' : 'purple',
      short: n.value == null ? '—' : readingText(n.value, n.unit),
      tip: `Load sensor (${n.name}): ${readingText(n.value, n.unit)}${rangeSuffix(n)}`,
      ...sensorRange(n, 'Load sensor'),
    });
  if (e.loadWeightKg != null) {
    t.push({
      key: 'lw',
      icon: 'Weight',
      tone: 'purple',
      short: `${formatReading(e.loadWeightKg, 0)} kg`,
      tip: `Load weight: ${formatReading(e.loadWeightKg, 0)} kg`,
      name: 'Load weight',
      kind: 'Load',
      range: null,
      pct: null,
    });
  }
  return t;
}

export const INDICATOR_GROUPS: any = [
  {
    title: 'Connectivity',
    icon: 'RadioTower',
    keys: ['gps', 'gsm'],
  },
  {
    title: 'Power',
    icon: 'BatteryCharging',
    keys: ['internalBattery', 'externalBattery'],
  },
  {
    title: 'Inputs',
    icon: 'KeyRound',
    keys: ['engine', 'ac', 'seatbelt', 'frontDoor', 'backDoor'],
  },
];

export function pickIndicators(e?: any, t?: any, n?: any) {
  return indicators(e, t)
    .filter((r?: any) => n.includes(r.key))
    .map((r?: any) => {
      const i = r.state === 'inactive' && r.tone === 'red',
        s = r.state === 'unavailable' ? 'gray' : r.state === 'active' || i ? r.tone : undefined;
      return {
        indicator: r,
        tone: s,
        warn: i,
      };
    });
}

export function doorFields(e?: any, t: any = null) {
  return e
    ? pickIndicators(e, t, ['frontDoor', 'backDoor']).map(({ indicator, tone, warn }: any) => ({
        label: indicator.label,
        icon: indicator.icon,
        value: indicator.value,
        ...(tone
          ? {
              tone,
            }
          : {}),
        ...(warn
          ? {
              warn,
            }
          : {}),
      }))
    : [];
}

export const MINI_VALUES: any = {
  On: 'On',
  Off: 'Off',
  Fastened: 'Fastened',
  Unfastened: 'Unfastened',
};

export function miniChips(e?: any, t: any = null) {
  return e
    ? pickIndicators(e, t, ['ac', 'seatbelt']).flatMap(({ indicator, tone }: any) => {
        if (indicator.value === 'Not configured') return [];
        const i = indicator.key === 'ac' ? 'AC' : 'Belt',
          s = MINI_VALUES[indicator.value] ?? '—';
        return [
          {
            key: indicator.key,
            icon: indicator.icon,
            text: `${i} ${s}`,
            tone: tone ?? 'gray',
            title: `${indicator.label}: ${indicator.value}`,
          },
        ];
      })
    : [];
}

export const SENSOR_FILTERS: any = [
  {
    id: 'ac',
    label: 'AC',
    icon: 'Snowflake',
    options: ['On', 'Off'],
  },
  {
    id: 'seatbelt',
    label: 'Seat Belt',
    icon: 'Armchair',
    options: ['Fastened', 'Unfastened'],
  },
  {
    id: 'door',
    label: 'Door',
    icon: 'DoorOpen',
    options: ['Open', 'Closed'],
  },
];

export function sensorAttrs(e?: any) {
  const t = (r?: any, i?: any, s?: any, a?: any) =>
      e != null && e.inputs.includes(r) && i != null ? (i ? s : a) : '',
    n = [
      t('FRONT_DOOR', e?.frontDoor, 'Open', 'Closed'),
      t('BACK_DOOR', e?.backDoor, 'Open', 'Closed'),
    ].filter(Boolean);
  return {
    ac: t('AC', e?.ac, 'On', 'Off'),
    seatbelt: t('SEATBELT', e?.seatbelt, 'Fastened', 'Unfastened'),
    door: n.includes('Open') ? 'Open' : n.length ? 'Closed' : '',
  };
}

export const hasSensors = (e?: any) =>
  e.temperatures.length > 0 ||
  e.bluetooth.length > 0 ||
  e.loads.length > 0 ||
  e.loadWeightKg != null;

export function doorState(e?: any, t?: any, n?: any) {
  if (!e || !e.inputs.includes(t)) return 'notconfigured';
  const r = typeof n == 'string' ? n.trim().toLowerCase() : n;
  return r === true || r === 1 || r === '1' || r === 'true' || r === 'open'
    ? 'open'
    : r === false || r === 0 || r === '0' || r === 'false' || r === 'closed'
      ? 'closed'
      : 'notconfigured';
}

export function odometerOf(e?: any, t?: any) {
  return e?.odometerKm != null ? e.odometerKm : t != null && t > 0 ? t : null;
}

export const VEHICLE_STATUS_LABELS: any = {
  OPERATIONAL: 'Operational',
  MAINTENANCE: 'Maintenance',
  BREAKDOWN: 'Breakdown',
  STANDBY: 'Standby',
  RETIRED: 'Retired',
};

export const vehicleStatusLabel = (e?: any) => (e ? (VEHICLE_STATUS_LABELS[e] ?? e) : null);

export const vehicleStatusTone = (e?: any) =>
  e === 'OPERATIONAL' ? 'green' : e === 'BREAKDOWN' ? 'red' : e ? 'orange' : 'gray';

export const Indicators = memo(function ({ t, ignition }: any) {
  const [r, i] = useState<any>(null),
    s = useCallback((A?: any) => i(A?.closest('.td-gv-card') ?? null), []),
    [a, l] = useState<any>(false),
    c = useRef<any>(null),
    f = useRef<any>(null);
  useEffect(() => {
    if (!r) return;
    r.classList.add('vt-card');
    const A = (v?: any) => {
      if (v.target === r && v.propertyName === 'transform' && r.classList.contains('is-flipped')) {
        r.classList.add('is-settled');
      }
    };
    r.addEventListener('transitionend', A);
    return () => {
      r.removeEventListener('transitionend', A);
      r.classList.remove('vt-card', 'is-flipped', 'is-settled');
    };
  }, [r]);
  const p = useRef<any>(true);
  useEffect(() => {
    var A: any;
    if (r) {
      if (a) {
        {
          r.classList.add('is-flipped');
          if (
            getComputedStyle(r)
              .transitionDuration.split(',')
              .every((v?: any) => parseFloat(v) === 0)
          ) {
            r.classList.add('is-settled');
          }
        }
      } else {
        {
          if (r.classList.contains('is-settled')) {
            {
              r.style.transition = 'none';
              r.classList.remove('is-settled');
              r.offsetWidth;
              r.style.transition = '';
            }
          }
          r.classList.remove('is-flipped');
        }
      }
      for (const v of Array.from(r.children) as any[])
        v.toggleAttribute('inert', v.classList.contains('vt-back') ? !a : a);
      if (p.current) {
        p.current = false;
        return;
      }
      if (!((A = (a ? f : c).current) == null)) {
        A.focus({
          preventScroll: true,
        });
      }
    }
  }, [r, a]);
  const h = useCallback(() => l(false), []);
  return (
    <span ref={s} className="vt-strip" role="list" aria-label="Vehicle status">
      {indicators(t, ignition)
        .filter((A?: any) => !r || A.key !== 'alerts')
        .map((A?: any) => {
          const v = `${A.label}: ${A.value}`;
          return (
            <span
              key={A.key}
              role="listitem"
              tabIndex={0}
              aria-label={v}
              data-tip={v}
              className={`vt-ind tone-${A.tone} is-${A.state}`}
            >
              <Icon name={A.icon} size={15} />
              {A.badge ? <b className="vt-ind__badge">{A.badge > 9 ? '9+' : A.badge}</b> : null}
            </span>
          );
        })}
      {r && (
        <span role="listitem" className="vt-strip__flip">
          <button
            ref={c}
            type="button"
            className="vt-ind vt-flip tone-brand"
            aria-pressed={a}
            aria-label="More details: sensors and device"
            data-tip="Flip card: sensors & device"
            onClick={() => l(true)}
          >
            <Icon name="FlipHorizontal2" size={15} />
          </button>
        </span>
      )}
      {r &&
        createPortal(<IndicatorDetails t={t} ignition={ignition} closeRef={f} onClose={h} />, r)}
    </span>
  );
});

export function BackTitle({ icon, title, end }: any) {
  return (
    <h4 className="vt-back__title">
      <Icon name={icon} size={12} />
      {title}
      {end && <span>{end}</span>}
    </h4>
  );
}

export function IndicatorDetails({ t: e, ignition, closeRef, onClose }: any) {
  const i = sensorChips(e),
    s = new Map<any, any>(indicators(e, ignition).map((a?: any) => [a.key, a]));
  return (
    <section
      className="vt-back"
      aria-label="Sensors and device details"
      onKeyDown={(a?: any) => a.key === 'Escape' && onClose()}
    >
      <header className="vt-back__head">
        <span className="vt-back__badge">
          <Icon name="Activity" size={14} />
        </span>
        <span className="vt-back__heading">
          <strong>Sensors & Device</strong>
          <small>{e.ts ? `Last report ${ago(e.ts)}` : 'No report yet'}</small>
        </span>
        <button
          ref={closeRef}
          type="button"
          className="vt-back__close"
          aria-label="Back to the card"
          onClick={onClose}
        >
          <Icon name="X" size={15} />
        </button>
      </header>
      <div className="vt-back__body">
        <section>
          <BackTitle
            icon="Thermometer"
            title="Sensors"
            end={i.length ? String(i.length) : undefined}
          />
          {i.length ? (
            <ul className="vt-sensors">
              {i.map((a?: any) => (
                <li key={a.key} className={`vt-sensor tone-${a.tone}`} title={a.tip}>
                  <span className="vt-sensor__icon">
                    <Icon name={a.icon} size={14} />
                  </span>
                  <span className="vt-sensor__text">
                    <small>{a.kind}</small>
                    <b>{a.short}</b>
                    <em>{a.name}</em>
                  </span>
                  {a.pct != null && (
                    <span className="vt-sensor__gauge" aria-hidden="true">
                      <i
                        style={
                          {
                            width: `${Math.max(6, a.pct * 100)}%`,
                          } as any
                        }
                      />
                    </span>
                  )}
                  {a.range && <span className="vt-sensor__range">{a.range}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="vt-back__empty">
              <Icon name="Thermometer" size={14} />
              No sensors configured for this vehicle
            </p>
          )}
        </section>
        {INDICATOR_GROUPS.map((a?: any) => (
          <section key={a.title}>
            <BackTitle icon={a.icon} title={a.title} />
            <ul className="vt-tiles">
              {a.keys
                .flatMap((l?: any) => s.get(l) ?? [])
                .map((l?: any) => {
                  const [c, ...f] = l.value.split(' · ');
                  return (
                    <li key={l.key} className={`vt-tile tone-${l.tone} is-${l.state}`}>
                      <span className="vt-tile__icon">
                        <Icon name={l.icon} size={14} />
                      </span>
                      <span className="vt-tile__text">
                        <small>{l.label}</small>
                        <b>{c}</b>
                        {f.length > 0 && <em>{f.join(' · ')}</em>}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}

export const SensorChips = memo(function ({ t }: any) {
  return (
    <span className="vt-chips" role="list" aria-label="Sensors">
      {sensorChips(t).map((n?: any) => (
        <span
          key={n.key}
          role="listitem"
          tabIndex={0}
          aria-label={n.tip}
          data-tip={n.tip}
          className={`vt-chip tone-${n.tone}`}
        >
          <Icon name={n.icon} size={13} />
          {n.short}
        </span>
      ))}
    </span>
  );
});

export function telemetryCells(e?: any, t?: any) {
  return e
    ? {
        indicators: {
          v: <Indicators t={e} ignition={t} />,
        },
        sensors: hasSensors(e)
          ? {
              v: <SensorChips t={e} />,
            }
          : null,
      }
    : {
        indicators: null,
        sensors: null,
      };
}

export function MiniChips({ t: e, ignition }: any) {
  return miniChips(e, ignition).map((n?: any) => (
    <span key={n.key} className={`vt-mini tone-${n.tone}`} title={n.title}>
      <Icon name={n.icon} size={11} />
      {n.text}
    </span>
  ));
}

export const formatKm = (e?: any) =>
  e == null ? '—' : `${Math.round(e).toLocaleString('en-IN')} km`;

export const operatorFields = (e?: any) => [
  {
    label: 'Operator',
    icon: 'UserRound',
    value: e?.name || 'Not Assigned',
  },
  {
    label: 'Operator ID',
    icon: 'IdCard',
    value: e?.tagId || '—',
  },
];

export const NONE_ASSIGNED: any = {
  manager: 'None assigned yet',
  supervisor: 'None assigned yet',
  operator: 'None assigned yet',
};

export const MOTION_STATES: any = {
  moving: ['RUNNING', 'MOVING'],
  overspeed: ['RUNNING', 'MOVING', 'OVERSPEED'],
  idle: ['IDLE'],
  stopped: ['STOP', 'STOPPED'],
  towed: ['TOWED'],
};

export const motionMatches = (e?: any, t?: any) => {
  var n: any;
  return !!(t && (n = MOTION_STATES[e]) != null && n.includes(t.toUpperCase()));
};

export function useVehicleKind({ telemetry = false }: any = {}) {
  const t = useCan('vehicle:vehicle:view'),
    n = useCan('tracking:live:view') && telemetry && t,
    r = useVehicles(t, {
      telemetry: n,
    }),
    i = useTelemetry(r.data, n, r.refetch),
    { byId: s } = r,
    a = i.byId,
    l = useRef<any>(a);
  l.current = a;
  const c = useOperators(t),
    f = useRef<any>(c.byId);
  f.current = c.byId;
  const p = useCallback(
      (O?: any) => {
        const C = s.get(O)?.details?.operatorId;
        return typeof C == 'string' && C ? f.current.get(C) : undefined;
      },
      [s],
    ),
    { data: h, isPending: A, isError: v, error: y, refetch: g } = r,
    E = useMemo<any>(
      () =>
        t
          ? {
              data: h?.map((O?: any) => ({
                id: O.id,
                assetType: 'VEHICLE',
                name: O.name,
                groupId: O.groupId,
                deviceId: O.deviceId,
              })),
              isPending: A,
              isError: v,
              error: y,
              refetch: g,
            }
          : undefined,
      [t, h, A, v, y, g],
    ),
    b = useGroups(useCan('admin:group:view')),
    w = useMemo<any>(() => {
      const O = new Map<any, any>((b.data ?? []).map(($?: any) => [$.id, $.name])),
        C = h ?? [],
        k = ($?: any, Z?: any) => {
          const Q = $?.details?.[Z];
          return typeof Q == 'string' ? Q.trim() : '';
        },
        z = ($?: any) => {
          return c.byId.get(k($, 'operatorId'))?.name?.trim() ?? '';
        },
        B = ($?: any) =>
          [...new Set<any>(C.map($).filter(Boolean))].sort((Z?: any, Q?: any) =>
            Z.localeCompare(Q, undefined, {
              numeric: true,
            }),
          ),
        J = [...new Set<any>(C.map(($?: any) => categoryOf($).label))].sort(),
        G = ($?: any, Z?: any, Q?: any, P?: any, H?: any, Y?: any) => ({
          id: $,
          label: Z,
          icon: Q,
          options: P,
          placeholder: P.length ? H : Y,
        });
      return {
        title: 'Vehicle Filters',
        fields: [
          G(
            'manager',
            'Fleet Manager',
            'Network',
            B(($?: any) => k($, 'fleetManager')),
            'Select Fleet Manager',
            NONE_ASSIGNED.manager,
          ),
          G(
            'supervisor',
            'Supervisor',
            'Users',
            B(($?: any) => k($, 'supervisor')),
            'Select Supervisor',
            NONE_ASSIGNED.supervisor,
          ),
          G(
            'operator',
            'Vehicle Operator',
            'UserRound',
            B(z),
            'Select vehicle Operator',
            NONE_ASSIGNED.operator,
          ),
          {
            id: 'type',
            label: 'Vehicle Type',
            icon: 'Box',
            options: J,
          },
          ...(n ? SENSOR_FILTERS : []),
        ],
        attrs: ($?: any) => {
          const Z = s.get($);
          return {
            manager: k(Z, 'fleetManager'),
            supervisor: k(Z, 'supervisor'),
            operator: z(Z),
            type: Z ? categoryOf(Z).label : '',
            ...(n ? sensorAttrs(l.current.get($)) : {}),
          };
        },
        group: ($?: any) => {
          if (!O.size) return;
          const Z = s.get($)?.groupId;
          return (Z && O.get(Z)) || 'Ungrouped';
        },
        sections: [
          {
            title: 'People',
            fields: ['manager', 'supervisor', 'operator'],
          },
          {
            title: 'Vehicle',
            fields: ['type', STATUS_FIELD],
          },
          {
            title: 'Sensors',
            fields: ['ac', 'ignition', 'seatbelt', 'door'],
            toggles: true,
          },
        ],
      };
    }, [h, s, b.data, n, c.byId]),
    x = useCallback((O?: any) => {
      return l.current.get(O)?.lastSeen ?? null;
    }, []),
    S = useMemo<any>(
      () => ({
        lastSeen: x,
        assetType: 'VEHICLE',
        noun: {
          one: 'Vehicle',
          many: 'Vehicles',
        },
        profile: {
          ...VEHICLE_PROFILE,
          limitOf: (O?: any) => {
            return s.get(O)?.speedLimitKmh;
          },
        },
        codeLabel: 'Vehicle No',
        code: (O?: any) => {
          return s.get(O.id)?.plateNo ?? undefined;
        },
        image: (O?: any) => vehicleImageOf(s.get(O.id) ?? O),
        details: (O?: any) => {
          return [
            ...operatorFields(p(O.id)),
            {
              label: 'Odometer',
              icon: 'Milestone',
              value: formatKm(odometerOf(l.current.get(O.id), s.get(O.id)?.odometerKm)),
            },
            {
              label: 'Fuel',
              icon: 'Fuel',
              value: '—',
            },
            ...doorFields(l.current.get(O.id), O.position?.ignition ?? null),
          ];
        },
        listExtra: (O?: any) => {
          return createElement(MiniChips, {
            t: l.current.get(O.id),
            ignition: O.position?.ignition ?? null,
          });
        },
        info: (O?: any, C?: any) => {
          const k = O && s.get(O.id);
          return [
            {
              label: 'Plate Number',
              value: C,
              strong: true,
            },
            {
              label: 'Vehicle Model',
              value: [k?.make, k?.model].filter(Boolean).join(' ') || null,
            },
            {
              label: 'Vehicle Type',
              value: null,
            },
            {
              label: 'Total Odometer',
              value: null,
            },
          ];
        },
        operator: true,
        hiddenDetails: ['heading', 'running', 'idle'],
        alertSolution: 'VEHICLE',
        typeOf: (O?: any) => {
          return categoryById(s.get(O)?.category)?.label;
        },
        driverOf: (O?: any) => {
          const C = p(O);
          return {
            name: C?.name || undefined,
            id: C?.tagId || undefined,
            phone: C?.contactNo || undefined,
          };
        },
        operatorLog: async (O?: any, C?: any, k?: any) =>
          (
            await reportsApi.run('VEHICLE_OPERATOR', {
              assetType: 'VEHICLE',
              assetIds: [O],
              from: C.toISOString(),
              to: k.toISOString(),
            })
          ).rows.flatMap((B?: any) => {
            var J: any;
            return (J = B.operator) != null && J.trim()
              ? [
                  {
                    operator: B.operator.trim(),
                    from: Date.parse(B.signIn),
                    to: B.signOut ? Date.parse(B.signOut) : null,
                  },
                ]
              : [];
          }),
        assets: E,
        filters: w,
        marker: (O?: any) => {
          const C = s.get(O);
          return {
            plate: C?.plateNo ?? C?.name ?? '',
            img: categoryById(C?.category)?.image,
          };
        },
        vehicleInfo: (O?: any) => {
          const C = s.get(O),
            k = l.current.get(O),
            z = C?.details?.operatorId,
            B = typeof z == 'string' && z ? f.current.get(z) : undefined;
          return {
            model: [C?.make, C?.model].filter(Boolean).join(' ') || undefined,
            operator: B?.name ?? (typeof z == 'string' && z ? '—' : 'Not Assigned'),
            operatorId: B?.tagId || undefined,
            odometerKm: odometerOf(k, C?.odometerKm) ?? undefined,
            gpsSatellites: k?.gps === false ? 0 : (k?.satellites ?? undefined),
            batteryLevel: k?.internalBattery ?? undefined,
            vehicleBatteryV: k?.externalPowerV ?? undefined,
            externalPower: k?.externalPower ?? undefined,
            ac: k != null && k.inputs.includes('AC') ? (k.ac ?? undefined) : undefined,
            frontDoor: doorState(k, 'FRONT_DOOR', k?.frontDoor),
            backDoor: doorState(k, 'BACK_DOOR', k?.backDoor),
          };
        },
      }),
      [s, E, w, x, p],
    ),
    W = useCallback(
      (O?: any, C?: any) => {
        const k = s.get(O.id),
          z = a.get(O.id),
          B = odometerOf(z, k?.odometerKm),
          J = vehicleStatusLabel(z?.vehicleStatus);
        return {
          ...C,
          ...telemetryCells(z, O.position?.ignition ?? null),
          type: [k?.make, k?.model].filter(Boolean).join(' '),
          driver:
            c.byId
              .get(typeof k?.details?.operatorId == 'string' ? k.details.operatorId : '')
              ?.name?.trim() || 'Not Assigned',
          odometer: formatKm(B),
          odoKm: B ?? -1,
          updated: O.position ? formatDateTime(Date.parse(O.position.ts)) : C.updated,
          since:
            z != null && z.stateSince && motionMatches(O.status.id, z.motionState)
              ? z.stateSince
              : '',
          device: k?.deviceId ?? '',
          vehicleStatus: J
            ? {
                v: J,
                tone: vehicleStatusTone(z?.vehicleStatus),
              }
            : '—',
        };
      },
      [s, a, c.byId],
    );
  return {
    kind: S,
    vehicles: r,
    telemetry: i,
    gridRow: W,
  };
}

export const vehicleMedia = (e?: any) => (t?: any, n?: any, r?: any) => {
  const i = categoryById(e.byId.get(t)?.category),
    s = Math.round(r * 0.8);
  return i ? (
    <Img
      src={i.image}
      alt={i.label}
      width={s * 1.4}
      height={s}
      className="vh-tracking__img"
      fallback={n}
    />
  ) : (
    n
  );
};

// IT-0053: `gridExtras` (Grid View records) turns on the header controls and the added filter options.
export function VehicleTracking({ gridExtras }: any = {}) {
  const { kind: e, vehicles: t } = useVehicleKind({
    telemetry: true,
  });
  return (
    <div className="vh-tracking">
      <TrackingPage
        kind={e}
        renderMedia={vehicleMedia(t)}
        mapHeader={true}
        centralFilter={true}
        headerControls={!!gridExtras}
        gridExtras={gridExtras}
      />
    </div>
  );
}
