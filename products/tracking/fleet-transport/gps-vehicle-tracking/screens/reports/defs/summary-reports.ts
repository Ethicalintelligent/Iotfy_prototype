// Vehicle summary reports: a row per vehicle per day, or per vehicle over the period, from the
// demo activity (statuses, distance, alerts) of the company's real vehicles.
import { addDays, rng, startOfDay } from '../../../demo/fleet';
import {
  at,
  daysAgo,
  daysHours,
  dur,
  hoursOf,
  iso,
  kmText,
  latLng,
  one,
  placeName,
  pointAt,
  sessions,
  span,
} from '../data';
import type { ReportDef, ReportRow } from '../types';
import type { DayData } from '../data';
import { COL, eachDay, scoreHue, statusHue, statusLabel, vehicleCells } from './common';

/** Where a vehicle was when its day began and ended. */
function ends(d: DayData) {
  const s = span(d.segments)!;
  const begin = pointAt(d.route, at(d.date, s.from));
  const end = d.route.points[d.route.points.length - 1] ?? begin;
  return { s, begin, end };
}

export const executiveSummary: ReportDef = {
  key: 'executive-summary',
  label: 'Executive Summary Report',
  icon: 'sheet',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  columns: [
    COL.vehicle,
    COL.type,
    { key: 'date', header: 'Date', width: 130 },
    { key: 'begin', header: 'Begin Time', width: 120 },
    { key: 'beginAt', header: 'Begin Location', width: 190 },
    { key: 'end', header: 'End Time', width: 120 },
    { key: 'endAt', header: 'End Location', width: 190 },
    { key: 'total', header: 'Total Duration', width: 140 },
    { key: 'running', header: 'Running', width: 110 },
    { key: 'idle', header: 'Idle', width: 100 },
    { key: 'stop', header: 'Stop', width: 100 },
    { key: 'towed', header: 'Towed', width: 100 },
    { key: 'km', header: 'Distance (km)', width: 130 },
    { key: 'max', header: 'Max Speed (km/h)', width: 150 },
    { key: 'alerts', header: 'Alerts Count', width: 130 },
    COL.group,
  ],
  build: (input) =>
    eachDay(input).map(({ v, d }) => {
      const { s, begin, end } = ends(d);
      const h = hoursOf(d.stats);
      return {
        id: `${v.id}-${iso(d.date)}`,
        ...vehicleCells(v),
        date: input.fmt.date(d.date),
        begin: input.fmt.time(at(d.date, s.from)),
        beginAt: begin ? placeName(begin, input.fences) : '—',
        end: input.fmt.time(at(d.date, s.to)),
        endAt: end ? placeName(end, input.fences) : '—',
        total: dur(s.to - s.from),
        running: dur(h.running),
        idle: dur(h.idle),
        stop: dur(h.stopped),
        towed: dur(h.towed),
        km: kmText(d.stats.km),
        max: d.stats.maxSpeed,
        alerts: d.alerts.length,
      };
    }),
  empty: 'No activity for these vehicles in this period.',
};

export const statusSummary: ReportDef = {
  key: 'status-summary',
  label: 'Status Summary Report',
  icon: 'sheet',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  columns: [
    COL.group,
    COL.vehicle,
    COL.type,
    { key: 'start', header: 'Start Date & Time', width: 200 },
    { key: 'startAt', header: 'Start Location', width: 190 },
    { key: 'end', header: 'End Date & Time', width: 200 },
    { key: 'endAt', header: 'End Location', width: 190 },
    { key: 'total', header: 'Total Duration', width: 140 },
    { key: 'running', header: 'Running', width: 110 },
    { key: 'idle', header: 'Idle', width: 100 },
    { key: 'stop', header: 'Stop', width: 100 },
    { key: 'towed', header: 'Towed', width: 100 },
    { key: 'km', header: 'Distance (km)', width: 130 },
  ],
  build: (input) => {
    const rows: ReportRow[] = [];
    for (const v of input.vehicles) {
      const days = eachDay({ ...input, vehicles: [v] });
      if (!days.length) continue;
      const first = ends(days[0]!.d);
      const last = ends(days[days.length - 1]!.d);
      const t = { total: 0, running: 0, idle: 0, stopped: 0, towed: 0, km: 0 };
      for (const { d } of days) {
        const s = span(d.segments)!;
        const h = hoursOf(d.stats);
        t.total += s.to - s.from;
        t.running += h.running;
        t.idle += h.idle;
        t.stopped += h.stopped;
        t.towed += h.towed;
        t.km += d.stats.km;
      }
      rows.push({
        id: v.id,
        ...vehicleCells(v),
        start: input.fmt.dateTime(at(days[0]!.d.date, first.s.from)),
        startAt: first.begin ? placeName(first.begin, input.fences) : '—',
        end: input.fmt.dateTime(at(days[days.length - 1]!.d.date, last.s.to)),
        endAt: last.end ? placeName(last.end, input.fences) : '—',
        total: dur(t.total),
        running: dur(t.running),
        idle: dur(t.idle),
        stop: dur(t.stopped),
        towed: dur(t.towed),
        km: kmText(t.km),
      });
    }
    return rows;
  },
  empty: 'No activity for these vehicles in this period.',
};

export const activityConsolidate: ReportDef = {
  key: 'activity-consolidate',
  label: 'Vehicle Activity Consolidate Report',
  icon: 'layers',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  columns: [
    COL.vehicle,
    COL.type,
    { key: 'date', header: 'Date', width: 130 },
    { key: 'running', header: 'Running Duration', width: 150 },
    { key: 'idle', header: 'Idle Duration', width: 130 },
    { key: 'stop', header: 'Stop Duration', width: 130 },
    { key: 'towed', header: 'Towed Duration', width: 140 },
    { key: 'km', header: 'Distance (km)', width: 130 },
    { key: 'alerts', header: 'Alert Count', width: 120 },
    { key: 'beginAt', header: 'Begin Location (lat, long)', width: 220 },
    { key: 'endAt', header: 'End Location (lat, long)', width: 220 },
    COL.group,
  ],
  build: (input) =>
    eachDay(input).map(({ v, d }) => {
      const { begin, end } = ends(d);
      const h = hoursOf(d.stats);
      return {
        id: `${v.id}-${iso(d.date)}`,
        ...vehicleCells(v),
        date: input.fmt.date(d.date),
        running: dur(h.running),
        idle: dur(h.idle),
        stop: dur(h.stopped),
        towed: dur(h.towed),
        km: kmText(d.stats.km),
        alerts: d.alerts.length,
        beginAt: latLng(begin),
        endAt: latLng(end),
      };
    }),
  empty: 'No activity for these vehicles in this period.',
};

export const fleetSummary: ReportDef = {
  key: 'fleet-summary',
  label: 'Fleet Summary Report',
  icon: 'vehicles',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  current: true,
  columns: [
    COL.vehicle,
    COL.type,
    { key: 'status', header: 'Current Status', width: 160, chip: (r) => statusHue(r.status) },
    { key: 'where', header: 'Current / Last Known Location', width: 240 },
    { key: 'last', header: 'Last Transmission Date & Time', width: 230 },
    { key: 'operator', header: 'Current Operator', width: 160 },
    { key: 'associated', header: 'Vehicle Association Date', width: 200 },
    { key: 'purchase', header: 'Date of Purchase', width: 150 },
    COL.group,
  ],
  build: (input) =>
    input.vehicles.map((v) => {
      const dev = input.devices.get(v.id);
      return {
        id: v.id,
        ...vehicleCells(v),
        status: statusLabel(v.status),
        where: v.lastReport ? placeName(v, input.fences) : '—',
        last: v.lastReport ? input.fmt.dateTime(v.lastReport) : 'No report yet',
        associated: dev?.associated ? input.fmt.date(new Date(dev.associated)) : '—',
        purchase: dev?.purchase ? input.fmt.date(new Date(dev.purchase)) : '—',
      };
    }),
  empty: 'No vehicles chosen.',
};

export const consolidateSummary: ReportDef = {
  key: 'consolidate-summary',
  label: 'Consolidate Summary Report',
  icon: 'list',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  columns: [
    COL.vehicle,
    COL.group,
    COL.type,
    { key: 'date', header: 'Date', width: 130 },
    { key: 'on', header: 'First ON Time', width: 130 },
    { key: 'beginAt', header: 'Begin Location (lat, long)', width: 220 },
    { key: 'off', header: 'Last OFF Time', width: 130 },
    { key: 'endAt', header: 'End Location (lat, long)', width: 220 },
    { key: 'running', header: 'Running Duration', width: 150 },
    { key: 'idle', header: 'Idle Duration', width: 130 },
    { key: 'stop', header: 'Stop Duration', width: 130 },
    { key: 'towed', header: 'Towed Duration', width: 140 },
    { key: 'towedKm', header: 'Towed Distance (km)', width: 170 },
    { key: 'km', header: 'Distance (km)', width: 130 },
    { key: 'max', header: 'Max Speed (km/h)', width: 150 },
    { key: 'alerts', header: 'Alert Count', width: 120 },
  ],
  build: (input) =>
    eachDay(input).map(({ v, d }) => {
      const { begin, end } = ends(d);
      const on = sessions(d.segments);
      const h = hoursOf(d.stats);
      return {
        id: `${v.id}-${iso(d.date)}`,
        ...vehicleCells(v),
        date: input.fmt.date(d.date),
        on: on[0] ? input.fmt.time(at(d.date, on[0].from)) : '—',
        beginAt: latLng(begin),
        off: on.length ? input.fmt.time(at(d.date, on[on.length - 1]!.to)) : '—',
        endAt: latLng(end),
        running: dur(h.running),
        idle: dur(h.idle),
        stop: dur(h.stopped),
        towed: dur(h.towed),
        towedKm: kmText(0),
        km: kmText(d.stats.km),
        max: d.stats.maxSpeed,
        alerts: d.alerts.length,
      };
    }),
  empty: 'No activity for these vehicles in this period.',
};

export const engineHours: ReportDef = {
  key: 'engine-hours',
  label: 'Engine Hours Summary Report',
  icon: 'power',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  columns: [
    COL.vehicle,
    COL.type,
    { key: 'start', header: 'Start Date & Time', width: 200 },
    { key: 'startAt', header: 'Start Location (lat, long)', width: 220 },
    { key: 'end', header: 'End Date & Time', width: 200 },
    { key: 'endAt', header: 'End Location (lat, long)', width: 220 },
    { key: 'engine', header: 'Engine Hours', width: 130 },
    { key: 'running', header: 'Vehicle Running Duration', width: 200 },
    { key: 'idle', header: 'Vehicle Idle Duration', width: 180 },
    { key: 'km', header: 'Distance (km)', width: 130 },
    COL.group,
  ],
  build: (input) =>
    eachDay(input).flatMap(({ v, d }) => {
      const runH = hoursOf(d.stats).running || 1;
      return sessions(d.segments).map((s, i) => ({
        id: `${v.id}-${iso(d.date)}-${i}`,
        ...vehicleCells(v),
        start: input.fmt.dateTime(at(d.date, s.from)),
        startAt: latLng(pointAt(d.route, at(d.date, s.from))),
        end: input.fmt.dateTime(at(d.date, s.to)),
        endAt: latLng(pointAt(d.route, at(d.date, s.to))),
        engine: dur(s.to - s.from),
        running: dur(s.running),
        idle: dur(s.idle),
        km: kmText((d.stats.km * s.running) / runH),
      }));
    }),
  empty: 'No engine running in this period.',
};

export const dailyMovement: ReportDef = {
  key: 'daily-movement',
  label: 'Daily Movement Report',
  icon: 'calendar',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  columns: [
    COL.vehicle,
    { key: 'model', header: 'Vehicle Model', width: 160 },
    { key: 'operator', header: 'Operator Name', width: 160 },
    { key: 'contact', header: 'Operator Contact No', width: 180 },
    { key: 'date', header: 'Date', width: 130 },
    { key: 'begin', header: 'Begin Time', width: 120 },
    { key: 'beginAt', header: 'Begin Location', width: 190 },
    { key: 'end', header: 'End Time', width: 120 },
    { key: 'endAt', header: 'End Location', width: 190 },
    { key: 'running', header: 'Running Duration', width: 150 },
    { key: 'km', header: 'Daily Distance (km)', width: 160 },
    { key: 'odo', header: 'Total Odometer (km)', width: 170 },
    COL.group,
  ],
  build: (input) => {
    const opByName = new Map(input.operators.map((o) => [o.name, o]));
    return eachDay(input).map(({ v, d }) => {
      const { s, begin, end } = ends(d);
      // Odometer at the end of that day: today's reading less what it drove since.
      let since = 0;
      for (let n = 0; n < daysAgo(d.date, input.now); n++)
        since += input.day(v, addDays(startOfDay(input.now), -n)).stats.km;
      return {
        id: `${v.id}-${iso(d.date)}`,
        ...vehicleCells(v),
        model: [v.make, v.model].filter(Boolean).join(' ') || '—',
        contact: (v.operator && opByName.get(v.operator)?.contact_no) || '—',
        date: input.fmt.date(d.date),
        begin: input.fmt.time(at(d.date, s.from)),
        beginAt: begin ? placeName(begin, input.fences) : '—',
        end: input.fmt.time(at(d.date, s.to)),
        endAt: end ? placeName(end, input.fences) : '—',
        running: dur(hoursOf(d.stats).running),
        km: kmText(d.stats.km),
        odo: kmText(Math.round(v.odometer - since)),
      };
    });
  },
  empty: 'No activity for these vehicles in this period.',
};

export const utilization: ReportDef = {
  key: 'utilization',
  label: 'Utilization Report',
  icon: 'pie',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  columns: [
    COL.vehicle,
    { key: 'days', header: 'Selected Days', width: 130, align: 'center' },
    { key: 'available', header: 'Available Hours', width: 150 },
    { key: 'used', header: 'Utilized Hours', width: 140 },
    { key: 'unused', header: 'Unused Hours', width: 140 },
    { key: 'usedPct', header: 'Utilization (%)', width: 140, pill: () => 'green' },
    { key: 'unusedPct', header: 'Unused (%)', width: 120, pill: () => 'grey' },
    COL.group,
  ],
  build: (input) =>
    input.vehicles.map((v) => {
      let available = 0;
      let used = 0;
      for (const day of input.days) {
        available +=
          daysAgo(day, input.now) === 0
            ? (input.now.getTime() - startOfDay(input.now).getTime()) / 3_600_000
            : 24;
        used += hoursOf(input.day(v, day).stats).engine;
      }
      const pct = available ? (used / available) * 100 : 0;
      return {
        id: v.id,
        ...vehicleCells(v),
        days: input.days.length,
        available: daysHours(available),
        used: dur(used),
        unused: dur(Math.max(0, available - used)),
        usedPct: `${one(pct)}%`,
        unusedPct: `${one(100 - pct)}%`,
      };
    }),
  empty: 'No vehicles chosen.',
};

export const driverBehaviour: ReportDef = {
  key: 'driver-behaviour',
  label: 'Driver Behaviour Report',
  icon: 'user',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  columns: [
    COL.group,
    COL.vehicle,
    COL.operator,
    { key: 'score', header: 'Overall Score', width: 130, pill: (r) => scoreHue(r.score) },
    { key: 'braking', header: 'Harsh Braking Events', width: 180, align: 'center' },
    { key: 'accel', header: 'Harsh Acceleration Events', width: 210, align: 'center' },
    { key: 'overspeed', header: 'Overspeed Events', width: 160, align: 'center' },
    { key: 'belt', header: 'Seat Belt Violations', width: 170, align: 'center' },
    { key: 'drift', header: 'Drift Events', width: 120, align: 'center' },
    { key: 'idle', header: 'Excessive Idle Duration', width: 190 },
    { key: 'km', header: 'Distance (km)', width: 130 },
    { key: 'engine', header: 'Engine On Duration', width: 170 },
    { key: 'running', header: 'Vehicle Running Duration', width: 200 },
    { key: 'avg', header: 'Average Speed (km/h)', width: 180 },
    { key: 'max', header: 'Max Speed (km/h)', width: 150 },
  ],
  build: (input) => {
    const rows: ReportRow[] = [];
    for (const v of input.vehicles) {
      const days = eachDay({ ...input, vehicles: [v] });
      if (!days.length) continue;
      const t = {
        braking: 0,
        accel: 0,
        over: 0,
        belt: 0,
        drift: 0,
        idle: 0,
        km: 0,
        engine: 0,
        running: 0,
        max: 0,
      };
      for (const { d } of days) {
        const kinds = d.alerts.map((a) => a.kind);
        t.braking += kinds.filter((k) => k === 'harsh_braking').length;
        t.accel += kinds.filter((k) => k === 'harsh_driving').length;
        t.over += kinds.filter((k) => k === 'overspeed').length;
        t.drift += kinds.filter((k) => k === 'harsh_cornering').length;
        const r = rng(v.id + 'belt' + iso(d.date))();
        t.belt += Math.floor(r * r * 2.4);
        t.idle += d.segments
          .filter((s) => s.status === 'idle' && s.to - s.from >= 10 / 60)
          .reduce((a, s) => a + s.to - s.from, 0);
        const h = hoursOf(d.stats);
        t.km += d.stats.km;
        t.engine += h.engine;
        t.running += h.running;
        t.max = Math.max(t.max, d.stats.maxSpeed);
      }
      const n = days.length;
      const penalty =
        (4 * t.braking + 3 * t.accel + 5 * t.over + 3 * t.belt + 2 * t.drift + t.idle * 6) / n;
      rows.push({
        id: v.id,
        ...vehicleCells(v),
        score: Math.max(40, Math.round(100 - penalty)),
        braking: t.braking,
        accel: t.accel,
        overspeed: t.over,
        belt: t.belt,
        drift: t.drift,
        idle: dur(t.idle),
        km: kmText(t.km),
        engine: dur(t.engine),
        running: dur(t.running),
        avg: t.running ? Math.round(t.km / t.running) : 0,
        max: t.max,
      });
    }
    return rows;
  },
  empty: 'No driving for these vehicles in this period.',
};
