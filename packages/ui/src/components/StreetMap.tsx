// Real street map (Leaflet + OpenStreetMap tiles): vehicle markers coloured by status, nearby
// markers grouped into a count bubble, plate labels, geofences and a route. From the approved
// GPS Vehicle Tracking design (Desktop/vs, Nov 2026). The tiles need an internet connection.
// Leaflet itself loads only when a map is shown (StreetMapView), so apps without maps and the
// unit tests never load it.
import { Suspense, lazy, type ReactNode } from 'react';
import type { IconName } from '../icons';
import { cx } from '../cx';
import { Icon, type Hue } from './basics';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  /** Label pill above the marker (e.g. a plate number); shown when the map's `labels` is on. */
  label?: string;
  /** Second part of the label (e.g. "24 km/h"). */
  detail?: string;
  /** Colour (default green). */
  hue?: Hue;
  /** Icon in the marker (default `vehicles`). */
  icon?: IconName;
  /** Pulsing ring, e.g. moving vehicles (off when the user prefers reduced motion). */
  pulse?: boolean;
}

export interface MapFence {
  id: string;
  name: string;
  shape: 'circle' | 'polygon';
  lat?: number;
  lng?: number;
  radiusM?: number;
  /** Polygon corners as [lat, lng]. */
  points?: [number, number][];
  /** Default purple. */
  hue?: Hue;
}

export interface MapRoute {
  /** The path as [lat, lng], oldest first. */
  points: [number, number][];
  /** Stops along it (amber pins). */
  stops?: [number, number][];
  /** Line colour in `routes` (default blue). */
  hue?: Hue;
}

export interface StreetMapProps {
  /** Accessible name, e.g. "Live map of 12 vehicles". */
  label: string;
  markers?: MapMarker[];
  fences?: MapFence[];
  route?: MapRoute;
  /** Several routes at once, each in its own `hue` (e.g. replaying vehicles side by side). */
  routes?: MapRoute[];
  /** Group markers that are close together into a count bubble (default true). */
  cluster?: boolean;
  /** Plate labels above the markers (default false). */
  labels?: boolean;
  /** The highlighted marker; it is never grouped and the map pans to it when it changes. */
  selected?: string | null;
  onSelect?: (id: string) => void;
  /** A click on the map itself (not a marker), e.g. to place a geofence's centre or corners. */
  onMapClick?: (lat: number, lng: number) => void;
  /** Start view when there is nothing to fit (default Riyadh). */
  center?: [number, number];
  zoom?: number;
  /** Fit the view to markers, fences and route on first data and whenever this changes. */
  fitKey?: string | number;
  /** Mouse-wheel zoom (default false, so the page scrolls past small maps). */
  wheelZoom?: boolean;
  /** CSS height (default 100%: give the parent a height). */
  height?: number | string;
  /** Top-right overlay (e.g. a "Live · updated 14:29" pill). */
  overlay?: ReactNode;
  /** Bottom overlay (e.g. a trip panel). */
  footer?: ReactNode;
  /** Extra buttons under the map tools (use MapToolButton). */
  tools?: ReactNode;
  className?: string;
}

/** A round button for the map's tool column (zoom, fit, layers…). */
export function MapToolButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cx('ui-smap-tool', active && 'is-on')}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

const View = lazy(() => import('./StreetMapView'));

/** Street map with vehicle markers, geofences and a route (Leaflet + OpenStreetMap). */
export function StreetMap(props: StreetMapProps) {
  return (
    <Suspense
      fallback={
        <div
          className={cx('ui-smap', props.className)}
          style={props.height != null ? { height: props.height } : undefined}
          role="region"
          aria-label={props.label}
          aria-busy="true"
        />
      }
    >
      <View {...props} />
    </Suspense>
  );
}
