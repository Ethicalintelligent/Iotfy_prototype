// IT-0036. The selected vehicle's chip on the map and its "Nearby Vehicles" dialog (original
// markup and texts).
import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, Modal, usePortalRoot } from '../smart-track/kit';
import { PinMap, type Pin } from './LiveMap';
import { VehicleMarkerView } from './leaflet';
import { MARKER_STATUS, ago, coords, distance, type Status, type Position } from './model';

/** A vehicle on the page: its position (if any) and current status. */
export interface Row {
  id: string;
  name: string;
  position: Position | null;
  status: Status;
}

export interface Driver {
  name?: string;
  id?: string;
  phone?: string;
}

/** What the dialog needs to know about vehicles. */
export interface NearbyKind {
  code: (r: Row) => string | undefined;
  driverOf: (id: string) => Driver;
  marker: (id: string) => { plate: string; img?: string };
  /** List picture: the vehicle's own category image, else the guessed one (`fallback`). */
  media: (id: string, size: number) => ReactNode;
}

const MIN_KM = 5;
const MAX_KM = 100;
const STEP_KM = 5;
const START_KM = 5;

export const driverText = (d: Driver) => (d.name ? `${d.name} (ID: ${d.id || '—'})` : 'Unassigned');
const kmText = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;

function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className={`td-pill tone-${tone}`}>
      <i className="td-dot" />
      {children}
    </span>
  );
}

function CallButton({ name, phone }: Driver) {
  return phone ? (
    <a
      className="td-icon-btn td-icon-btn--sm td-nb__call"
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      title={`Call ${name ?? 'operator'} · ${phone}`}
      aria-label={`Call ${name ?? 'operator'}`}
    >
      <Icon name="Phone" size={14} />
    </a>
  ) : (
    <button
      type="button"
      className="td-icon-btn td-icon-btn--sm td-nb__call"
      disabled
      title={name ? `No contact number for ${name}` : 'No operator assigned'}
      aria-label="Call operator (unavailable)"
    >
      <Icon name="Phone" size={14} />
    </button>
  );
}

/** The chip top right of the map for the selected vehicle, with its Nearby button. */
export function NearbyChip({
  kind,
  row,
  rows,
  now,
}: {
  kind: NearbyKind;
  row: Row;
  rows: Row[];
  now: number;
}) {
  const [open, setOpen] = useState(false);
  const portal = usePortalRoot();
  const name = kind.code(row) || row.name;
  return (
    <>
      <div
        className="td-trk__chip vh-mapview__nearby"
        title={`Selected: ${name} · ${row.status.label}`}
      >
        <span>{name}</span>
        {/* IT-0041 (bug sheet 23-11-2026, Map View #1): the selected vehicle's current status. */}
        <span className={`td-pill tone-${row.status.tone}`}>
          <i className="td-dot" />
          {row.status.label}
        </span>
        <button
          type="button"
          className="td-link"
          onClick={() => setOpen(true)}
          title={`Vehicles near ${name}`}
        >
          <Icon name="Radar" size={14} />
          Nearby
        </button>
      </div>
      {open &&
        portal &&
        createPortal(
          <NearbyDialog
            kind={kind}
            row={row}
            rows={rows}
            now={now}
            onClose={() => setOpen(false)}
          />,
          portal,
        )}
    </>
  );
}

function circle([lat, lng]: [number, number], km: number, steps = 72): [number, number][] {
  const dLat = km / 110.574;
  const dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI;
    return [lat + dLat * Math.sin(a), lng + dLng * Math.cos(a)];
  });
}

function NearbyDialog({
  kind,
  row,
  rows,
  now,
  onClose,
}: {
  kind: NearbyKind;
  row: Row;
  rows: Row[];
  now: number;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(START_KM);
  const [range, setRange] = useState(START_KM);
  const [picked, setPicked] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const plate = kind.code(row);
  const title = `Nearby Vehicles — ${row.name}${plate ? ` (${plate})` : ''}`;
  const p = row.position;
  const at = useMemo<[number, number] | null>(() => (p ? [p.lat, p.lng] : null), [p]);

  const near = useMemo(() => {
    if (!at) return [];
    const out: { row: Row; at: [number, number]; km: number }[] = [];
    for (const r of rows) {
      if (r.id === row.id || !r.position) continue;
      const pos: [number, number] = [r.position.lat, r.position.lng];
      const km = distance(at, pos) / 1000;
      if (km <= range) out.push({ row: r, at: pos, km });
    }
    return out.sort((a, b) => a.km - b.km);
  }, [rows, row.id, at, range]);
  const ring = useMemo(() => (at ? circle(at, range) : []), [at, range]);
  const lines = useMemo(() => [{ id: 'range', className: 'is-faded', points: ring }], [ring]);

  const pins = useMemo<Pin[]>(() => {
    if (!at) return [];
    const marker = (r: Row) => {
      const m = kind.marker(r.id);
      return (
        <VehicleMarkerView
          plate={m.plate}
          status={MARKER_STATUS[r.status.id]}
          speed={Math.round(r.position?.speed ?? 0)}
          img={m.img}
        />
      );
    };
    return [
      ...near.map(({ row: r, at: pos, km }) => ({
        id: r.id,
        at: pos,
        top: hovered === r.id,
        className: `td-marker--vehicle tone-${r.status.tone} ${picked === r.id ? 'is-picked' : ''} ${hovered === r.id ? 'is-hovered' : ''}`,
        onClick: () => setPicked(r.id),
        children: (
          <>
            {marker(r)}
            <span className="td-marker__tip">
              <strong>{r.name}</strong>
              {r.status.label} · {kmText(km)} away
            </span>
          </>
        ),
      })),
      {
        id: `self-${row.id}`,
        at,
        top: true,
        className: `td-marker--vehicle tone-${row.status.tone}`,
        children: (
          <>
            {marker(row)}
            <span className="td-marker__tip">
              <strong>{row.name}</strong>
              {row.status.label} · {coords(at[0], at[1])}
            </span>
          </>
        ),
      },
    ];
  }, [at, near, row, picked, hovered, kind]);

  if (!at)
    return (
      <Modal title={title} onClose={onClose}>
        <div className="gp-empty">
          <span className="td-badge td-badge--lg tone-gray">
            <Icon name="MapPinOff" size={20} />
          </span>
          <strong>No location yet</strong>
          <p>{row.name} has not reported a position, so nearby vehicles cannot be found.</p>
        </div>
      </Modal>
    );

  const self = kind.driverOf(row.id);
  const speed = Math.round(p?.speed ?? 0);
  return (
    <Modal title={title} onClose={onClose} width={1120}>
      <div className="td-nb">
        <PinMap
          className="td-nb__map"
          pins={pins}
          lines={lines}
          fit={ring}
          fitKey={`${row.id}-${range}`}
          maxFitZoom={16}
          overlay={
            <form
              className="td-nb__range"
              onSubmit={(e) => {
                e.preventDefault();
                setRange(draft);
                setPicked(null);
              }}
            >
              <label htmlFor={`td-nb-${row.id}`} className="td-nb__range-label">
                Range in km
              </label>
              <div className="td-nb__slider">
                <span className="td-nb__value">{draft} km</span>
                <input
                  id={`td-nb-${row.id}`}
                  type="range"
                  className="td-range"
                  min={MIN_KM}
                  max={MAX_KM}
                  step={STEP_KM}
                  value={draft}
                  style={{
                    ['--pct' as string]: `${((draft - MIN_KM) / (MAX_KM - MIN_KM)) * 100}%`,
                  }}
                  onChange={(e) => setDraft(Number(e.target.value))}
                />
                <span className="td-nb__ends" aria-hidden="true">
                  <span>{MIN_KM}</span>
                  <span>{MAX_KM}</span>
                </span>
              </div>
              <button type="submit" className="td-btn td-btn--primary td-nb__show">
                <Icon name="Radar" size={14} />
                <span>Show nearby vehicles</span>
              </button>
            </form>
          }
        />
        <section className="td-nb__list" aria-label="Nearby vehicles">
          <div
            className={`td-nb__self tone-${row.status.tone}`}
            role="group"
            aria-label="Selected vehicle"
          >
            <small className="td-nb__self-label">Selected vehicle</small>
            <div className="td-nb__self-main">
              {kind.media(row.id, 34)}
              <span className="td-nb__who">
                <strong>{plate ?? row.name}</strong>
                <small>
                  {[plate ? row.name : null, `${speed} km/h`, p && ago(p.ts, now)]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
                <small title={driverText(self)}>
                  <Icon name="UserRound" size={11} /> {driverText(self)}
                </small>
              </span>
              <span className="td-nb__meta">
                <Pill tone={row.status.tone}>{row.status.label}</Pill>
                <CallButton {...self} />
              </span>
            </div>
          </div>
          <header className="td-nb__head">
            <strong>
              {near.length} {near.length === 1 ? 'vehicle' : 'vehicles'}
            </strong>
            <small>
              within {range} km of {row.name}
            </small>
          </header>
          {near.length ? (
            <ul className="td-nb__rows">
              {near.map(({ row: r, km }) => (
                <li
                  key={r.id}
                  className="td-nb__item"
                  onMouseEnter={() => setHovered(r.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(r.id)}
                  onBlur={() => setHovered(null)}
                >
                  <button
                    type="button"
                    className={`td-nb__row ${picked === r.id ? 'is-picked' : ''}`}
                    onClick={() => setPicked(r.id)}
                    aria-pressed={picked === r.id}
                  >
                    {kind.media(r.id, 28)}
                    <span className="td-nb__who">
                      <strong>{r.name}</strong>
                      <small>
                        {[
                          kind.code(r),
                          `${r.position ? Math.round(r.position.speed ?? 0) : 0} km/h`,
                          r.position && ago(r.position.ts, now),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </small>
                    </span>
                    <span className="td-nb__meta">
                      <span className="td-nb__km">{kmText(km)}</span>
                      <Pill tone={r.status.tone}>{r.status.label}</Pill>
                    </span>
                  </button>
                  <CallButton {...kind.driverOf(r.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="gp-empty">
              <span className="td-badge td-badge--lg tone-gray">
                <Icon name="Radar" size={20} />
              </span>
              <strong>No vehicles nearby</strong>
              <p>Nothing within {range} km. Widen the range and press Show nearby vehicles.</p>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
