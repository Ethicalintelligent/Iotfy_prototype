// IT-0053 (Heeba's approved prototype IT-0046): Tracking's controls in the IoTIFY header row (the
// product's recorded header exception, CLAUDE.md): the status pills after the title, and the
// Live Track / Track History switch between the header search and the bell.
import { HeaderSlot } from '@iotify/app-kit';
import { StatusPills, type PillKey } from '../shared/StatusPills';
import { Icon } from './icon';

const SCOPE = 'st-tracking';
const GRAD = 'linear-gradient(90deg,#009863 0%,#005965 100%)';

/** The page's status ids → the pill keys. */
export const PILL_OF: Record<string, PillKey> = {
  moving: 'running',
  stopped: 'stopped',
  idle: 'idle',
  offline: 'notrans',
  overspeed: 'over',
  towed: 'towed',
  never: 'ytt',
};

// The header controls carry the page's style scope (as Grid View's); the scope's page rules
// (height, background, overflow) must not apply to them.
const headerScope = { className: SCOPE, 'data-st': '' };
const headerBox = {
  lineHeight: 'normal',
  fontSize: 16,
  fontWeight: 400,
  fontVariantNumeric: 'normal',
  position: 'relative',
  height: 'auto',
  overflow: 'visible',
  background: 'transparent',
  alignItems: 'center',
  zIndex: 20,
} as const;

const TABS = [
  { id: 'live', label: 'Live Track', icon: 'Navigation' },
  { id: 'history', label: 'Track History', icon: 'Route' },
] as const;

export function TrackingHeader({
  active,
  counts,
  onPick,
  tab,
  onTab,
}: {
  active: PillKey;
  counts: Partial<Record<PillKey, number>>;
  onPick: (k: PillKey) => void;
  tab: 'live' | 'history';
  onTab: (t: 'live' | 'history') => void;
}) {
  return (
    <>
      {/* IT-0055: in Track History the history timeline (ported/timeline.tsx) takes their place */}
      {tab === 'live' && (
        <HeaderSlot side="left">
          <section aria-label="Status filter" {...headerScope} style={{ ...headerBox, display: 'flex' }}>
            <StatusPills page="tracking" active={active} counts={counts} onPick={onPick} />
          </section>
        </HeaderSlot>
      )}
      <HeaderSlot side="right">
        <section
          aria-label="Tracking view"
          {...headerScope}
          style={{ ...headerBox, display: 'flex', margin: '0 6px 0 0' }}
        >
          <div
            role="group"
            aria-label="Tracking view"
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
            {TABS.map((t) => {
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  title={t.label}
                  onClick={() => onTab(t.id)}
                  style={{
                    height: 22,
                    border: 'none',
                    borderRadius: 6,
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    lineHeight: 'normal',
                    fontWeight: on ? 700 : 600,
                    whiteSpace: 'nowrap',
                    background: on ? GRAD : 'transparent',
                    color: on ? '#fff' : '#3D4A5C',
                  }}
                >
                  <Icon name={t.icon} size={11} style={{ display: 'block' }} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </section>
      </HeaderSlot>
    </>
  );
}
