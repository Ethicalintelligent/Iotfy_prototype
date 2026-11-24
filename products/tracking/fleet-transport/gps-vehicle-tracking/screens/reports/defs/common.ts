// Columns and values every vehicle report shares (Vehicle No, Vehicle Type, Operator, Group),
// and helpers to walk the chosen vehicles and days.
import type { Hue } from '@iotify/ui';
import type { LiveVehicle } from '../../../demo/fleet';
import { ALERT, STATUS, type AlertKind, type VehicleStatus } from '../../../shared/vehicle-status';
import type { DayData } from '../data';
import type { ReportColumn, ReportInput } from '../types';

export const COL = {
  vehicle: { key: 'vehicle', header: 'Vehicle No', strong: true, width: 130 },
  type: { key: 'type', header: 'Vehicle Type', width: 160 },
  operator: { key: 'operator', header: 'Operator', width: 150 },
  group: { key: 'group', header: 'Group', width: 140 },
} satisfies Record<string, ReportColumn>;

/** Vehicle No, Vehicle Type, Operator and Group of a vehicle. */
export const vehicleCells = (v: LiveVehicle) => ({
  vehicle: v.callSign,
  type: v.category ?? '—',
  operator: v.operator ?? '—',
  group: v.group ?? '—',
});

/** Every chosen vehicle's every day that has activity, vehicle by vehicle, oldest day first. */
export function eachDay(input: ReportInput): { v: LiveVehicle; d: DayData }[] {
  const out: { v: LiveVehicle; d: DayData }[] = [];
  for (const v of input.vehicles) {
    if (v.status === 'ytt') continue;
    for (const day of input.days) {
      const d = input.day(v, day);
      if (d.segments.length) out.push({ v, d });
    }
  }
  return out;
}

/** The hue of a vehicle status (for chips), by its label. */
export const statusHue = (label: unknown): Hue =>
  (Object.values(STATUS).find((s) => s.label === label)?.hue ?? 'grey') as Hue;

export const statusLabel = (s: VehicleStatus) => STATUS[s].label;

const SEVERITY_HUE: Record<string, Hue> = {
  Critical: 'red',
  High: 'orange',
  Medium: 'amber',
  Low: 'blue',
};
export const severityHue = (label: unknown): Hue => SEVERITY_HUE[String(label)] ?? 'grey';

/** Options for an "Alert type" condition. */
export const alertTypeOptions = () =>
  (Object.keys(ALERT) as AlertKind[]).map((k) => ({ value: k, label: ALERT[k].label }));

/** A pill hue for a score out of 100. */
export const scoreHue = (score: unknown): Hue => {
  const n = Number(score);
  return n >= 85 ? 'green' : n >= 70 ? 'amber' : 'red';
};
