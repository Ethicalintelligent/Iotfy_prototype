// IT-0036. The original Dashboard's vehicle-type catalogue and pictures (inlined in the HTML page,
// extracted unchanged to ./assets), and its rule for picking a vehicle's picture.
import auto from './assets/vehicles/auto_img.png';
import bike from './assets/vehicles/bike_img.png';
import bobcat from './assets/vehicles/bobcat_img.png';
import bus from './assets/vehicles/bus_img.png';
import car from './assets/vehicles/car_img.png';
import cementBulker from './assets/vehicles/cement_bulter_img.png';
import concreteCarrier from './assets/vehicles/concrete_carrier_img.png';
import concreteMixer from './assets/vehicles/concrete_mixer_img.png';
import concretePump from './assets/vehicles/concrete_pumping_equipment_img.png';
import crawler from './assets/vehicles/crawler_excavator_img.png';
import dumper from './assets/vehicles/dumper_truck.png';
import fireRescue from './assets/vehicles/fire_rescue_truck_img.png';
import flatbed from './assets/vehicles/flatbed_truck_img.png';
import forklift from './assets/vehicles/fork_lifts_img.png';
import garbage from './assets/vehicles/garbage_compactor_img.png';
import heavyTruck from './assets/vehicles/heavy_truck_img.png';
import hooklift from './assets/vehicles/hook_lift_img.png';
import loader from './assets/vehicles/loader_img.png';
import pickup1 from './assets/vehicles/pickup_1_cabin_img.png';
import pickup2 from './assets/vehicles/pickup_2_cabin_img.png';
import roller from './assets/vehicles/road_roller_compactor_img.png';
import scooty from './assets/vehicles/scooty_img.png';
import smallBus from './assets/vehicles/small_bus_img.png';
import smallCovered from './assets/vehicles/small_truck_covered_img.png';
import smallUncovered from './assets/vehicles/small_truck_uncovered_img.png';
import sweeper from './assets/vehicles/street_sweeper_img.png';
import tanker from './assets/vehicles/tanker_img.png';
import towedSweeper from './assets/vehicles/towed_street_sweeper_img.png';
import vanDelivery from './assets/vehicles/van_delivery_img.png';
import van from './assets/vehicles/van_img.png';
import rank1 from './assets/rank/rank_1.png';
import rank2 from './assets/rank/rank_2.png';
import rank3 from './assets/rank/rank_3.png';
import unused48 from './assets/unused/unused_48.png';
import unused24 from './assets/unused/unused_24_48.png';
import unused20 from './assets/unused/unused_20_24.png';
import unused16 from './assets/unused/unused_16_20.png';
import unused12 from './assets/unused/unused_12_16.png';
import unused8 from './assets/unused/unused_8_12.png';
import unused4 from './assets/unused/unused_4_8.png';
import unused0 from './assets/unused/unused_0_4.png';

export const RANK_IMAGES = [rank1, rank2, rank3];
/** Pictures of the Unused Vehicle Summary buckets, 48+ hrs first. */
export const UNUSED_IMAGES = [
  unused48,
  unused24,
  unused20,
  unused16,
  unused12,
  unused8,
  unused4,
  unused0,
];

export interface VehicleType {
  id: string;
  label: string;
  image: string;
}

const TYPES: VehicleType[] = [
  { id: 'FORKLIFT', label: 'ForkLifts', image: forklift },
  { id: 'BUS', label: 'Bus', image: bus },
  { id: 'CAR', label: 'Car', image: car },
  { id: 'SMALL_TRUCK_COVERED', label: 'Small Truck Covered', image: smallCovered },
  { id: 'BIKE', label: 'Bike', image: bike },
  { id: 'AUTO', label: 'Auto', image: auto },
  { id: 'BOBCAT', label: 'Bobcat', image: bobcat },
  { id: 'PICKUP_1_CABIN', label: 'Pickup-1 cabin', image: pickup1 },
  { id: 'TANKER', label: 'Tanker', image: tanker },
  { id: 'LOADER', label: 'Loader', image: loader },
  { id: 'DUMPER_TRUCK', label: 'Dumper Truck', image: dumper },
  { id: 'STREET_SWEEPER', label: 'Street Sweeper', image: sweeper },
  { id: 'TOWED_STREET_SWEEPER', label: 'Towed Street Sweeper', image: towedSweeper },
  { id: 'ROAD_ROLLER_COMPACTOR', label: 'Road Roller Compactor', image: roller },
  { id: 'HOOKLIFT', label: 'Hooklift', image: hooklift },
  { id: 'SMALL_TRUCK_UNCOVERED', label: 'Small Truck Uncovered', image: smallUncovered },
  { id: 'PICKUP_2_CABIN', label: 'Pickup-2 cabin', image: pickup2 },
  { id: 'CONCRETE_CARRIER', label: 'Concrete Carrier', image: concreteCarrier },
  { id: 'CONCRETE_MIXER', label: 'Concrete Mixer', image: concreteMixer },
  { id: 'GARBAGE_COMPACTOR', label: 'Garbage Compactor', image: garbage },
  { id: 'VAN', label: 'Van', image: van },
  { id: 'SMALL_BUS', label: 'Small bus', image: smallBus },
  { id: 'VAN_DELIVERY', label: 'Van Delivery', image: vanDelivery },
  { id: 'SCOOTY', label: 'Scooty', image: scooty },
  { id: 'HEAVY_TRUCK', label: 'Heavy Truck', image: heavyTruck },
  { id: 'CONCRETE_PUMP', label: 'Concrete pumping equipment', image: concretePump },
  { id: 'CEMENT_BULKER', label: 'Cement bulker', image: cementBulker },
  { id: 'CRAWLER_EXCAVATOR', label: 'Crawler excavator', image: crawler },
  { id: 'FLATBED_TRUCK', label: 'Flatbed Truck', image: flatbed },
  { id: 'FIRE_RESCUE_TRUCK', label: 'Fire&Rescue Truck', image: fireRescue },
];
const BY_ID = new Map(TYPES.map((t) => [t.id, t]));
const HEAVY = BY_ID.get('HEAVY_TRUCK')!;

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

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The original's rule: the vehicle's category if it is one of the catalogue's, otherwise the first
 * catalogue name or keyword found in make, model and name; a heavy truck when nothing matches.
 * (Neon keeps the category as its label, e.g. "Garbage Compactor", so labels are matched too.)
 */
export function vehicleType(v: {
  category?: string | null;
  make?: string | null;
  model?: string | null;
  name?: string | null;
}): VehicleType {
  const cat = v.category?.trim();
  if (cat) {
    const byCat = BY_ID.get(cat) ?? TYPES.find((t) => squash(t.label) === squash(cat));
    if (byCat) return byCat;
  }
  const text = [v.make, v.model, v.name].filter(Boolean).join(' ').toLowerCase();
  if (!text) return HEAVY;
  const byLabel = TYPES.find((t) => text.includes(t.label.toLowerCase()));
  if (byLabel) return byLabel;
  const byWord = WORDS.find(([, re]) => re.test(text));
  return (byWord && BY_ID.get(byWord[0])) || HEAVY;
}
