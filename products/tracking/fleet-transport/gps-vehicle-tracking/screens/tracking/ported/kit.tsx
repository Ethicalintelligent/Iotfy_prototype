// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import { portalRoot } from '../runtime';
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dropdown } from '../../smart-track/kit';
import { Icon } from '../icon';
import { hasFilters } from './rows';

export const FLOAT_MENU_CLASS = 'td-pop__menu--float';

export const matchesText = (e?: any, t?: any) => e.toLowerCase().includes(t.trim().toLowerCase());

export function PopSearch({
  value,
  onChange,
  label,
  placeholder = 'Search…',
  autoFocus = true,
}: any) {
  return (
    <label className="td-pop__search">
      <Icon name="Search" size={14} />
      <input
        type="search"
        value={value}
        onChange={(s?: any) => onChange(s.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        autoFocus={autoFocus}
      />
    </label>
  );
}

export let NUMBER_LOCALE: any;

export function formatNumber(e?: any) {
  return e == null ? '—' : typeof e == 'number' ? e.toLocaleString(NUMBER_LOCALE) : e;
}

export function Pill({ tone, children, dot = true, solid = false }: any) {
  return (
    <span className={`td-pill tone-${tone}${solid ? ' td-pill--solid' : ''}`}>
      {dot && <i className="td-dot" />}
      {children}
    </span>
  );
}

export function Avatar({ name, photo, tone = 'brand', size = 32 }: any) {
  if (photo) return <img className="td-avatar" src={photo} alt="" width={size} height={size} />;
  const i = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s?: any) => s[0])
    .join('')
    .toUpperCase();
  return (
    <span
      className={`td-avatar tone-${tone}`}
      style={
        {
          width: size,
          height: size,
          fontSize: size * 0.36,
        } as any
      }
    >
      {i || '?'}
    </span>
  );
}

export function Img({ src, alt, width, height, className = '', fallback }: any) {
  const [a, l] = useState<any>(null);
  return !src || a === src ? (
    <>{fallback}</>
  ) : (
    <img
      className={`td-img ${className}`}
      src={src}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      onError={() => l(src)}
    />
  );
}

export function VehicleThumb({ icon, size = 40 }: any) {
  return (
    <span
      className="td-vthumb"
      style={
        {
          width: size * 1.4,
          height: size,
        } as any
      }
    >
      <Icon name={icon} size={size * 0.62} strokeWidth={1.6} />
    </span>
  );
}

export function SearchBox({ id: e, value, onChange, placeholder, label = placeholder }: any) {
  return (
    <label className="td-gv__search">
      <Icon name="Search" size={15} />
      <input
        id={e}
        type="search"
        value={value}
        onChange={(s?: any) => onChange(s.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </label>
  );
}

export function Segmented({ options, value, onChange, size = 'md', label, arrows }: any) {
  const a = options.map((f?: any) =>
      typeof f == 'object'
        ? f
        : {
            id: f,
            label: String(f),
          },
    ),
    l = a.findIndex((f?: any) => f.id === value),
    c = (f?: any) => {
      const p = a[Math.min(a.length - 1, Math.max(0, l + f))];
      if (p) {
        onChange(p.id);
      }
    };
  return (
    <div className="td-seg-wrap">
      {arrows && (
        <button type="button" className="td-seg-arrow" onClick={() => c(-1)} aria-label="Previous">
          <Icon name="ChevronLeft" size={14} />
        </button>
      )}
      <div className={`td-seg td-seg--${size}`} role="tablist" aria-label={label}>
        {a.map((f?: any) => {
          const p = f.id === value;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={p}
              title={f.title}
              aria-label={f.label ? undefined : f.title}
              className={`td-seg__btn ${p ? 'is-active' : ''} ${f.icon && !f.label ? 'is-icon' : ''}`}
              onClick={() => onChange(f.id)}
            >
              {f.icon && <Icon name={f.icon} size={15} />}
              {f.label && <span>{f.label}</span>}
            </button>
          );
        })}
      </div>
      {arrows && (
        <button type="button" className="td-seg-arrow" onClick={() => c(1)} aria-label="Next">
          <Icon name="ChevronRight" size={14} />
        </button>
      )}
    </div>
  );
}

export function StatusSelect({
  id: e,
  icon = 'SlidersHorizontal',
  value,
  onChange,
  options,
  label,
}: any) {
  return (
    <Dropdown
      id={e}
      icon={icon}
      value={value}
      aria-label={label}
      onChange={onChange}
      options={options.map((a?: any) =>
        typeof a == 'string'
          ? {
              value: a,
              label: a,
            }
          : {
              value: a.id,
              label: a.label,
            },
      )}
    />
  );
}

export function Checkbox({ checked, mixed, onChange, children, className = '', style }: any) {
  const a = useRef<any>(null);
  useEffect(() => {
    if (a.current) {
      a.current.indeterminate = !!mixed && !checked;
    }
  }, [mixed, checked]);
  return (
    <label className={`td-check ${className}`} style={style as any}>
      <input
        ref={a}
        type="checkbox"
        checked={checked}
        onChange={(l?: any) => onChange(l.target.checked)}
      />
      {children}
    </label>
  );
}

export const identity = (e?: any) => e;

export function SidePanel({
  title,
  subtitle,
  icon = 'Plus',
  onClose,
  onReset,
  submitLabel,
  submitting,
  formId,
  level = 0,
  footer,
  nav,
  children,
}: any) {
  const A = useRef<any>(null);
  useEffect(() => {
    const v = (y?: any) => {
      if (y.key !== 'Escape') return;
      const g = document.querySelectorAll('.td-drawerx');
      if (g[g.length - 1] === A.current?.parentElement) {
        onClose();
      }
    };
    window.addEventListener('keydown', v);
    return () => window.removeEventListener('keydown', v);
  }, [onClose]);
  useEffect(() => {
    return A.current?.focus();
  }, []);
  return createPortal(
    <div
      className="td-drawerx"
      style={
        identity({
          '--level': level,
        }) as any
      }
    >
      <div className="td-drawerx__scrim" />
      <aside
        ref={A}
        className="td-drawerx__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="td-drawerx__head">
          <span className="td-drawerx__icon">
            <Icon name={icon} size={18} />
          </span>
          <div className="td-drawerx__titles">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="td-drawerx__close" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </button>
        </header>
        {nav}
        <div className="td-drawerx__body">{children}</div>
        {footer !== undefined ? (
          footer && <footer className="td-drawerx__foot">{footer}</footer>
        ) : (
          <footer className="td-drawerx__foot">
            <button
              type="button"
              className="td-btn td-btn--ghost td-drawerx__reset"
              onClick={onReset}
              disabled={submitting || !onReset}
            >
              Reset
            </button>
            <button
              type="submit"
              form={formId}
              className="td-btn td-btn--primary td-drawerx__submit"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : submitLabel}
            </button>
          </footer>
        )}
      </aside>
    </div>,
    portalRoot(),
  );
}

export const SEVERITIES: any = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export const SEVERITY_TONE: any = {
  CRITICAL: 'red',
  HIGH: 'orange',
  MEDIUM: 'amber',
  LOW: 'blue',
};

export const SEVERITY_LABEL: any = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export function normalSeverity(e?: any) {
  const t = e?.trim().toUpperCase();
  return t && SEVERITIES.includes(t) ? t : null;
}

export function SeverityPill({ value }: any) {
  const t = normalSeverity(value);
  return t ? (
    <Pill tone={SEVERITY_TONE[t]} dot={false}>
      {SEVERITY_LABEL[t]}
    </Pill>
  ) : null;
}

export function WidgetCard({
  widget,
  tone,
  actions,
  className = '',
  children,
  bodyClass = '',
}: any) {
  const {
    icon: a,
    title: l,
    subtitle: c,
    meta: f,
    filters: p,
    caps: h,
    period: A,
    fixedHeight: v,
  } = widget;
  return (
    <section
      className={`td-card ${v ? 'td-card--fixed' : ''} ${className} ${widget.className ?? ''}`}
      style={
        (v
          ? {
              height: v,
            }
          : undefined) as any
      }
    >
      <header className="td-card__head">
        {a && (
          <span className={`td-badge td-badge--solid tone-${tone || widget.tone || 'brand'}`}>
            <Icon name={a} size={16} />
          </span>
        )}
        <div className="td-card__titles">
          <h2 className={`td-card__title ${h ? 'is-caps' : ''}`}>{l}</h2>
          {c && <p className="td-card__sub">{c}</p>}
        </div>
        {(f || actions || p || A) && (
          <div className="td-card__right">
            {f && <span className="td-card__meta">{f}</span>}
            {p?.map((y?: any, g?: any) => (
              <HeaderSelect key={g} icon={y.icon} options={y.options} id={`${widget.id}-f${g}`} />
            ))}
            {actions}
            {A && <PeriodSelect id={widget.id} period={A} />}
          </div>
        )}
      </header>
      <div className={`td-card__body ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function PeriodSelect({ id: e, period }: any) {
  const n = period.liveId != null && period.value === period.liveId;
  return (
    <Dropdown
      id={`td-period-${e}`}
      className={`td-ddl--period ${n ? 'is-live' : ''}`}
      title={n ? 'Live data' : 'Past period: live updates paused'}
      icon={(n ? <i className="td-live-dot" aria-hidden="true" /> : 'CalendarDays') as any}
      aria-label="Date filter"
      value={period.value}
      onChange={period.onChange}
      options={period.options.map((r?: any) => ({
        value: r.id,
        label: r.label,
      }))}
    />
  );
}

export function HeaderSelect({ icon = 'CalendarDays', options, id: n }: any) {
  const [r, i] = useState<any>(options[0] ?? '');
  return (
    <Dropdown
      id={`td-dd-${n}`}
      icon={icon}
      aria-label={options[0]}
      value={r}
      onChange={i}
      options={options.map((s?: any) => ({
        value: s,
        label: s,
      }))}
    />
  );
}

export const ACTIVE_GRADIENT = 'var(--eit-active-gradient)';

export const ACTIVE_GLOW = '0 0 0 1.5px #03AD86, 0 0 10px rgba(3,173,134,.45)';

export function FilterButton({
  count = 0,
  open = false,
  onClick,
  title = 'Filters',
  className,
  size,
}: any) {
  const a = count > 0,
    l = a || open,
    c = size != null,
    f = l
      ? {
          bg: ACTIVE_GRADIENT,
          shadow: ACTIVE_GLOW,
          icon: '#fff',
          gap: a ? 5 : 3,
        }
      : {
          bg: '#E8F5EF',
          shadow: 'inset 0 0 0 1.5px #A9D8C3',
          icon: '#12955F',
          gap: 7,
        };
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      title={a ? `${title} (${count} applied)` : title}
      aria-label={title}
      aria-pressed={open}
      style={
        {
          position: c ? 'relative' : undefined,
          flexShrink: 0,
          width: c ? size : 44,
          height: c ? size : 26,
          boxSizing: 'border-box',
          border: 'none',
          borderRadius: c && size >= 32 ? 9 : 8,
          background: f.bg,
          boxShadow: f.shadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: f.gap,
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 700,
          color: l ? '#fff' : '#0B6E58',
          transition: 'background .15s ease, box-shadow .15s ease',
        } as any
      }
    >
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke={f.icon}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          {
            display: 'block',
            flexShrink: 0,
          } as any
        }
        aria-hidden="true"
      >
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
      </svg>
      {a && (
        <span
          style={
            {
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              width: 16,
              height: 16,
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              overflow: 'hidden',
              ...(c
                ? {
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    background: '#fff',
                    color: '#005965',
                    boxShadow: '0 0 0 1.5px #03AD86, 0 1px 3px rgba(1,29,50,.25)',
                  }
                : {
                    background: 'rgba(255,255,255,.22)',
                    color: '#fff',
                  }),
            } as any
          }
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

export function ThumbIcon({ icon, size = 40 }: any) {
  return <VehicleThumb icon={icon} size={size} />;
}

export function EntityMedia({ row, tone = 'brand', size = 36 }: any) {
  const r =
    typeof row.thumb == 'string' && row.thumb ? (
      <ThumbIcon icon={row.thumb} size={Math.round(size * 0.8)} />
    ) : (
      <Avatar
        name={row.name}
        photo={row.photo ? String(row.photo) : undefined}
        tone={tone}
        size={size}
      />
    );
  return typeof row.image != 'string' || !row.image ? (
    r
  ) : (
    <Img
      src={row.image}
      alt=""
      width={Math.round(size * 1.4)}
      height={size}
      className="td-entity-media"
      fallback={r}
    />
  );
}

export const POPOVER_GAP = 8;

export const firstButton = (e?: any) =>
  (e != null && e.matches('button') ? e : e?.querySelector('button')) ?? null;

export function usePopover({ open, anchor, section, onClose, keep }: any) {
  const [s, a] = useState<any>(null),
    [l, c] = useState<any>(null),
    f = useRef<any>(onClose);
  f.current = onClose;
  const p = useRef<any>(section);
  p.current = section;
  useLayoutEffect(() => {
    if (!open) {
      c(null);
      return;
    }
    const h = () => {
      const y = anchor.current;
      if (!y) return;
      const g = y.getBoundingClientRect(),
        E = (p.current?.() ?? y).getBoundingClientRect(),
        b = document.documentElement.clientWidth,
        w = window.innerHeight,
        x = s?.offsetWidth ?? 0,
        S = s?.scrollHeight ?? 0,
        W = w - 2 * POPOVER_GAP,
        O = g.left + g.width / 2 < b / 2;
      let C = O ? 'right' : 'left',
        k = O ? E.right + POPOVER_GAP : E.left - POPOVER_GAP - x,
        z = E.top;
      if (k < POPOVER_GAP || k + x > b - POPOVER_GAP) {
        {
          C = 'below';
          z = g.bottom + POPOVER_GAP;
          k = O ? g.left : g.right - x;
        }
      }
      const B: any = {
        side: C,
        left: Math.round(Math.max(POPOVER_GAP, Math.min(k, b - POPOVER_GAP - x))),
        top: Math.round(Math.max(POPOVER_GAP, Math.min(z, w - POPOVER_GAP - S))),
        maxHeight: S >= W ? W : undefined,
      };
      c((G?: any) =>
        G &&
        G.side === B.side &&
        G.left === B.left &&
        G.top === B.top &&
        G.maxHeight === B.maxHeight
          ? G
          : B,
      );
    };
    h();
    const A = new MutationObserver(h),
      v = typeof ResizeObserver > 'u' ? null : new ResizeObserver(h);
    if (s) {
      {
        A.observe(s, {
          childList: true,
          subtree: true,
        });
        if (!(v == null)) {
          v.observe(s);
        }
      }
    }
    window.addEventListener('resize', h);
    window.addEventListener('scroll', h, true);
    return () => {
      A.disconnect();
      if (!(v == null)) {
        v.disconnect();
      }
      window.removeEventListener('resize', h);
      window.removeEventListener('scroll', h, true);
    };
  }, [open, anchor, s]);
  useEffect(() => {
    if (!open) return;
    const h = firstButton(anchor.current),
      A = (y?: any) => {
        var E: any, b: any;
        const g = y.target;
        if (!(
          !g ||
          (s != null && s.contains(g)) ||
          ((E = anchor.current) != null && E.contains(g)) ||
          (keep && (b = g.closest) != null && b.call(g, keep))
        )) {
          f.current();
        }
      },
      v = (y?: any) => {
        if (y.key === 'Escape') {
          f.current();
        }
      };
    document.addEventListener('pointerdown', A);
    document.addEventListener('keydown', v);
    return () => {
      document.removeEventListener('pointerdown', A);
      document.removeEventListener('keydown', v);
      requestAnimationFrame(() => {
        if (!document.activeElement || document.activeElement === document.body) {
          if (!(h == null)) {
            h.focus();
          }
        }
      });
    };
  }, [open, anchor, s, keep]);
  return {
    ref: a,
    side: l?.side ?? null,
    style: l
      ? {
          position: 'fixed',
          top: l.top,
          left: l.left,
          maxHeight: l.maxHeight,
          overflowY: l.maxHeight ? 'auto' : undefined,
          zIndex: 1200,
        }
      : {
          position: 'fixed',
          top: 0,
          left: 0,
          visibility: 'hidden',
          zIndex: 1200,
        },
  };
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder,
  id: s,
  disabled,
  title,
  ...c
}: any) {
  const f = useRef<any>(null),
    p = useRef<any>(null),
    [h, A] = useState<any>(null),
    [v, y] = useState<any>(''),
    g = new Set<any>(value),
    E = (G?: any) => {
      return options.find((Z?: any) => Z.value === G)?.label ?? G;
    },
    b = options.filter((G?: any) => matchesText(G.label, v)),
    w = b.filter((G?: any) => g.has(G.value)).length,
    x = () => {
      const G = f.current?.getBoundingClientRect();
      if (!G) return;
      const $ = window.innerHeight - G.bottom - 12,
        Z = $ < 320 && G.top - 12 > $;
      A({
        ...(Z
          ? {
              bottom: window.innerHeight - G.top + 4,
            }
          : {
              top: G.bottom + 4,
            }),
        left: G.right - 272,
      });
      y('');
    },
    S = (G: any = false) => {
      var $: any;
      A(null);
      if (G) {
        if (!(($ = f.current) == null)) {
          $.focus();
        }
      }
    };
  useLayoutEffect(() => {
    const G = p.current;
    if (!h || !G) return;
    const $ = G.getBoundingClientRect();
    if ($.left < 8) {
      G.style.left = '8px';
    } else {
      if ($.right > window.innerWidth - 8) {
        G.style.left = `${Math.max(8, window.innerWidth - 8 - $.width)}px`;
      }
    }
  }, [h]);
  useEffect(() => {
    var P: any;
    if (!h) return;
    const G = (H?: any) => {
        var Y: any, te: any;
        return (
          !((Y = p.current) != null && Y.contains(H.target)) &&
          !((te = f.current) != null && te.contains(H.target))
        );
      },
      $ = (H?: any) => {
        if (G(H)) {
          S();
        }
      },
      Z = () => S();
    document.addEventListener('pointerdown', $, true);
    document.addEventListener('scroll', $, true);
    window.addEventListener('resize', Z);
    if (!((P = p.current?.querySelector('input[type=search]')) == null)) {
      P.focus();
    }
    return () => {
      document.removeEventListener('pointerdown', $, true);
      document.removeEventListener('scroll', $, true);
      window.removeEventListener('resize', Z);
    };
  }, [h]);
  const W = (G?: any) =>
      onChange(options.map(($?: any) => $.value).filter(($?: any) => G.includes($))),
    O = (G?: any, $?: any) => W($ ? [...value, G] : value.filter((Z?: any) => Z !== G)),
    C = (G?: any) => {
      const $ = b.map((Z?: any) => Z.value);
      W(G ? [...new Set<any>([...value, ...$])] : value.filter((Z?: any) => !$.includes(Z)));
    },
    k = (G?: any) => {
      if (G.key === 'Escape') {
        {
          G.preventDefault();
          G.stopPropagation();
          S(true);
        }
      }
    },
    z = value[0],
    B = z === undefined ? placeholder : value.length === 1 ? E(z) : `${E(z)} +${value.length - 1}`,
    J = ['td-ddl', 'td-ddl--block', !value.length && 'is-placeholder', h && 'is-open']
      .filter(Boolean)
      .join(' ');
  return (
    <>
      <button
        ref={f}
        type="button"
        id={s}
        className={J}
        disabled={disabled}
        title={title ?? (value.length > 1 ? value.map(E).join(', ') : undefined)}
        aria-haspopup="dialog"
        aria-expanded={h !== null}
        {...c}
        onClick={() => (h ? S() : x())}
        onKeyDown={(G?: any) => {
          if (!h && (G.key === 'ArrowDown' || G.key === 'ArrowUp')) {
            {
              G.preventDefault();
              x();
            }
          }
        }}
      >
        <span className="td-ddl__label">{B}</span>
        <Icon name="ChevronDown" size={15} className="td-ddl__chev" />
      </button>
      {h &&
        createPortal(
          <div
            ref={p}
            className={`td-msel ${FLOAT_MENU_CLASS}`}
            role="dialog"
            aria-label={c['aria-label']}
            style={
              {
                top: h.top,
                bottom: h.bottom,
                left: h.left,
              } as any
            }
            onKeyDown={k}
            onBlur={(G?: any) => {
              var Z: any;
              const $ = G.relatedTarget;
              if ($ && !((Z = p.current) != null && Z.contains($)) && $ !== f.current) {
                S();
              }
            }}
          >
            <PopSearch
              value={v}
              onChange={y}
              label={searchPlaceholder ?? 'Search'}
              placeholder={searchPlaceholder ?? 'Search…'}
              autoFocus={false}
            />
            <div className="td-msel__list">
              {b.length > 0 && (
                <Checkbox
                  className="td-msel__all"
                  checked={w === b.length}
                  mixed={w > 0}
                  onChange={C}
                >
                  <b>Select all</b>
                </Checkbox>
              )}
              {b.map((G?: any) => (
                <Checkbox
                  key={G.value}
                  checked={g.has(G.value)}
                  onChange={($?: any) => O(G.value, $)}
                >
                  <span className="td-msel__label" title={G.label}>
                    {G.label}
                  </span>
                </Checkbox>
              ))}
              {!b.length && <span className="td-msel__none">No results found</span>}
            </div>
            <div className="td-msel__foot">
              <span>
                {value.length}
                {' selected'}
              </span>
              <button type="button" className="td-btn td-btn--primary" onClick={() => S(true)}>
                Done
              </button>
            </div>
          </div>,
          portalRoot(),
        )}
    </>
  );
}

export function TreeChecklist({
  id: e,
  label,
  placeholder,
  groups,
  selected,
  onChange,
  hideLabel,
  counts,
  className = '',
}: any) {
  const [f, p] = useState<any>(''),
    [h, A] = useState<any>({}),
    v = f.trim().toLowerCase(),
    y = groups.flatMap((S?: any) => S.items.map((W?: any) => W.id)),
    g = groups
      .map((S?: any) => {
        var W: any;
        return {
          ...S,
          items:
            !v || ((W = S.label) != null && W.toLowerCase().includes(v))
              ? S.items
              : S.items.filter((O?: any) => O.label.toLowerCase().includes(v)),
        };
      })
      .filter((S?: any) => S.items.length),
    E = (S?: any) => S.filter((W?: any) => selected.has(W)).length,
    b = (S?: any, W?: any) => {
      const O = new Set<any>(selected);
      S.forEach((C?: any) => (W ? O.add(C) : O.delete(C)));
      onChange(O);
    },
    w = g.flatMap((S?: any) => S.items.map((W?: any) => W.id)),
    x = E(w);
  return (
    <fieldset className={`td-afilter__field td-afilter__tree ${className}`}>
      <legend className={hideLabel ? 'td-sr' : undefined}>{label}</legend>
      <SearchBox id={`${e}-q`} value={f} onChange={p} placeholder={placeholder} />
      <div className="td-afilter__list">
        {w.length > 0 && (
          <Checkbox
            className="is-all"
            checked={x === w.length}
            mixed={x > 0}
            onChange={(S?: any) => b(w, S)}
          >
            {counts ? (
              <>
                <b>Select all</b>
                <small>
                  {formatNumber(x)}
                  {' / '}
                  {formatNumber(w.length)}
                </small>
              </>
            ) : (
              <b>Select All</b>
            )}
          </Checkbox>
        )}
        {g.map((S?: any) => {
          const W = S.items.map((z?: any) => z.id),
            O = E(W),
            C = v || !h[S.id],
            k =
              C &&
              S.items.map((z?: any) => (
                <Checkbox
                  key={z.id}
                  className={S.label ? 'is-leaf' : ''}
                  checked={selected.has(z.id)}
                  onChange={(B?: any) => b([z.id], B)}
                >
                  {z.label}
                </Checkbox>
              ));
          return S.label ? (
            <div key={S.id} className="td-afilter__group">
              <div className="td-afilter__group-head">
                <button
                  type="button"
                  className="td-afilter__twist"
                  aria-expanded={!!C}
                  aria-label={`${C ? 'Collapse' : 'Expand'} ${S.label}`}
                  onClick={() =>
                    A((z?: any) => ({
                      ...z,
                      [S.id]: !z[S.id],
                    }))
                  }
                >
                  <Icon name={C ? 'ChevronDown' : 'ChevronRight'} size={13} />
                </button>
                <Checkbox checked={O === W.length} mixed={O > 0} onChange={(z?: any) => b(W, z)}>
                  <b>{S.label}</b>
                </Checkbox>
                <small>
                  {counts ? `${formatNumber(O)} / ${formatNumber(W.length)}` : S.items.length}
                </small>
              </div>
              {k}
            </div>
          ) : (
            <div key={S.id}>{k}</div>
          );
        })}
        {!w.length && (
          <p className="td-afilter__none">
            {v ? `Nothing matches “${f}”.` : 'Nothing to choose from.'}
          </p>
        )}
      </div>
      {y.length > 0 && E(y) === 0 && <small className="td-afilter__warn">Pick at least one.</small>}
    </fieldset>
  );
}

export function ListFilters({ id: e, fields, values, onChange, stacked = false }: any) {
  return (
    <div className={`gp-lfilters ${stacked ? 'is-stacked' : ''}`} role="group" aria-label="Filters">
      {fields.map((s?: any) => (
        <div key={s.id} className="td-field">
          <label htmlFor={`${e}-${s.id}`}>{s.label}</label>
          <Dropdown
            block={true}
            id={`${e}-${s.id}`}
            value={values[s.id] ?? ''}
            placeholder="All"
            options={s.options}
            disabled={!s.options.length}
            title={s.options.length ? undefined : `No ${s.label.toLowerCase()} recorded yet`}
            onChange={(a?: any) =>
              onChange({
                ...values,
                [s.id]: a,
              })
            }
          />
        </div>
      ))}
      {hasFilters(values) && (
        <button type="button" className="td-link gp-lfilters__clear" onClick={() => onChange({})}>
          Clear filters
        </button>
      )}
    </div>
  );
}
