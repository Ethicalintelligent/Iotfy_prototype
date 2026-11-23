// Vehicle pictures from the approved GPS Vehicle Tracking design (Desktop/vs, Nov 2026).
// One picture per vehicle category; anything unknown shows the box truck.
import bus from './vehicles/bus.png';
import car from './vehicles/car.png';
import compactor from './vehicles/compactor.png';
import dumpTruck from './vehicles/dump-truck.png';
import flatbed from './vehicles/flatbed.png';
import pickup from './vehicles/pickup.png';
import tanker from './vehicles/tanker.png';
import truck from './vehicles/truck.png';
import van from './vehicles/van.png';

export const VEHICLE_PHOTOS = {
  bus,
  car,
  compactor,
  'dump-truck': dumpTruck,
  flatbed,
  pickup,
  tanker,
  truck,
  van,
} as const;

export type VehiclePhotoKind = keyof typeof VEHICLE_PHOTOS;

/** The picture for a vehicle category name ("Garbage Compactor", "Pickup - 1 cabin", "Van"…). */
export function vehiclePhotoKind(category: string | null | undefined): VehiclePhotoKind {
  const c = (category ?? '').toLowerCase();
  if (c.includes('compactor') || c.includes('garbage') || c.includes('waste')) return 'compactor';
  if (c.includes('pickup') || c.includes('pick-up')) return 'pickup';
  if (c.includes('van')) return 'van';
  if (c.includes('bus')) return 'bus';
  if (c.includes('car') || c.includes('sedan') || c.includes('suv')) return 'car';
  if (c.includes('tank')) return 'tanker';
  if (c.includes('dump') || c.includes('tipper')) return 'dump-truck';
  if (c.includes('flat') || c.includes('trailer')) return 'flatbed';
  return 'truck';
}

export interface VehiclePhotoProps {
  /** A kind, or a category name (mapped with vehiclePhotoKind). */
  kind?: VehiclePhotoKind;
  category?: string | null;
  /** Width in px (height follows; the pictures are square). Default 40. */
  size?: number;
  className?: string;
}

/** A vehicle picture (decorative: the vehicle's name is always written next to it). */
export function VehiclePhoto({ kind, category, size = 40, className }: VehiclePhotoProps) {
  const k = kind ?? vehiclePhotoKind(category);
  return (
    <img
      src={VEHICLE_PHOTOS[k]}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain', display: 'block' }}
      draggable={false}
    />
  );
}
