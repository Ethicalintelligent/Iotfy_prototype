// Demo report figures (root CLAUDE.md §8: labelled "Demo data" on screen). The original page's
// own demo generators, run on the company's real vehicles and users from Neon: the same seeded
// random numbers per vehicle and day, so a report shows the same figures every time it runs.
// Where Neon knows a vehicle's type, model, operator, IMEI or SIM, that real value is shown
// instead of the generator's invented one.

export interface ReportVehicle {
  id: string;
  /** Plate number (shown as "Vehicle No"). */
  name: string;
  groupId: string | null;
  group: string | null;
  vehicleType?: string | null;
  model?: string | null;
  operator?: {
    name: string;
    contact?: string | null;
    tagId?: string | null;
    branch?: string | null;
  } | null;
  imei?: string | null;
  simNo?: string | null;
  deviceMake?: string | null;
  deviceModel?: string | null;
  purchaseDate?: string | null;
}

export interface ReportUser {
  id: string;
  name: string;
  role?: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type DemoRow = Record<string, any>;
const DAY = 864e5;

function seeded(key: string) {
  let t = 2166136261;
  for (let i = 0; i < key.length; i++) t = Math.imul(t ^ key.charCodeAt(i), 16777619);
  return () => {
    t = Math.imul(t ^ (t >>> 15), 2246822507);
    t = Math.imul(t ^ (t >>> 13), 3266489909);
    return ((t ^= t >>> 16) >>> 0) / 4294967296;
  };
}
/** The user reports' generator (one step shorter, as in the original). */
function seededUsers(key: string) {
  let t = 2166136261;
  for (let i = 0; i < key.length; i++) t = Math.imul(t ^ key.charCodeAt(i), 16777619);
  return () => {
    t = Math.imul(t ^ (t >>> 15), 2246822507);
    return ((t ^= t >>> 13) >>> 0) / 4294967296;
  };
}

const iso = (ms: number) => new Date(ms).toISOString();
const dayOf = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const pick = <T>(rnd: () => number, list: T[]): T => list[Math.floor(rnd() * list.length)]!;
const latLng = (rnd: () => number) =>
  `${(24.6 + rnd() * 0.2).toFixed(6)}, ${(46.6 + rnd() * 0.2).toFixed(6)}`;
const round1 = (n: number) => Math.round(n * 10) / 10;

const TYPES = ['Truck', 'Truck', 'Trailer', 'LCV', 'Pickup-1 cabin'];
const OPERATORS = [
  'Ravi Kumar',
  'Murugan S',
  'Suresh B',
  'Prakash P',
  'Arun Kumar',
  'Karthik M',
  'Manikandan',
  'Shiju V',
];
const PLACES = [
  'Olaya St, Riyadh',
  'King Fahd Rd',
  'Industrial Area 2',
  'North Depot',
  'Al Malaz',
  'Exit 18, Ring Rd',
];
const ALERTS: [string, string][] = [
  ['OVERSPEED', 'Overspeed'],
  ['HARSH_BRAKING', 'Harsh braking'],
  ['IDLE', 'Excess idle'],
  ['POWER_CUT', 'Power cut'],
  ['GEOFENCE_EXIT', 'Geofence exit'],
];
const ZONES = ['Head Office', 'North Depot', 'Customer Zone East'];
const MOVEMENT = ['RUNNING', 'IDLE', 'STOP', 'RUNNING', 'STOP', 'TOWED'];
const SUMMARY_PLACES = [...PLACES, 'Customer Zone East', 'Head Office'];

/** Reports of the second generator family (per vehicle and day). */
const DAILY = new Set([
  'VEHICLE_OVERSPEED',
  'VEHICLE_SPEED',
  'VEHICLE_STOP',
  'VEHICLE_ALERT',
  'VEHICLE_MOVEMENT',
  'VEHICLE_ACTIVITY_CONSOLIDATE',
  'VEHICLE_NO_TRANSMISSION',
  'VEHICLE_FLEET_SUMMARY',
  'VEHICLE_CONSOLIDATE_SUMMARY',
  'VEHICLE_ENGINE_HOURS',
  'VEHICLE_DRIVER_BEHAVIOUR',
  'VEHICLE_FENCE',
  'VEHICLE_DAILY_MOVEMENT',
  'VEHICLE_TRIP',
  'VEHICLE_OPERATOR',
  'VEHICLE_ALERT_MAIL',
  'VEHICLE_UTILIZATION',
  'VEHICLE_TEMPERATURE',
]);

function vehicleRows(
  code: string,
  v: ReportVehicle,
  from: number,
  to: number,
  p: Record<string, string>,
): DemoRow[] {
  const end = Math.min(to, Date.now());
  const base = { assetId: v.id, asset: v.name, group: v.group ?? undefined };
  const rnd0 = seeded(`${code}:${v.id}`);
  const demoType = pick(rnd0, TYPES);
  const demoOperator = pick(rnd0, OPERATORS);
  const type = v.vehicleType || demoType;
  const op = v.operator?.name || demoOperator;
  const rows: DemoRow[] = [];

  if (code === 'VEHICLE_FLEET_SUMMARY') {
    const r = seeded(`fleet:${v.id}`);
    return [
      {
        ...base,
        vehicleType: type,
        status: pick(r, ['RUNNING', 'IDLE', 'STOP', 'OFFLINE']),
        location: pick(r, PLACES),
        coords: latLng(r),
        lastAt: iso(Date.now() - Math.floor(r() * 72e5)),
        operator: op,
        associatedAt: iso(Date.UTC(2025, 2, 1 + Math.floor(r() * 200))),
        purchaseDate: v.purchaseDate || `2024-0${1 + Math.floor(r() * 9)}-15`,
      },
    ];
  }
  if (code === 'VEHICLE_UTILIZATION') {
    const days = Math.max(1, Math.round((end - from) / DAY));
    const [fh = 0, fm = 0] = (p.fromTime || '00:00').split(':').map(Number);
    const [th = 24, tm = 0] = (p.toTime || '24:00').split(':').map(Number);
    const minutes = (th * 60 + tm - (fh * 60 + fm) + 1440) % 1440 || 1440;
    const available = days * minutes * 60;
    const used = Math.round(available * (0.2 + rnd0() * 0.6));
    const pct = round1((used / available) * 100);
    return [
      {
        ...base,
        days,
        availableSeconds: available,
        utilizedSeconds: used,
        unusedSeconds: available - used,
        utilizationPct: pct,
        unusedPct: round1(100 - pct),
      },
    ];
  }

  for (let day = from; day < end; day += DAY) {
    const r = seeded(`${code}:${v.id}:${day}`);
    const at = (h: number) => day + h * 36e5 + Math.floor(r() * 50) * 6e4;
    if (r() < 0.12) continue;
    switch (code) {
      case 'VEHICLE_OVERSPEED':
        if (r() < 0.6) {
          const start = at(8 + r() * 8);
          const seconds = 40 + Math.floor(r() * 500);
          const max = 82 + Math.round(r() * 30);
          rows.push({
            ...base,
            vehicleType: type,
            limit: 80,
            seconds,
            start: iso(start),
            startLocation: pick(r, PLACES),
            startCoords: latLng(r),
            end: iso(start + seconds * 1e3),
            endLocation: pick(r, PLACES),
            endCoords: latLng(r),
            minSpeed: 81,
            avgSpeed: Math.round((81 + max) / 2),
            maxSpeed: max,
          });
        }
        break;
      case 'VEHICLE_SPEED': {
        const opCode = p.op;
        const limit = Number(p.speed);
        for (let i = 0; i < 12; i++) {
          const speed = Math.round(30 + r() * 60);
          const keep =
            !opCode || !Number.isFinite(limit)
              ? speed > 5
              : opCode === 'GT'
                ? speed > limit
                : opCode === 'LT'
                  ? speed < limit
                  : opCode === 'GE'
                    ? speed >= limit
                    : speed <= limit;
          if (keep)
            rows.push({
              ...base,
              vehicleType: type,
              operator: op,
              at: iso(day + (7 * 60 + i * 5) * 6e4),
              coords: latLng(r),
              location: pick(r, PLACES),
              speed,
              limit: 60,
              exceeds: Math.max(0, speed - 60),
            });
        }
        break;
      }
      case 'VEHICLE_STOP': {
        const min = Number(p.minMinutes || 5) * 60;
        for (let i = 0, n = 1 + Math.floor(r() * 3); i < n; i++) {
          const start = at(8 + i * 4);
          const seconds = 300 + Math.floor(r() * 6e3);
          if (seconds < min) continue;
          rows.push({
            ...base,
            vehicleType: type,
            stoppedAt: iso(start),
            stoppedLocation: pick(r, PLACES),
            stoppedCoords: latLng(r),
            resumedAt: iso(start + seconds * 1e3),
            resumedLocation: pick(r, PLACES),
            resumedCoords: latLng(r),
            seconds,
            stoppedBy: op,
            resumedBy: op,
          });
        }
        break;
      }
      case 'VEHICLE_ALERT':
      case 'VEHICLE_ALERT_MAIL':
        for (let i = 0, n = Math.floor(r() * 3); i < n; i++) {
          const [alertType, alertName] = pick(r, ALERTS);
          if (p.alertType && p.alertType !== alertType) continue;
          const when = at(8 + i * 3);
          rows.push(
            code === 'VEHICLE_ALERT'
              ? {
                  ...base,
                  vehicleType: type,
                  operator: op,
                  alertType,
                  alertName,
                  severity: pick(r, ['HIGH', 'MEDIUM', 'LOW']),
                  at: iso(when),
                  coords: latLng(r),
                  location: pick(r, PLACES),
                  details: `${alertName} near ${pick(r, PLACES)}`,
                }
              : {
                  ...base,
                  alertType,
                  alertName,
                  details: `${alertName} near ${pick(r, PLACES)}`,
                  at: iso(when),
                  recipient: 'ops@example.com',
                  status: pick(r, ['DELIVERED', 'SENT', 'FAILED']),
                  sentAt: iso(when + 3e4),
                },
          );
        }
        break;
      case 'VEHICLE_MOVEMENT': {
        let t = at(6);
        for (let i = 0; i < 6; i++) {
          const seconds = 600 + Math.floor(r() * 5400);
          const status = MOVEMENT[i]!;
          rows.push({
            ...base,
            vehicleType: type,
            operator: op,
            status,
            start: iso(t),
            end: iso(t + seconds * 1e3),
            seconds,
            distanceKm:
              status === 'RUNNING' || status === 'TOWED' ? round1((seconds / 3600) * 40) : 0,
            beginCoords: latLng(r),
            endCoords: latLng(r),
          });
          t += seconds * 1e3;
        }
        break;
      }
      case 'VEHICLE_ACTIVITY_CONSOLIDATE':
      case 'VEHICLE_CONSOLIDATE_SUMMARY':
      case 'VEHICLE_DAILY_MOVEMENT':
      case 'VEHICLE_DRIVER_BEHAVIOUR': {
        const running = Math.round(3600 * (2 + r() * 5));
        const idle = Math.round(300 + r() * 3600);
        const stop = Math.round(3600 * (1 + r() * 3));
        const towed = r() < 0.08 ? Math.round(r() * 1800) : 0;
        const distanceKm = round1(40 + r() * 300);
        if (code === 'VEHICLE_ACTIVITY_CONSOLIDATE')
          rows.push({
            ...base,
            vehicleType: type,
            day: dayOf(day),
            runningSeconds: running,
            idleSeconds: idle,
            stopSeconds: stop,
            towedSeconds: towed,
            distanceKm,
            alerts: Math.floor(r() * 4),
            beginCoords: latLng(r),
            endCoords: latLng(r),
          });
        else if (code === 'VEHICLE_CONSOLIDATE_SUMMARY')
          rows.push({
            ...base,
            vehicleType: type,
            day: dayOf(day),
            firstOn: iso(at(6)),
            beginCoords: latLng(r),
            lastOff: iso(at(19)),
            endCoords: latLng(r),
            runningSeconds: running,
            idleSeconds: idle,
            stopSeconds: stop,
            towedSeconds: towed,
            towedKm: towed ? round1((towed / 3600) * 20) : 0,
            distanceKm,
            maxSpeed: Math.round(50 + r() * 60),
            alerts: Math.floor(r() * 4),
          });
        else if (code === 'VEHICLE_DAILY_MOVEMENT') {
          const contact = `98${Math.floor(1e7 + r() * 89999999)}`;
          rows.push({
            ...base,
            vehicleModel: v.model || 'Isuzu NPR',
            operator: op,
            operatorContact: v.operator?.contact || contact,
            day: dayOf(day),
            begin: iso(at(6)),
            beginLocation: pick(r, PLACES),
            end: iso(at(19)),
            endLocation: pick(r, PLACES),
            runningSeconds: running,
            distanceKm,
            odometerKm: 12e3 + Math.round(r() * 4e4),
          });
        } else {
          const braking = Math.floor(r() * 4);
          const accel = Math.floor(r() * 4);
          const overspeed = Math.floor(r() * 3);
          const belt = Math.floor(r() * 2);
          rows.push({
            ...base,
            operator: op,
            day: dayOf(day),
            score: Math.max(0, 100 - 2 * (braking + accel) - overspeed - 2 * belt),
            harshBraking: braking,
            harshAcceleration: accel,
            overspeed,
            seatBelt: belt,
            drift: Math.floor(r() * 2),
            excessiveIdleSeconds: Math.round(idle / 2),
            distanceKm,
            engineSeconds: running + idle,
            runningSeconds: running,
            avgSpeed: Math.round(30 + r() * 20),
            maxSpeed: Math.round(60 + r() * 50),
          });
        }
        break;
      }
      case 'VEHICLE_NO_TRANSMISSION':
        if (r() < 0.3) {
          const last = at(9 + r() * 8);
          const seconds = Math.max(Number(p.minMinutes || 60) * 60, 3600 + Math.floor(r() * 14400));
          const status = pick(r, ['STOP', 'IDLE']);
          const coords = latLng(r);
          const location = pick(r, PLACES);
          const imei = `35${Math.floor(1e12 + r() * 9e12)}`;
          const sim = `9665${Math.floor(1e7 + r() * 9e7)}`;
          rows.push({
            ...base,
            vehicleType: type,
            operator: op,
            lastAt: iso(last),
            seconds,
            lastStatus: status,
            lastCoords: coords,
            lastLocation: location,
            deviceMake: v.deviceMake || 'Teltonika',
            deviceModel: v.deviceModel || 'FMB920',
            imei: v.imei || imei,
            simNo: v.simNo || sim,
            purchaseDate: v.purchaseDate || '2024-05-12',
          });
        }
        break;
      case 'VEHICLE_ENGINE_HOURS':
        for (let i = 0, n = 1 + Math.floor(r() * 2); i < n; i++) {
          const start = at(7 + i * 6);
          const engine = 3600 + Math.floor(r() * 1e4);
          const idle = Math.floor(engine * 0.2);
          rows.push({
            ...base,
            vehicleType: type,
            start: iso(start),
            startCoords: latLng(r),
            end: iso(start + engine * 1e3),
            endCoords: latLng(r),
            engineSeconds: engine,
            runningSeconds: engine - idle,
            idleSeconds: idle,
            distanceKm: round1(((engine - idle) / 3600) * 38),
          });
        }
        break;
      case 'VEHICLE_FENCE':
        for (let i = 0, n = Math.floor(r() * 2) + 1; i < n; i++) {
          const alertType = pick(r, ['GEOFENCE_ENTER', 'GEOFENCE_EXIT']);
          if (p.alertType && p.alertType !== alertType) continue;
          const zone = pick(r, ZONES);
          rows.push({
            ...base,
            vehicleType: type,
            operator: op,
            geofence: zone,
            insideSeconds: 600 + Math.floor(r() * 9e3),
            alertType,
            alertName: alertType === 'GEOFENCE_ENTER' ? 'Geofence enter' : 'Geofence exit',
            details: `${alertType === 'GEOFENCE_ENTER' ? 'Entered' : 'Left'} ${zone}`,
            at: iso(at(8 + i * 5)),
            coords: latLng(r),
            location: zone,
          });
        }
        break;
      case 'VEHICLE_TRIP':
        for (let i = 0, n = 1 + Math.floor(r() * 3); i < n; i++) {
          const start = at(7 + i * 4);
          const seconds = 1800 + Math.floor(r() * 7200);
          const distanceKm = round1((seconds / 3600) * 42);
          if (p.minKm && distanceKm < Number(p.minKm)) continue;
          rows.push({
            ...base,
            vehicleType: type,
            operator: op,
            tripId: `${v.name.replace(/\s/g, '')}-${dayOf(day).replace(/-/g, '')}-${i + 1}`,
            tripName: null,
            start: iso(start),
            startCoords: latLng(r),
            end: iso(start + seconds * 1e3),
            endCoords: latLng(r),
            runningSeconds: seconds,
            distanceKm,
          });
        }
        break;
      case 'VEHICLE_OPERATOR': {
        const signIn = at(6 + r());
        const seconds = 36e3 + Math.floor(r() * 1e4);
        const tag = `TAG${String(Math.floor(r() * 99999)).padStart(5, '0')}`;
        const contact = `98${Math.floor(1e7 + r() * 89999999)}`;
        const branch = pick(r, ['Riyadh Branch', 'Jeddah Branch', 'Dammam Branch']);
        rows.push({
          ...base,
          tagId: v.operator?.tagId || tag,
          operator: op,
          contact: v.operator?.contact || contact,
          branch: v.operator?.branch || branch,
          vehicleType: type,
          signIn: iso(signIn),
          signInCoords: latLng(r),
          signOut: iso(signIn + seconds * 1e3),
          signOutCoords: latLng(r),
          seconds,
        });
        break;
      }
      case 'VEHICLE_TEMPERATURE':
        for (let s = 1; s <= 2; s++) {
          const min = round1(-20 + r() * 6);
          const max = round1(min + 2 + r() * 8);
          rows.push({
            ...base,
            vehicleType: type,
            day: dayOf(day),
            sensor: s === 1 ? 'Chamber front' : 'Chamber rear',
            minTemp: min,
            avgTemp: round1((min + max) / 2),
            maxTemp: max,
            low: -20,
            high: -12,
            outOfRangeSeconds: max > -12 ? Math.floor(r() * 3600) : 0,
            begin: iso(at(6)),
            end: iso(at(19)),
            beginLocation: pick(r, PLACES),
            endLocation: pick(r, PLACES),
          });
        }
        break;
    }
  }
  return rows;
}

/** The first generator family (summaries, idle violations, fuel). */
function summaryRows(
  code: string,
  vehicles: ReportVehicle[],
  from: number,
  to: number,
  p: Record<string, string>,
) {
  const end = Math.min(to, Date.now());
  const rows: DemoRow[] = [];
  for (const v of vehicles)
    for (let day = from; day < end; day += DAY) {
      const r = seeded(`${code}:${v.id}:${day}`);
      const base = { assetId: v.id, asset: v.name, group: v.group ?? undefined };
      const at = (h: number) => day + h * 36e5 + Math.floor(r() * 50) * 6e4;
      const place = () => pick(r, SUMMARY_PLACES);
      if (r() < 0.12) continue;
      switch (code) {
        case 'VEHICLE_EXECUTIVE_SUMMARY':
        case 'VEHICLE_STATUS_SUMMARY': {
          const start = at(6);
          const stopAt = at(18);
          const running = 3600 * (2 + r() * 5);
          const idle = 300 + r() * 3600;
          const stop = 3600 * (1 + r() * 3);
          const towed = r() < 0.08;
          const distanceKm = Math.round(40 + r() * 300);
          const type = v.vehicleType || 'Truck';
          if (code === 'VEHICLE_STATUS_SUMMARY')
            rows.push({
              ...base,
              vehicleType: type,
              day: dayOf(day),
              distanceKm,
              start: iso(start),
              startAddress: place(),
              end: iso(stopAt),
              endAddress: place(),
              stopSeconds: Math.round(stop),
              towed,
              towedSeconds: towed ? 900 : 0,
              totalSeconds: Math.round((stopAt - start) / 1e3),
              runningSeconds: Math.round(running),
              idleSeconds: Math.round(idle),
            });
          else
            rows.push({
              ...base,
              day: dayOf(day),
              begin: iso(start),
              firstOn: iso(start + 12e4),
              beginLocation: place(),
              end: iso(stopAt),
              lastOff: iso(stopAt - 6e4),
              endLocation: place(),
              alerts: Math.floor(r() * 4),
              maxSpeed: Math.round(50 + r() * 80),
              odometerKm: 12e3 + Math.round(r() * 4e4),
              distanceKm,
              runningSeconds: Math.round(running),
              idleSeconds: Math.round(idle),
              stopSeconds: Math.round(stop),
              towed,
              vehicleType: type,
              towedSeconds: towed ? 900 : 0,
              totalSeconds: Math.round((stopAt - start) / 1e3),
            });
          break;
        }
        case 'VEHICLE_IDLE_VIOLATION':
          for (let i = 0, n = Math.floor(r() * 3); i < n; i++) {
            const start = at(8 + i * 5);
            const seconds = 300 + Math.floor(r() * 7e3);
            if (seconds < Number(p.minMinutes || 0) * 60) continue;
            rows.push({
              ...base,
              location: place(),
              start: iso(start),
              end: iso(start + seconds * 1e3),
              seconds,
              ignition: true,
              status: seconds >= 3600 ? 'EXCESSIVE' : 'NORMAL',
            });
          }
          break;
        case 'VEHICLE_FUEL': {
          const begin = Math.round((30 + r() * 40) * 10) / 10;
          const used = Math.round(r() * 25 * 10) / 10;
          rows.push({
            ...base,
            day: dayOf(day),
            beginFuel: begin,
            endFuel: Math.round((begin - used) * 10) / 10,
            change: -used,
            begin: iso(at(6)),
            end: iso(at(19)),
            beginLocation: place(),
            endLocation: place(),
          });
          break;
        }
      }
    }
  return rows;
}

/** Runs a vehicle report on the picked vehicles for [from, to). */
export function runVehicleReport(
  code: string,
  vehicles: ReportVehicle[],
  from: number,
  to: number,
  params: Record<string, string>,
): DemoRow[] {
  return DAILY.has(code)
    ? vehicles.flatMap((v) => vehicleRows(code, v, from, to, params))
    : summaryRows(code, vehicles, from, to, params);
}

const ACTIVITY: [string, string, string?, string?][] = [
  ['Auth', 'LOGIN_SUCCESS'],
  ['Users', 'USER_CHANGED', 'status: ACTIVE', 'status: INACTIVE'],
  ['Roles', 'ROLE_CHANGED', 'Fleet Viewer', 'Fleet Manager'],
  ['Reports', 'REPORT_RUN'],
  ['Tracking', 'LOCATION_HISTORY_VIEWED'],
  ['Devices', 'DEVICE_COMMAND'],
  ['Profile', 'PROFILE_CHANGED'],
];
const CLIENTS = [
  'Chrome 131 · Windows',
  'Safari · iPhone',
  'Edge · Windows',
  'EIT Mobile · Android',
];
const riyadhMinutes = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Riyadh',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const minuteOfDay = (ms: number) => {
  const [h = 0, m = 0] = riyadhMinutes.format(ms).split(':').map(Number);
  return h * 60 + m;
};
const toMinutes = (s?: string) => {
  if (!s) return null;
  const [h = 0, m = 0] = s.split(':').map(Number);
  return h * 60 + m;
};

export const COMMON_LIMIT = 2000;

/** User Activity and User Logs of the company's real users (Neon), newest first. */
export function runUserReport(
  code: string,
  companyCode: string,
  users: ReportUser[],
  from: number,
  to: number,
  p: Record<string, string>,
): DemoRow[] {
  const end = Math.min(to, Date.now());
  const rows: DemoRow[] = [];
  const lo = toMinutes(p.fromTime);
  const hi = toMinutes(p.toTime);
  const inWindow = (ms: number) => {
    const m = minuteOfDay(ms);
    if (lo === null && hi === null) return true;
    if (lo !== null && hi !== null && hi <= lo) return m >= lo || m < hi;
    return (lo === null || m >= lo) && (hi === null || m < hi);
  };
  for (const u of users)
    for (let day = from; day < end; day += DAY) {
      const r = seededUsers(`${code}:${u.id}:${day}`);
      for (let i = 0, n = 1 + Math.floor(r() * 3); i < n; i++) {
        const t = day + (7 + i * 4 + r() * 3) * 36e5;
        if (t > end) continue;
        const ip = `10.0.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}`;
        if (code === 'USER_ACTIVITY') {
          const [module, action, oldValue, newValue] = pick(r, ACTIVITY);
          if ((p.module && p.module !== module) || (p.action && p.action !== action)) continue;
          rows.push({
            id: `${u.id}-${day}-${i}`,
            companyCode,
            module,
            action,
            oldValue: oldValue ?? null,
            newValue: newValue ?? null,
            at: iso(t),
            performedBy: u.name,
            ip,
            device: pick(r, CLIENTS),
          });
        } else {
          if (!inWindow(t)) continue;
          const seconds = 600 + Math.floor(r() * 2e4);
          const open = t + seconds * 1e3 > Date.now();
          rows.push({
            id: `${u.id}-${day}-${i}`,
            userId: u.id,
            userName: u.name,
            role: u.role || 'Fleet Manager',
            loginAt: iso(t),
            logoutAt: open ? null : iso(t + seconds * 1e3),
            seconds: open ? Math.round((Date.now() - t) / 1e3) : seconds,
            status: open ? 'ACTIVE' : r() < 0.8 ? 'LOGGED_OUT' : 'EXPIRED',
            client: r() < 0.8 ? 'WEB' : 'MOBILE',
            ip,
            device: pick(r, CLIENTS),
          });
        }
      }
    }
  return rows.sort((a, b) => String(b.at ?? b.loginAt).localeCompare(String(a.at ?? a.loginAt)));
}
