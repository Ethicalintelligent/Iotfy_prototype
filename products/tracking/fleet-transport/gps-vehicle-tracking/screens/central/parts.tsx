// IT-0036. Small pieces of the original page, same markup and class names: pill, image, segmented
// tabs, confirm, toast, search box, multi-select, checkbox tree, speed gauge, share pop-up.
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon, usePortalRoot } from '../smart-track/kit';

const FLOAT = 'td-pop__menu--float';
/** True for clicks inside a floating pop-up (they must not close the filter panels). */
export const inFloating = (t: EventTarget | null) =>
  t instanceof Element && t.closest(`.${FLOAT}`) !== null;
const matches = (label: string, q: string) => label.toLowerCase().includes(q.trim().toLowerCase());

export function Pill({
  tone,
  children,
  dot = true,
  solid = false,
}: {
  tone: string;
  children: ReactNode;
  dot?: boolean;
  solid?: boolean;
}) {
  return (
    <span className={`td-pill tone-${tone}${solid ? ' td-pill--solid' : ''}`}>
      {dot && <i className="td-dot" />}
      {children}
    </span>
  );
}

export function Img({
  src,
  alt,
  width,
  height,
  className = '',
  fallback,
}: {
  src?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallback: ReactNode;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  return !src || broken === src ? (
    <>{fallback}</>
  ) : (
    <img
      className={`td-img ${className}`}
      src={src}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      onError={() => setBroken(src)}
    />
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  label,
}: {
  options: { id: T; label: string; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: string;
  label: string;
}) {
  return (
    <div className="td-seg-wrap">
      <div className={`td-seg td-seg--${size}`} role="tablist" aria-label={label}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`td-seg__btn ${on ? 'is-active' : ''} ${o.icon && !o.label ? 'is-icon' : ''}`}
              onClick={() => onChange(o.id)}
            >
              {o.icon && <Icon name={o.icon} size={15} />}
              {o.label && <span>{o.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Confirm({
  title,
  message,
  icon = 'Trash',
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  icon?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const portal = usePortalRoot();
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onCancel, portal]);
  if (!portal) return null;
  return createPortal(
    <div className="td-confirm">
      <div className="td-confirm__scrim" onClick={onCancel} />
      <div
        className="td-confirm__box"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="td-confirm-title"
        aria-describedby="td-confirm-msg"
      >
        <div className="td-confirm__head">
          <span className="td-confirm__icon">
            <Icon name={icon} size={17} />
          </span>
          <h2 id="td-confirm-title">{title}</h2>
        </div>
        <p id="td-confirm-msg">{message}</p>
        <div className="td-confirm__actions">
          <button ref={cancel} type="button" className="td-btn td-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="td-btn td-confirm__danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    portal,
  );
}

export function useToast(ms = 3500) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => setText(null), ms);
    return () => clearTimeout(t);
  }, [text, ms]);
  return {
    show: setText,
    node: text ? (
      <div className="td-toast" role="status">
        <Icon name="CircleCheck" size={16} />
        {text}
      </div>
    ) : null,
  };
}

export function SearchBox({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="td-gv__search">
      <Icon name="Search" size={15} />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}

export function Check({
  checked,
  mixed,
  onChange,
  children,
  className = '',
}: {
  checked: boolean;
  mixed?: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!mixed && !checked;
  }, [mixed, checked]);
  return (
    <label className={`td-check ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

/** Multi-select drop-down with search, "Select all" and Done (original: Vq). */
export function MultiSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder,
  disabled,
  title,
  'aria-label': ariaLabel,
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  title?: string;
  'aria-label': string;
}) {
  const portal = usePortalRoot();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [q, setQ] = useState('');
  const picked = new Set(value);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const shown = options.filter((o) => matches(o.label, q));
  const shownPicked = shown.filter((o) => picked.has(o.value)).length;
  const open = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const up = below < 320 && r.top - 12 > below;
    setPos({
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      left: r.right - 272,
    });
    setQ('');
  };
  const close = (focus = false) => {
    setPos(null);
    if (focus) btn.current?.focus();
  };
  useLayoutEffect(() => {
    const el = pop.current;
    if (!pos || !el) return;
    const r = el.getBoundingClientRect();
    if (r.left < 8) el.style.left = '8px';
    else if (r.right > window.innerWidth - 8)
      el.style.left = `${Math.max(8, window.innerWidth - 8 - r.width)}px`;
  }, [pos]);
  useEffect(() => {
    if (!pos) return;
    const outside = (e: Event) =>
      !pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node);
    const down = (e: Event) => outside(e) && close();
    const resize = () => close();
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('scroll', down, true);
    window.addEventListener('resize', resize);
    pop.current?.querySelector<HTMLInputElement>('input[type=search]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('scroll', down, true);
      window.removeEventListener('resize', resize);
    };
  }, [pos]);
  const set = (vals: string[]) =>
    onChange(options.map((o) => o.value).filter((v) => vals.includes(v)));
  const first = value[0];
  const text =
    first === undefined
      ? placeholder
      : value.length === 1
        ? labelOf(first)
        : `${labelOf(first)} +${value.length - 1}`;
  const cls = ['td-ddl', 'td-ddl--block', !value.length && 'is-placeholder', pos && 'is-open']
    .filter(Boolean)
    .join(' ');
  return (
    <>
      <button
        ref={btn}
        type="button"
        id={id}
        className={cls}
        disabled={disabled}
        title={title ?? (value.length > 1 ? value.map(labelOf).join(', ') : undefined)}
        aria-haspopup="dialog"
        aria-expanded={pos !== null}
        aria-label={ariaLabel}
        onClick={() => (pos ? close() : open())}
        onKeyDown={(e) => {
          if (!pos && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            open();
          }
        }}
      >
        <span className="td-ddl__label">{text}</span>
        <Icon name="ChevronDown" size={15} className="td-ddl__chev" />
      </button>
      {pos &&
        portal &&
        createPortal(
          <div
            ref={pop}
            className={`td-msel ${FLOAT}`}
            role="dialog"
            aria-label={ariaLabel}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close(true);
              }
            }}
          >
            <label className="td-pop__search">
              <Icon name="Search" size={14} />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder ?? 'Search…'}
                aria-label={searchPlaceholder ?? 'Search'}
                autoComplete="off"
              />
            </label>
            <div className="td-msel__list">
              {shown.length > 0 && (
                <Check
                  className="td-msel__all"
                  checked={shownPicked === shown.length}
                  mixed={shownPicked > 0}
                  onChange={(all) => {
                    const ids = shown.map((o) => o.value);
                    set(
                      all
                        ? [...new Set([...value, ...ids])]
                        : value.filter((v) => !ids.includes(v)),
                    );
                  }}
                >
                  <b>Select all</b>
                </Check>
              )}
              {shown.map((o) => (
                <Check
                  key={o.value}
                  checked={picked.has(o.value)}
                  onChange={(c) =>
                    set(c ? [...value, o.value] : value.filter((v) => v !== o.value))
                  }
                >
                  <span className="td-msel__label" title={o.label}>
                    {o.label}
                  </span>
                </Check>
              ))}
              {!shown.length && <span className="td-msel__none">No results found</span>}
            </div>
            <div className="td-msel__foot">
              <span>{value.length} selected</span>
              <button type="button" className="td-btn td-btn--primary" onClick={() => close(true)}>
                Done
              </button>
            </div>
          </div>,
          portal,
        )}
    </>
  );
}

export interface TreeGroup {
  id: string;
  label: string;
  items: { id: string; label: string }[];
}

/** Grouped checkbox list with search (original: Zq). */
export function CheckTree({
  id,
  label,
  placeholder,
  groups,
  selected,
  onChange,
  className = '',
}: {
  id: string;
  label: string;
  placeholder: string;
  groups: TreeGroup[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
  className?: string;
}) {
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const needle = q.trim().toLowerCase();
  const every = groups.flatMap((g) => g.items.map((i) => i.id));
  const shown = groups
    .map((g) => ({
      ...g,
      items:
        !needle || g.label?.toLowerCase().includes(needle)
          ? g.items
          : g.items.filter((i) => i.label.toLowerCase().includes(needle)),
    }))
    .filter((g) => g.items.length);
  const countIn = (ids: string[]) => ids.filter((x) => selected.has(x)).length;
  const set = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((x) => (on ? next.add(x) : next.delete(x)));
    onChange(next);
  };
  const shownIds = shown.flatMap((g) => g.items.map((i) => i.id));
  const shownOn = countIn(shownIds);
  return (
    <fieldset className={`td-afilter__field td-afilter__tree ${className}`}>
      <legend className="td-sr">{label}</legend>
      <SearchBox id={`${id}-q`} value={q} onChange={setQ} placeholder={placeholder} />
      <div className="td-afilter__list">
        {shownIds.length > 0 && (
          <Check
            className="is-all"
            checked={shownOn === shownIds.length}
            mixed={shownOn > 0}
            onChange={(v) => set(shownIds, v)}
          >
            <b>Select All</b>
          </Check>
        )}
        {shown.map((g) => {
          const ids = g.items.map((i) => i.id);
          const on = countIn(ids);
          const open = needle || !closed[g.id];
          const leaves =
            open &&
            g.items.map((i) => (
              <Check
                key={i.id}
                className={g.label ? 'is-leaf' : ''}
                checked={selected.has(i.id)}
                onChange={(v) => set([i.id], v)}
              >
                {i.label}
              </Check>
            ));
          return g.label ? (
            <div key={g.id} className="td-afilter__group">
              <div className="td-afilter__group-head">
                <button
                  type="button"
                  className="td-afilter__twist"
                  aria-expanded={!!open}
                  aria-label={`${open ? 'Collapse' : 'Expand'} ${g.label}`}
                  onClick={() => setClosed((c) => ({ ...c, [g.id]: !c[g.id] }))}
                >
                  <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={13} />
                </button>
                <Check checked={on === ids.length} mixed={on > 0} onChange={(v) => set(ids, v)}>
                  <b>{g.label}</b>
                </Check>
                <small>{g.items.length}</small>
              </div>
              {leaves}
            </div>
          ) : (
            <div key={g.id}>{leaves}</div>
          );
        })}
        {!shownIds.length && (
          <p className="td-afilter__none">
            {needle ? `Nothing matches “${q}”.` : 'Nothing to choose from.'}
          </p>
        )}
      </div>
      {every.length > 0 && countIn(every) === 0 && (
        <small className="td-afilter__warn">Pick at least one.</small>
      )}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ speed gauge (original: w2, inline styles kept) */

const GAUGE: Record<
  string,
  {
    c1: string;
    c2: string;
    light: string;
    glow: string;
    shadeA: string;
    shadeB: string;
    ring: string;
  }
> = {
  running: {
    c1: '#009863',
    c2: '#005965',
    light: '#BDEBD9',
    glow: 'rgba(0,152,99,.35)',
    shadeA: '#83E4B2',
    shadeB: '#C7F3DC',
    ring: '#009863',
  },
  stop: {
    c1: '#FF8887',
    c2: '#F90507',
    light: '#FFD2D3',
    glow: 'rgba(249,5,7,.3)',
    shadeA: '#FF9A9C',
    shadeB: '#FFD9DA',
    ring: '#FF8887',
  },
  idle: {
    c1: '#74AAFF',
    c2: '#0363FF',
    light: '#CFE0FF',
    glow: 'rgba(3,99,255,.3)',
    shadeA: '#8DB6FF',
    shadeB: '#D3E3FF',
    ring: '#74AAFF',
  },
  overspeed: {
    c1: '#F98007',
    c2: '#F76C09',
    light: '#FFE0C2',
    glow: 'rgba(247,108,9,.32)',
    shadeA: '#FFB877',
    shadeB: '#FFE3C9',
    ring: '#FFA36B',
  },
  towed: {
    c1: '#3ECFCF',
    c2: '#07B1B4',
    light: '#C8F1F1',
    glow: 'rgba(7,177,180,.32)',
    shadeA: '#86E3E3',
    shadeB: '#CFF5F5',
    ring: '#6FE0E0',
  },
  notrans: {
    c1: '#2B333C',
    c2: '#0B1116',
    light: '#D5D9DE',
    glow: 'rgba(11,17,22,.28)',
    shadeA: '#8A939D',
    shadeB: '#D5D9DE',
    ring: '#4A5560',
  },
  ytt: {
    c1: '#A9B4C0',
    c2: '#8D99A8',
    light: '#E3E7EC',
    glow: 'rgba(141,153,168,.3)',
    shadeA: '#C3CBD4',
    shadeB: '#E6E9ED',
    ring: '#C3CBD4',
  },
};
const GAUGE_KIND: Record<string, string> = {
  running: 'running',
  stopped: 'stop',
  stop: 'stop',
  idle: 'idle',
  overspeed: 'overspeed',
  towed: 'towed',
  notrans: 'notrans',
  'no transmit': 'notrans',
  ytt: 'ytt',
  'yet to transmit': 'ytt',
};
const GAUGE_LABEL: Record<string, string> = {
  running: 'Running',
  stop: 'Stopped',
  idle: 'Idle',
  overspeed: 'Overspeed',
  towed: 'Towed',
  notrans: 'No Transmit',
  ytt: 'Yet to Transmit',
};
const GAUGE_MOVING = new Set(['running', 'overspeed', 'towed']);

export function SpeedGauge({
  speed,
  status,
  max = 200,
  width = 160,
  badgeStyle = 'default',
  style,
}: {
  speed: number;
  status: string;
  max?: number;
  width?: number;
  badgeStyle?: 'default' | 'playback';
  style?: CSSProperties;
}) {
  const pb = badgeStyle === 'playback';
  const M = pb
    ? { s: 59.35, l: 50.32, t: 50.32, val: 21, lab: 11.6 }
    : { s: 52, l: 54, t: 54, val: 18, lab: 10 };
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const kind =
    GAUGE_KIND[
      String(status ?? 'running')
        .trim()
        .toLowerCase()
    ] ?? 'running';
  const c = GAUGE[kind]!;
  const raw = Math.max(0, Math.round(Number.isNaN(speed) ? 0 : speed));
  const v = GAUGE_MOVING.has(kind) ? raw : 0;
  const f = Math.min(max, v) / max;
  const dash = `${(f * 100).toFixed(2)} 101`;
  const rot = (f * 216 - 108).toFixed(2);
  const step = max / 8;
  const ticks = Array.from({ length: 9 }, (_, i) => {
    const a = ((198 - 27 * i) * Math.PI) / 180;
    return {
      x1: 80 + 51 * Math.cos(a),
      y1: 72 - 51 * Math.sin(a),
      x2: 80 + 56 * Math.cos(a),
      y2: 72 - 56 * Math.sin(a),
      color: i * step <= v && v > 0 ? c.c1 : '#4A5568',
    };
  });
  const marks = [
    { x: 40.06, y: 84.98, v: 0 },
    { x: 46.02, y: 47.3, v: max / 4 },
    { x: 80, y: 30, v: max / 2 },
    { x: 113.98, y: 47.3, v: (max * 3) / 4 },
    { x: 119.94, y: 84.98, v: max },
  ];
  const scale = width / 160;
  const ease = '.4s ease';
  const arc = 'M 19.13 91.78 A 64 64 0 1 1 140.87 91.78';
  return (
    <div
      title={`Status: ${GAUGE_LABEL[kind]} · ${v} km/hr`}
      role="img"
      aria-label={`Speed ${v} km/hr, status ${GAUGE_LABEL[kind]}`}
      style={{ position: 'relative', width, height: 112 * scale, flexShrink: 0, ...style }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 160,
          height: 112,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <svg
          viewBox="0 0 160 112"
          width={160}
          height={112}
          style={{ display: 'block', overflow: 'visible' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`spd-arc-${id}`}
              gradientUnits="userSpaceOnUse"
              x1="19"
              y1="92"
              x2="125"
              y2="10"
            >
              <stop offset="0" stopColor={c.light} stopOpacity={0.35} />
              <stop offset="0.55" stopColor={c.c1} stopOpacity={0.85} />
              <stop offset="1" stopColor={c.c1} />
            </linearGradient>
            <linearGradient
              id={`spd-wedge-${id}`}
              gradientUnits="userSpaceOnUse"
              x1="112"
              y1="10"
              x2="22"
              y2="100"
            >
              <stop offset="0" stopColor={c.shadeA} stopOpacity={0.3} />
              <stop offset="1" stopColor={c.shadeB} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <path
            d="M 51.95 81.12 A 29.5 29.5 0 1 1 108.05 81.12"
            pathLength={100}
            fill="none"
            stroke={`url(#spd-wedge-${id})`}
            strokeWidth={58}
            style={{ strokeDasharray: dash, transition: `stroke-dasharray ${ease}` }}
          />
          <path d={arc} fill="none" stroke="#E6E9ED" strokeWidth={9} strokeLinecap="round" />
          <path
            d={arc}
            pathLength={100}
            fill="none"
            stroke={`url(#spd-arc-${id})`}
            strokeWidth={9}
            strokeLinecap="round"
            style={{ strokeDasharray: dash, transition: `stroke-dasharray ${ease}` }}
          />
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1.toFixed(2)}
              y1={t.y1.toFixed(2)}
              x2={t.x2.toFixed(2)}
              y2={t.y2.toFixed(2)}
              stroke={t.color}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          ))}
          <g
            fill="#3D4A5C"
            fontSize={9}
            fontWeight={500}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {marks.map((m) => (
              <text key={m.v} x={m.x} y={m.y}>
                {Math.round(m.v)}
              </text>
            ))}
          </g>
          <g
            style={{
              transformOrigin: '80px 72px',
              transform: `rotate(${rot}deg)`,
              transition: `transform ${ease}`,
            }}
          >
            <path
              d="M80 17 L86 4.5 L74 4.5 Z"
              fill={c.c2}
              stroke="#fff"
              strokeWidth={1}
              strokeLinejoin="round"
            />
          </g>
        </svg>
        <div
          style={{
            position: 'absolute',
            left: M.l,
            top: M.t,
            width: M.s,
            height: M.s,
            boxSizing: 'border-box',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${c.c1} 0%, ${c.c2} 100%)`,
            boxShadow: pb
              ? `inset 0 0 0 2px ${c.ring}, 0 6px 14px ${c.glow}`
              : `0 0 0 3px #fff, 0 6px 14px ${c.glow}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            transition: 'background .3s ease',
            textShadow: '0 1px 2px rgba(1,29,50,.35)',
            fontFamily:
              "'Instrument Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          <span
            style={{
              fontSize: M.val,
              lineHeight: 1.1,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {v}
          </span>
          <span style={{ fontSize: M.lab, lineHeight: 1.2, fontWeight: 400 }}>km/hr</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ share (original: hC) */

const enc = encodeURIComponent;

export function Share({ subject, mode }: { subject: string; mode: 'live' | 'history' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const url = window.location.href;
  const text = `EIT Track · ${subject} · ${mode === 'live' ? 'Live tracking' : 'History playback'}`;
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', down);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      window.removeEventListener('keydown', key);
    };
  }, [open]);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = () => {
    const done = () => setCopied(true);
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done);
    else done();
  };
  const apps = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: 'MessageCircle',
      href: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
      external: true,
    },
    {
      id: 'email',
      label: 'Email',
      icon: 'Mail',
      href: `mailto:?subject=${enc(text)}&body=${enc(url)}`,
      external: false,
    },
    {
      id: 'sms',
      label: 'SMS',
      icon: 'MessageSquare',
      href: `sms:?&body=${enc(`${text} ${url}`)}`,
      external: false,
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: 'Send',
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
      external: true,
    },
  ];
  return (
    <div ref={box} className="mt-share">
      <button
        type="button"
        className={`mt-icon-btn ${open ? 'is-on' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Share"
        title="Share"
        onClick={() => {
          setOpen((o) => !o);
          setCopied(false);
        }}
      >
        <Icon name="Share2" size={14} />
      </button>
      {open && (
        <div className="mt-share__pop" role="dialog" aria-label={`Share ${subject}`}>
          <div className="mt-share__head">
            <span>
              <strong>Share tracking</strong>
              <small>{subject}</small>
            </span>
            <button
              type="button"
              className="mt-icon-btn mt-icon-btn--sm"
              aria-label="Close share"
              onClick={() => setOpen(false)}
            >
              <Icon name="X" size={12} />
            </button>
          </div>
          <div className="mt-share__link">
            <span title={url}>{url}</span>
            <button type="button" className={copied ? 'is-done' : ''} onClick={copy}>
              <Icon name={copied ? 'Check' : 'Copy'} size={12} />
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <div className="mt-share__apps">
            {apps.map((a) => (
              <a
                key={a.id}
                href={a.href}
                className={`mt-share__app is-${a.id}`}
                onClick={() => setOpen(false)}
                {...(a.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <span>
                  <Icon name={a.icon} size={16} />
                </span>
                {a.label}
              </a>
            ))}
          </div>
          <p className="mt-share__note">
            Opening the link needs sign-in with access to this vehicle.
          </p>
        </div>
      )}
    </div>
  );
}

/** Empty state inside a map tile (original: mu). */
export function Empty({
  icon,
  title,
  text,
  children,
}: {
  icon: string;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="td-trk__empty">
      <span className="td-badge td-badge--xl">
        <Icon name={icon} size={22} />
      </span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

export const cssVars = (v: Record<string, string>) => v as CSSProperties;
