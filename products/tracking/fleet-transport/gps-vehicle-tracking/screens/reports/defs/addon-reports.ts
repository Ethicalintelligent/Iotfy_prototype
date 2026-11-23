// Add-on reports: Fuel (Fuel Monitoring, N005) and Temperature (Temperature Monitoring, N006).
// The screen shows them only when the company has bought the add-on, and only for the vehicles
// the add-on covers. Demo readings (labelled on screen) until the sensors report.
import { rng } from '../../../demo/fleet';
import { at, dur, iso, latLng, one, pointAt, span } from '../data';
import type { ReportDef } from '../types';
import { COL, eachDay, vehicleCells } from './common';

const litres = (n: number) => `${one(n)} L`;

export const fuel: ReportDef = {
  key: 'fuel',
  label: 'Fuel Report',
  icon: 'fuel',
  section: 'Fuel Management',
  subject: 'vehicles',
  addon: { id: 'N005', name: 'Fuel Monitoring' },
  columns: [
    COL.vehicle,
    { key: 'level', header: 'Fuel Level', width: 120 },
    { key: 'start', header: 'Begin Date & Time', width: 200 },
    { key: 'end', header: 'End Date & Time', width: 200 },
    { key: 'startAt', header: 'Begin Location (lat, long)', width: 220 },
    { key: 'endAt', header: 'End Location (lat, long)', width: 220 },
    { key: 'begin', header: 'Begin Fuel', width: 120 },
    { key: 'used', header: 'Used', width: 110 },
    { key: 'refill', header: 'Refilled', width: 110 },
    {
      key: 'change',
      header: 'Change',
      width: 120,
      pill: (r) => (String(r.change).startsWith('+') ? 'green' : 'red'),
    },
    COL.group,
  ],
  build: (input) =>
    eachDay({
      ...input,
      vehicles: input.vehicles.filter((v) => !input.covered || input.covered.has(v.id)),
    }).map(({ v, d }) => {
      const x = input.extra.get(v.id);
      const tank = x?.tankL ?? 80;
      const mileage = x?.mileageKmL ?? 6;
      const r = rng(v.id + 'fuel' + iso(d.date));
      const begin = tank * (0.35 + r() * 0.55);
      const used = d.stats.km / mileage;
      // Refilled when it would drop below a fifth of the tank.
      const refill =
        begin - used < tank * 0.2 ? Math.min(tank - (begin - used), tank * (0.5 + r() * 0.3)) : 0;
      const end = Math.max(0, begin - used + refill);
      const s = span(d.segments)!;
      const change = end - begin;
      return {
        id: `${v.id}-${iso(d.date)}`,
        ...vehicleCells(v),
        level: litres(end),
        start: input.fmt.dateTime(at(d.date, s.from)),
        end: input.fmt.dateTime(at(d.date, s.to)),
        startAt: latLng(pointAt(d.route, at(d.date, s.from))),
        endAt: latLng(d.route.points[d.route.points.length - 1]),
        begin: litres(begin),
        used: litres(used),
        refill: refill ? litres(refill) : '—',
        change: `${change >= 0 ? '+' : '−'}${litres(Math.abs(change))}`,
      };
    }),
  empty: 'No fuel readings for these vehicles in this period.',
};

const SENSORS = [
  { name: 'Chamber front', min: -20, max: -12 },
  { name: 'Chamber rear', min: -20, max: -12 },
];

export const temperature: ReportDef = {
  key: 'temperature',
  label: 'Temperature Report',
  icon: 'thermo',
  section: 'Temperature Monitoring',
  subject: 'vehicles',
  addon: { id: 'N006', name: 'Temperature Monitoring' },
  columns: [
    COL.vehicle,
    COL.type,
    { key: 'sensor', header: 'Sensor', width: 150 },
    { key: 'date', header: 'Date', width: 130 },
    { key: 'min', header: 'Min Temp', width: 110 },
    { key: 'avg', header: 'Avg Temp', width: 110 },
    { key: 'max', header: 'Max Temp', width: 110 },
    { key: 'range', header: 'Allowed Range', width: 150 },
    {
      key: 'out',
      header: 'Time Out of Range',
      width: 160,
      pill: (r) => (r.out === '0s' ? 'green' : 'red'),
    },
    { key: 'start', header: 'Begin Date & Time', width: 200 },
    { key: 'startAt', header: 'Begin Location (lat, long)', width: 220 },
    { key: 'end', header: 'End Date & Time', width: 200 },
    { key: 'endAt', header: 'End Location (lat, long)', width: 220 },
    COL.group,
  ],
  build: (input) =>
    eachDay({
      ...input,
      vehicles: input.vehicles.filter((v) => !input.covered || input.covered.has(v.id)),
    }).flatMap(({ v, d }) => {
      const s = span(d.segments)!;
      return SENSORS.map((sensor, i) => {
        const r = rng(v.id + sensor.name + iso(d.date));
        const avg = sensor.min + 2 + r() * 6;
        const lo = avg - 1 - r() * 3;
        const hi = avg + 1 + r() * 4;
        const out = hi > sensor.max ? (hi - sensor.max) * (0.1 + r() * 0.3) : 0;
        const c = (n: number) => `${one(n)} °C`;
        return {
          id: `${v.id}-${iso(d.date)}-${i}`,
          ...vehicleCells(v),
          sensor: sensor.name,
          date: input.fmt.date(d.date),
          min: c(lo),
          avg: c(avg),
          max: c(hi),
          range: `${sensor.min} to ${sensor.max} °C`,
          out: dur(out),
          start: input.fmt.dateTime(at(d.date, s.from)),
          startAt: latLng(pointAt(d.route, at(d.date, s.from))),
          end: input.fmt.dateTime(at(d.date, s.to)),
          endAt: latLng(d.route.points[d.route.points.length - 1]),
        };
      });
    }),
  empty: 'No temperature readings for these vehicles in this period.',
};
