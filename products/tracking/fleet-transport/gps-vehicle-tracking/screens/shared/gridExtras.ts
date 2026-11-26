// IT-0053 (Heeba's approved prototype IT-0051): Grid View's filter options that Map View and Tracking
// lacked (Unassigned operator only, Installed sensors, Out-of-range readings only, GPS, External
// Battery, Watch Mode, GSM, Internal Battery, Geofence). Same labels, choices, defaults and matching as
// Grid View: each vehicle's Grid View record (Neon vehicle + Grid View's demo activity, the same one
// Map View's indicator icons already use) is matched with Grid View's own `matches` rule.
import { useMemo, useState } from 'react';
import { withDemoActivity } from '../grid/demo';
import { DEFAULT_FILTERS, INSTALLED_SENSORS, isSet, matches, type Filters, type GridVehicle } from '../grid/model';
import { useFleetData } from '../grid/useFleetData';

export const EXTRA_KEYS = [
  'unassigned',
  'installed',
  'outOfRange',
  'gps',
  'extBat',
  'watch',
  'gsm',
  'intBat',
  'geofence',
] as const;
export type ExtraKey = (typeof EXTRA_KEYS)[number];
export type Extras = Pick<Filters, ExtraKey>;

export const NO_EXTRAS: Extras = {
  unassigned: DEFAULT_FILTERS.unassigned,
  installed: [],
  outOfRange: DEFAULT_FILTERS.outOfRange,
  gps: DEFAULT_FILTERS.gps,
  extBat: DEFAULT_FILTERS.extBat,
  watch: DEFAULT_FILTERS.watch,
  gsm: DEFAULT_FILTERS.gsm,
  intBat: DEFAULT_FILTERS.intBat,
  geofence: DEFAULT_FILTERS.geofence,
};

/** How many of the added options are set (for the filter button's count). */
export const extrasCount = (x: Extras) =>
  EXTRA_KEYS.filter((k) => isSet({ ...DEFAULT_FILTERS, ...x }, k)).length;

/** Choices, in the panels' own toggle-bar and dropdown style ("All" = Grid View's "Any"). */
export const ON_OFF: [boolean, string][] = [
  [false, 'Off'],
  [true, 'On'],
];
export const INSTALLED_CHOICES = INSTALLED_SENSORS;
export const GPS_CHOICES: [string, string][] = [
  ['Any', 'All'],
  ['Available', 'Available'],
  ['Not available', 'Not available'],
];
export const EXTBAT_CHOICES: [string, string][] = [
  ['Any', 'All'],
  ['Connected', 'Connected'],
  ['Disconnected', 'Disconnected'],
];
export const WATCH_CHOICES: [string, string][] = [
  ['Any', 'All'],
  ['On', 'On'],
  ['Off', 'Off'],
];
/** Grid View's own dropdown texts. */
export const GSM_CHOICES: [string, string][] = [
  ['any', 'Any gsm'],
  ['strong', 'Strong signal'],
  ['weak', 'Weak signal'],
  ['none', 'No signal'],
  ['nodata', 'No data'],
];
export const INTBAT_CHOICES: [string, string][] = [
  ['any', 'Any internal battery'],
  ['Very High', 'Very High'],
  ['High', 'High'],
  ['Medium', 'Medium'],
  ['Low', 'Low'],
  ['No data', 'No data'],
];

/** Grid View's record for each vehicle (by vehicle id) and the company's geofences. */
export function useGridRecords(companyId: string, assetGroup: string | null) {
  const data = useFleetData(companyId, assetGroup);
  const [now] = useState(() => Date.now());
  const records = useMemo(
    () => withDemoActivity(data.vehicles, data.fencesOf, now),
    [data.vehicles, data.fencesOf, now],
  );
  const byId = useMemo(() => new Map(records.map((r) => [String(r.id), r])), [records]);
  const geofences = useMemo(
    () => [['any', 'Any geofence'] as [string, string], ...data.fences.map((f): [string, string] => [f.id, f.name])],
    [data.fences],
  );
  return { byId, geofences };
}

/** Does a vehicle pass the added options? (No record and options set: it can't be checked, so no.) */
export function passesExtras(rec: GridVehicle | undefined, x: Extras): boolean {
  if (!extrasCount(x)) return true;
  return !!rec && matches(rec, { ...DEFAULT_FILTERS, ...x });
}
