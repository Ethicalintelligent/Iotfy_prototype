// IT-0055. The popup frame (prototype frame() + slimHead() + addNav()): scrim, modal at the Live
// Monitor size, slim header (icon tile, title · name (plate), extra chips), the six card actions as
// navigation with the current one active, close button; the body below.
import { useEffect, useRef, type CSSProperties, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../icons';
import { IcoDetails, IcoNearby, useTextShadows, type PV } from './kit';

export type PopupKind = 'details' | 'live' | 'nearby' | 'report' | 'immob' | 'settings';
export const NAV: [PopupKind, string][] = [
  ['details', 'Vehicle details'],
  ['live', 'Live Monitor'],
  ['nearby', 'Nearby Vehicles'],
  ['report', 'Vehicle Report'],
  ['immob', 'Immobilizer'],
  ['settings', 'Settings'],
];
/** The card action icons (same as the Grid View card buttons). */
export function ActionIcon({ kind, size = 15 }: { kind: PopupKind; size?: number }) {
  if (kind === 'details') return <IcoDetails size={size} tone="dark" />;
  if (kind === 'nearby') return <IcoNearby size={size} tone="dark" />;
  const name = ({ live: 'live', report: 'report', immob: 'immob', settings: 'settings' } as const)[kind];
  return <Icon name={name} size={size} />;
}

export interface FrameProps {
  kind: PopupKind;
  /** the vehicle the popup opened with (its card's actions make the navigation) */
  head: PV;
  /** the vehicle the navigation opens (Nearby / Report can switch vehicle) */
  navV?: PV;
  icon: ReactNode;
  title: string;
  /** shown after the title (status chip, mode switch…) */
  extra?: ReactNode;
  onNav: (kind: PopupKind, v: PV) => void;
  onClose: () => void;
  bodyClass?: string;
  bodyStyle?: CSSProperties;
  bodyRef?: Ref<HTMLDivElement>;
  closeStyle?: CSSProperties;
  children: ReactNode;
}

export function Frame({
  kind,
  head,
  navV,
  icon,
  title,
  extra,
  onNav,
  onClose,
  bodyClass,
  bodyStyle,
  bodyRef,
  closeStyle,
  children,
}: FrameProps) {
  const scrim = useRef<HTMLDivElement>(null);
  useTextShadows(scrim);
  const v = navV ?? head;
  // Esc closes the popup (an open confirm box first: it handles Esc itself)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('.pp-confirm')) return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return createPortal(
    <div
      ref={scrim}
      className={`pp-scrim pp--${kind}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pp-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="pp-head">
          <span className="nb-htile">{icon}</span>
          <div className="nb-htitle">
            <span className="pp-htxt">{title}</span>{' '}
            <span className="nb-hsub">
              · {v.name} ({v.plate})
            </span>
          </div>
          {extra}
          <div className="pp-nav" role="toolbar" aria-label="Vehicle actions">
            {NAV.filter(([k]) => k !== 'immob' || head.immob).map(([k, label]) => (
              <button
                key={k}
                type="button"
                title={label}
                aria-label={label}
                aria-current={k === kind ? 'true' : undefined}
                className={'pp-navb' + (k === 'immob' ? ' is-danger' : '') + (k === kind ? ' on' : '')}
                onClick={() => k !== kind && onNav(k, v)}
              >
                <ActionIcon kind={k} />
              </button>
            ))}
          </div>
          <button type="button" className="pp-x" aria-label="Close" onClick={onClose} style={closeStyle}>
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block', flex: 'none' }}
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div ref={bodyRef} className={'pp-body' + (bodyClass ? ' ' + bodyClass : '')} style={bodyStyle}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
