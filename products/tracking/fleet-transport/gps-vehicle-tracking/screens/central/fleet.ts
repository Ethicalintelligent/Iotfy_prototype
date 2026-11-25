// IT-0036. The company's vehicles from Neon (gps.tracked_asset + vehicle_details, operators, users,
// devices, groups; IT-0040) joined with the demo live positions, as the rows the page shows.
import { useMemo } from 'react';
import {
  useOperators,
  useVehicleDetails,
} from '@iotify/data';
import { useFleetAssets, useFleetDevices, useFleetGroups, useFleetUsers } from '../fleet-rows';
import {
  profileFor,
  statusOf,
  STATUS,
  telemetryOf,
  useNow,
  usePositions,
  type Position,
  type Profile,
  type Status,
  type Telemetry,
} from './demo';

const images = import.meta.glob<string>('./vehicles/*.png', { eager: true, import: 'default' });
const img = (file: string) => images[`./vehicles/${file}`];

/** Vehicle categories and pictures (the original's list and matching rules). */
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
const RULES: [string, RegExp][] = [
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

function categoryOf(
  category?: string | null,
  make?: string | null,
  model?: string | null,
  name?: string | null,
) {
  const direct = category
    ? (BY_ID.get(category) ??
      CATEGORIES.find((c) => c.label.toLowerCase() === category.toLowerCase()))
    : undefined;
  if (direct) return direct;
  const text = [make, model, name].filter(Boolean).join(' ').toLowerCase();
  const fallback = BY_ID.get('HEAVY_TRUCK')!;
  if (!text) return fallback;
  const byLabel = CATEGORIES.find((c) => text.includes(c.label.toLowerCase()));
  if (byLabel) return byLabel;
  const rule = RULES.find(([, re]) => re.test(text));
  return (rule && BY_ID.get(rule[0])) || fallback;
}

export interface Vehicle {
  id: string;
  name: string;
  /** Plate (gps.tracked_asset.code): the original's "code". */
  code?: string;
  image?: string;
  typeLabel: string;
  make: string;
  model: string;
  odometerKm: number | null;
  profile: Profile;
  group: string | null;
  manager: string;
  supervisor: string;
  operator: { name: string; tagId: string; phone: string } | null;
  index: number;
}

export interface Row {
  id: string;
  name: string;
  vehicle: Vehicle;
  position: Position | null;
  status: Status;
}

/** A user limited to a group sees its sub-groups' vehicles too. */
function groupScope(
  groups: { id: string; name: string; parent_id?: string | null }[],
  top: string | null,
) {
  if (!top) return null;
  const root = groups.find((g) => g.name === top);
  const names = new Set([top]);
  if (!root) return names;
  const ids = new Set([root.id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const g of groups)
      if (g.parent_id && ids.has(g.parent_id) && !ids.has(g.id)) {
        ids.add(g.id);
        names.add(g.name);
        grew = true;
      }
  }
  return names;
}

export function useFleetRows(companyId: string, assetGroup: string | null) {
  const assets = useFleetAssets(companyId);
  const details = useVehicleDetails();
  const operators = useOperators({ company_id: Number(companyId) });
  const users = useFleetUsers(companyId);
  const devices = useFleetDevices(companyId);
  const groups = useFleetGroups(companyId);

  const vehicles = useMemo(() => {
    const scope = groupScope(groups.data ?? [], assetGroup);
    const det = new Map((details.data ?? []).map((d) => [String(d.asset_id), d] as const));
    const ops = new Map((operators.data ?? []).map((o) => [o.id, o]));
    const people = new Map([
      ...(users.data ?? []).map((u) => [u.id, u.name ?? ''] as const),
      ...(operators.data ?? []).map((o) => [o.id, o.name] as const),
    ]);
    const list = (assets.data ?? [])
      .filter((a) => det.has(a.id) && (!scope || (a.asset_group && scope.has(a.asset_group))))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true }));
    return list.map((a, index): Vehicle => {
      const d = det.get(a.id)!;
      const op = d.operator_id ? ops.get(d.operator_id) : undefined;
      const cat = categoryOf(d.category, d.make, d.model, a.name);
      return {
        id: a.id,
        name: a.name ?? a.plate_serial ?? a.id,
        code: a.plate_serial ?? undefined,
        image: img(cat.file),
        typeLabel: cat.label,
        make: d.make ?? '',
        model: d.model ?? '',
        odometerKm: d.odometer_km ?? null,
        profile: profileFor(d.speed_limit_kmh),
        group: a.asset_group ?? null,
        manager: (d.fleet_manager_id && people.get(String(d.fleet_manager_id))?.trim()) || '',
        supervisor: (d.supervisor_id && people.get(String(d.supervisor_id))?.trim()) || '',
        operator: op ? { name: op.name, tagId: op.tag_id ?? '', phone: op.contact_no ?? '' } : null,
        index,
      };
    });
  }, [assets.data, details.data, operators.data, users.data, groups.data, assetGroup]);

  // Vehicles with a tracker report (every 11th stays "Yet to Transmit", as in the original demo).
  const fitted = new Set((devices.data ?? []).map((d) => d.asset_id).filter(Boolean));
  const reporting = vehicles
    .filter((v) => fitted.has(v.id) && v.index % 11 !== 10)
    .map((v) => v.id);
  const positions = usePositions(reporting);
  const now = useNow();

  const rows: Row[] = vehicles.map((v) => {
    const p = positions.get(v.id) ?? null;
    return {
      id: v.id,
      name: v.name,
      vehicle: v,
      position: p,
      status: p ? statusOf(p, now, v.profile) : STATUS.never,
    };
  });

  const pending = assets.isPending || details.isPending;
  const error = assets.error ?? details.error ?? null;
  return {
    rows,
    isPending: pending,
    isError: !!error,
    error,
    refetch: () => {
      void assets.refetch();
      void details.refetch();
    },
    telemetry: (id: string): Telemetry | undefined => {
      const v = vehicles.find((x) => x.id === id);
      return v ? telemetryOf(id, v.index, v.odometerKm) : undefined;
    },
  };
}
