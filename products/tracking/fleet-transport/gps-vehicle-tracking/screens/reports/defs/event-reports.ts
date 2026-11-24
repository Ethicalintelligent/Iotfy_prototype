// Vehicle event reports: one row per event (overspeed, speed sample, stop, alert, status change,
// idle, geofence visit, trip, operator shift, alert email), from the demo activity of the
// company's real vehicles, operators, users and geofences.
import type { Hue } from '@iotify/ui';
import { hash, rng } from '../../../demo/fleet';
import { ALERT, STATUS, type VehicleStatus } from '../../../shared/vehicle-status';
import type { Fence } from '../../../shared/useFleet';
import {
  at,
  dur,
  hoursOf,
  iso,
  kmText,
  latLng,
  num,
  placeName,
  pointAt,
  pointsBetween,
  sessions,
  tripId,
} from '../data';
import type { ReportDef, ReportRow } from '../types';
import {
  COL,
  alertTypeOptions,
  eachDay,
  severityHue,
  statusHue,
  statusLabel,
  vehicleCells,
} from './common';

const HOUR = 3_600_000;

export const overspeedDuration: ReportDef = {
  key: 'overspeed-duration',
  label: 'Overspeed Duration Report',
  icon: 'warn',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  conditions: [
    { key: 'min', label: 'Overspeed for at least (min)', kind: 'number', placeholder: 'e.g. 2' },
  ],
  columns: [
    COL.vehicle,
    COL.type,
    { key: 'limit', header: 'Speed Limit (km/hr)', width: 170, align: 'center' },
    { key: 'length', header: 'Overspeed Duration', width: 170 },
    { key: 'start', header: 'Start Date & Time', width: 200 },
    { key: 'startAt', header: 'Start Location', width: 190 },
    { key: 'end', header: 'End Date & Time', width: 200 },
    { key: 'endAt', header: 'End Location', width: 190 },
    { key: 'minS', header: 'Min OverSpeed (km/hr)', width: 190, align: 'center' },
    { key: 'avgS', header: 'Avg OverSpeed (km/hr)', width: 190, align: 'center' },
    { key: 'maxS', header: 'Max OverSpeed (km/hr)', width: 190, align: 'center' },
    COL.group,
  ],
  build: (input) => {
    const least = num(input.cond, 'min', 0) / 60;
    return eachDay(input).flatMap(({ v, d }) =>
      d.segments
        .filter((s) => s.status === 'overspeed' && s.to - s.from >= least)
        .map((s, i) => {
          const from = at(d.date, s.from);
          const to = at(d.date, s.to);
          const speeds = pointsBetween(d.route, from, to)
            .map((p) => p.speed)
            .filter((x) => x > v.speedLimit);
          // A short burst between two route samples: use the day's top speed.
          const top = Math.max(d.stats.maxSpeed, v.speedLimit + 1);
          const list = speeds.length ? speeds.map((x) => Math.min(x, top)) : [top];
          const p1 = pointAt(d.route, from);
          const p2 = pointAt(d.route, to);
          return {
            id: `${v.id}-${iso(d.date)}-${i}`,
            ...vehicleCells(v),
            limit: v.speedLimit,
            length: dur(s.to - s.from),
            start: input.fmt.dateTime(from),
            startAt: p1 ? placeName(p1, input.fences) : '—',
            end: input.fmt.dateTime(to),
            endAt: p2 ? placeName(p2, input.fences) : '—',
            minS: Math.min(...list, top),
            avgS: Math.round(list.reduce((a, x) => a + x, 0) / list.length),
            maxS: Math.max(...list),
          };
        }),
    );
  },
  empty: 'No overspeeding in this period.',
};

export const speed: ReportDef = {
  key: 'speed',
  label: 'Speed Report',
  icon: 'gauge',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  conditions: [
    {
      key: 'every',
      label: 'One reading every (min)',
      kind: 'number',
      initial: '5',
      placeholder: '5',
    },
    { key: 'above', label: 'Speed above (km/h)', kind: 'number', placeholder: 'e.g. 60' },
  ],
  columns: [
    COL.vehicle,
    COL.type,
    COL.operator,
    { key: 'at', header: 'Date & Time', width: 200 },
    { key: 'where', header: 'Location (lat, long)', width: 220 },
    { key: 'speed', header: 'Speed (km/hr)', width: 140, align: 'center' },
    { key: 'limit', header: 'Speed Limit (km/hr)', width: 170, align: 'center' },
    {
      key: 'over',
      header: 'Limit Exceeds (km/hr)',
      width: 190,
      align: 'center',
      pill: (r) => (Number(r.over) > 0 ? 'red' : 'green'),
    },
    COL.group,
  ],
  build: (input) => {
    const every = Math.max(1, num(input.cond, 'every', 5)) * 60_000;
    const above = num(input.cond, 'above', 0);
    const rows: ReportRow[] = [];
    for (const { v, d } of eachDay(input)) {
      let last = -Infinity;
      d.route.points.forEach((p, i) => {
        if (p.speed <= 0 || p.at.getTime() - last < every) return;
        last = p.at.getTime();
        if (p.speed <= above) return;
        rows.push({
          id: `${v.id}-${iso(d.date)}-${i}`,
          ...vehicleCells(v),
          at: input.fmt.dateTime(p.at),
          where: latLng(p),
          speed: p.speed,
          limit: v.speedLimit,
          over: Math.max(0, p.speed - v.speedLimit),
        });
      });
    }
    return rows;
  },
  empty: 'No speed readings in this period.',
};

export const stop: ReportDef = {
  key: 'stop',
  label: 'Stop Report',
  icon: 'xcircle',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  conditions: [
    {
      key: 'min',
      label: 'Stopped for at least (min)',
      kind: 'number',
      initial: '10',
      placeholder: '10',
    },
  ],
  columns: [
    COL.vehicle,
    COL.type,
    { key: 'stopped', header: 'Stopped Date & Time', width: 200 },
    { key: 'stoppedAt', header: 'Stopped At Location', width: 200 },
    { key: 'resumed', header: 'Resumed Date & Time', width: 200 },
    { key: 'resumedAt', header: 'Resumed At Location', width: 200 },
    { key: 'length', header: 'Stop Duration', width: 140 },
    { key: 'stoppedBy', header: 'Stopped By', width: 150 },
    { key: 'resumedBy', header: 'Resumed By', width: 150 },
    COL.group,
  ],
  build: (input) => {
    const least = num(input.cond, 'min', 10) / 60;
    return eachDay(input).flatMap(({ v, d }) =>
      d.segments
        .map((s, i) => ({ s, i, next: d.segments[i + 1] }))
        .filter(({ s }) => s.status === 'stopped' && s.to - s.from >= least)
        .map(({ s, i, next }) => {
          const p = pointAt(d.route, at(d.date, s.from));
          const place = p ? placeName(p, input.fences) : '—';
          return {
            id: `${v.id}-${iso(d.date)}-${i}`,
            ...vehicleCells(v),
            stopped: input.fmt.dateTime(at(d.date, s.from)),
            stoppedAt: place,
            resumed: next ? input.fmt.dateTime(at(d.date, s.to)) : '—',
            resumedAt: next ? place : '—',
            length: dur(s.to - s.from),
            stoppedBy: v.operator ?? '—',
            resumedBy: next ? (v.operator ?? '—') : '—',
          };
        }),
    );
  },
  empty: 'No stops in this period.',
};

export const alert: ReportDef = {
  key: 'alert',
  label: 'Alert Report',
  icon: 'siren',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  conditions: [{ key: 'kind', label: 'Alert type', kind: 'select', options: alertTypeOptions }],
  columns: [
    COL.vehicle,
    COL.type,
    COL.operator,
    { key: 'kind', header: 'Alert Type', width: 170 },
    { key: 'at', header: 'Date & Time', width: 200 },
    { key: 'where', header: 'Location (lat, long)', width: 220 },
    { key: 'details', header: 'Alert Details', width: 260 },
    { key: 'severity', header: 'Severity', width: 130, chip: (r) => severityHue(r.severity) },
    COL.group,
  ],
  build: (input) =>
    eachDay(input).flatMap(({ v, d }) =>
      [...d.alerts]
        .filter((a) => !input.cond.kind || a.kind === input.cond.kind)
        .sort((a, b) => a.at.getTime() - b.at.getTime())
        .map((a) => ({
          id: a.id,
          ...vehicleCells(v),
          kind: ALERT[a.kind].label,
          at: input.fmt.dateTime(a.at),
          where: latLng(a),
          details: a.description,
          severity: ALERT[a.kind].severity,
        })),
    ),
  empty: 'No alerts in this period.',
};

const MOVEMENT_STATUSES: VehicleStatus[] = ['running', 'stopped', 'idle', 'overspeed'];

export const vehicleMovement: ReportDef = {
  key: 'vehicle-movement',
  label: 'Vehicle Movement Report',
  icon: 'route',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  conditions: [
    {
      key: 'status',
      label: 'Status',
      kind: 'select',
      options: () => MOVEMENT_STATUSES.map((s) => ({ value: s, label: STATUS[s].label })),
    },
  ],
  columns: [
    COL.vehicle,
    COL.type,
    COL.operator,
    { key: 'status', header: 'Status', width: 140, chip: (r) => statusHue(r.status) },
    { key: 'start', header: 'Event Start Date & Time', width: 210 },
    { key: 'end', header: 'Event End Date & Time', width: 210 },
    { key: 'length', header: 'Duration', width: 120 },
    { key: 'km', header: 'Distance (km)', width: 130 },
    { key: 'startAt', header: 'Begin Location (lat, long)', width: 220 },
    { key: 'endAt', header: 'End Location (lat, long)', width: 220 },
    COL.group,
  ],
  build: (input) =>
    eachDay(input).flatMap(({ v, d }) => {
      const runH = hoursOf(d.stats).running || 1;
      return d.segments
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => !input.cond.status || s.status === input.cond.status)
        .map(({ s, i }) => {
          const moving = s.status === 'running' || s.status === 'overspeed';
          return {
            id: `${v.id}-${iso(d.date)}-${i}`,
            ...vehicleCells(v),
            status: statusLabel(s.status),
            start: input.fmt.dateTime(at(d.date, s.from)),
            end: input.fmt.dateTime(at(d.date, s.to)),
            length: dur(s.to - s.from),
            km: kmText(moving ? (d.stats.km * (s.to - s.from)) / runH : 0),
            startAt: latLng(pointAt(d.route, at(d.date, s.from))),
            endAt: latLng(pointAt(d.route, at(d.date, s.to))),
          };
        });
    }),
  empty: 'No movement in this period.',
};

export const noTransmission: ReportDef = {
  key: 'no-transmission',
  label: 'No Transmission Report',
  icon: 'wifioff',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  current: true,
  conditions: [
    {
      key: 'min',
      label: 'No data for at least (min)',
      kind: 'number',
      initial: '60',
      placeholder: '60',
    },
  ],
  columns: [
    COL.vehicle,
    COL.type,
    COL.operator,
    { key: 'last', header: 'Last Transmission Date & Time', width: 230 },
    { key: 'gap', header: 'No Transmission Duration', width: 210 },
    { key: 'status', header: 'Last Known Status', width: 170, chip: (r) => statusHue(r.status) },
    { key: 'where', header: 'Last Known Location (lat, long)', width: 240 },
    { key: 'make', header: 'Device Make', width: 140 },
    { key: 'model', header: 'Device Model', width: 150 },
    { key: 'imei', header: 'IMEI No', width: 170 },
    { key: 'sim', header: 'SIM No', width: 150 },
    { key: 'purchase', header: 'Date of Purchase', width: 150 },
    COL.group,
  ],
  build: (input) => {
    const least = num(input.cond, 'min', 60) * 60_000;
    return input.vehicles
      .filter((v) => v.lastReport && input.now.getTime() - v.lastReport.getTime() >= least)
      .map((v) => {
        const dev = input.devices.get(v.id);
        const today = input.day(v, input.now).segments;
        const lastSeg = today.filter((s) => at(input.now, s.from) <= v.lastReport!).pop();
        const status: VehicleStatus =
          lastSeg && lastSeg.status !== 'notx' ? lastSeg.status : 'stopped';
        return {
          id: v.id,
          ...vehicleCells(v),
          last: input.fmt.dateTime(v.lastReport!),
          gap: dur((input.now.getTime() - v.lastReport!.getTime()) / HOUR),
          status: statusLabel(status),
          where: latLng(v),
          make: dev?.make ?? '—',
          model: dev?.model ?? '—',
          imei: dev?.imei ?? '—',
          sim: dev?.sim ?? '—',
          purchase: dev?.purchase ? input.fmt.date(new Date(dev.purchase)) : '—',
        };
      });
  },
  empty: 'Every chosen vehicle is transmitting.',
};

export const idleViolation: ReportDef = {
  key: 'idle-violation',
  label: 'Idle Violation Report',
  icon: 'clock',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  conditions: [
    { key: 'min', label: 'Idle for at least (min)', kind: 'number', placeholder: 'e.g. 5' },
    {
      key: 'excessive',
      label: 'Excessive from (min)',
      kind: 'number',
      initial: '10',
      placeholder: '10',
    },
  ],
  columns: [
    COL.vehicle,
    COL.type,
    { key: 'length', header: 'Idle Duration', width: 130 },
    { key: 'start', header: 'Begin Date & Time', width: 200 },
    { key: 'startAt', header: 'Begin Location (lat, long)', width: 220 },
    { key: 'end', header: 'End Date & Time', width: 200 },
    { key: 'endAt', header: 'End Location (lat, long)', width: 220 },
    {
      key: 'status',
      header: 'Status',
      width: 130,
      chip: (r) => (r.status === 'Excessive' ? 'red' : 'green'),
    },
    COL.group,
  ],
  build: (input) => {
    const least = num(input.cond, 'min', 0) / 60;
    const excessive = num(input.cond, 'excessive', 10) / 60;
    return eachDay(input).flatMap(({ v, d }) =>
      d.segments
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.status === 'idle' && s.to - s.from >= least)
        .map(({ s, i }) => {
          const p = latLng(pointAt(d.route, at(d.date, s.from)));
          return {
            id: `${v.id}-${iso(d.date)}-${i}`,
            ...vehicleCells(v),
            length: dur(s.to - s.from),
            start: input.fmt.dateTime(at(d.date, s.from)),
            startAt: p,
            end: input.fmt.dateTime(at(d.date, s.to)),
            endAt: p,
            status: s.to - s.from >= excessive ? 'Excessive' : 'Normal',
          };
        }),
    );
  },
  empty: 'No idling in this period.',
};

/** The geofence a demo geofence alert happened at: one linked to the vehicle, else any. */
function fenceFor(fences: Fence[], vehicleId: string, seed: string): Fence | null {
  const active = fences.filter((f) => f.active);
  const linked = active.filter((f) => f.vehicleIds.includes(vehicleId));
  const list = linked.length ? linked : active;
  return list.length ? list[hash(seed) % list.length]! : null;
}

export const fence: ReportDef = {
  key: 'fence',
  label: 'Fence Report',
  icon: 'geofence',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  conditions: [
    {
      key: 'kind',
      label: 'Entry or exit',
      kind: 'select',
      options: () => [
        { value: 'geofence_entry', label: ALERT.geofence_entry.label },
        { value: 'geofence_exit', label: ALERT.geofence_exit.label },
      ],
    },
  ],
  columns: [
    COL.vehicle,
    COL.type,
    COL.operator,
    { key: 'zone', header: 'Zone / Fence Name', width: 190 },
    { key: 'inside', header: 'Time Inside Zone', width: 150 },
    { key: 'kind', header: 'Alert Type', width: 160 },
    { key: 'details', header: 'Alert Details', width: 220 },
    { key: 'at', header: 'Alert Date & Time', width: 200 },
    { key: 'where', header: 'Entry / Exit Location', width: 220 },
    COL.group,
  ],
  build: (input) =>
    eachDay(input).flatMap(({ v, d }) =>
      d.alerts
        .filter(
          (a) =>
            (a.kind === 'geofence_entry' || a.kind === 'geofence_exit') &&
            (!input.cond.kind || a.kind === input.cond.kind),
        )
        .sort((a, b) => a.at.getTime() - b.at.getTime())
        .flatMap((a) => {
          const f = fenceFor(input.fences, v.id, a.id);
          if (!f) return [];
          const entry = a.kind === 'geofence_entry';
          const inside = 0.1 + rng(a.id + 'in')() * 1.9;
          const centre = f.lat != null && f.lng != null ? { lat: f.lat, lng: f.lng } : null;
          const corner = f.points[0] ? { lat: f.points[0][0], lng: f.points[0][1] } : null;
          return [
            {
              id: a.id,
              ...vehicleCells(v),
              zone: `${f.name} · ${f.zoneType}`,
              inside: dur(inside),
              kind: ALERT[a.kind].label,
              details: `${entry ? 'Entered' : 'Left'} ${f.name}`,
              at: input.fmt.dateTime(a.at),
              where: latLng(centre ?? corner),
            },
          ];
        }),
    ),
  empty:
    'No geofence entries or exits in this period. Geofences are set up in Manage › Geo Configuration.',
};

export const trip: ReportDef = {
  key: 'trip',
  label: 'Trip Report',
  icon: 'navigate',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  conditions: [
    { key: 'km', label: 'Distance at least (km)', kind: 'number', placeholder: 'e.g. 5' },
  ],
  columns: [
    COL.vehicle,
    COL.type,
    COL.operator,
    { key: 'trip', header: 'Trip ID / Trip Name', width: 200 },
    { key: 'start', header: 'Trip Start Date & Time', width: 200 },
    { key: 'startAt', header: 'Start Location (lat, long)', width: 220 },
    { key: 'end', header: 'Trip End Date & Time', width: 200 },
    { key: 'endAt', header: 'End Location (lat, long)', width: 220 },
    { key: 'running', header: 'Running Duration', width: 150 },
    { key: 'km', header: 'Distance (km)', width: 130 },
    COL.group,
  ],
  build: (input) => {
    const least = num(input.cond, 'km', 0);
    return eachDay(input).flatMap(({ v, d }) => {
      const runH = hoursOf(d.stats).running || 1;
      return sessions(d.segments)
        .map((s, i) => ({ s, i, km: (d.stats.km * s.running) / runH }))
        .filter((t) => t.km >= least)
        .map(({ s, i, km }) => ({
          id: `${v.id}-${iso(d.date)}-${i}`,
          ...vehicleCells(v),
          trip: tripId(v.callSign, d.date, i + 1),
          start: input.fmt.dateTime(at(d.date, s.from)),
          startAt: latLng(pointAt(d.route, at(d.date, s.from))),
          end: input.fmt.dateTime(at(d.date, s.to)),
          endAt: latLng(pointAt(d.route, at(d.date, s.to))),
          running: dur(s.running),
          km: kmText(km),
        }));
    });
  },
  empty: 'No trips in this period.',
};

export const operator: ReportDef = {
  key: 'operator',
  label: 'Operator Report',
  icon: 'users',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  columns: [
    { key: 'tag', header: 'Tag ID', width: 120 },
    { key: 'name', header: 'Operator Name', strong: true, width: 170 },
    { key: 'contact', header: 'Contact No', width: 170 },
    { key: 'branch', header: 'Branch Location', width: 160 },
    COL.vehicle,
    COL.type,
    { key: 'in', header: 'Sign In Date & Time', width: 200 },
    { key: 'inAt', header: 'Sign In Location (lat, long)', width: 230 },
    { key: 'out', header: 'Sign Out Date & Time', width: 200 },
    { key: 'outAt', header: 'Sign Out Location (lat, long)', width: 230 },
    { key: 'length', header: 'Sign In Duration', width: 150 },
  ],
  build: (input) => {
    const byName = new Map(input.operators.map((o) => [o.name, o]));
    return eachDay(input).flatMap(({ v, d }) => {
      const op = v.operator ? byName.get(v.operator) : undefined;
      // The shift: from the first ignition on to the last ignition off of the day.
      const runs = sessions(d.segments);
      if (!op || op.status === 'Inactive' || !runs.length) return [];
      const r = rng(op.id + iso(d.date));
      const nowH = (input.now.getTime() - d.date.getTime()) / HOUR;
      const inH = Math.max(0, runs[0]!.from - r() * 0.25);
      const lastOff = runs[runs.length - 1]!.to;
      // Engine still on today: not signed out yet.
      const signedOut = lastOff < nowH - 0.01;
      const outH = signedOut ? Math.min(nowH, lastOff + r() * 0.25, 24) : nowH;
      return [
        {
          id: `${op.id}-${v.id}-${iso(d.date)}`,
          ...vehicleCells(v),
          tag: op.tag_id ?? '—',
          name: op.name,
          contact: op.contact_no ?? '—',
          branch: op.branch_location ?? '—',
          in: input.fmt.dateTime(at(d.date, inH)),
          inAt: latLng(pointAt(d.route, at(d.date, runs[0]!.from))),
          out: signedOut ? input.fmt.dateTime(at(d.date, outH)) : 'Still signed in',
          outAt: signedOut ? latLng(pointAt(d.route, at(d.date, lastOff))) : '—',
          length: dur(outH - inH),
        },
      ];
    });
  },
  empty: 'No operator shifts in this period. Operators are linked to vehicles in Manage › Vehicle.',
};

const MAIL_HUE: Record<string, Hue> = { Sent: 'green', Failed: 'red' };

export const alertMail: ReportDef = {
  key: 'alert-mail',
  label: 'Alert Mail Report',
  icon: 'mail',
  section: 'Vehicle Reports',
  subject: 'vehicles',
  conditions: [
    { key: 'kind', label: 'Alert type', kind: 'select', options: alertTypeOptions },
    {
      key: 'mail',
      label: 'Email status',
      kind: 'select',
      options: () => [
        { value: 'Sent', label: 'Sent' },
        { value: 'Failed', label: 'Failed' },
      ],
    },
  ],
  columns: [
    COL.vehicle,
    { key: 'kind', header: 'Alert Type', width: 170 },
    { key: 'details', header: 'Alert Details', width: 260 },
    { key: 'at', header: 'Alert Date & Time', width: 200 },
    { key: 'to', header: 'Recipient Email', width: 240 },
    {
      key: 'mail',
      header: 'Email Status',
      width: 140,
      chip: (r) => MAIL_HUE[String(r.mail)] ?? 'grey',
    },
    COL.group,
  ],
  build: (input) => {
    const to = input.users.map((u) => u.email ?? `${u.userName ?? u.id.toLowerCase()}@example.com`);
    if (!to.length) to.push('fleet-alerts@example.com');
    return eachDay(input).flatMap(({ v, d }) =>
      [...d.alerts]
        .filter((a) => !input.cond.kind || a.kind === input.cond.kind)
        .sort((a, b) => a.at.getTime() - b.at.getTime())
        .map((a) => {
          const r = rng(a.id + 'mail');
          return {
            id: a.id,
            ...vehicleCells(v),
            kind: ALERT[a.kind].label,
            details: a.description,
            at: input.fmt.dateTime(a.at),
            to: to[Math.floor(r() * to.length)]!,
            mail: r() < 0.12 ? 'Failed' : 'Sent',
          };
        })
        .filter((row) => !input.cond.mail || row.mail === input.cond.mail),
    );
  },
  empty: 'No alert emails in this period.',
};
