// Side drawer forms from the approved GPS Platform design (D:/Project/GPS_Platform/approved_degin,
// 07-01 Add Vehicle and 07-02 Add Device): a panel on the right with an icon-tile header, step
// links that jump to each section, white section cards and a Reset / Add footer.
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../cx';
import type { IconName } from '../icons';
import { Icon } from './basics';
import { Field } from './fields';
import { useEscape } from './overlays';

// ---------------------------------------------------------------- Drawer
export interface DrawerStep {
  /** Matches a FormSection's `id`. */
  key: string;
  label: string;
}
export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  /** Icon in the header tile; default `plus`. */
  icon?: IconName;
  /** Step links under the header; each scrolls to its section. */
  steps?: DrawerStep[];
  /** Footer buttons (e.g. Reset and Add Vehicle). */
  footer?: ReactNode;
  /** Error or notice shown above the footer. */
  notice?: ReactNode;
  /** Panel width in px (default 710; full width on phones). */
  width?: number;
  children: ReactNode;
}

/** Right-hand drawer with an icon header, optional step links, scrolling sections and a footer. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  icon = 'plus',
  steps,
  footer,
  notice,
  width = 710,
  children,
}: DrawerProps) {
  const body = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(steps?.[0]?.key ?? '');
  useEscape(open, onClose);

  // The step whose section is at the top of the scroll area is the active one.
  useEffect(() => {
    const el = body.current;
    if (!open || !el || !steps?.length) return;
    const onScroll = () => {
      const top = el.getBoundingClientRect().top + 24;
      let current = steps[0]!.key;
      for (const s of steps) {
        const sec = el.querySelector<HTMLElement>(`[data-section="${s.key}"]`);
        if (sec && sec.getBoundingClientRect().top <= top) current = s.key;
      }
      // at the very bottom, the last section counts as reached
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) current = steps.at(-1)!.key;
      setActive(current);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [open, steps]);

  useEffect(() => {
    if (!open) return;
    body.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
  }, [open]);

  if (!open) return null;
  const go = (key: string) => {
    const sec = body.current?.querySelector<HTMLElement>(`[data-section="${key}"]`);
    if (sec && body.current) {
      const top =
        sec.getBoundingClientRect().top -
        body.current.getBoundingClientRect().top +
        body.current.scrollTop;
      body.current.scrollTo({ top: top - 14, behavior: 'smooth' });
      setActive(key);
    }
  };
  return createPortal(
    <div className="ui-drawer-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside
        className="ui-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width }}
      >
        <header className="ui-drawer__head">
          <span className="ui-drawer__ic">
            <Icon name={icon} size={20} />
          </span>
          <span className="ui-drawer__titles">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </span>
          <button type="button" className="ui-drawer__close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        {steps && steps.length > 1 && (
          <nav className="ui-drawer__steps" aria-label={`${title} sections`}>
            {steps.map((s, i) => (
              <span key={s.key} className="ui-drawer__stepwrap">
                {i > 0 && <Icon name="chev" size={14} className="ui-drawer__sep" />}
                <button
                  type="button"
                  className={cx('ui-drawer__step', active === s.key && 'is-on')}
                  aria-current={active === s.key ? 'step' : undefined}
                  onClick={() => go(s.key)}
                >
                  {s.label}
                </button>
              </span>
            ))}
          </nav>
        )}
        <div className="ui-drawer__body" ref={body}>
          {children}
        </div>
        {notice && <div className="ui-drawer__notice">{notice}</div>}
        {footer && <footer className="ui-drawer__foot">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------- FormSection
export interface FormSectionProps {
  /** Step key (Drawer `steps`) so the step link can scroll here. */
  id?: string;
  title: ReactNode;
  icon?: IconName;
  /** Columns of the field grid (default 3; one column on phones). */
  cols?: 1 | 2 | 3;
  /** Right side of the title line. */
  actions?: ReactNode;
  children: ReactNode;
}
/** White section card with an icon title and a grid of fields. */
export function FormSection({
  id,
  title,
  icon = 'info',
  cols = 3,
  actions,
  children,
}: FormSectionProps) {
  return (
    <section className="ui-fsec" data-section={id}>
      <div className="ui-fsec__head">
        <Icon name={icon} size={17} />
        <h3>{title}</h3>
        {actions && <span className="ui-fsec__actions">{actions}</span>}
      </div>
      <div className={cx('ui-fsec__grid', `ui-fsec__grid--${cols}`)}>{children}</div>
    </section>
  );
}

/** A smaller heading inside a FormSection (e.g. "Digital I/O"); spans the whole row. */
export function FormSubhead({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ui-fsec__sub">
      <b>{children}</b>
      {actions}
    </div>
  );
}

/** Makes a field span the whole row of a FormSection grid (or 2 columns; full width on phones). */
export function FullRow({ children, span }: { children: ReactNode; span?: 2 }) {
  return <div className={span === 2 ? 'ui-fsec__span2' : 'ui-fsec__full'}>{children}</div>;
}

// ---------------------------------------------------------------- RadioGroupField
export interface RadioGroupFieldProps {
  label: ReactNode;
  value: string | null | undefined;
  onChange?: (value: string) => void;
  options: { value: string; label: string }[];
  readOnly?: boolean;
  required?: boolean;
  name?: string;
}
/** A few choices side by side (e.g. Active / Inactive). */
export function RadioGroupField({
  label,
  value,
  onChange,
  options,
  readOnly,
  required,
  name,
}: RadioGroupFieldProps) {
  const auto = useId();
  return (
    <Field label={label} required={required}>
      <span className="ui-radios" role="radiogroup">
        {options.map((o) => (
          <label key={o.value} className="ui-radio">
            <input
              type="radio"
              name={name ?? auto}
              value={o.value}
              checked={value === o.value}
              disabled={readOnly}
              onChange={() => onChange?.(o.value)}
            />
            {o.label}
          </label>
        ))}
      </span>
    </Field>
  );
}

// ---------------------------------------------------------------- GeofenceMap
export interface GeofenceShape {
  id: string;
  name: string;
  shape: 'Circle' | 'Freeform';
  lat?: number | null;
  lng?: number | null;
  radiusM?: number | null;
  /** Freeform corners as [lat, lng]. */
  points?: [number, number][] | null;
}
export interface GeofenceMapProps {
  fences: GeofenceShape[];
  /** Ticked fences (drawn on the map). */
  selected: string[];
  onToggle?: (id: string) => void;
  /** When set, clicking the map picks a point (e.g. the centre of a new circle). */
  onPick?: (lat: number, lng: number) => void;
  /** The point picked so far, drawn as a pin. */
  picked?: { lat: number; lng: number; radiusM?: number } | null;
  readOnly?: boolean;
}

const KIND_ORDER: GeofenceShape['shape'][] = ['Circle', 'Freeform'];
/** Fence list on the left (grouped Circle / Freeform), schematic map on the right. */
export function GeofenceMap({
  fences,
  selected,
  onToggle,
  onPick,
  picked,
  readOnly,
}: GeofenceMapProps) {
  // Frame: every fence (or the picked point) with some margin; Riyadh when there is nothing.
  // Ticked fences fill the map; while picking a point the frame stays on every fence (steady).
  const ticked = fences.filter((f) => selected.includes(f.id));
  const framed = onPick || !ticked.length ? fences : ticked;
  const pts: [number, number][] = [];
  for (const f of framed) {
    if (f.shape === 'Circle' && f.lat != null && f.lng != null) {
      const d = (f.radiusM ?? 300) / 111000;
      pts.push([f.lat - d, f.lng - d], [f.lat + d, f.lng + d]);
    } else for (const p of f.points ?? []) pts.push(p);
  }
  if (picked) pts.push([picked.lat, picked.lng]);
  if (!pts.length) pts.push([24.68, 46.62], [24.8, 46.78]);
  let [minLat, maxLat] = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
  let [minLng, maxLng] = [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
  const pad = Math.max(maxLat - minLat, maxLng - minLng, 0.006) * 0.35;
  minLat -= pad;
  maxLat += pad;
  minLng -= pad;
  maxLng += pad;
  const W = 400;
  const H = 260;
  const span = Math.max(maxLat - minLat, (maxLng - minLng) * (H / W));
  const x = (lng: number) => ((lng - minLng) / (span * (W / H))) * W;
  const y = (lat: number) => H - ((lat - minLat) / span) * H;
  const r = (m: number) => (m / 111000 / span) * H;

  const shown = fences.filter((f) => selected.includes(f.id));
  const pick = (e: MouseEvent<SVGSVGElement>) => {
    if (!onPick || readOnly) return;
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const py = ((e.clientY - box.top) / box.height) * H;
    onPick(
      Math.round((minLat + ((H - py) / H) * span) * 1e5) / 1e5,
      Math.round((minLng + (px / W) * span * (W / H)) * 1e5) / 1e5,
    );
  };
  return (
    <div className="ui-geomap">
      <div className="ui-geomap__list">
        {KIND_ORDER.map((kind) => {
          const list = fences.filter((f) => f.shape === kind);
          return (
            <div key={kind}>
              <div className="ui-geomap__kind">
                {kind} <span>{list.length}</span>
              </div>
              {list.length ? (
                list.map((f) => (
                  <label key={f.id} className="ui-geomap__item">
                    <input
                      type="checkbox"
                      checked={selected.includes(f.id)}
                      disabled={readOnly}
                      onChange={() => onToggle?.(f.id)}
                    />
                    {f.name}
                  </label>
                ))
              ) : (
                <div className="ui-geomap__none">None yet</div>
              )}
            </div>
          );
        })}
      </div>
      <div className={cx('ui-geomap__map', onPick && !readOnly && 'is-picking')}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Map with ${shown.length} geofence${shown.length === 1 ? '' : 's'}`}
          onClick={pick}
        >
          <defs>
            <pattern id="ui-geogrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" className="ui-geomap__grid" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#ui-geogrid)" />
          {shown.map((f) =>
            f.shape === 'Circle' && f.lat != null && f.lng != null ? (
              <g key={f.id}>
                <circle
                  cx={x(f.lng)}
                  cy={y(f.lat)}
                  r={Math.max(r(f.radiusM ?? 300), 4)}
                  className="ui-geomap__fence"
                />
                <text x={x(f.lng)} y={y(f.lat)} className="ui-geomap__label">
                  {f.name}
                </text>
              </g>
            ) : f.points?.length ? (
              <g key={f.id}>
                <polygon
                  points={f.points.map(([la, ln]) => `${x(ln)},${y(la)}`).join(' ')}
                  className="ui-geomap__fence"
                />
                <text x={x(f.points[0]![1])} y={y(f.points[0]![0])} className="ui-geomap__label">
                  {f.name}
                </text>
              </g>
            ) : null,
          )}
          {picked && (
            <g>
              {picked.radiusM ? (
                <circle
                  cx={x(picked.lng)}
                  cy={y(picked.lat)}
                  r={Math.max(r(picked.radiusM), 4)}
                  className="ui-geomap__fence is-new"
                />
              ) : null}
              <circle cx={x(picked.lng)} cy={y(picked.lat)} r={4} className="ui-geomap__pin" />
            </g>
          )}
        </svg>
        {!shown.length && !picked && (
          <div className="ui-geomap__empty">
            <b>No geofence selected</b>
            Tick a fence on the left to draw it here
          </div>
        )}
        <span className="ui-geomap__note">Schematic map (prototype): no map tiles</span>
      </div>
    </div>
  );
}
