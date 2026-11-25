// The original's vehicle pictures (extracted unchanged from Alerts.html into ./vehicles/) and its
// rule for choosing one: the vehicle category, else words in make, model and name, else Heavy Truck.
const FILES = import.meta.glob<string>('./vehicles/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const img = (file: string) => FILES[`./vehicles/${file}`];

const CATEGORIES: { id: string; label: string; file: string }[] = [
  { id: 'FORKLIFT', label: 'ForkLifts', file: 'fork_lifts_img.png' },
  { id: 'BUS', label: 'Bus', file: 'bus_img.png' },
  { id: 'CAR', label: 'Car', file: 'car_img.png' },
  { id: 'SMALL_TRUCK_COVERED', label: 'Small Truck Covered', file: 'small_truck_covered_img.png' },
  { id: 'BIKE', label: 'Bike', file: 'bike_img.png' },
  { id: 'AUTO', label: 'Auto', file: 'auto_img.png' },
  { id: 'BOBCAT', label: 'Bobcat', file: 'bobcat_img.png' },
  { id: 'PICKUP_1_CABIN', label: 'Pickup-1 cabin', file: 'pickup_1_cabin_img.png' },
  { id: 'TANKER', label: 'Tanker', file: 'tanker_img.png' },
  { id: 'LOADER', label: 'Loader', file: 'loader_img.png' },
  { id: 'DUMPER_TRUCK', label: 'Dumper Truck', file: 'dumper_truck.png' },
  { id: 'STREET_SWEEPER', label: 'Street Sweeper', file: 'street_sweeper_img.png' },
  {
    id: 'TOWED_STREET_SWEEPER',
    label: 'Towed Street Sweeper',
    file: 'towed_street_sweeper_img.png',
  },
  {
    id: 'ROAD_ROLLER_COMPACTOR',
    label: 'Road Roller Compactor',
    file: 'road_roller_compactor_img.png',
  },
  { id: 'HOOKLIFT', label: 'Hooklift', file: 'hook_lift_img.png' },
  {
    id: 'SMALL_TRUCK_UNCOVERED',
    label: 'Small Truck Uncovered',
    file: 'small_truck_uncovered_img.png',
  },
  { id: 'PICKUP_2_CABIN', label: 'Pickup-2 cabin', file: 'pickup_2_cabin_img.png' },
  { id: 'CONCRETE_CARRIER', label: 'Concrete Carrier', file: 'concrete_carrier_img.png' },
  { id: 'CONCRETE_MIXER', label: 'Concrete Mixer', file: 'concrete_mixer_img.png' },
  { id: 'GARBAGE_COMPACTOR', label: 'Garbage Compactor', file: 'garbage_compactor_img.png' },
  { id: 'VAN', label: 'Van', file: 'van_img.png' },
  { id: 'SMALL_BUS', label: 'Small bus', file: 'small_bus_img.png' },
  { id: 'VAN_DELIVERY', label: 'Van Delivery', file: 'van_delivery_img.png' },
  { id: 'SCOOTY', label: 'Scooty', file: 'scooty_img.png' },
  { id: 'HEAVY_TRUCK', label: 'Heavy Truck', file: 'heavy_truck_img.png' },
  {
    id: 'CONCRETE_PUMP',
    label: 'Concrete pumping equipment',
    file: 'concrete_pumping_equipment_img.png',
  },
  { id: 'CEMENT_BULKER', label: 'Cement bulker', file: 'cement_bulter_img.png' },
  { id: 'CRAWLER_EXCAVATOR', label: 'Crawler excavator', file: 'crawler_excavator_img.png' },
  { id: 'FLATBED_TRUCK', label: 'Flatbed Truck', file: 'flatbed_truck_img.png' },
  { id: 'FIRE_RESCUE_TRUCK', label: 'Fire&Rescue Truck', file: 'fire_rescue_truck_img.png' },
];
const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

const WORDS: [string, RegExp][] = [
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

/** Picture for a vehicle. Neon keeps the category as a label (e.g. "Garbage Compactor"). */
export function vehicleImage(v: {
  category?: string | null;
  make?: string | null;
  model?: string | null;
  name?: string | null;
}): string | undefined {
  const cat = v.category?.trim().toLowerCase();
  const byCategory =
    cat && CATEGORIES.find((c) => c.id.toLowerCase() === cat || c.label.toLowerCase() === cat);
  if (byCategory) return img(byCategory.file);
  const text = [v.make, v.model, v.name].filter(Boolean).join(' ').toLowerCase();
  const fallback = BY_ID.get('HEAVY_TRUCK')!;
  if (!text) return img(fallback.file);
  const byLabel = CATEGORIES.find((c) => text.includes(c.label.toLowerCase()));
  if (byLabel) return img(byLabel.file);
  const byWord = WORDS.find(([, re]) => re.test(text));
  return img((byWord && BY_ID.get(byWord[0])?.file) || fallback.file);
}
