// What a report is: its place in the "Select Report" menu, its columns, the conditions in its
// filter panel and how its rows are built. Each report is a small definition in ./defs.
import type { Hue, IconName } from '@iotify/ui';
import type { OperatorsRow } from '@iotify/data';
import type { LiveVehicle } from '../../demo/fleet';
import type { Fence } from '../../shared/useFleet';
import type { DayData, Formatter } from './data';

/** A row of a report: display values by column key (text the grid filters, sorts and exports). */
export type ReportRow = { id: string } & Record<string, string | number | null>;

export interface ReportColumn {
  key: string;
  header: string;
  /** Bold (the row's name, e.g. Vehicle No). */
  strong?: boolean;
  /** Shown as a coloured chip; the hue comes from the row. */
  chip?: (row: ReportRow) => Hue;
  /** Shown as a tinted number pill; the hue comes from the row. */
  pill?: (row: ReportRow) => Hue;
  align?: 'left' | 'right' | 'center';
  width?: number;
}

/** A field in the "Report conditions" part of the filter panel. */
export interface Condition {
  key: string;
  label: string;
  /** `number`: a number box; `select`: a choice with "Any" first. */
  kind: 'number' | 'select';
  placeholder?: string;
  /** Value to start with (and after Reset). */
  initial?: string;
  options?: (ctx: ConditionContext) => { value: string; label: string }[];
}
export interface ConditionContext {
  users: ReportUser[];
}

export type ReportSection =
  'Common Reports' | 'Vehicle Reports' | 'Fuel Management' | 'Temperature Monitoring';

export interface ReportDef {
  key: string;
  label: string;
  icon: IconName;
  section: ReportSection;
  /** What the report is about: the vehicle tree in the filters, or the company's users. */
  subject: 'vehicles' | 'users';
  /** The state right now, not a period (no date range; "Showing: now"). */
  current?: boolean;
  /** Needs this add-on (product id and name), bought for the company. */
  addon?: { id: string; name: string };
  conditions?: Condition[];
  columns: ReportColumn[];
  build: (input: ReportInput) => ReportRow[];
  /** Shown when there are no rows. */
  empty?: string;
}

export interface ReportUser {
  id: string;
  name: string;
  role: string;
  email: string | null;
  userName: string | null;
}

export interface DeviceInfo {
  make: string | null;
  model: string | null;
  imei: string | null;
  sim: string | null;
  purchase: string | null;
  associated: string | null;
}

export interface VehicleExtra {
  tankL: number | null;
  mileageKmL: number | null;
}

/** Everything a report needs to build its rows. */
export interface ReportInput {
  companyId: string;
  /** The vehicles picked in the filters (all reporting and never-reported ones). */
  vehicles: LiveVehicle[];
  /** The days of the period, oldest first (start of each day). */
  days: Date[];
  now: Date;
  fmt: Formatter;
  /** Values of the report's conditions ('' = not set). */
  cond: Record<string, string>;
  /** A vehicle's day: segments, totals, route and alerts (demo activity, cached). */
  day: (v: LiveVehicle, day: Date) => DayData;
  fences: Fence[];
  operators: OperatorsRow[];
  users: ReportUser[];
  roles: string[];
  devices: Map<string, DeviceInfo>;
  extra: Map<string, VehicleExtra>;
  /** Vehicles covered by the report's add-on (null: all of them). */
  covered: Set<string> | null;
}
