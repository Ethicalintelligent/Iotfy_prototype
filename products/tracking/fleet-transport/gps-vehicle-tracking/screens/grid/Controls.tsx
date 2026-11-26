// Grid View page controls (approved Grid View design, IT-0037): the status dropdown with counts
// (header, after the title) and Filter · Sort · Grid/List (header, between search and the bell).
// IT-0049 (Heeba, 26 Nov 2026): all header controls 26px tall, the height of the profile circle,
// with smaller icons; the header search matches through header-26.css.
import type { ReactNode } from 'react';
import { Icon } from './icons';
import { GRAD, SORTS, STATUS_CHOICES, STATUS_LOOK, type SortKey, type StatusChoice } from './model';

export type Menu = 'status' | 'sort' | 'filter' | null;

const POPUP = {
  position: 'absolute',
  top: 34,
  zIndex: 30,
  boxSizing: 'border-box',
  padding: 6,
  background: '#fff',
  borderRadius: 10,
  boxShadow: '0 12px 28px rgba(1,29,50,.18),inset 0 0 0 1px #E9ECEF',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
} as const;
const POPUP_TITLE = {
  padding: '4px 8px 6px',
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '.06em',
  color: '#8A94A3',
} as const;

/** Clicking anywhere outside an open pop-up closes it. */
function Backdrop({ onClose }: { onClose: () => void }) {
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 25 }} />;
}

function Option({
  on,
  onPick,
  children,
}: {
  on: boolean;
  onPick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      className="h-opt"
      aria-selected={on}
      onClick={onPick}
      style={{
        height: 30,
        border: 'none',
        borderRadius: 6,
        padding: '0 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 12.5,
        fontWeight: on ? 700 : 500,
        color: '#0B1B2B',
        textAlign: 'left',
        background: on ? '#E6F5EF' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

interface StatusInfo {
  label: string;
  dot: string;
  pillFg: string;
  n: number;
}
function statusInfo(
  k: StatusChoice,
  counts: Partial<Record<StatusChoice, number>>,
  total: number,
): StatusInfo {
  const label = STATUS_CHOICES.find(([key]) => key === k)?.[1] ?? 'All';
  if (k === 'all') return { label, dot: '#6B7685', pillFg: '#0B1B2B', n: total };
  return { label, dot: STATUS_LOOK[k].dot, pillFg: STATUS_LOOK[k].fg, n: counts[k] ?? 0 };
}
const CountPill = ({ info }: { info: StatusInfo }) => (
  <span
    style={{
      height: 18,
      lineHeight: '18px',
      padding: '0 7px',
      borderRadius: 999,
      background: '#fff',
      boxShadow: 'inset 0 0 0 1px #D5DADF',
      fontSize: 11,
      fontWeight: 700,
      color: info.pillFg,
    }}
  >
    {info.n}
  </span>
);
const Dot = ({ info }: { info: StatusInfo }) => (
  <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: info.dot }} />
);

export interface StatusControlProps {
  status: StatusChoice;
  counts: Partial<Record<StatusChoice, number>>;
  total: number;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPick: (k: StatusChoice) => void;
}

export function StatusControl({
  status,
  counts,
  total,
  open,
  onToggle,
  onClose,
  onPick,
}: StatusControlProps) {
  const cur = statusInfo(status, counts, total);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        aria-label={`Vehicle status: ${cur.label} (${cur.n})`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={onToggle}
        style={{
          height: 26,
          boxSizing: 'border-box',
          border: 'none',
          borderRadius: 8,
          padding: '0 6px 0 9px',
          background: '#fff',
          boxShadow: `inset 0 0 0 1.5px ${open ? '#03AD86' : '#E3E6EA'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 12.5,
          fontWeight: 700,
          color: '#0B1B2B',
          whiteSpace: 'nowrap',
        }}
      >
        <Dot info={cur} />
        {cur.label}
        <CountPill info={cur} />
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            color: '#6B7685',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .18s ease',
          }}
        >
          <Icon name="chevDown" size={12} />
        </span>
      </button>
      {open && (
        <>
          <Backdrop onClose={onClose} />
          <div role="listbox" aria-label="Vehicle status" style={{ ...POPUP, left: 0, width: 220 }}>
            <span style={POPUP_TITLE}>VEHICLE STATUS</span>
            {STATUS_CHOICES.map(([k]) => {
              const on = status === k;
              const info = statusInfo(k, counts, total);
              return (
                <Option key={k} on={on} onPick={() => onPick(k)}>
                  <Dot info={info} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{info.label}</span>
                  <CountPill info={info} />
                  <span
                    style={{ width: 14, display: 'grid', placeItems: 'center', color: '#0E7F5E' }}
                  >
                    {on && <Icon name="check" size={14} />}
                  </span>
                </Option>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export interface ViewControlsProps {
  menu: Menu;
  activeCount: number;
  sort: SortKey;
  view: 'grid' | 'list';
  onMenu: (m: Menu) => void;
  onSort: (k: SortKey) => void;
  onView: (v: 'grid' | 'list') => void;
}

function ViewButton({
  on,
  label,
  title,
  icon,
  onClick,
}: {
  on: boolean;
  label: string;
  title: string;
  icon: 'grid' | 'list';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      title={title}
      onClick={onClick}
      style={{
        width: 22,
        height: 22,
        border: 'none',
        borderRadius: 6,
        padding: 0,
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        background: on ? GRAD : 'transparent',
        color: on ? '#fff' : '#3D4A5C',
      }}
    >
      <Icon name={icon} size={11} />
    </button>
  );
}

export function ViewControls({
  menu,
  activeCount,
  sort,
  view,
  onMenu,
  onSort,
  onView,
}: ViewControlsProps) {
  const filterOn = menu === 'filter' || activeCount > 0;
  const sortOpen = menu === 'sort';
  const sortOn = sortOpen || sort !== 'no';
  const sortLabel = SORTS.find(([k]) => k === sort)?.[1] ?? 'Vehicle no.';
  const filterTitle = activeCount
    ? `${activeCount} filter${activeCount > 1 ? 's' : ''} applied`
    : 'Vehicle filters';
  return (
    <>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          aria-label="Vehicle filters"
          aria-expanded={menu === 'filter'}
          title={filterTitle}
          onClick={() => onMenu(menu === 'filter' ? null : 'filter')}
          style={{
            width: 44,
            height: 26,
            boxSizing: 'border-box',
            border: 'none',
            borderRadius: 8,
            padding: 0,
            background: filterOn ? 'linear-gradient(90deg, #009863 0%, #005965 100%)' : '#E8F5EF',
            boxShadow: filterOn
              ? '0 0 0 1.5px #03AD86, 0 0 10px rgba(3,173,134,.45)'
              : 'inset 0 0 0 1.5px #A9D8C3',
            color: filterOn ? '#fff' : '#12955F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: activeCount ? 4 : 0,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Icon name="funnel" size={11} />
          {activeCount > 0 && (
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: 'rgba(255,255,255,.22)',
                fontSize: 10,
                fontWeight: 700,
                lineHeight: '14px',
                textAlign: 'center',
                color: '#fff',
              }}
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          aria-label="Sort vehicles"
          aria-haspopup="listbox"
          aria-expanded={sortOpen}
          title={`Sort: ${sortLabel}`}
          onClick={() => onMenu(sortOpen ? null : 'sort')}
          style={{
            width: 26,
            height: 26,
            boxSizing: 'border-box',
            border: 'none',
            borderRadius: 8,
            padding: 0,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            background: sortOn ? GRAD : '#fff',
            boxShadow: sortOn ? '0 0 0 1.5px #03AD86' : 'inset 0 0 0 1.5px #E3E6EA',
            color: sortOn ? '#fff' : '#3D4A5C',
          }}
        >
          <Icon name="sort" size={11} />
        </button>
        {sortOpen && (
          <>
            <Backdrop onClose={() => onMenu(null)} />
            <div role="listbox" aria-label="Sort by" style={{ ...POPUP, right: 0, width: 200 }}>
              <span style={POPUP_TITLE}>SORT BY</span>
              {SORTS.map(([k, label]) => {
                const on = sort === k;
                return (
                  <Option key={k} on={on} onPick={() => onSort(k)}>
                    <span style={{ flex: 1 }}>{label}</span>
                    <span style={{ display: 'grid', placeItems: 'center', color: '#0E7F5E' }}>
                      {on && <Icon name="check" size={14} />}
                    </span>
                  </Option>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div
        role="group"
        aria-label="Layout"
        style={{
          flexShrink: 0,
          height: 26,
          boxSizing: 'border-box',
          display: 'flex',
          gap: 2,
          padding: 2,
          borderRadius: 8,
          background: '#fff',
          boxShadow: 'inset 0 0 0 1.5px #E3E6EA',
        }}
      >
        <ViewButton
          on={view === 'grid'}
          label="Grid"
          title="Grid view"
          icon="grid"
          onClick={() => onView('grid')}
        />
        <ViewButton
          on={view === 'list'}
          label="List"
          title="List view"
          icon="list"
          onClick={() => onView('list')}
        />
      </div>
    </>
  );
}
