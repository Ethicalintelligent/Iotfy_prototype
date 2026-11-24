// Every report in the "Select Report" menu, in the design's order and sections.
import type { ReportDef } from './types';
import { userActivity, userLogs } from './defs/user-reports';
import {
  activityConsolidate,
  consolidateSummary,
  dailyMovement,
  driverBehaviour,
  engineHours,
  executiveSummary,
  fleetSummary,
  statusSummary,
  utilization,
} from './defs/summary-reports';
import {
  alert,
  alertMail,
  fence,
  idleViolation,
  noTransmission,
  operator,
  overspeedDuration,
  speed,
  stop,
  trip,
  vehicleMovement,
} from './defs/event-reports';
import { fuel, temperature } from './defs/addon-reports';

export const REPORTS: ReportDef[] = [
  userActivity,
  userLogs,
  executiveSummary,
  statusSummary,
  overspeedDuration,
  speed,
  stop,
  alert,
  vehicleMovement,
  activityConsolidate,
  noTransmission,
  idleViolation,
  fleetSummary,
  consolidateSummary,
  engineHours,
  driverBehaviour,
  fence,
  dailyMovement,
  trip,
  operator,
  alertMail,
  utilization,
  fuel,
  temperature,
];

export const reportByKey = (key: string | null | undefined): ReportDef =>
  REPORTS.find((r) => r.key === key) ?? REPORTS[0]!;
