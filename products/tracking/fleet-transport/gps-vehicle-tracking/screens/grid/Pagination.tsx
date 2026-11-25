// Grid View pagination (approved design): "Showing 1–12 of 24", ‹ 1 2 ›. The "Demo data" label
// (root CLAUDE.md §8) sits next to the count, in the same small grey text.
import { Icon } from './icons';
import { GRAD, PAGE_SIZE } from './model';

const ARROW = {
  width: 22,
  height: 22,
  border: 'none',
  borderRadius: 6,
  background: '#fff',
  boxShadow: 'inset 0 0 0 1px #E3E6EA',
  color: '#3D4A5C',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  padding: 0,
} as const;

export function Pagination({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (i: number) => void;
}) {
  return (
    <nav
      aria-label="Pagination"
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: 0,
        height: 22,
      }}
    >
      <span style={{ fontSize: 11.5, color: '#6B7685', marginRight: 8 }}>
        Showing {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
        {' · '}
        <span title="Status, speed, location, indicators, sensors, alerts and last update are generated demo activity">
          Demo data
        </span>
      </span>
      <button
        type="button"
        aria-label="Previous page"
        disabled={page === 0}
        onClick={() => onPage(Math.max(0, page - 1))}
        style={ARROW}
      >
        <Icon name="chevL" size={13} />
      </button>
      {Array.from({ length: pageCount }, (_, i) => {
        const current = i === page;
        return (
          <button
            key={i}
            type="button"
            aria-current={current ? 'page' : 'false'}
            onClick={() => onPage(i)}
            style={{
              minWidth: 22,
              height: 22,
              border: 'none',
              borderRadius: 6,
              padding: '0 5px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 11.5,
              fontWeight: 700,
              background: current ? GRAD : '#fff',
              boxShadow: current ? 'none' : 'inset 0 0 0 1px #E3E6EA',
              color: current ? '#fff' : '#3D4A5C',
            }}
          >
            {i + 1}
          </button>
        );
      })}
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount - 1}
        onClick={() => onPage(Math.min(pageCount - 1, page + 1))}
        style={ARROW}
      >
        <Icon name="chevR" size={13} />
      </button>
    </nav>
  );
}
