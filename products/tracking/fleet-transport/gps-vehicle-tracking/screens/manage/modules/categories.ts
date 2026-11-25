// IT-0036. The vehicle categories of the original page, with their pictures (extracted unchanged
// from the page into ../vehicles/).
const IMAGES = import.meta.glob('../vehicles/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const img = (file: string) => IMAGES[`../vehicles/${file}`];

export interface Category {
  id: string;
  label: string;
  image?: string;
}
export const CATEGORIES: Category[] = [
  ['FORKLIFT', 'ForkLifts', 'fork_lifts_img.png'],
  ['BUS', 'Bus', 'bus_img.png'],
  ['CAR', 'Car', 'car_img.png'],
  ['SMALL_TRUCK_COVERED', 'Small Truck Covered', 'small_truck_covered_img.png'],
  ['BIKE', 'Bike', 'bike_img.png'],
  ['AUTO', 'Auto', 'auto_img.png'],
  ['BOBCAT', 'Bobcat', 'bobcat_img.png'],
  ['PICKUP_1_CABIN', 'Pickup-1 cabin', 'pickup_1_cabin_img.png'],
  ['TANKER', 'Tanker', 'tanker_img.png'],
  ['LOADER', 'Loader', 'loader_img.png'],
  ['DUMPER_TRUCK', 'Dumper Truck', 'dumper_truck.png'],
  ['STREET_SWEEPER', 'Street Sweeper', 'street_sweeper_img.png'],
  ['TOWED_STREET_SWEEPER', 'Towed Street Sweeper', 'towed_street_sweeper_img.png'],
  ['ROAD_ROLLER_COMPACTOR', 'Road Roller Compactor', 'road_roller_compactor_img.png'],
  ['HOOKLIFT', 'Hooklift', 'hook_lift_img.png'],
  ['SMALL_TRUCK_UNCOVERED', 'Small Truck Uncovered', 'small_truck_uncovered_img.png'],
  ['PICKUP_2_CABIN', 'Pickup-2 cabin', 'pickup_2_cabin_img.png'],
  ['CONCRETE_CARRIER', 'Concrete Carrier', 'concrete_carrier_img.png'],
  ['CONCRETE_MIXER', 'Concrete Mixer', 'concrete_mixer_img.png'],
  ['GARBAGE_COMPACTOR', 'Garbage Compactor', 'garbage_compactor_img.png'],
  ['VAN', 'Van', 'van_img.png'],
  ['SMALL_BUS', 'Small bus', 'small_bus_img.png'],
  ['VAN_DELIVERY', 'Van Delivery', 'van_delivery_img.png'],
  ['SCOOTY', 'Scooty', 'scooty_img.png'],
  ['HEAVY_TRUCK', 'Heavy Truck', 'heavy_truck_img.png'],
  ['CONCRETE_PUMP', 'Concrete pumping equipment', 'concrete_pumping_equipment_img.png'],
  ['CEMENT_BULKER', 'Cement bulker', 'cement_bulter_img.png'],
  ['CRAWLER_EXCAVATOR', 'Crawler excavator', 'crawler_excavator_img.png'],
  ['FLATBED_TRUCK', 'Flatbed Truck', 'flatbed_truck_img.png'],
  ['FIRE_RESCUE_TRUCK', 'Fire&Rescue Truck', 'fire_rescue_truck_img.png'],
].map(([id, label, file]) => ({ id: id!, label: label!, image: img(file!) }));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
/** A stored category: the original's code (GARBAGE_COMPACTOR) or its label. */
export function categoryOf(value: string | null | undefined): Category | undefined {
  if (!value) return undefined;
  return BY_ID.get(value) ?? CATEGORIES.find((c) => norm(c.label) === norm(value));
}
