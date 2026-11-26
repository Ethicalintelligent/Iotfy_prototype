// Grid View page controls (approved Grid View design, IT-0037): Search · Filter · Sort · Grid/List in
// the header, between the header search and the bell. IT-0053 (approved prototype IT-0046): the
// status dropdown gave way to the open status pills (../shared/StatusPills.tsx), and a vehicle search
// icon comes before Filter.
// IT-0049 (Heeba, 26 Nov 2026): all header controls 26px tall, the height of the profile circle,
// with smaller icons; the header search matches through header-26.css.
import type { ReactNode } from 'react';
import { Icon } from './icons';
import { GRAD, SORTS, type SortKey } from './model';

export type Menu = 'search' | 'sort' | 'filter' | null;

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

/** IT-0053 (approved prototype IT-0046): a 26px search icon right before Filter. It opens a
 *  "Search vehicles…" field under it; typing filters the vehicles (number, plate, operator, location,
 *  type, group) everywhere: cards, list, pill counts and pages. × clears; Escape or a click outside
 *  closes the field and keeps the search (the icon stays green while a search is on). */
function VehicleSearch({
  open,
  query,
  onMenu,
  onQuery,
}: {
  open: boolean;
  query: string;
  onMenu: (m: Menu) => void;
  onQuery: (q: string) => void;
}) {
  const on = open || query.trim() !== '';
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        aria-label="Search vehicles"
        aria-expanded={open}
        title={query.trim() ? `Searching: ${query.trim()}` : 'Search vehicles'}
        onClick={() => onMenu(open ? null : 'search')}
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
          background: on ? GRAD : '#fff',
          boxShadow: on ? '0 0 0 1.5px #03AD86' : 'inset 0 0 0 1.5px #E3E6EA',
          color: on ? '#fff' : '#3D4A5C',
        }}
      >
        <Icon name="search" size={11} />
      </button>
      {open && (
        <>
          <Backdrop onClose={() => onMenu(null)} />
          <div role="search" style={{ ...POPUP, right: 0, width: 260 }}>
            <label
              style={{
                height: 30,
                boxSizing: 'border-box',
                padding: '0 6px 0 10px',
                borderRadius: 8,
                background: '#F9F9FB',
                boxShadow: 'inset 0 0 0 1px #D7D8DB',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#6B7685',
              }}
            >
              <Icon name="search" size={11} />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Search vehicles…"
                aria-label="Search vehicles"
                autoComplete="off"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  color: '#0B1B2B',
                }}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  title="Clear"
                  onClick={() => onQuery('')}
                  style={{
                    width: 20,
                    height: 20,
                    border: 'none',
                    borderRadius: 6,
                    padding: 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'transparent',
                    color: '#6B7685',
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="close" size={12} />
                </button>
              )}
            </label>
          </div>
        </>
      )}
    </div>
  );
}

export interface ViewControlsProps {
  menu: Menu;
  query: string;
  onQuery: (q: string) => void;
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
  query,
  onQuery,
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
      <VehicleSearch open={menu === 'search'} query={query} onMenu={onMenu} onQuery={onQuery} />
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
