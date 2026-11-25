// Right column of the Alerts page: Vehicle Info + Operator Info card, and the selected alert with
// its map. Same markup as the original.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { Icon } from '../smart-track/kit';
import {
  alertStyle,
  severityOf,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  type AlertStyle,
  type Status,
} from './demo';
import { LayersButton, useLeaflet } from './map';
import { formatStamp } from './time';
import operatorIcon from './operator-icon.png';

export interface AlertRow {
  id: string;
  at: string;
  type: string;
  label: string;
  description: string;
  plateNo: string;
  assetId: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  severity: string | null;
}

export interface VehicleRow {
  id: string;
  plate: string;
  model: string | null;
  type: string | null;
  odometer: string | null;
  image?: string;
  status: Status;
  operator: { name: string; tagId: string | null; contact: string | null } | null;
}

export const alertKey = (a: AlertRow | null) => (a ? `${a.id}@${a.at}` : null);
export const coords = (a: { lat: number | null; lng: number | null }) =>
  a.lat != null && a.lng != null ? `${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}` : null;

export function SeverityPill({ value }: { value: string | null }) {
  const s = severityOf(value);
  return s ? <span className={`td-pill tone-${SEVERITY_TONE[s]}`}>{SEVERITY_LABEL[s]}</span> : null;
}

function Field({
  label,
  strong,
  children,
}: {
  label: string;
  strong?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <dt>{label}:</dt>
      <dd className={strong ? 'is-strong' : ''}>{children ?? '—'}</dd>
    </div>
  );
}

/** The vehicle picture, or the truck outline when there is none or it fails to load. */
function VehiclePicture({ src }: { src?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src)
    return (
      <span className="td-vthumb" style={{ width: 58 * 1.4, height: 58 }}>
        <Icon name="Truck" size={58 * 0.62} strokeWidth={1.6} />
      </span>
    );
  return (
    <img
      className="td-img td-entity-media"
      src={src}
      alt=""
      width={101}
      height={72}
      decoding="async"
      onError={() => setFailed(src)}
    />
  );
}

export function VehicleInfo({ alert, vehicle }: { alert: AlertRow; vehicle?: VehicleRow }) {
  return (
    <section className="td-card td-avd">
      <div className="td-avd__sec">
        <header className="td-avd__head">
          <span className="td-badge td-badge--sm tone-brand">
            <Icon name="Truck" size={13} />
          </span>
          <h2>Vehicle Info</h2>
          {vehicle && (
            <span className="td-avd__now" title="Current status (not recorded at alert time)">
              <span className={`td-pill tone-${vehicle.status.tone} td-pill--solid`}>
                <i className="td-dot" />
                {vehicle.status.label}
              </span>
            </span>
          )}
        </header>
        <div className="td-avd__vehicle">
          <span className="td-avd__media">{vehicle && <VehiclePicture src={vehicle.image} />}</span>
          <dl className="td-avd__fields">
            <Field label="Plate Number" strong>
              {alert.plateNo}
            </Field>
            <Field label="Vehicle Model">{vehicle?.model}</Field>
            <Field label="Vehicle Type">{vehicle?.type}</Field>
            <Field label="Total Odometer">{vehicle?.odometer}</Field>
          </dl>
          <dl
            className={`td-avd__speed tone-${vehicle?.status.tone || 'gray'}`}
            title={`At alert time · ${formatStamp(alert.at)}`}
          >
            <div>
              <dt>Speed</dt>
              <dd>{alert.speed != null ? `${Math.round(alert.speed)} km/h` : '—'}</dd>
            </div>
            <div>
              <dt>Today's Distance</dt>
              <dd>—</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="td-avd__sec">
        <header className="td-avd__head">
          <span className="td-badge td-badge--sm tone-brand">
            <span
              className="td-mask-icon"
              aria-hidden="true"
              style={{ ['--mask' as string]: `url(${operatorIcon})` }}
            />
          </span>
          <h2>Operator Info</h2>
        </header>
        <dl className="td-avd__fields td-avd__fields--operator">
          <Field label="Operator Name">{vehicle?.operator?.name}</Field>
          <Field label="ID">{vehicle?.operator?.tagId}</Field>
          <Field label="Contact Number">{vehicle?.operator?.contact}</Field>
        </dl>
      </div>
    </section>
  );
}

const ALERT_ZOOM = 16;

function AlertMap({
  point,
  style,
  children,
}: {
  point: AlertRow;
  style: AlertStyle;
  children: ReactNode;
}) {
  const el = useRef<HTMLDivElement>(null);
  const { map, ready } = useLeaflet(el, 5);
  const marker = useRef<L.Marker | null>(null);
  const [pinBox, setPinBox] = useState<HTMLElement | null>(null);
  const { lat, lng } = point;
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || lat == null || lng == null) return;
    if (marker.current) marker.current.setLatLng([lat, lng]);
    else {
      marker.current = L.marker([lat, lng], {
        icon: L.divIcon({ className: 'td-avd__pin-box', html: '', iconSize: [38, 38] }),
        keyboard: false,
      }).addTo(m);
      setPinBox(marker.current.getElement() ?? null);
    }
    m.setView([lat, lng], ALERT_ZOOM);
  }, [lat, lng, ready, map]);
  useEffect(
    () => () => {
      marker.current = null;
    },
    [],
  );
  const has = lat != null && lng != null;
  return (
    <div className="td-map td-avd__map">
      <div ref={el} className="td-avd__leaflet" />
      {pinBox &&
        createPortal(
          <span className={`td-marker td-avd__pin tone-${style.tone}`} tabIndex={0}>
            <Icon name={style.icon} size={15} />
            <span className="td-marker__tip">{children}</span>
          </span>,
          pinBox,
        )}
      <div className="td-map__zoom">
        <button type="button" aria-label="Zoom in" onClick={() => map.current?.zoomIn()}>
          <Icon name="Plus" size={15} />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => map.current?.zoomOut()}>
          <Icon name="Minus" size={15} />
        </button>
        <button
          type="button"
          aria-label="Recenter on the alert"
          disabled={!has}
          onClick={() => has && map.current?.setView([lat!, lng!], ALERT_ZOOM)}
        >
          <Icon name="LocateFixed" size={15} />
        </button>
        <LayersButton map={map} />
        {has && (
          <button
            type="button"
            aria-label="Open in Google Maps"
            title="Open in Google Maps"
            onClick={() =>
              window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener')
            }
          >
            <Icon name="Expand" size={15} />
          </button>
        )}
      </div>
      {!has && <p className="td-avd__nomap">No position was reported for this alert.</p>}
    </div>
  );
}

export function AlertCard({ alert }: { alert: AlertRow }) {
  const style = alertStyle(alert.type);
  const where = alert.location || coords(alert);
  return (
    <section className={`td-card td-avd td-avd--alert tone-${style.tone}`}>
      <header className="td-avd__alert-head">
        <span className="td-badge td-badge--solid">
          <Icon name={style.icon} size={16} />
        </span>
        <div>
          <strong>{alert.label}</strong>
          <p>{style.about || alert.description || formatStamp(alert.at)}</p>
        </div>
        <SeverityPill value={alert.severity} />
      </header>
      <AlertMap point={alert} style={style}>
        <strong>{alert.plateNo}</strong>
        {alert.label}
        {' · '}
        {formatStamp(alert.at)}
        {alert.speed != null ? ` · ${Math.round(alert.speed)} km/h` : ''}
      </AlertMap>
      <p className="td-avd__addr">
        <Icon name="MapPin" size={15} />
        {where || 'Location not reported'}
      </p>
    </section>
  );
}
