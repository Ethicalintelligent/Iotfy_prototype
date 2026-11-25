// IT-0036. Manage › Geo Configuration (original `eK` + zone form `nK`): zone summary tiles, the
// list of geofence cards with filters, the selected zone on a map with its limits and time
// intervals, and Add / Edit Zone with drawing on the map. Saved in core.geofences.
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import L from 'leaflet';
import { useSaveBatch, useVehicleGeofences, type Batch } from '@iotify/data';
import { ErrorState, Icon, Loading } from '../../smart-track/kit';
import type { GridLayout } from '../grid/DataGrid';
import {
  GeoControls,
  ZonesMap,
  draftComplete,
  draftLayer,
  fitLayer,
  useLeaflet,
  type ZoneDraft,
} from '../map';
import {
  Banner,
  Confirm,
  Drawer,
  FieldError,
  FormSection,
  Fx,
  SearchBox,
  Select,
  ViewOnly,
  errText,
  useToast,
} from '../ui';
import {
  ampm,
  hhmm,
  useZones,
  zoneTypeLabel,
  type Interval,
  type Zone,
  type ZoneCategory,
} from './zones';

const RADIUS = { min: 50, max: 5000, step: 10, initial: 300 };
const NO_SETTINGS = {
  category: 'GENERAL' as ZoneCategory,
  speedLimitKmh: null,
  heightM: null,
  status: 'ACTIVE' as const,
  intervals: [] as Interval[],
};
const km = (m: number) =>
  m >= 1000 ? `${(m / 1000).toFixed(m % 1000 ? 2 : 0)} km` : `${Math.round(m)} m`;

/* ------------------------------------------------------------------ glyphs */

const PIN = 'M18 20.6s-8.3-6.9-8.3-11.8a8.3 8.3 0 0 1 16.6 0c0 4.9-8.3 11.8-8.3 11.8z';
const SHIELD = 'M18 1.2l8 3v6.2c0 5-3.4 8.6-8 10.3-4.6-1.7-8-5.3-8-10.3V4.2z';
const STAR =
  'M18 1L20.59 7.04L27.13 7.63L22.18 11.96L23.64 18.37L18 15L12.36 18.37L13.82 11.96L8.87 7.63L15.41 7.04Z';
const dot = <circle cx="18" cy="10" r="8.2" />;
const GLYPHS: Record<string, { cut: ReactNode; body: ReactNode }> = {
  total: {
    cut: <path d={PIN} />,
    body: (
      <>
        <path d={PIN} />
        <circle cx="18" cy="8.8" r="3" />
      </>
    ),
  },
  active: {
    cut: dot,
    body: (
      <>
        {dot}
        <path d="M14.4 10.2l2.5 2.5 4.8-4.9" />
      </>
    ),
  },
  inactive: {
    cut: dot,
    body: (
      <>
        {dot}
        <path d="M12.3 15.7l11.4-11.4" />
      </>
    ),
  },
  restricted: {
    cut: <path d={SHIELD} />,
    body: (
      <>
        <path d={SHIELD} />
        <path d="M18 6.4v5.6" />
        <circle cx="18" cy="15.4" r=".45" fill="currentColor" />
      </>
    ),
  },
  preferred: { cut: <path d={STAR} />, body: <path d={STAR} /> },
};

/** A zone glyph standing on a dashed ground ellipse (original `T0`). */
export function ZoneGlyph({
  kind,
  width,
  height,
  viewBox,
}: {
  kind: string;
  width: number;
  height: number;
  viewBox: string;
}) {
  const id = `vm-zg-${useId().replace(/[^\w-]/g, '')}`;
  const g = GLYPHS[kind]!;
  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      overflow="visible"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="26">
          <rect width="36" height="26" fill="#fff" stroke="none" />
          <g fill="#000" stroke="#000" strokeWidth={4.4}>
            {g.cut}
          </g>
        </mask>
      </defs>
      <ellipse
        cx="18"
        cy="18.6"
        rx="15.8"
        ry="5.9"
        strokeDasharray="3.4 2.2"
        mask={`url(#${id})`}
      />
      {g.body}
    </svg>
  );
}

const SHAPE_ART = {
  CIRCLE: {
    label: 'Circle',
    from: '#0A6E86',
    to: '#14A9C4',
    art: <circle cx="12" cy="12" r="8" />,
  },
  POLYGON: {
    label: 'Freeform',
    from: '#9B7D00',
    to: '#EBBD00',
    art: <path d="M12 3 3 9v6l9 6 9-6V9z" />,
  },
};
function ShapeArt({ kind }: { kind: 'CIRCLE' | 'POLYGON' }) {
  const id = `vm-sg-${useId().replace(/[^\w-]/g, '')}`;
  const s = SHAPE_ART[kind];
  return (
    <svg
      width={36}
      height={36}
      viewBox="0 0 24 24"
      fill="none"
      stroke={`url(#${id})`}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor={s.from} />
          <stop offset="1" stopColor={s.to} />
        </linearGradient>
      </defs>
      {s.art}
    </svg>
  );
}

const PATHS = {
  speedometer:
    'M12 16a3 3 0 0 1-3-3c0-1.12.61-2.1 1.5-2.61l9.71-5.62l-5.53 9.58c-.5.98-1.51 1.65-2.68 1.65m0-13c1.81 0 3.5.5 4.97 1.32l-2.1 1.21C14 5.19 13 5 12 5a8 8 0 0 0-8 8c0 2.21.89 4.21 2.34 5.65h.01c.39.39.39 1.02 0 1.41s-1.03.39-1.42.01A9.97 9.97 0 0 1 2 13A10 10 0 0 1 12 3m10 10c0 2.76-1.12 5.26-2.93 7.07c-.39.38-1.02.38-1.41-.01a.996.996 0 0 1 0-1.41A7.95 7.95 0 0 0 20 13c0-1-.19-2-.54-2.9L20.67 8C21.5 9.5 22 11.18 22 13',
  heightLimit: 'M13 9v6h3l-4 4l-4-4h3V9H8l4-4l4 4zM4 2h16v2H4zm0 18h16v2H4z',
  clock:
    'M12 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8a8 8 0 0 0-8 8a8 8 0 0 0 8 8m0-18a10 10 0 0 1 10 10a10 10 0 0 1-10 10C6.47 22 2 17.5 2 12A10 10 0 0 1 12 2m.5 5v5.25l4.5 2.67l-.75 1.23L11 13V7z',
};
function PathIcon({
  path,
  size = 16,
  className,
}: {
  path: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={path} />
    </svg>
  );
}

/** The search box grows to line up with the first summary card (original `YD`). */
export function useSearchAlign(row: React.RefObject<HTMLDivElement | null>, child: number) {
  useEffect(() => {
    const el = row.current;
    const target = el?.children[child] as HTMLElement | undefined;
    const manage = el?.closest<HTMLElement>('.td-manage');
    const search = manage?.querySelector<HTMLElement>(':scope > .td-manage__bar > .td-gv__search');
    if (!el || !target || !manage || !search) return;
    const picker = manage.querySelector(':scope > .td-manage__bar > .td-manage__module');
    const fit = () => {
      const s = search.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      if (t.right < el.getBoundingClientRect().right - 1 && t.right > s.left)
        manage.style.setProperty('--vm-search-w', `${Math.floor(t.right - s.left)}px`);
      else manage.style.removeProperty('--vm-search-w');
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(target);
    if (picker) ro.observe(picker);
    return () => {
      ro.disconnect();
      manage.style.removeProperty('--vm-search-w');
    };
  }, [row, child]);
}

function Kpi({ label, value, glyph }: { label: string; value: number | null; glyph: string }) {
  return (
    <div className="vm-zkpi__tile">
      <span className={`vm-zkpi__icon is-${glyph}`}>
        <ZoneGlyph kind={glyph} width={28} height={21} viewBox="0 -0.6 36 27" />
      </span>
      <span className="vm-zkpi__text">
        <b>{label}</b>
        <strong>{value ?? '—'}</strong>
      </span>
    </div>
  );
}

function Summary({ zones }: { zones: Zone[] }) {
  const row = useRef<HTMLDivElement>(null);
  useSearchAlign(row, 1);
  const n = (f: (z: Zone) => boolean) => zones.filter(f).length;
  return (
    <div ref={row} className="vm-zkpi" role="group" aria-label="Zone summary">
      <section className="vm-zkpi__card">
        <Kpi label="Total Geofences" value={zones.length} glyph="total" />
      </section>
      <section className="vm-zkpi__card">
        <Kpi label="Active Zones" value={n((z) => z.status === 'ACTIVE')} glyph="active" />
        <i className="vm-zkpi__sep" />
        <Kpi label="Inactive Zones" value={n((z) => z.status !== 'ACTIVE')} glyph="inactive" />
      </section>
      <section className="vm-zkpi__card">
        <Kpi
          label="Restricted Zones"
          value={n((z) => z.category === 'RESTRICTED')}
          glyph="restricted"
        />
        <i className="vm-zkpi__sep" />
        <Kpi
          label="Preferred Zones"
          value={n((z) => z.category === 'PREFERRED')}
          glyph="preferred"
        />
      </section>
    </div>
  );
}

function TypeTag({ category }: { category: ZoneCategory }) {
  return (
    <span className={`vm-zcard__type is-${category.toLowerCase()}`}>
      {category === 'RESTRICTED' && (
        <ZoneGlyph kind="restricted" width={20} height={14.5} viewBox="0 0 36 26" />
      )}
      {category === 'PREFERRED' && (
        <ZoneGlyph kind="preferred" width={20} height={14.5} viewBox="0 0 36 26" />
      )}
      {zoneTypeLabel(category)}
    </span>
  );
}

function ZoneCard({
  zone,
  count,
  selected,
  canEdit,
  onSelect,
  onView,
  onEdit,
  onDelete,
}: {
  zone: Zone;
  count: number;
  selected: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) el.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);
  const active = zone.status === 'ACTIVE';
  return (
    <div
      ref={el}
      className={`vm-zcard ${selected ? 'is-selected' : ''}`}
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="vm-zcard__shape">
        <ShapeArt kind={zone.shape.kind} />
      </span>
      <div className="vm-zcard__main">
        <strong title={zone.name}>Name: {zone.name}</strong>
        <small>Shape: {SHAPE_ART[zone.shape.kind].label}</small>
        <div className="vm-zcard__meta">
          <TypeTag category={zone.category} />
          <i className="vm-zcard__sep" />
          <span className="vm-zcard__count" title="Vehicles bound to this zone">
            <Icon name="Truck" size={16} />
            {count}
          </span>
        </div>
      </div>
      <div className="vm-zcard__side">
        <span className="vm-zcard__actions" onClick={(e) => e.stopPropagation()}>
          {/* IT-0041: View opens the zone's form read-only. */}
          <button
            type="button"
            className="td-mg__act"
            onClick={onView}
            title="View"
            aria-label={`View ${zone.name}`}
          >
            <Icon name="RowView" size={15} />
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                className="td-mg__act"
                onClick={onEdit}
                title="Edit"
                aria-label={`Edit ${zone.name}`}
              >
                <Icon name="RowEdit" size={15} />
              </button>
              <button
                type="button"
                className="td-mg__act is-danger"
                onClick={onDelete}
                title="Delete"
                aria-label={`Delete ${zone.name}`}
              >
                <Icon name="RowDelete" size={15} />
              </button>
            </>
          )}
        </span>
        <span className={`vm-zbadge ${active ? 'is-active' : ''}`}>
          <i />
          {active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );
}

function ZoneHead({ zone }: { zone: Zone }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const title =
    zone.category === 'GENERAL'
      ? 'Time Intervals'
      : `${zoneTypeLabel(zone.category)} Time Intervals`;
  const tone = zone.category === 'RESTRICTED' ? 'is-restricted' : '';
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const out = (e: Event) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('keydown', key);
    document.addEventListener('mousedown', out);
    document.addEventListener('focusin', out);
    return () => {
      window.removeEventListener('keydown', key);
      document.removeEventListener('mousedown', out);
      document.removeEventListener('focusin', out);
    };
  }, [open]);
  return (
    <>
      <span className="vm-zhead__item">
        <PathIcon path={PATHS.speedometer} className="vm-zhead__speed" />
        Speed Limit: <b>{zone.speedLimitKmh ? `${zone.speedLimitKmh} km/h` : '—'}</b>
      </span>
      <i className="vm-zhead__sep" />
      <span className="vm-zhead__item">
        <PathIcon path={PATHS.heightLimit} className="vm-zhead__height" />
        Height Limit: <b>{zone.heightM ? `${zone.heightM.toFixed(1)} m` : '—'}</b>
      </span>
      <i className="vm-zhead__sep" />
      <span ref={box} className="vm-zhead__intervals">
        <button
          type="button"
          className={`vm-zhead__btn ${tone}`}
          aria-expanded={open && zone.intervals.length > 0}
          disabled={!zone.intervals.length}
          onClick={() => setOpen((o) => !o)}
        >
          <PathIcon path={PATHS.clock} className="vm-zhead__clock" />
          <b>{title}</b>
          <em>· {zone.intervals.length}</em>
          <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} />
        </button>
        {open && zone.intervals.length > 0 && (
          <ul className={`vm-zhead__menu ${tone}`}>
            {zone.intervals.map((t) => (
              <li key={`${t.from}-${t.to}`}>
                <PathIcon path={PATHS.clock} size={15} className="vm-zhead__clock" />
                {ampm(t.from)} – {ampm(t.to)}
              </li>
            ))}
          </ul>
        )}
      </span>
    </>
  );
}

export function GeoConfigModule({
  companyId,
  readOnly,
  picker,
}: {
  companyId: string;
  readOnly: boolean;
  picker: ReactNode;
  layout?: GridLayout;
  onLayout?: (l: GridLayout) => void;
}) {
  const canEdit = !readOnly;
  const zonesQ = useZones(companyId);
  const links = useVehicleGeofences();
  const save = useSaveBatch();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [shape, setShape] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [picked, setPicked] = useState<string | null>(null);
  const [editing, setEditing] = useState<Zone | 'new' | null>(null);
  // IT-0041: the card's View action opens the same form read-only.
  const [viewing, setViewing] = useState(false);
  const [deleting, setDeleting] = useState<Zone | null>(null);
  const zones = zonesQ.zones;
  const bound = useMemo(() => {
    const m = new Map<string, number>();
    const ids = new Set(zones.map((z) => z.id));
    for (const l of links.data ?? [])
      if (ids.has(l.geofence_id)) m.set(l.geofence_id, (m.get(l.geofence_id) ?? 0) + 1);
    return m;
  }, [links.data, zones]);
  const text = q.trim().toLowerCase();
  const shown = zones.filter(
    (z) =>
      (!text || z.name.toLowerCase().includes(text)) &&
      (shape === 'all' || z.shape.kind === shape) &&
      (type === 'all' || z.category === type) &&
      (status === 'all' || z.status === status),
  );
  const current = shown.find((z) => z.id === picked) ?? shown[0] ?? null;
  const onMap = useMemo(
    () => (current ? [{ id: current.id, shape: current.shape, label: current.name }] : []),
    [current],
  );
  const remove = (z: Zone) =>
    save.mutate(
      {
        deletes: [
          {
            table: 'vehicle_geofences',
            keys: (links.data ?? [])
              .filter((l) => l.geofence_id === z.id)
              .map((l) => ({ asset_id: l.asset_id, geofence_id: z.id })),
          },
          { table: 'geofences', keys: [{ id: z.id }] },
        ],
      },
      {
        onSuccess: () => {
          toast.show(`Zone ${z.name} deleted.`);
          setDeleting(null);
        },
      },
    );
  return (
    <div className="td-manage vm-geoconfig">
      <div className="td-manage__bar">
        {picker}
        <SearchBox value={q} onChange={setQ} placeholder="Search geofence..." />
        {canEdit && (
          <button
            type="button"
            className="td-btn td-btn--glow td-manage__add"
            onClick={() => {
              setViewing(false);
              setEditing('new');
            }}
          >
            <Icon name="Plus" size={17} />
            Add Zone
          </button>
        )}
      </div>
      {zonesQ.isPending ? (
        <Loading label="Loading geofences…" />
      ) : zonesQ.isError ? (
        <ErrorState message={zonesQ.error.message} onRetry={() => void zonesQ.refetch()} />
      ) : (
        <div className="td-geo">
          <Summary zones={zones} />
          <div className="td-geo__body">
            <section className="td-geo__list">
              <header className="td-geo__list-head">
                <h2>Geofences</h2>
                <small>
                  {shown.length === zones.length
                    ? `${zones.length} total`
                    : `${shown.length} of ${zones.length}`}
                </small>
              </header>
              <div className="td-geo__filters">
                <Select
                  small
                  value={shape}
                  onChange={setShape}
                  aria-label="Shape"
                  options={[
                    { value: 'all', label: 'All Shapes' },
                    { value: 'CIRCLE', label: 'Circle' },
                    { value: 'POLYGON', label: 'Freeform' },
                  ]}
                />
                <Select
                  small
                  value={type}
                  onChange={setType}
                  aria-label="Zone type"
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'PREFERRED', label: 'Preferred' },
                    { value: 'RESTRICTED', label: 'Restricted' },
                    { value: 'GENERAL', label: 'General' },
                  ]}
                />
                <Select
                  small
                  value={status}
                  onChange={setStatus}
                  aria-label="Status"
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                  ]}
                />
              </div>
              <div className="td-geo__items" role="listbox" aria-label="Geofences">
                {shown.length ? (
                  shown.map((z) => (
                    <ZoneCard
                      key={z.id}
                      zone={z}
                      count={bound.get(z.id) ?? 0}
                      selected={current?.id === z.id}
                      canEdit={canEdit}
                      onSelect={() => setPicked(z.id)}
                      onView={() => {
                        setViewing(true);
                        setEditing(z);
                      }}
                      onEdit={() => {
                        setViewing(false);
                        setEditing(z);
                      }}
                      onDelete={() => setDeleting(z)}
                    />
                  ))
                ) : (
                  <p className="td-unavailable">
                    {zones.length
                      ? 'No matching geofences. Try a different search term.'
                      : canEdit
                        ? 'No geofences yet. Use “Add Zone” to draw one.'
                        : 'No geofences yet.'}
                  </p>
                )}
              </div>
            </section>
            <section className="td-geo__map">
              <header className="td-geo__map-head">
                <h2>{current?.name ?? 'No zone selected'}</h2>
                {current && <ZoneHead key={current.id} zone={current} />}
              </header>
              <div className="td-geo__map-box">
                <ZonesMap zones={onMap} selectedId={current?.id ?? null} height="100%" />
              </div>
            </section>
          </div>
        </div>
      )}
      {editing && (
        <ViewOnly title={viewing ? 'View Zone' : null}>
        <ZoneForm
          key={`${editing === 'new' ? 'new' : editing.id}:${viewing}`}
          companyId={companyId}
          zone={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(name, added) => {
            setEditing(null);
            toast.show(`Zone ${name} ${added ? 'added' : 'updated'}.`);
          }}
        />
        </ViewOnly>
      )}
      {deleting && (
        <Confirm
          title="Delete this geofence?"
          busy={save.isPending}
          error={save.error ? save.error.message : null}
          message={`This will permanently remove ${deleting.name} from your geofences${bound.get(deleting.id) ? ` and unbind its ${bound.get(deleting.id)} vehicle(s)` : ''}. This action cannot be undone.`}
          onCancel={() => {
            setDeleting(null);
            save.reset();
          }}
          onConfirm={() => remove(deleting)}
        />
      )}
      {toast.node}
    </div>
  );
}

/* ------------------------------------------------------------------ zone form */

const DRAW_HINT = {
  CIRCLE: (d: ZoneDraft) =>
    d.kind === 'CIRCLE' && d.center
      ? 'Circle placed · click again to move the centre'
      : 'Click on the map to place the circle centre',
  POLYGON: (d: ZoneDraft) => {
    const n = d.kind === 'POLYGON' ? d.points.length : 0;
    return n
      ? `${n} point${n > 1 ? 's' : ''} · keep clicking to add, ${n >= 3 ? 'the shape closes itself' : 'at least 3 needed'}`
      : 'Click to start drawing the boundary';
  },
};

/** The drawing map of the zone form (original `G8`). */
function DrawMap({
  draft,
  onChange,
  fitKey,
}: {
  draft: ZoneDraft;
  onChange: (d: ZoneDraft) => void;
  fitKey?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const latest = useRef(draft);
  latest.current = draft;
  const { map, ready } = useLeaflet(el, {
    onClick: (p) => {
      const d = latest.current;
      onChange(d.kind === 'CIRCLE' ? { ...d, center: p } : { ...d, points: [...d.points, p] });
    },
  });
  const layer = useRef<L.FeatureGroup | null>(null);
  const fitted = useRef<string | undefined>(undefined);
  const sig = JSON.stringify(draft);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    layer.current?.remove();
    layer.current = draftLayer(draft, { edit: true }).addTo(m);
    if (fitKey !== undefined && fitKey !== fitted.current && draftComplete(draft)) {
      fitted.current = fitKey;
      fitLayer(m, layer.current);
    }
  }, [sig, ready, map, fitKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const empty = draft.kind === 'CIRCLE' ? !draft.center : !draft.points.length;
  return (
    <div className="td-zmap gp-mapbox">
      <div ref={el} className="gp-mapbox__leaflet" />
      <span className="td-zmap__tag">Map</span>
      {!empty && (
        <button
          type="button"
          className="td-zmap__clear"
          onClick={(e) => {
            e.stopPropagation();
            onChange(
              draft.kind === 'CIRCLE' ? { ...draft, center: null } : { ...draft, points: [] },
            );
          }}
        >
          Clear
        </button>
      )}
      <GeoControls
        map={map}
        onFit={() => layer.current && map.current && fitLayer(map.current, layer.current)}
      />
      <span className="td-zmap__hint">{DRAW_HINT[draft.kind](draft)}</span>
    </div>
  );
}

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`ui-switch ${on ? 'is-on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="ui-switch__track">
        <span className="ui-switch__knob" />
      </span>
      <span>{on ? 'On' : 'Off'}</span>
    </button>
  );
}

const overlaps = (list: Interval[]) =>
  [...list]
    .sort((a, b) => a.from.localeCompare(b.from))
    .some((t, i, all) => i > 0 && t.from < all[i - 1]!.to);
const startDraft = (z: Zone | null): ZoneDraft =>
  z
    ? z.shape.kind === 'CIRCLE'
      ? { ...z.shape }
      : { kind: 'POLYGON', points: [...z.shape.points] }
    : { kind: 'CIRCLE', center: null, radius: RADIUS.initial };

function ZoneForm({
  companyId,
  zone,
  onClose,
  onSaved,
}: {
  companyId: string;
  zone: Zone | null;
  onClose: () => void;
  onSaved: (name: string, added: boolean) => void;
}) {
  const save = useSaveBatch();
  const s = zone ?? { ...NO_SETTINGS, name: '' };
  const start = {
    name: zone?.name ?? '',
    active: s.status === 'ACTIVE',
    speed: s.speedLimitKmh == null ? '' : String(s.speedLimitKmh),
    height: s.heightM == null ? '' : String(s.heightM),
    category: zone
      ? s.category === 'RESTRICTED' || s.category === 'PREFERRED'
        ? s.category
        : 'GENERAL'
      : 'PREFERRED',
    intervals: s.intervals.length
      ? s.intervals.map((t) => ({ from: hhmm(t.from), to: hhmm(t.to) }))
      : [{ from: '', to: '' }],
  };
  const [v, setV] = useState(start);
  const [draft, setDraft] = useState<ZoneDraft>(() => startDraft(zone));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const setInterval = (i: number, p: Partial<Interval>) =>
    setV((x) => ({ ...x, intervals: x.intervals.map((t, j) => (j === i ? { ...t, ...p } : t)) }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!v.name.trim()) err.name = 'Geozone name is required';
    if (!draftComplete(draft))
      err.geometry =
        draft.kind === 'CIRCLE'
          ? 'Click on the map to place the circle centre'
          : 'Draw the boundary: at least 3 points';
    const speed = v.speed.trim() ? Number(v.speed) : null;
    const height = v.height.trim() ? Number(v.height.replace(',', '.')) : null;
    if (speed != null && !(Number.isInteger(speed) && speed >= 1 && speed <= 300))
      err.speed = '1 to 300 km/h';
    if (height != null && !(height >= 0.5 && height <= 20)) err.height = '0.5 to 20 m';
    const times = v.intervals.filter((t) => t.from || t.to);
    if (times.some((t) => !t.from || !t.to)) err.intervals = 'Give a start and an end time';
    else if (times.some((t) => t.to <= t.from)) err.intervals = 'End Time must be after Start Time';
    else if (overlaps(times)) err.intervals = 'Time intervals must not overlap';
    setErrors(err);
    setBanner(null);
    if (Object.keys(err).length) return;
    const id = zone?.id ?? `GF-${companyId}-${crypto.randomUUID().slice(0, 8)}`;
    const row: Record<string, unknown> = {
      id,
      company_id: Number(companyId),
      name: v.name.trim(),
      shape: draft.kind === 'CIRCLE' ? 'Circle' : 'Freeform',
      center_lat: draft.kind === 'CIRCLE' ? draft.center![0] : null,
      center_lng: draft.kind === 'CIRCLE' ? draft.center![1] : null,
      radius_m: draft.kind === 'CIRCLE' ? Math.round(draft.radius) : null,
      points: draft.kind === 'POLYGON' ? draft.points : null,
      zone_type: zoneTypeLabel(v.category),
      active: v.active,
      speed_limit_kmh: speed,
      height_limit_m: height,
      time_intervals: times,
      updated_at: new Date().toISOString(),
    };
    try {
      await save.mutateAsync({ upserts: [{ table: 'geofences', rows: [row] }] } as Batch);
      onSaved(v.name.trim(), !zone);
    } catch (x) {
      setBanner(errText(x));
    }
  };
  const radius = draft.kind === 'CIRCLE' ? draft.radius : 0;
  return (
    <Drawer
      title={zone ? 'Edit Zone' : 'Add Zone'}
      subtitle={zone ? `Update ${zone.name}` : 'Draw and configure a geofence'}
      icon={zone ? 'Pencil' : 'Plus'}
      onClose={onClose}
      onReset={() => {
        setV(start);
        setDraft(startDraft(zone));
        setErrors({});
        setBanner(null);
      }}
      submitLabel={zone ? 'Save Changes' : 'Add Zone'}
      submitting={save.isPending}
      formId="vm-zone-form"
    >
      <div className="td-form__scroll">
        <form id="vm-zone-form" className="td-form" onSubmit={(e) => void submit(e)} noValidate>
          {banner && <Banner>{banner}</Banner>}
          <FormSection title="Zone Details" icon="Info">
            <div className="td-zone">
              <div className="td-zone__main">
                <Fx label="Geozone Name" required error={errors.name}>
                  <input
                    value={v.name}
                    maxLength={120}
                    onChange={(e) => setV((x) => ({ ...x, name: e.target.value }))}
                    autoFocus
                  />
                </Fx>
                <DrawMap draft={draft} fitKey={zone?.id} onChange={setDraft} />
                {errors.geometry && <FieldError>{errors.geometry}</FieldError>}
                {draft.kind === 'CIRCLE' ? (
                  <Fx label="Zone Radius" id="vm-zone-radius" className="td-zone__foot vm-radius">
                    <input
                      id="vm-zone-radius"
                      type="range"
                      className="td-range"
                      min={RADIUS.min}
                      max={RADIUS.max}
                      step={RADIUS.step}
                      value={radius}
                      style={
                        {
                          '--pct': `${((radius - RADIUS.min) / (RADIUS.max - RADIUS.min)) * 100}%`,
                        } as React.CSSProperties
                      }
                      onChange={(e) => setDraft({ ...draft, radius: Number(e.target.value) })}
                    />
                    <strong>{km(radius)}</strong>
                  </Fx>
                ) : (
                  <Fx label="Points Plotted" className="td-zone__foot" group>
                    <span className="td-zone__points">
                      <strong>
                        {draft.points.length} point{draft.points.length === 1 ? '' : 's'}
                      </strong>
                      {draft.points.length > 0 && (
                        <button
                          type="button"
                          className="td-link"
                          onClick={() => setDraft({ ...draft, points: draft.points.slice(0, -1) })}
                        >
                          <Icon name="RotateCcw" size={12} />
                          Undo last
                        </button>
                      )}
                    </span>
                  </Fx>
                )}
              </div>
              <div className="td-zone__side">
                <Fx label="Geozone Shape">
                  <Select
                    value={draft.kind}
                    options={[
                      { value: 'CIRCLE', label: 'Circle' },
                      { value: 'POLYGON', label: 'Freeform' },
                    ]}
                    onChange={(k) =>
                      setDraft(
                        k === 'CIRCLE'
                          ? { kind: 'CIRCLE', center: null, radius: RADIUS.initial }
                          : { kind: 'POLYGON', points: [] },
                      )
                    }
                  />
                </Fx>
                <Fx label="Status" group>
                  <Switch
                    on={v.active}
                    label="Zone active"
                    onChange={(on) => setV((x) => ({ ...x, active: on }))}
                  />
                </Fx>
                <Fx label="Geozone Type">
                  <Select
                    value={v.category}
                    onChange={(c) => setV((x) => ({ ...x, category: c as ZoneCategory }))}
                    options={[
                      { value: 'PREFERRED', label: 'Preferred' },
                      { value: 'RESTRICTED', label: 'Restricted' },
                      { value: 'GENERAL', label: 'General' },
                    ]}
                  />
                </Fx>
                <Fx label="Speed Limit" error={errors.speed}>
                  <input
                    inputMode="numeric"
                    value={v.speed}
                    placeholder="Optional · km/h"
                    onChange={(e) => setV((x) => ({ ...x, speed: e.target.value }))}
                  />
                </Fx>
                <Fx label="Height Limit" error={errors.height}>
                  <input
                    inputMode="decimal"
                    value={v.height}
                    placeholder="Optional · m"
                    onChange={(e) => setV((x) => ({ ...x, height: e.target.value }))}
                  />
                </Fx>
              </div>
            </div>
          </FormSection>
          <FormSection
            title={v.category === 'RESTRICTED' ? 'Restricted Time Intervals' : 'Time Intervals'}
            icon="Clock"
            after={
              <div className="vm-times">
                {v.intervals.map((t, i) => (
                  <div key={i} className="vm-times__row">
                    <input
                      type="time"
                      aria-label="Start Time"
                      title="Start Time"
                      value={t.from}
                      onChange={(e) => setInterval(i, { from: e.target.value })}
                    />
                    <span>–</span>
                    <input
                      type="time"
                      aria-label="End Time"
                      title="End Time"
                      value={t.to}
                      onChange={(e) => setInterval(i, { to: e.target.value })}
                    />
                    <button
                      type="button"
                      className="td-mg__act is-danger"
                      title="Remove interval"
                      aria-label="Remove interval"
                      disabled={v.intervals.length === 1}
                      onClick={() =>
                        setV((x) => ({ ...x, intervals: x.intervals.filter((_, j) => j !== i) }))
                      }
                    >
                      <Icon name="Trash" size={14} />
                    </button>
                  </div>
                ))}
                {errors.intervals && <FieldError>{errors.intervals}</FieldError>}
                <button
                  type="button"
                  className="td-link"
                  disabled={v.intervals.length >= 6}
                  onClick={() =>
                    setV((x) => ({ ...x, intervals: [...x.intervals, { from: '', to: '' }] }))
                  }
                >
                  <Icon name="Plus" size={13} />
                  Add Interval
                </button>
              </div>
            }
          />
        </form>
      </div>
    </Drawer>
  );
}
