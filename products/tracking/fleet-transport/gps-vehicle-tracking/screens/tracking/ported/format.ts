// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { ApiError, api } from '../runtime';
import { ASSET_URLS } from '../vehicles';

export const pad2 = (e?: any) => String(e).padStart(2, '0');

export let timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const formatters = new Map<any, any>();

export function setTimeZone(e?: any) {
  if (!(!e || e === timeZone)) {
    try {
      new Intl.DateTimeFormat('en-GB', {
        timeZone: e,
      });
    } catch {
      return;
    }
    timeZone = e;
    formatters.clear();
  }
}

export function formatter(e?: any, t?: any) {
  const n = JSON.stringify([e, t]);
  let r = formatters.get(n);
  if (!r) {
    formatters.set(
      n,
      (r = new Intl.DateTimeFormat(e, {
        ...t,
        timeZone: timeZone,
      })),
    );
  }
  return r;
}

export function zonedParts(e?: any) {
  const t: any = {};
  for (const n of formatter('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(e))
    n.type !== 'literal' && (t[n.type] = Number(n.value));
  return {
    y: t.year,
    m: t.month,
    d: t.day,
    h: t.hour % 24,
    mi: t.minute,
    s: t.second,
  };
}

export const dayKey = (e?: any) => {
  const t = zonedParts(e.getTime());
  return `${t.y}-${pad2(t.m)}-${pad2(t.d)}`;
};

export const localIso = (e?: any) => {
  const t = zonedParts(e.getTime());
  return `${t.y}-${pad2(t.m)}-${pad2(t.d)}T${pad2(t.h)}:${pad2(t.mi)}:${pad2(t.s)}`;
};

export function dayStart(e?: any) {
  const [t = 1970, n = 1, r = 1] = e.split('-').map(Number),
    i = Date.UTC(t, n - 1, r),
    s = (l?: any) => {
      const c = zonedParts(l);
      return Date.UTC(c.y, c.m - 1, c.d, c.h, c.mi, c.s) - Math.floor(l / 1e3) * 1e3;
    };
  let a = i - s(i);
  a = i - s(a);
  return new Date(a);
}

export const todayStart = () => dayStart(dayKey(new Date()));

export function addDays(e?: any, t?: any) {
  const [n = 1970, r = 1, i = 1] = e.split('-').map(Number),
    s = new Date(Date.UTC(n, r - 1, i + t));
  return `${s.getUTCFullYear()}-${pad2(s.getUTCMonth() + 1)}-${pad2(s.getUTCDate())}`;
}

export function dayRange(e?: any) {
  return {
    from: dayStart(e),
    to: dayStart(addDays(e, 1)),
  };
}

export function formatClock(e?: any) {
  const { h: t, mi: n } = zonedParts(e);
  return `${pad2(t % 12 || 12)}:${pad2(n)} ${t < 12 ? 'AM' : 'PM'}`;
}

export const formatClockSeconds = (e?: any) => {
  const t = zonedParts(e);
  return `${pad2(t.h)}:${pad2(t.mi)}:${pad2(t.s)}`;
};

export const formatDateTime = (e?: any) =>
  formatter([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(e);

export const formatDay = (e?: any, t?: any, n: any = []) => {
  const [r = 1970, i = 1, s = 1] = e.split('-').map(Number);
  return new Intl.DateTimeFormat(n, {
    ...t,
    timeZone: 'UTC',
  }).format(Date.UTC(r, i - 1, s, 12));
};

export const formatLongDay = (e?: any) =>
  formatDay(
    e,
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
    'en-GB',
  );

export function formatMinutes(e?: any) {
  const t = Math.round(e),
    n = Math.floor(t / 60);
  return n ? `${n}h ${t % 60}m` : `${t}m`;
}

export const ALERTS_URL = '/api/v1/tracking/alerts';

export const ALERT_VIEW_PERMISSION = 'tracking:alert:view';

export const alertsApi: any = {
  list: (e?: any) => {
    return api(ALERTS_URL, {
      query: {
        assetType: e.assetType,
        from: e.from.toISOString(),
        to: e.to.toISOString(),
        type: e.types?.join(','),
        assetId: e.assetIds?.join(','),
        page: e.page ?? 0,
        size: e.size ?? 100,
      },
    });
  },
  summary: (e?: any, t?: any, n?: any) =>
    api(`${ALERTS_URL}/summary`, {
      query: {
        assetType: e,
        from: t.toISOString(),
        to: n.toISOString(),
      },
    }),
};

export const isMissingEndpoint = (e?: any) =>
  e instanceof ApiError && (e.status === 404 || e.status === 501);

export function inRange(e?: any, t?: any, n?: any) {
  const r = Date.parse(e);
  return Number.isNaN(r)
    ? true
    : r >= t.getTime() && (r < n.getTime() || n.getTime() >= Date.now() - 6e4);
}

export function distanceMeters(e?: any, t?: any) {
  const r = Math.PI / 180,
    i = (t[0] - e[0]) * r,
    s = (t[1] - e[1]) * r,
    a = Math.sin(i / 2) ** 2 + Math.cos(e[0] * r) * Math.cos(t[0] * r) * Math.sin(s / 2) ** 2;
  return 2 * 6371e3 * Math.asin(Math.sqrt(a));
}

export const STATUS_VOCABULARY: any = {
  moving: {
    id: 'moving',
    label: 'Running',
    tone: 'green',
    icon: 'Play',
    about: 'Moving at a normal speed',
  },
  stopped: {
    id: 'stopped',
    label: 'Stopped',
    tone: 'red',
    icon: 'Square',
    about: 'Ignition off',
  },
  idle: {
    id: 'idle',
    label: 'Idle',
    tone: 'blue',
    icon: 'Clock',
    about: 'Not moving, not switched off',
  },
  overspeed: {
    id: 'overspeed',
    label: 'Overspeed',
    tone: 'orange',
    icon: 'Gauge',
    about: 'Above the speed limit now',
  },
  towed: {
    id: 'towed',
    label: 'Towed',
    tone: 'teal',
    icon: 'Truck',
    about: 'Moving with the ignition off',
  },
  offline: {
    id: 'offline',
    label: 'No Transmit',
    tone: 'dark',
    icon: 'WifiOff',
    about: 'No report in 24 h',
  },
  never: {
    id: 'never',
    label: 'Yet to Transmit',
    tone: 'gray',
    icon: 'Hourglass',
    about: 'No position received yet',
  },
};

export const OFFLINE_AFTER_MS = 30 * 60 * 1e3;

export const GAP_MS = 10 * 60 * 1e3;

export const MOVING_KMH = 5;

export const OVERSPEED_KMH = 120;

export const VEHICLE_PROFILE: any = {
  ignition: true,
  overspeed: true,
  overspeedKmh: OVERSPEED_KMH,
  vocabulary: STATUS_VOCABULARY,
  order: ['moving', 'stopped', 'idle', 'overspeed', 'towed', 'offline', 'never'],
  icons: {
    one: 'Truck',
    many: 'Truck',
  },
  thumb: 'Truck',
};

export function speedLimitOf(e?: any, t?: any) {
  const n = t ? e.limitOf?.(t) : null;
  return n != null && n > 0 ? n : e.overspeedKmh;
}

export function profileFor(e?: any, t?: any) {
  const n = speedLimitOf(e, t);
  return n === e.overspeedKmh
    ? e
    : {
        ...e,
        overspeedKmh: n,
      };
}

export function statusOf(e?: any, t: any = VEHICLE_PROFILE) {
  return t.vocabulary[e] ?? t.vocabulary.offline ?? STATUS_VOCABULARY[e];
}

export function liveStatus(e?: any, t: any = Date.now(), n: any = VEHICLE_PROFILE, r?: any) {
  const i = Date.parse(e.ts),
    s = Math.max(i, (r && Date.parse(r)) || 0);
  if (t - s > OFFLINE_AFTER_MS) return statusOf('offline', n);
  const a = t - i > OFFLINE_AFTER_MS ? 0 : (e.speed ?? 0);
  return a >= MOVING_KMH
    ? n.ignition && e.ignition === false
      ? statusOf('towed', n)
      : n.overspeed && e.ignition != null && a > speedLimitOf(n, e.assetId)
        ? statusOf('overspeed', n)
        : statusOf('moving', n)
    : n.ignition && e.ignition === false
      ? statusOf('stopped', n)
      : statusOf('idle', n);
}

export function ago(e?: any, t: any = Date.now()) {
  const n = Math.max(0, Math.round((t - Date.parse(e)) / 1e3));
  return n < 60
    ? 'just now'
    : n < 3600
      ? `${Math.round(n / 60)} min ago`
      : n < 86400
        ? `${Math.floor(n / 3600)} h ago`
        : `${Math.floor(n / 86400)} d ago`;
}

export const COMPASS: any = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const compassPoint = (e?: any) => COMPASS[Math.round(e / 45) % 8];

export const formatLatLng = (e?: any, t?: any) => `${e.toFixed(5)}, ${t.toFixed(5)}`;

export const placeName = (e?: any) => {
  return e.locationName?.trim() || formatLatLng(e.lat, e.lng);
};

export const TICK_MS = 5e3;

export function useNow(e: any = TICK_MS) {
  const [t, n] = useState<any>(Date.now());
  useEffect(() => {
    const r = setInterval(() => n(Date.now()), e);
    return () => clearInterval(r);
  }, [e]);
  return t;
}

export const ALERT_TYPES: any = [
  {
    id: 'OVERSPEED',
    label: 'Overspeed',
    icon: 'Gauge',
    tone: 'red',
    about: 'Faster than the speed limit',
  },
  {
    id: 'HARSH_BRAKING',
    label: 'Harsh Braking',
    icon: 'OctagonX',
    tone: 'red',
    about: 'Sudden deceleration',
  },
  {
    id: 'HARSH_ACCELERATION',
    label: 'Harsh Driving',
    icon: 'TriangleAlert',
    tone: 'orange',
    about: 'Sudden acceleration',
  },
  {
    id: 'HARSH_CORNERING',
    label: 'Harsh Cornering',
    icon: 'TriangleAlert',
    tone: 'amber',
    about: 'Took a turn too sharply',
  },
  {
    id: 'IDLE',
    label: 'Idle',
    icon: 'Clock',
    tone: 'blue',
    about: 'Engine on without moving for too long',
  },
  {
    id: 'GEOFENCE_ENTER',
    label: 'Geofence Entry',
    icon: 'MapPinned',
    tone: 'teal',
    about: 'Entered a geofence',
  },
  {
    id: 'GEOFENCE_EXIT',
    label: 'Geofence Exit',
    icon: 'MapPinned',
    tone: 'orange',
    about: 'Left a geofence',
  },
  {
    id: 'POWER_CUT',
    label: 'Power Cut',
    icon: 'Zap',
    tone: 'amber',
    about: 'Tracker lost external power',
  },
  {
    id: 'TOWED',
    label: 'Towed',
    icon: 'Truck',
    tone: 'teal',
    about: 'Moved with the ignition off',
  },
  {
    id: 'SOS',
    label: 'SOS',
    icon: 'Siren',
    tone: 'red',
    about: 'Panic button pressed',
  },
  {
    id: 'LOW_BATTERY',
    label: 'Low Battery',
    icon: 'BatteryLow',
    tone: 'amber',
    about: 'Device battery is low',
  },
  {
    id: 'DEVICE_OFFLINE',
    label: 'Device Offline',
    icon: 'WifiOff',
    tone: 'dark',
    about: 'No report for a long time',
  },
  {
    id: 'MOCK_LOCATION',
    label: 'Fake Location',
    icon: 'ShieldAlert',
    tone: 'purple',
    about: 'The phone reported a mock location',
  },
];

export const ALERT_TYPE_BY_ID = new Map<any, any>(ALERT_TYPES.map((e?: any) => [e.id, e]));

export function alertType(e?: any) {
  return (
    ALERT_TYPE_BY_ID.get(e) ?? {
      id: e,
      label: e
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/^\w/, (t?: any) => t.toUpperCase()),
      icon: 'Bell',
      tone: 'blue',
      about: '',
    }
  );
}

export function assetUrl(e?: any) {
  return ASSET_URLS[e] ?? e;
}

export const vehicleImage = (e?: any) => assetUrl(`assets/vehicles/${e}`);

export const VEHICLE_CATEGORIES: any = [
  {
    id: 'FORKLIFT',
    label: 'ForkLifts',
    image: vehicleImage('fork_lifts_img.png'),
  },
  {
    id: 'BUS',
    label: 'Bus',
    image: vehicleImage('bus_img.png'),
  },
  {
    id: 'CAR',
    label: 'Car',
    image: vehicleImage('car_img.png'),
  },
  {
    id: 'SMALL_TRUCK_COVERED',
    label: 'Small Truck Covered',
    image: vehicleImage('small_truck_covered_img.png'),
  },
  {
    id: 'BIKE',
    label: 'Bike',
    image: vehicleImage('bike_img.png'),
  },
  {
    id: 'AUTO',
    label: 'Auto',
    image: vehicleImage('auto_img.png'),
  },
  {
    id: 'BOBCAT',
    label: 'Bobcat',
    image: vehicleImage('bobcat_img.png'),
  },
  {
    id: 'PICKUP_1_CABIN',
    label: 'Pickup-1 cabin',
    image: vehicleImage('pickup_1_cabin_img.png'),
  },
  {
    id: 'TANKER',
    label: 'Tanker',
    image: vehicleImage('tanker_img.png'),
  },
  {
    id: 'LOADER',
    label: 'Loader',
    image: vehicleImage('loader_img.png'),
  },
  {
    id: 'DUMPER_TRUCK',
    label: 'Dumper Truck',
    image: vehicleImage('dumper_truck.png'),
  },
  {
    id: 'STREET_SWEEPER',
    label: 'Street Sweeper',
    image: vehicleImage('street_sweeper_img.png'),
  },
  {
    id: 'TOWED_STREET_SWEEPER',
    label: 'Towed Street Sweeper',
    image: vehicleImage('towed_street_sweeper_img.png'),
  },
  {
    id: 'ROAD_ROLLER_COMPACTOR',
    label: 'Road Roller Compactor',
    image: vehicleImage('road_roller_compactor_img.png'),
  },
  {
    id: 'HOOKLIFT',
    label: 'Hooklift',
    image: vehicleImage('hook_lift_img.png'),
  },
  {
    id: 'SMALL_TRUCK_UNCOVERED',
    label: 'Small Truck Uncovered',
    image: vehicleImage('small_truck_uncovered_img.png'),
  },
  {
    id: 'PICKUP_2_CABIN',
    label: 'Pickup-2 cabin',
    image: vehicleImage('pickup_2_cabin_img.png'),
  },
  {
    id: 'CONCRETE_CARRIER',
    label: 'Concrete Carrier',
    image: vehicleImage('concrete_carrier_img.png'),
  },
  {
    id: 'CONCRETE_MIXER',
    label: 'Concrete Mixer',
    image: vehicleImage('concrete_mixer_img.png'),
  },
  {
    id: 'GARBAGE_COMPACTOR',
    label: 'Garbage Compactor',
    image: vehicleImage('garbage_compactor_img.png'),
  },
  {
    id: 'VAN',
    label: 'Van',
    image: vehicleImage('van_img.png'),
  },
  {
    id: 'SMALL_BUS',
    label: 'Small bus',
    image: vehicleImage('small_bus_img.png'),
  },
  {
    id: 'VAN_DELIVERY',
    label: 'Van Delivery',
    image: vehicleImage('van_delivery_img.png'),
  },
  {
    id: 'SCOOTY',
    label: 'Scooty',
    image: vehicleImage('scooty_img.png'),
  },
  {
    id: 'HEAVY_TRUCK',
    label: 'Heavy Truck',
    image: vehicleImage('heavy_truck_img.png'),
  },
  {
    id: 'CONCRETE_PUMP',
    label: 'Concrete pumping equipment',
    image: vehicleImage('concrete_pumping_equipment_img.png'),
  },
  {
    id: 'CEMENT_BULKER',
    label: 'Cement bulker',
    image: vehicleImage('cement_bulter_img.png'),
  },
  {
    id: 'CRAWLER_EXCAVATOR',
    label: 'Crawler excavator',
    image: vehicleImage('crawler_excavator_img.png'),
  },
  {
    id: 'FLATBED_TRUCK',
    label: 'Flatbed Truck',
    image: vehicleImage('flatbed_truck_img.png'),
  },
  {
    id: 'FIRE_RESCUE_TRUCK',
    label: 'Fire&Rescue Truck',
    image: vehicleImage('fire_rescue_truck_img.png'),
  },
];

export const CATEGORY_BY_ID = new Map<any, any>(VEHICLE_CATEGORIES.map((e?: any) => [e.id, e]));

export const DEFAULT_CATEGORY = CATEGORY_BY_ID.get('HEAVY_TRUCK');

export const CATEGORY_PATTERNS: any = [
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

export const categoryById = (e?: any) => (e ? CATEGORY_BY_ID.get(e) : undefined);

export function categoryOf(e?: any) {
  const t = categoryById(e?.category);
  if (t) return t;
  const n = [e?.make, e?.model, e?.name].filter(Boolean).join(' ').toLowerCase();
  if (!n) return DEFAULT_CATEGORY;
  const r = VEHICLE_CATEGORIES.find((s?: any) => n.includes(s.label.toLowerCase()));
  if (r) return r;
  const i = CATEGORY_PATTERNS.find(([, s]: any) => s.test(n));
  return (i && CATEGORY_BY_ID.get(i[0])) || DEFAULT_CATEGORY;
}

export const vehicleImageOf = (e?: any) => categoryOf(e).image;
