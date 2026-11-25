// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import React, { useId } from 'react';
import { api } from '../runtime';

export const UNTRUSTED_FLAG = 15;

export const MAX_HISTORY_DAYS = 7;

export const historyApi: any = {
  get: (e?: any, t?: any, n?: any) =>
    api(`/api/v1/tracking/assets/${e}/history`, {
      query: {
        from: t.toISOString(),
        to: n.toISOString(),
      },
    }),
};

export const GAUGE_STATUS_KEYS: any = {
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

export const GAUGE_STATUS_LABEL: any = {
  running: 'Running',
  stop: 'Stopped',
  idle: 'Idle',
  overspeed: 'Overspeed',
  towed: 'Towed',
  notrans: 'No Transmit',
  ytt: 'Yet to Transmit',
};

export const GAUGE_COLORS: any = {
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

export const GAUGE_MOVING: any = {
  running: true,
  overspeed: true,
  towed: true,
};

export const gaugeStatus = (e?: any) =>
  GAUGE_STATUS_KEYS[
    String(e ?? 'running')
      .trim()
      .toLowerCase()
  ] ?? 'running';

export const GAUGE_STATUS_COLOR: any = {
  running: '#009863',
  stop: '#F90507',
  idle: '#0363FF',
  overspeed: '#F76C09',
  towed: '#07B1B4',
  notrans: '#2B333C',
  ytt: '#8D99A8',
};

export const gaugeColor = (e?: any) => GAUGE_STATUS_COLOR[gaugeStatus(e)];

export const useSvgId = () => useId().replace(/[^a-zA-Z0-9_-]/g, '');

export function Speedometer({
  speed,
  status,
  max = 200,
  width = 160,
  badgeStyle = 'default',
  zeroWhenNotMoving = true,
  className,
  style,
}: any) {
  const c = useSvgId(),
    f = gaugeStatus(status),
    p = GAUGE_COLORS[f],
    h = typeof speed == 'number' ? speed : parseInt(String(speed), 10),
    A = Math.max(0, Math.round(isNaN(h) ? 0 : h)),
    v = zeroWhenNotMoving && !GAUGE_MOVING[f] ? 0 : A,
    y = Math.min(max, v) / max,
    g = `${(y * 100).toFixed(2)} 101`,
    E = (y * 216 - 108).toFixed(2),
    b = max / 8,
    w = Array.from(
      {
        length: 9,
      },
      (z?: any, B?: any) => {
        const J = ((198 - 27 * B) * Math.PI) / 180,
          G = Math.cos(J),
          $ = Math.sin(J);
        return {
          x1: 80 + 51 * G,
          y1: 72 - 51 * $,
          x2: 80 + 56 * G,
          y2: 72 - 56 * $,
          color: B * b <= v && v > 0 ? p.c1 : '#4A5568',
        };
      },
    ),
    x = [
      {
        x: 40.06,
        y: 84.98,
        v: 0,
      },
      {
        x: 46.02,
        y: 47.3,
        v: max / 4,
      },
      {
        x: 80,
        y: 30,
        v: max / 2,
      },
      {
        x: 113.98,
        y: 47.3,
        v: (max * 3) / 4,
      },
      {
        x: 119.94,
        y: 84.98,
        v: max,
      },
    ],
    S = width / 160,
    W = badgeStyle === 'playback',
    O = W
      ? {
          s: 59.35,
          l: 50.32,
          t: 50.32,
          val: 21,
          lab: 11.6,
        }
      : {
          s: 52,
          l: 54,
          t: 54,
          val: 18,
          lab: 10,
        },
    C = W
      ? `inset 0 0 0 2px ${p.ring}, 0 6px 14px ${p.glow}`
      : `0 0 0 3px #fff, 0 6px 14px ${p.glow}`,
    k = '.4s ease';
  return (
    <div
      className={className}
      title={`Status: ${GAUGE_STATUS_LABEL[f]} · ${v} km/hr`}
      role="img"
      aria-label={`Speed ${v} km/hr, status ${GAUGE_STATUS_LABEL[f]}`}
      style={
        {
          position: 'relative',
          width,
          height: 112 * S,
          flexShrink: 0,
          ...style,
        } as any
      }
    >
      <div
        style={
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: 160,
            height: 112,
            transform: `scale(${S})`,
            transformOrigin: '0 0',
          } as any
        }
      >
        <svg
          viewBox="0 0 160 112"
          width={160}
          height={112}
          style={
            {
              display: 'block',
              overflow: 'visible',
            } as any
          }
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`spd-arc-${c}`}
              gradientUnits="userSpaceOnUse"
              x1="19"
              y1="92"
              x2="125"
              y2="10"
            >
              <stop offset="0" stopColor={p.light} stopOpacity={0.35} />
              <stop offset="0.55" stopColor={p.c1} stopOpacity={0.85} />
              <stop offset="1" stopColor={p.c1} />
            </linearGradient>
            <linearGradient
              id={`spd-wedge-${c}`}
              gradientUnits="userSpaceOnUse"
              x1="112"
              y1="10"
              x2="22"
              y2="100"
            >
              <stop offset="0" stopColor={p.shadeA} stopOpacity={0.3} />
              <stop offset="1" stopColor={p.shadeB} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <path
            d="M 51.95 81.12 A 29.5 29.5 0 1 1 108.05 81.12"
            pathLength={100}
            fill="none"
            stroke={`url(#spd-wedge-${c})`}
            strokeWidth={58}
            style={
              {
                strokeDasharray: g,
                transition: `stroke-dasharray ${k}`,
              } as any
            }
          />
          <path
            d="M 19.13 91.78 A 64 64 0 1 1 140.87 91.78"
            fill="none"
            stroke="#E6E9ED"
            strokeWidth={9}
            strokeLinecap="round"
          />
          <path
            d="M 19.13 91.78 A 64 64 0 1 1 140.87 91.78"
            pathLength={100}
            fill="none"
            stroke={`url(#spd-arc-${c})`}
            strokeWidth={9}
            strokeLinecap="round"
            style={
              {
                strokeDasharray: g,
                transition: `stroke-dasharray ${k}`,
              } as any
            }
          />
          {w.map((z?: any, B?: any) => (
            <line
              key={B}
              x1={z.x1.toFixed(2)}
              y1={z.y1.toFixed(2)}
              x2={z.x2.toFixed(2)}
              y2={z.y2.toFixed(2)}
              stroke={z.color}
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
            {x.map((z?: any) => (
              <text key={z.v} x={z.x} y={z.y}>
                {Math.round(z.v)}
              </text>
            ))}
          </g>
          <g
            style={
              {
                transformOrigin: '80px 72px',
                transform: `rotate(${E}deg)`,
                transition: `transform ${k}`,
              } as any
            }
          >
            <path
              d="M80 17 L86 4.5 L74 4.5 Z"
              fill={p.c2}
              stroke="#fff"
              strokeWidth={1}
              strokeLinejoin="round"
            />
          </g>
        </svg>
        <div
          style={
            {
              position: 'absolute',
              left: O.l,
              top: O.t,
              width: O.s,
              height: O.s,
              boxSizing: 'border-box',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${p.c1} 0%, ${p.c2} 100%)`,
              boxShadow: C,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              transition: 'background .3s ease',
              textShadow: '0 1px 2px rgba(1,29,50,.35)',
              fontFamily:
                "'Instrument Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            } as any
          }
        >
          <span
            style={
              {
                fontSize: O.val,
                lineHeight: 1.1,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              } as any
            }
          >
            {v}
          </span>
          <span
            style={
              {
                fontSize: O.lab,
                lineHeight: 1.2,
                fontWeight: 400,
              } as any
            }
          >
            km/hr
          </span>
        </div>
      </div>
    </div>
  );
}
