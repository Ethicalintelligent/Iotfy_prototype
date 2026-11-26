// Grid View icons: the approved design's own SVG paths (Vehicle-Grid-View-standalone.html), unchanged.
// The path strings are constants written here, so injecting them as SVG markup is safe.
import operatorPicture from './pictures/operator.png';

const PATHS = {
  chevDown: '<path d="m6 9 6 6 6-6"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  funnel: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sort: '<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  /* IT-0053: the filter's Vehicle section (lucide car-front, as Tracking's filter) */
  car: '<path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8"/><path d="M7 14h.01"/><path d="M17 14h.01"/><rect width="18" height="8" x="3" y="10" rx="2"/><path d="M5 18v2"/><path d="M19 18v2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  odo: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m7 14 4-4 4 4 5-5"/>',
  flip: '<path d="M21 12a9 9 0 0 0-15-6.7L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/><path d="M16 16h5v5"/>',
  details:
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 8.38A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  live: '<path d="M17 9c0 4.2-5 10-5 10s-5-5.8-5-10a5 5 0 0 1 10 0Z"/><circle cx="12" cy="9" r="1.8"/><path d="M4.8 7.6a7 7 0 0 0 0 6.8"/><path d="M19.2 7.6a7 7 0 0 1 0 6.8"/>',
  nearby:
    '<path d="M16 11c0 2.4-2.6 4.8-3.3 5.4a1 1 0 0 1-1.4 0C10.6 15.8 8 13.4 8 11a4 4 0 0 1 8 0Z"/><circle cx="12" cy="11" r="1"/><circle cx="12" cy="12" r="10" stroke-dasharray="2 3"/>',
  report:
    '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M8 17v-4"/><path d="M12.5 17V8"/><path d="M17 17v-6"/>',
  immob: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  sensor:
    '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
  speed: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  minus: '<path d="M6 12h12"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  chip: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  temperature: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  load: '<path d="M12 3a2.5 2.5 0 0 1 2.5 2.5c0 .6-.2 1.1-.5 1.5h3.6a1 1 0 0 1 1 .8L21 20a1 1 0 0 1-1 1.2H4A1 1 0 0 1 3 20L5.4 7.8a1 1 0 0 1 1-.8H10c-.3-.4-.5-.9-.5-1.5A2.5 2.5 0 0 1 12 3Z"/>',
  door: '<path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/>',
  acStar: '<path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9"/>',
  // card telemetry indicators
  gps: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M15 8l2 2"/>',
  ac: '<path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2M4 9l2 3-2 3M20 9l-2 3 2 3"/>',
  belt: '<circle cx="12" cy="4.5" r="2.5"/><path d="M8 22v-8a4 4 0 0 1 8 0v8"/><path d="M7 10l10 9"/>',
  alert:
    '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
} as const;

/** Filled indicator icons (12 px, no stroke). */
const FILLED = {
  battery:
    '<rect x="7" y="4" width="10" height="18" rx="2" fill="currentColor"/><rect x="10" y="2" width="4" height="3" rx="1" fill="currentColor"/>',
  power:
    '<rect x="2" y="7" width="20" height="13" rx="2" fill="currentColor"/><path d="M6 7V5h3v2M15 7V5h3v2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5.5 13.5h4M16 11.5v4M14 13.5h4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
  gsm: '<path d="M21 3v18H3z" fill="currentColor"/>',
  front:
    '<path d="M2 22V10.2c0-.5.2-1 .5-1.3L8.4 2.6c.4-.4.9-.6 1.4-.6H20a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2Z" fill="currentColor"/><path d="M6 9.5 9.6 5.5H19v4Z" fill="#fff" fill-opacity=".85"/>',
  back: '<g transform="matrix(-1 0 0 1 24 0)"><path d="M2 22V10.2c0-.5.2-1 .5-1.3L8.4 2.6c.4-.4.9-.6 1.4-.6H20a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2Z" fill="currentColor"/><path d="M6 9.5 9.6 5.5H19v4Z" fill="#fff" fill-opacity=".85"/></g>',
} as const;

export type IconName = keyof typeof PATHS;
export type FilledIconName = keyof typeof FILLED;

/** A stroked line icon, as the design's ic(path, size). */
export function Icon({ name, size = 15 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}

/** A filled 12 px icon, as the design's fillI(inner). */
export function FilledIcon({ name }: { name: FilledIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={12}
      height={12}
      style={{ display: 'block' }}
      dangerouslySetInnerHTML={{ __html: FILLED[name] }}
    />
  );
}

/** One of the card's indicator icons (stroked or filled, 12 px). */
export type IndicatorIcon = { line: IconName } | { filled: FilledIconName };
export function Indicator({ icon }: { icon: IndicatorIcon }) {
  return 'line' in icon ? <Icon name={icon.line} size={12} /> : <FilledIcon name={icon.filled} />;
}

/** An indicator icon as SVG markup (for DOM built outside React, e.g. Leaflet tooltips). */
export function indicatorSvg(icon: IndicatorIcon): string {
  return 'line' in icon
    ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block">${PATHS[icon.line]}</svg>`
    : `<svg viewBox="0 0 24 24" width="12" height="12" style="display:block">${FILLED[icon.filled]}</svg>`;
}

/** The design's operator badge (a picture used as a mask, coloured green). */
export function OperatorIcon() {
  const mask = `url(${operatorPicture}) center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width: 12,
        height: 12,
        flexShrink: 0,
        background: '#12955F',
        WebkitMask: mask,
        mask,
      }}
    />
  );
}
