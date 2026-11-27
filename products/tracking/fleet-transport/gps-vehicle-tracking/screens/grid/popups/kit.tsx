// IT-0055. Grid View vehicle card popups: shared pieces from the approved prototype
// (iterations/IT-0055/prototype/in-shell.html): icons, status looks, demo helpers, the popup frame
// (slim header with the six card actions), the map box with Tracking's map controls, vehicle pins.
// The path strings are constants written here, so injecting them as SVG markup is safe.
import L from 'leaflet';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cardLook } from '../cardLook';
import type { GridVehicle, Status } from '../model';

/* ================================================================ icons */
export const IC = {
  truck:
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 8.38A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  fuel: '<path d="M3 22h12M4 9h10M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
  cal2: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  palette:
    '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C21.97 6.01 17.46 2 12 2z"/>',
  sign: '<path d="M12 13v8M12 3v3"/><path d="M4 6a1 1 0 0 0-.7 1.7l1.3 1.3a1 1 0 0 0 .7.3H18a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  idcard:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4M5 17c.5-1.5 1.7-2 3-2s2.5.5 3 2"/>',
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  offline:
    '<path d="M12 20h.01"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M5 12.86a10 10 0 0 1 5.17-2.69"/><path d="M19 12.86a10 10 0 0 0-2.01-1.53"/><path d="M2 8.82a15 15 0 0 1 4.18-2.65"/><path d="M22 8.82a15 15 0 0 0-11.29-3.76"/><path d="m2 2 20 20"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  locate:
    '<path d="M2 12h3M19 12h3M12 2v3M12 19v3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  layers:
    '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  share:
    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
  send: '<path d="M3 11l19-9-9 19-2-8-8-2z"/>',
  route:
    '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  swap: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  door: '<path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/>',
  stops: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  wifioff:
    '<path d="M12 20h.01"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M5 12.86a10 10 0 0 1 5.17-2.69"/><path d="M19 12.86a10 10 0 0 0-2.01-1.53"/><path d="m2 2 20 20"/>',
  radar:
    '<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/><circle cx="12" cy="12" r="2"/><path d="m13.41 10.59 5.66-5.66"/>',
  filechart:
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 18v-2M12 18v-4M16 18v-6"/>',
  activity:
    '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
  reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  spin: '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  shieldq:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  shieldok:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  history:
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  crosshair: '<circle cx="12" cy="12" r="10"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  sliders:
    '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/>',
  gps: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="7"/>',
  batt: '<rect x="7" y="4" width="10" height="17" rx="2"/><path d="M10 2h4"/>',
  power:
    '<rect x="2" y="7" width="20" height="12" rx="2"/><path d="M6 7V5M18 7V5M7 13h3M14 13h3M15.5 11.5v3"/>',
  gsm: '<path d="M22 2 2 22h20z" fill="currentColor" stroke="none"/>',
  snow: '<path d="M2 12h20M12 2v20m-8-6 4-4-4-4m16 8-4-4 4-4M8 4l4 4 4-4M8 20l4-4 4 4"/>',
  seat: '<path d="M7 18v-6a2 2 0 0 1 2-2h6M5 21h14M9 6a2 2 0 1 0 0-.01"/>',
  chip: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
  chipS: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>',
  barcode: '<path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14"/>',
  thermo: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  dots: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  freeze: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  stack: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  back: '<path d="M6 4v16"/><path d="M19 5 9 12l10 7z"/>',
  playT: '<polygon points="7 4 19 12 7 20 7 4"/>',
  pauseT: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
} as const;
export type IconKey = keyof typeof IC;

/** The prototype's I(d, w, sw): a stroked 24px-grid icon. */
export function I({
  d,
  size = 16,
  sw = 2,
  style,
}: {
  d: string;
  size?: number;
  sw?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flex: 'none', ...style }}
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}
export const Ic = ({ k, size }: { k: IconKey; size?: number }) => <I d={IC[k]} size={size} />;

/* developer-provided icons (nearby-vehicles-*.svg, vehicle-details-*.svg) */
const ICN = { dark: '#01152C', green: '#0B9467', white: '#FFFFFF' } as const;
type Tone = keyof typeof ICN;
export function IcoNearby({ size, tone }: { size: number; tone: Tone }) {
  return (
    <svg
      viewBox="-1 -1 26 26"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flex: 'none', color: ICN[tone] }}
      dangerouslySetInnerHTML={{
        __html:
          '<path stroke-width="1.5" d="M16 11c0 2.4-2.6 4.8-3.3 5.4a1 1 0 0 1-1.4 0C10.6 15.8 8 13.4 8 11a4 4 0 0 1 8 0Z"/><circle cx="12" cy="11" r="1" fill="currentColor" stroke="none"/>' +
          '<path stroke-width="1.5" d="M10.01 2.2A10 10 0 0 0 3.25 7.15"/><path stroke-width="1.5" d="M2.2 13.99A10 10 0 0 0 7.15 20.75"/><path stroke-width="1.5" d="M13.99 21.8A10 10 0 0 0 20.75 16.85"/><path stroke-width="1.5" d="M21.8 10.01A10 10 0 0 0 16.85 3.25"/>' +
          '<circle stroke-width="1.5" cx="12" cy="2" r="2"/><circle stroke-width="1.5" cx="22" cy="12" r="2"/><circle stroke-width="1.5" cx="12" cy="22" r="2"/><circle stroke-width="1.5" cx="2" cy="12" r="2"/>',
      }}
    />
  );
}
export function IcoDetails({ size, tone }: { size: number; tone: Tone }) {
  // on green tiles: white badge with a green 'i', no black
  const inner = tone === 'white' ? '#007A5A' : '#FFFFFF';
  return (
    <svg
      viewBox="-1 -1 26 26"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flex: 'none', color: ICN[tone] }}
      dangerouslySetInnerHTML={{
        __html:
          IC.truck +
          `<circle cx="6" cy="17" r="5" fill="currentColor" stroke="${inner}" stroke-width="1.6"/><path d="M6 16.5v2.9" stroke="${inner}" stroke-width="2"/><circle cx="6" cy="14.3" r="1" fill="${inner}" stroke="none"/>`,
      }}
    />
  );
}

/* ================================================================ status look (same as the cards) */
export const ST: Record<Status, { dot: string; ring: string; grad: string }> = {
  Running: { dot: '#009863', ring: '#03AD86', grad: 'linear-gradient(90deg,#005965 0%,#009863 100%)' },
  Stopped: { dot: '#F90507', ring: '#FF8A8A', grad: 'linear-gradient(90deg,#F90507 0%,#FF8887 100%)' },
  Idle: { dot: '#0363FF', ring: '#8BB8FF', grad: 'linear-gradient(90deg,#0363FF 0%,#74AAFF 100%)' },
  'No Transmit': {
    dot: '#1F2328',
    ring: '#6B7280',
    grad: 'linear-gradient(90deg,#1F2328 0%,#3A4048 55%,#6B7280 100%)',
  },
  Overspeed: { dot: '#FF6B2C', ring: '#FFA36B', grad: 'linear-gradient(90deg,#FF5A14 0%,#FF9447 100%)' },
  Towed: { dot: '#4BA9B5', ring: '#6FE0E0', grad: 'linear-gradient(90deg,#2B98A5 0%,#86D0D6 100%)' },
  'Yet to Transmit': {
    dot: '#9AA3B2',
    ring: '#C3C9D2',
    grad: 'linear-gradient(90deg,#7C8798 0%,#C3C9D2 100%)',
  },
};
export const st = (s: string) => ST[s as Status] ?? ST['Yet to Transmit'];
/** Speedometer palettes; every status colour in the popups follows these (date tab, pin, chips). */
export const GAUGE = {
  running: { c1: '#009863', c2: '#005965', light: '#BDEBD9', glow: 'rgba(0,152,99,.35)', shadeA: '#83E4B2', shadeB: '#C7F3DC', ring: '#009863' },
  stop: { c1: '#FF8887', c2: '#F90507', light: '#FFD2D3', glow: 'rgba(249,5,7,.3)', shadeA: '#FF9A9C', shadeB: '#FFD9DA', ring: '#FF8887' },
  idle: { c1: '#74AAFF', c2: '#0363FF', light: '#CFE0FF', glow: 'rgba(3,99,255,.3)', shadeA: '#8DB6FF', shadeB: '#D3E3FF', ring: '#74AAFF' },
  overspeed: { c1: '#F98007', c2: '#F76C09', light: '#FFE0C2', glow: 'rgba(247,108,9,.32)', shadeA: '#FFB877', shadeB: '#FFE3C9', ring: '#FFA36B' },
  towed: { c1: '#3ECFCF', c2: '#07B1B4', light: '#C8F1F1', glow: 'rgba(7,177,180,.32)', shadeA: '#86E3E3', shadeB: '#CFF5F5', ring: '#6FE0E0' },
  notrans: { c1: '#2B333C', c2: '#0B1116', light: '#D5D9DE', glow: 'rgba(11,17,22,.28)', shadeA: '#8A939D', shadeB: '#D5D9DE', ring: '#4A5560' },
  ytt: { c1: '#A9B4C0', c2: '#8D99A8', light: '#E3E7EC', glow: 'rgba(141,153,168,.3)', shadeA: '#C3CBD4', shadeB: '#E6E9ED', ring: '#C3CBD4' },
};
const GKEY: Record<string, keyof typeof GAUGE> = {
  Running: 'running',
  Stopped: 'stop',
  Idle: 'idle',
  Overspeed: 'overspeed',
  Towed: 'towed',
  'No Transmit': 'notrans',
  'Yet to Transmit': 'ytt',
};
export const gaugeOf = (s: string) => GAUGE[GKEY[s] ?? 'running'];

const TINT: Record<string, [string, string]> = {
  Running: ['#E6F6EF', '#009863'],
  Stopped: ['#FDECEC', '#E0161B'],
  Idle: ['#E8F0FF', '#0363FF'],
  Overspeed: ['#FFF0E8', '#FF5A1F'],
  Towed: ['#E5F5F6', '#2B98A5'],
  'No Transmit': ['#ECEDEF', '#1F2328'],
  'Yet to Transmit': ['#F1F3F5', '#6B7685'],
};
export function TintChip({ s }: { s: string }) {
  const t = TINT[s] ?? TINT['Yet to Transmit']!;
  return (
    <span className="nb-tchip" style={{ background: t[0], color: t[1] }}>
      <i style={{ background: t[1] }} />
      {s}
    </span>
  );
}

/* ================================================================ the vehicle as the popups read it */
export interface PV {
  id: string;
  name: string;
  plate: string;
  status: Status;
  operator: string;
  speed: string;
  odometer: string;
  location: string;
  last: string;
  alerts: number;
  img: string;
  immob: boolean;
  /** the card's indicators, "gps" → "Available", … (lower-case keys, as the card titles) */
  ind: Record<string, string>;
  /** indicator colours, same keys */
  indColor: Record<string, string>;
}
export function toPV(v: GridVehicle): PV {
  const ind: Record<string, string> = {};
  const indColor: Record<string, string> = {};
  for (const i of cardLook(v).indicators) {
    const m = i.title.match(/^([^:]+):\s*(.+)$/);
    if (m) {
      ind[m[1]!.trim().toLowerCase()] = m[2]!.trim();
      indColor[m[1]!.trim().toLowerCase()] = i.color;
    }
  }
  return {
    id: v.id,
    name: v.name,
    plate: v.plate,
    status: v.status,
    operator: v.operator,
    speed: v.speed,
    odometer: v.odometer,
    location: v.location || '—',
    last: v.lastReport || '—',
    alerts: v.alerts,
    img: v.image,
    immob: v.immobilizer,
    ind,
    indColor,
  };
}

/* ================================================================ demo helpers (seeded per vehicle) */
export function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rnd = () => number;
export const pad = (n: number) => (n < 10 ? '0' : '') + n;
export function clock12(min: number) {
  min = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return pad(h % 12 || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'PM' : 'AM');
}
export function hm(min: number) {
  min = Math.max(0, Math.round(min));
  return Math.floor(min / 60) + ' h ' + pad(min % 60) + ' m';
}
export function home(v: { plate: string }): [number, number] {
  const r = rng(v.plate + 'h');
  return [24.64 + r() * 0.14, 46.6 + r() * 0.16];
}
export const iso = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export const fmtLong = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
export const fmtDay = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
export const short = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
export function last7() {
  const out: Date[] = [];
  for (let i = 6; i >= 0; i--) out.push(addDays(new Date(), -i));
  return out;
}
export function typeOf(name: string) {
  const n = name.split(' ')[0] ?? '';
  return ({ Bus: 'Buses', Truck: 'Trucks', Pickup: 'Pickups', Van: 'Vans' } as Record<string, string>)[n] ?? 'Vehicles';
}
export function modelOf(v: PV) {
  const r = rng(v.plate + 'm');
  return ['Hyundai H-1', 'Isuzu NPR', 'Toyota Hilux', 'Mitsubishi Canter', 'Tata Ace', 'Ford Transit'][
    Math.floor(r() * 6)
  ]!;
}
export const hasDriver = (v: PV) => !!v.operator && v.operator !== 'Not Assigned' && v.operator !== '—';
export function contactOf(v: PV) {
  const r = rng(v.plate + 'c');
  return !hasDriver(v)
    ? '—'
    : '+966 5' + Math.floor(r() * 10) + ' ' + Math.floor(100 + r() * 900) + ' ' + Math.floor(1000 + r() * 9000);
}
export function opId(v: PV) {
  const r = rng(v.plate + 'o');
  return !hasDriver(v) ? '—' : 'TAG-' + Math.floor(1000 + r() * 30);
}
export const lastUpdateText = (v: PV) =>
  v.last && v.last !== '—' ? v.last.replace('Last report ', '') : 'No update';

/* ================================================================ toast */
type ToastFn = (msg: string) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastHost({ children }: { children: ReactNode }) {
  const [list, setList] = useState<{ id: number; msg: string }[]>([]);
  const seq = useRef(0);
  const show: ToastFn = (msg) => {
    const id = ++seq.current;
    setList((l) => [...l, { id, msg }]);
    window.setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 2400);
  };
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {list.map((t) =>
        createPortal(
          <div key={t.id} className="pp-toast">
            {t.msg}
          </div>,
          document.body,
        ),
      )}
    </ToastCtx.Provider>
  );
}

/* ================================================================ white text on gradients: soft shadow */
/** Every element with white text over a gradient fill gets .pp-tsh (the prototype's scan). */
export function useTextShadows(root: RefObject<HTMLElement>) {
  useEffect(() => {
    const scan = () => {
      const r = root.current;
      if (!r) return;
      const all = r.querySelectorAll<HTMLElement>('*');
      for (const e of all) {
        if (e.namespaceURI !== 'http://www.w3.org/1999/xhtml' || e.closest('.leaflet-tile-pane')) continue;
        const cs = getComputedStyle(e);
        const on =
          (/gradient/.test(cs.backgroundImage) && cs.color.indexOf('rgb(255, 255, 255') === 0) ||
          cs.color.indexOf('rgba(255, 255, 255') === 0;
        if (on !== e.classList.contains('pp-tsh')) e.classList.toggle('pp-tsh', on);
      }
    };
    const t0 = window.setTimeout(scan, 150);
    const t = window.setInterval(scan, 1200);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(t);
    };
  }, [root]);
}

/* ================================================================ vehicle pictures: blank border cut away */
const TRIM: Record<string, { url?: string; wait: ((u: string) => void)[] }> = {};
export function trimmed(src: string, cb: (u: string) => void) {
  if (!src) return cb(src);
  const t = TRIM[src];
  if (t) {
    if (t.url) cb(t.url);
    else t.wait.push(cb);
    return;
  }
  TRIM[src] = { wait: [cb] };
  const im = new Image();
  im.crossOrigin = 'anonymous';
  const done = (url: string) => {
    const e = TRIM[src]!;
    e.url = url;
    e.wait.forEach((f) => f(url));
    e.wait = [];
  };
  im.onload = () => {
    let url = src;
    try {
      const w = im.naturalWidth;
      const h = im.naturalHeight;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const x = c.getContext('2d')!;
      x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, w, h).data;
      let x0 = w;
      let y0 = h;
      let x1 = -1;
      let y1 = -1;
      for (let y = 0; y < h; y++)
        for (let i = 0; i < w; i++) {
          const k = (y * w + i) * 4;
          if (d[k + 3]! > 24 && !(d[k]! > 238 && d[k + 1]! > 238 && d[k + 2]! > 238)) {
            if (i < x0) x0 = i;
            if (i > x1) x1 = i;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      if (x1 > x0 && y1 > y0 && (x1 - x0 < w - 4 || y1 - y0 < h - 4)) {
        const o = document.createElement('canvas');
        o.width = x1 - x0 + 1;
        o.height = y1 - y0 + 1;
        o.getContext('2d')!.drawImage(im, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
        url = o.toDataURL('image/png');
      }
    } catch {
      /* keep the original picture */
    }
    done(url);
  };
  im.onerror = () => done(src);
  im.src = src;
}
export function useTrimmed(src: string) {
  const [url, setUrl] = useState<string | null>(() => (src && TRIM[src]?.url) || null);
  useEffect(() => {
    let live = true;
    trimmed(src, (u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [src]);
  return url;
}
/** A vehicle picture, hidden until its blank border is cut away (as the prototype). */
export function Pic({ src, style, className }: { src: string; style?: CSSProperties; className?: string }) {
  const url = useTrimmed(src);
  if (!src) return null;
  return (
    <img
      src={url ?? src}
      alt=""
      className={className}
      style={{ ...style, visibility: url ? undefined : 'hidden' }}
    />
  );
}

/* ================================================================ vehicle pins */
/** Every pin: 28px, 3px ring and water ripple in the vehicle's status colour (selected / focused one). */
export function nbPin(v: PV, ring: string, selected: boolean, img?: string) {
  const pic = img ?? (v.img ? TRIM[v.img]?.url ?? v.img : '');
  return (
    `<div class="nb-pin" style="--ring:${ring};--rp:${st(v.status).dot}">` +
    (selected ? '<span class="rp"></span><span class="rp"></span><span class="rp"></span>' : '') +
    `<div class="core">${pic ? `<img src="${pic}" alt="">` : ''}</div></div>`
  );
}
export const pinIcon = (v: PV, selected: boolean) =>
  L.divIcon({ className: '', iconSize: [28, 28], iconAnchor: [14, 14], html: nbPin(v, st(v.status).dot, selected) });

/** A vehicle pin marker; its picture is swapped for the trimmed one when ready. */
export function pinMarker(ll: L.LatLngExpression, v: PV, selected: boolean, opts: L.MarkerOptions = {}) {
  const m = L.marker(ll, { ...opts, icon: pinIcon(v, selected) });
  if (v.img && !TRIM[v.img]?.url) trimmed(v.img, () => m.setIcon(pinIcon(v, selected)));
  return m;
}

/* ================================================================ map box with Tracking's controls */
const STREET = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};
const LIGHT = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles © Esri',
};
const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export interface MapOpts {
  light?: boolean;
  share?: boolean;
  /** where "Centre on vehicle" goes (defaults to the start centre) */
  center?: () => [number, number];
}
/**
 * The popup map: a Leaflet map filling `.pp-map`, with the app's control column (zoom in/out,
 * centre, layers, optional share). Children are drawn over the map (chips, info card…).
 */
export function PopupMap({
  center,
  zoom = 16,
  opts = {},
  className = 'pp-map',
  style,
  onMap,
  children,
}: {
  center: [number, number];
  zoom?: number;
  opts?: MapOpts;
  className?: string;
  style?: CSSProperties;
  onMap?: (m: L.Map | null) => void;
  children?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ street: L.TileLayer; sat: L.TileLayer; onSat: boolean } | null>(null);
  const toast = useToast();
  const optsRef = useRef(opts);
  optsRef.current = opts;
  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { zoomControl: false }).setView(center, zoom);
    const base = opts.light ? LIGHT : STREET;
    const street = L.tileLayer(base.url, { maxZoom: 19, attribution: base.attribution }).addTo(m);
    const sat = L.tileLayer(SAT, { maxZoom: 19, attribution: 'Esri' });
    layers.current = { street, sat, onSat: false };
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    const t = window.setTimeout(() => m.invalidateSize(), 80);
    onMap?.(m);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      onMap?.(null);
      m.remove();
      map.current = null;
    };
    // the map is made once per box
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={className} style={style}>
      <div ref={box} style={{ position: 'absolute', inset: 0 }}>
        <div className="pp-mctl" ref={stopMap}>
          <button type="button" title="Zoom in" onClick={() => map.current?.zoomIn()}>
            <I d={IC.plus} />
          </button>
          <button type="button" title="Zoom out" onClick={() => map.current?.zoomOut()}>
            <I d={IC.minus} />
          </button>
          <button
            type="button"
            title="Centre on vehicle"
            onClick={() => {
              const m = map.current;
              if (m) m.setView(optsRef.current.center ? optsRef.current.center() : center, Math.max(m.getZoom(), zoom));
            }}
          >
            <I d={IC.locate} />
          </button>
          <button
            type="button"
            title="Map layers"
            onClick={() => {
              const m = map.current;
              const l = layers.current;
              if (!m || !l) return;
              l.onSat = !l.onSat;
              if (l.onSat) {
                m.removeLayer(l.street);
                l.sat.addTo(m);
              } else {
                m.removeLayer(l.sat);
                l.street.addTo(m);
              }
            }}
          >
            <I d={IC.layers} />
          </button>
          {opts.share && (
            <button type="button" title="Share location" onClick={() => toast('Location link copied (demo)')}>
              <I d={IC.share} size={15} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
/** Ref callback: clicks on an overlay drawn on the map do not reach the map (prototype disableClickPropagation). */
const stopped = new WeakSet<HTMLElement>();
export const stopMap = (el: HTMLElement | null) => {
  if (el && !stopped.has(el)) {
    stopped.add(el);
    L.DomEvent.disableClickPropagation(el);
  }
};

/* ================================================================ rows, section heads */
export function Row({ ic, label, value }: { ic: string; label: string; value: string | number }) {
  return (
    <div className="pp-row">
      <span>
        <I d={ic} size={14} />
        {label}
      </span>
      <b title={String(value)}>{value}</b>
    </div>
  );
}
export function SectionHead({
  icon,
  tone,
  title,
  sub,
  extra,
}: {
  icon: ReactNode;
  tone: string;
  title: ReactNode;
  sub: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="pp-ch">
      <span className={`pp-ctile ${tone}`}>{icon}</span>
      <div>
        <b>{title}</b>
        <small>{sub}</small>
      </div>
      {extra}
    </div>
  );
}
