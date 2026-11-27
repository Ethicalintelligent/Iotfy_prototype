// IT-0055 (Heeba's approved prototype): in Track History the header's status filters are replaced
// by the history timeline: back to start, play / pause, the playback time, a progress bar (drag to
// seek), the end time and the speeds 1x 2x 4x 8x. It drives the page's own playback (usePlayback).
// Rendered into the shell header's left page-control slot (the product's recorded header exception).
import type { ReactNode } from 'react';
import { HeaderSlot } from '@iotify/app-kit';

const GRAD = 'linear-gradient(135deg,#009863 0%,#005965 100%)';
export const TIMELINE_SPEEDS = [1, 2, 4, 8];

const Svg = ({ size, children }: { size: number; children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', flex: 'none' }}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export function HistoryTimeline({
  playing,
  t,
  start,
  end,
  rate,
  now,
  endText,
  onToggle,
  onRestart,
  onSeek,
  onRate,
}: {
  playing: boolean;
  t: number;
  start: number;
  end: number;
  rate: number;
  now: string;
  endText: string;
  onToggle?: () => void;
  onRestart?: () => void;
  onSeek?: (t: number) => void;
  onRate?: (r: number) => void;
}) {
  const ready = end > start,
    f = ready ? Math.max(0, Math.min(1, (t - start) / (end - start))) : 0;
  return (
    <HeaderSlot side="left">
      <div
        className="td-hist-tl"
        role="group"
        aria-label="Playback"
        style={{
          flex: 1,
          minWidth: 360,
          height: 36,
          marginLeft: 8,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 8px',
          borderRadius: 10,
          background: '#fff',
          boxShadow: 'inset 0 0 0 1px #EEF0F2',
          color: '#0B1B2B',
        }}
      >
        <button
          type="button"
          title="Back to start"
          aria-label="Back to start"
          disabled={!ready}
          onClick={onRestart}
          style={{
            width: 24,
            height: 24,
            border: 0,
            borderRadius: 7,
            padding: 0,
            background: '#fff',
            boxShadow: 'inset 0 0 0 1px #E3E6EA',
            color: '#0B1B2B',
            display: 'grid',
            placeItems: 'center',
            cursor: ready ? 'pointer' : 'default',
            flex: 'none',
          }}
        >
          <Svg size={15}>
            <path d="M6 4v16" />
            <path d="M19 5 9 12l10 7z" />
          </Svg>
        </button>
        <button
          type="button"
          title={playing ? 'Pause' : 'Play'}
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={!ready}
          onClick={onToggle}
          style={{
            width: 28,
            height: 28,
            border: 0,
            borderRadius: '50%',
            padding: 0,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            cursor: ready ? 'pointer' : 'default',
            flex: 'none',
            background: GRAD,
            boxShadow: '0 0 0 3px rgba(3,173,134,.22),0 3px 10px rgba(3,173,134,.45)',
          }}
        >
          <Svg size={17}>
            {playing ? (
              <>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </>
            ) : (
              <polygon points="7 4 19 12 7 20 7 4" />
            )}
          </Svg>
        </button>
        <b style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 64 }}>{now}</b>
        <div
          style={{
            position: 'relative',
            flex: 1,
            height: 14,
            display: 'flex',
            alignItems: 'center',
            minWidth: 80,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 4,
              borderRadius: 999,
              background: '#E3E6EA',
            }}
          />
          <i
            style={{
              position: 'absolute',
              left: 0,
              height: 4,
              borderRadius: 999,
              background: '#009863',
              width: `${f * 100}%`,
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: `${f * 100}%`,
              width: 10,
              height: 10,
              marginLeft: -5,
              boxSizing: 'border-box',
              borderRadius: '50%',
              background: '#fff',
              border: '2px solid #009863',
              boxShadow: '0 1px 3px rgba(1,29,50,.2)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="range"
            min={start}
            max={Math.max(end, start + 1)}
            step={15e3}
            value={t}
            disabled={!ready}
            aria-label="Playback position"
            onChange={(ev) => onSeek?.(Number(ev.target.value))}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              margin: 0,
              opacity: 0,
              cursor: ready ? 'pointer' : 'default',
            }}
          />
        </div>
        <span style={{ fontSize: 12.5, color: '#6B7685', whiteSpace: 'nowrap' }}>{endText}</span>
        <div
          style={{
            display: 'flex',
            gap: 2,
            padding: 2,
            borderRadius: 9,
            background: '#fff',
            boxShadow: 'inset 0 0 0 1px #DDE2E7',
            flex: 'none',
          }}
        >
          {TIMELINE_SPEEDS.map((x) => {
            const on = x === rate;
            return (
              <button
                key={x}
                type="button"
                aria-pressed={on}
                title={`Playback speed ${x}×`}
                onClick={() => onRate?.(x)}
                style={{
                  width: 32,
                  height: 22,
                  border: 0,
                  borderRadius: 7,
                  padding: 0,
                  background: on ? GRAD : 'none',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 700,
                  color: on ? '#fff' : '#6B7685',
                  cursor: 'pointer',
                  boxShadow: on ? '0 2px 6px rgba(3,173,134,.35)' : 'none',
                  textShadow: on ? '0 1px 2px rgba(1,21,44,.32)' : undefined,
                }}
              >
                {x}×
              </button>
            );
          })}
        </div>
      </div>
    </HeaderSlot>
  );
}
