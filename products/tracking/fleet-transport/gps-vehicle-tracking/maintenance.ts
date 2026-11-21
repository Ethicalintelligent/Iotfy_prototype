// Maintenance: service schedule per vehicle. Pure functions (unit-tested); the screen is
// screens/MaintenanceScreen.tsx. Odometers and service history are demo activity until devices
// report; the vehicles are the company's real assets.
import type { DemoContext } from '@iotify/app-kit';

/** A service every this many km. */
export const SERVICE_INTERVAL_KM = 10_000;
/** "Due soon" within this many km of the next service. */
export const DUE_SOON_KM = 1_000;

export type ServiceStatus = 'Overdue' | 'Due soon' | 'OK';

export interface ServiceRow {
  id: string;
  vehicle: string;
  odometerKm: number;
  lastServiceKm: number;
  lastServiceDate: string;
  lastWork: string;
  /** Average km per day (for the estimated due date). */
  kmPerDay: number;
}

export interface ServicePlan extends ServiceRow {
  nextServiceKm: number;
  /** Negative = overdue by that many km. */
  kmLeft: number;
  status: ServiceStatus;
  /** Days until due at the vehicle's usual daily distance (0 when overdue). */
  daysLeft: number;
}

/** yyyy-mm-dd, n days before now (local date). */
export function isoDaysAgo(n: number, now: Date = new Date()): string {
  const d = new Date(now.getTime() - n * 864e5);
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WORK = ['Oil and filter', 'Full service', 'Brakes and tyres', 'Oil, filters, belts'];

/** Demo odometer and last service for each vehicle (seeded, so stable per company). */
export function demoServiceRows(
  c: DemoContext,
  vehicles: { id: string; name: string }[],
  now: Date = new Date(),
): ServiceRow[] {
  return vehicles.map((v, i) => {
    const odometerKm = c.i(18_000, 140_000);
    // Every fourth vehicle overdue and the next one due soon, so a small fleet shows each state.
    const since =
      i % 4 === 0 ? c.i(10_200, 11_500) : i % 4 === 1 ? c.i(9_100, 9_900) : c.i(1_500, 8_500);
    return {
      id: v.id,
      vehicle: v.name,
      odometerKm,
      lastServiceKm: odometerKm - since,
      lastServiceDate: isoDaysAgo(c.i(15, 160), now),
      lastWork: c.pick(WORK),
      kmPerDay: c.i(80, 260),
    };
  });
}

export function statusFor(kmLeft: number): ServiceStatus {
  if (kmLeft < 0) return 'Overdue';
  if (kmLeft <= DUE_SOON_KM) return 'Due soon';
  return 'OK';
}

export function plan(row: ServiceRow): ServicePlan {
  const nextServiceKm = row.lastServiceKm + SERVICE_INTERVAL_KM;
  const kmLeft = nextServiceKm - row.odometerKm;
  return {
    ...row,
    nextServiceKm,
    kmLeft,
    status: statusFor(kmLeft),
    daysLeft: kmLeft <= 0 ? 0 : Math.ceil(kmLeft / Math.max(1, row.kmPerDay)),
  };
}

/** Most urgent first: overdue (most overdue first), then by km left. */
export const byUrgency = (a: ServicePlan, b: ServicePlan) => a.kmLeft - b.kmLeft;

/** A logged service resets the clock at that odometer reading. */
export function logService(
  row: ServiceRow,
  entry: { date: string; odometerKm: number; work: string },
): ServiceRow {
  return {
    ...row,
    odometerKm: Math.max(row.odometerKm, entry.odometerKm),
    lastServiceKm: entry.odometerKm,
    lastServiceDate: entry.date,
    lastWork: entry.work,
  };
}

/** Why a "Log service" entry can't be saved, or null when it can. */
export function serviceEntryError(
  row: ServiceRow,
  entry: { date: string; odometerKm: number; work: string },
  today: string,
): string | null {
  if (!entry.date) return 'Enter the service date.';
  if (entry.date > today) return 'The service date can’t be in the future.';
  if (!Number.isFinite(entry.odometerKm) || entry.odometerKm <= 0)
    return 'Enter the odometer reading in km.';
  if (entry.odometerKm < row.lastServiceKm)
    return `The odometer can’t be lower than the last service (${row.lastServiceKm.toLocaleString('en-US')} km).`;
  if (!entry.work.trim()) return 'Say what work was done.';
  return null;
}
