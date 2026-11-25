// IT-0036. The vehicle categories (label + picture) of the earlier Smart Track Grid View, and how a
// vehicle's category, make, model or name picks one. Used by the approved Grid View design (IT-0037)
// for vehicle types without a picture of their own in that design. Pictures: ./vehicles/.
const images = import.meta.glob('./vehicles/*.png', { eager: true, import: 'default' }) as Record<
  string,
  string
>;
const img = (file: string) => images[`./vehicles/${file}`] ?? '';

export interface VehicleType {
  id: string;
  label: string;
  image: string;
}

const LIST: [string, string, string][] = [
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
];

export const VEHICLE_TYPES: VehicleType[] = LIST.map(([id, label, file]) => ({
  id,
  label,
  image: img(file),
}));
const BY_ID = new Map(VEHICLE_TYPES.map((t) => [t.id, t]));
const HEAVY_TRUCK = BY_ID.get('HEAVY_TRUCK')!;

/** Words in make / model / name that point to a category (same order as the original). */
const PATTERNS: [string, RegExp][] = [
  ['FIRE_RESCUE_TRUCK', /fire|rescue/],
  ['TOWED_STREET_SWEEPER', /towed.*sweep|sweep.*towed|trailer sweep/],
  ['STREET_SWEEPER', /sweep/],
  ['GARBAGE_COMPACTOR', /garbage|refuse|waste|compactor truck/],
  ['ROAD_ROLLER_COMPACTOR', /roller|compactor|bomag|hamm|dynapac/],
  ['CONCRETE_PUMP', /pump|putzmeister/],
  ['CEMENT_BULKER', /bulker|cement bulk/],
  ['CONCRETE_CARRIER', /concrete carrier|precast|block carrier/],
  ['CONCRETE_MIXER', /mixer|stetter|schwing/],
  ['CRAWLER_EXCAVATOR', /excavator|crawler|digger/],
  ['BOBCAT', /bobcat|skid ?steer/],
  ['LOADER', /loader|backhoe|jcb/],
  ['FORKLIFT', /fork ?lift|linde|hyster|jungheinrich/],
  ['HOOKLIFT', /hook ?lift|roll ?off|skip/],
  ['TANKER', /tanker|bowser|water tank|fuel tank/],
  ['DUMPER_TRUCK', /dump|tipper|hyva/],
  ['FLATBED_TRUCK', /flat ?bed|low ?bed|platform|trailer/],
  ['SCOOTY', /scoot|activa|jupiter|vespa/],
  ['BIKE', /bike|motorcycle|pulsar|splendor|enfield/],
  ['AUTO', /\bauto\b|rickshaw|tuk|three ?wheel/],
  ['SMALL_BUS', /small bus|mini ?bus|coaster|rosa|traveller|urbania|county/],
  ['BUS', /\bbus\b|coach/],
  ['VAN_DELIVERY', /deliver|panel van|cargo van|transit|sprinter|crafter|ducato/],
  ['VAN', /\bvan\b|hiace|hiance|h-?1\b|starex|staria|urvan|eeco/],
  ['PICKUP_2_CABIN', /double cab|crew cab|dual cab|2 cabin|2-cabin/],
  [
    'PICKUP_1_CABIN',
    /pick ?up|single cab|1 cabin|1-cabin|hilux|d-?max|navara|ranger|l200|triton|bolero|yodha/,
  ],
  ['SMALL_TRUCK_UNCOVERED', /uncovered|open (body|deck)|drop ?side/],
  [
    'SMALL_TRUCK_COVERED',
    /small truck|light truck|box truck|canter|\belf\b|npr|nkr|dyna|dost|\bace\b|eicher/,
  ],
  [
    'CAR',
    /\bcar\b|sedan|hatch|suv|corolla|camry|accord|civic|elantra|sonata|accent|yaris|sunny|altima|cruiser|prado|dzire|verna|swift|innova|city/,
  ],
  ['HEAVY_TRUCK', /heavy|truck|prima|actros|scania|volvo|bharatbenz|signa|leyland|prime mover/],
];

/** The vehicle's category: its stored category first, then words in make, model and name. */
export function vehicleType(v: {
  category?: string | null;
  make?: string | null;
  model?: string | null;
  name?: string | null;
}): VehicleType {
  const cat = v.category?.trim();
  if (cat) {
    const byId = BY_ID.get(cat.toUpperCase().replace(/[^A-Z0-9]+/g, '_'));
    if (byId) return byId;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const byLabel = VEHICLE_TYPES.find((t) => norm(t.label) === norm(cat));
    if (byLabel) return byLabel;
  }
  const text = [cat, v.make, v.model, v.name].filter(Boolean).join(' ').toLowerCase();
  if (!text) return HEAVY_TRUCK;
  const named = VEHICLE_TYPES.find((t) => text.includes(t.label.toLowerCase()));
  if (named) return named;
  const hit = PATTERNS.find(([, re]) => re.test(text));
  return (hit && BY_ID.get(hit[0])) || HEAVY_TRUCK;
}
