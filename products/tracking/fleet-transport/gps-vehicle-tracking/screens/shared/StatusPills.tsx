// IT-0053 (Heeba's approved prototype IT-0046): the open status pills in the IoTIFY header row, shared
// by Grid View, Map View and Tracking (part of this product's recorded header exception, CLAUDE.md).
// One line, 26px tall. The size step is the largest that fits before the header search on *every* one
// of the three pages, so the pills have the same font and widths wherever you open them: each page
// stores how much header room its own controls take ("extent"), and every page leaves room for the
// widest one. Below the smallest step the line scrolls sideways.
import { useLayoutEffect, useRef, useState } from 'react';

export type PillKey = 'all' | 'running' | 'stopped' | 'idle' | 'notrans' | 'over' | 'towed' | 'ytt';
export type PillPage = 'grid' | 'map' | 'tracking';

export const PILL_ORDER: PillKey[] = ['all', 'running', 'stopped', 'idle', 'notrans', 'over', 'towed', 'ytt'];

/** Look of each pill (same values as the approved Grid View status colours). */
export const PILL_LOOK: Record<
  PillKey,
  { label: string; dot: string; fg: string; grad: string; ring: string }
> = {
  all: { label: 'All', dot: '#6B7685', fg: '#0B1B2B', grad: 'linear-gradient(135deg,#4E5A6B 0%,#94A0AF 100%)', ring: 'rgba(255,255,255,.35)' },
  running: { label: 'Running', dot: '#009863', fg: '#009863', grad: 'linear-gradient(90deg,#005965 0%,#009863 100%)', ring: '#03AD86' },
  stopped: { label: 'Stopped', dot: '#F90507', fg: '#F90507', grad: 'linear-gradient(90deg,#F90507 0%,#FF8887 100%)', ring: '#FF8A8A' },
  idle: { label: 'Idle', dot: '#0363FF', fg: '#0363FF', grad: 'linear-gradient(90deg,#0363FF 0%,#74AAFF 100%)', ring: '#8BB8FF' },
  notrans: { label: 'No Trans', dot: '#1F2328', fg: '#111827', grad: 'linear-gradient(90deg,#1F2328 0%,#3A4048 55%,#6B7280 100%)', ring: '#6B7280' },
  over: { label: 'Overspeed', dot: '#FF6B2C', fg: '#FF5A1F', grad: 'linear-gradient(90deg,#FF5A14 0%,#FF6F2A 55%,#FF9447 100%)', ring: '#FFA36B' },
  towed: { label: 'Towed', dot: '#4BA9B5', fg: '#11636A', grad: 'linear-gradient(90deg,#2B98A5 0%,#4FB3BE 55%,#86D0D6 100%)', ring: '#6FE0E0' },
  ytt: { label: 'YTT', dot: '#9AA3B2', fg: '#8A94A6', grad: 'linear-gradient(90deg,#7C8798 0%,#9AA3B2 55%,#C3C9D2 100%)', ring: '#C3C9D2' },
};

/** Size steps, largest first; all 26px tall (the profile circle's height). */
const TIERS = [
  { fs: 11.5, dot: 7, ph: 18, pfs: 11, pad: '0 4px 0 8px', ppad: '0 7px', gap: 6 },
  { fs: 11, dot: 6, ph: 17, pfs: 10, pad: '0 3px 0 7px', ppad: '0 6px', gap: 5 },
  { fs: 10.5, dot: 6, ph: 16, pfs: 9.5, pad: '0 3px 0 6px', ppad: '0 5px', gap: 4 },
  { fs: 10, dot: 5, ph: 15, pfs: 9, pad: '0 3px 0 6px', ppad: '0 4px', gap: 4 },
  { fs: 9.5, dot: 5, ph: 14, pfs: 8.5, pad: '0 2px 0 5px', ppad: '0 3px', gap: 3 },
  { fs: 9, dot: 4, ph: 13, pfs: 8, pad: '0 2px 0 4px', ppad: '0 3px', gap: 3 },
];

/* Header room each page's controls take: pills' left edge + the width between the header search and
   the bell. Measured on each visit and remembered; these defaults are the measured values. */
const EXTENT_KEY = 'iotify.vt.pill-extent';
const DEFAULT_EXTENT: Record<PillPage, number> = { grid: 368, map: 189, tracking: 280 };
function readExtents(): Record<PillPage, number> {
  try {
    return { ...DEFAULT_EXTENT, ...JSON.parse(localStorage.getItem(EXTENT_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_EXTENT };
  }
}

export interface StatusPillsProps {
  page: PillPage;
  active: PillKey;
  counts: Partial<Record<PillKey, number>>;
  onPick: (k: PillKey) => void;
}

export function StatusPills({ page, active, counts, onPick }: StatusPillsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState(0);
  const [width, setWidth] = useState(0);
  const [scroll, setScroll] = useState<number | null>(null);

  // Start again from the largest step when the window size changes.
  useLayoutEffect(() => {
    const onResize = () => {
      setTier(0);
      setScroll(null);
      setWidth(window.innerWidth);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    const header = g.closest('.ui-ph');
    const search = header?.querySelector('.ui-hsearch');
    const bell = header?.querySelector('.ui-iconbtn');
    const lead = header?.querySelector('.ui-ph__lead');
    const title = header?.querySelector('.ui-ph__title');
    if (!search || !lead) return;
    const gr = g.getBoundingClientRect();
    const sr = search.getBoundingClientRect();
    const buttons = bell ? bell.getBoundingClientRect().left - sr.right : 0;
    const mine = Math.round(gr.left + buttons);
    const ext = readExtents();
    ext[page] = mine;
    try {
      localStorage.setItem(EXTENT_KEY, JSON.stringify(ext));
    } catch {
      /* private mode: keep the defaults */
    }
    const reserve = Math.max(0, Math.max(ext.grid, ext.map, ext.tracking) - mine);
    const limit = Math.min(sr.left - 8, lead.getBoundingClientRect().right) - reserve;
    const wrapped = title ? gr.top >= title.getBoundingClientRect().bottom - 1 : false;
    if (gr.right > limit || wrapped) {
      if (tier < TIERS.length - 1) setTier(tier + 1);
      else if (scroll === null) {
        const info = header?.querySelector('.ui-ph__info') ?? title;
        setScroll(Math.max(120, limit - (info ? info.getBoundingClientRect().right : gr.left) - 8));
      }
    }
  }, [tier, width, page, scroll, counts]);

  const T = TIERS[Math.min(tier, TIERS.length - 1)]!;
  return (
    <div
      ref={ref}
      role="group"
      aria-label="Vehicle status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: T.gap,
        flexShrink: 0,
        ...(scroll !== null ? { maxWidth: scroll, overflowX: 'auto', scrollbarWidth: 'none' } : {}),
      }}
    >
      {PILL_ORDER.map((k) => {
        const s = PILL_LOOK[k];
        const on = active === k;
        const n = counts[k] ?? 0;
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            title={`${s.label}: ${n}`}
            onClick={() => onPick(k)}
            style={{
              flex: '0 0 auto',
              height: 26,
              boxSizing: 'border-box',
              padding: T.pad,
              border: 'none',
              borderRadius: 8,
              background: on ? s.grad : '#fff',
              boxShadow: on
                ? `inset 0 0 0 1px ${s.ring}, 0 1px 4px rgba(10,79,85,.24)`
                : 'inset 0 0 0 1px #D5DADF',
              display: 'flex',
              alignItems: 'center',
              gap: T.gap,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: T.fs,
              lineHeight: 1,
              fontWeight: on ? 700 : 500,
              color: on ? '#fff' : '#4B5563',
              textShadow: on ? '0 1px 2px rgba(1,29,50,.35)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: T.dot,
                height: T.dot,
                borderRadius: '50%',
                flexShrink: 0,
                background: on ? '#fff' : s.dot,
              }}
            />
            {s.label}
            <span
              style={{
                marginLeft: 'auto',
                height: T.ph,
                lineHeight: `${T.ph}px`,
                minWidth: T.ph,
                boxSizing: 'border-box',
                padding: T.ppad,
                borderRadius: 999,
                textAlign: 'center',
                background: on ? 'rgba(255,255,255,.22)' : '#fff',
                boxShadow: on ? 'none' : 'inset 0 0 0 1px #D5DADF',
                fontSize: T.pfs,
                fontWeight: 700,
                color: on ? '#fff' : k === 'all' ? '#0B1B2B' : s.fg,
              }}
            >
              {n}
            </span>
          </button>
        );
      })}
    </div>
  );
}
