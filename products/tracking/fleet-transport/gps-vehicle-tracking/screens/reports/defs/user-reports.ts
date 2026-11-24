// Common Reports: User Activity and User Logs. Demo audit rows (labelled on screen) that use the
// company's real users and roles; real activity replaces them when the platform logs it.
import type { Hue } from '@iotify/ui';
import { hash, rng } from '../../../demo/fleet';
import { at, daysAgo, dur, iso } from '../data';
import type { ReportDef, ReportInput, ReportRow, ReportUser } from '../types';

const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;

const BROWSERS = [
  'Chrome 131 · Windows',
  'Edge · Windows',
  'Safari · iPhone',
  'Safari · Mac',
  'EIT Mobile · Android',
];
const ip = (r: () => number) => `10.0.${Math.floor(r() * 250) + 2}.${Math.floor(r() * 250) + 2}`;

/** The modules and what users do in them (old and new values when something changed). */
const ACTIONS: {
  module: string;
  action: string;
  change?: (r: () => number, input: ReportInput, by: ReportUser) => [string, string];
}[] = [
  { module: 'Auth', action: 'Login success' },
  { module: 'Auth', action: 'Login failed' },
  { module: 'Tracking', action: 'Location history viewed' },
  { module: 'Reports', action: 'Report run' },
  { module: 'Reports', action: 'Report downloaded' },
  { module: 'Users', action: 'User changed', change: () => ['status: ACTIVE', 'status: INACTIVE'] },
  {
    module: 'Roles',
    action: 'Role changed',
    change: (r, input) => {
      const roles = input.roles.length > 1 ? input.roles : ['Fleet Supervisor', 'Fleet Manager'];
      const a = pick(r, roles);
      return [
        a,
        pick(
          r,
          roles.filter((x) => x !== a),
        ),
      ];
    },
  },
  { module: 'Profile', action: 'Profile changed' },
  {
    module: 'Vehicles',
    action: 'Vehicle changed',
    change: (r) => {
      const a = pick(r, [60, 80, 100]);
      return [`speed limit: ${a}`, `speed limit: ${a === 80 ? 90 : 80}`];
    },
  },
  {
    module: 'Alerts',
    action: 'Alert setting changed',
    change: () => ['email: off', 'email: on'],
  },
  { module: 'Geofences', action: 'Geofence viewed' },
  { module: 'Devices', action: 'Command sent', change: () => ['—', 'Request location'] },
];
export const MODULES = [...new Set(ACTIONS.map((a) => a.module))];
export const ACTION_NAMES = [...new Set(ACTIONS.map((a) => a.action))];

const fallbackUser = (input: ReportInput): ReportUser => ({
  id: '—',
  name: `${input.companyId} user`,
  role: '—',
  email: null,
  userName: null,
});

/** Activity events of one day (today: up to now), newest first. */
function activity(input: ReportInput, day: Date) {
  const r = rng(input.companyId + 'audit' + iso(day));
  const n = 5 + Math.floor(r() * 8);
  const limit = daysAgo(day, input.now) === 0 ? input.now.getTime() : Infinity;
  const out: {
    at: Date;
    by: ReportUser;
    module: string;
    action: string;
    old: string;
    nu: string;
    device: string;
    i: number;
  }[] = [];
  for (let i = 0; i < n; i++) {
    const t = at(day, 7 + r() * 12);
    const by = input.users.length ? pick(r, input.users) : fallbackUser(input);
    const a = pick(r, ACTIONS);
    const [old, nu] = a.change ? a.change(r, input, by) : ['—', '—'];
    const device = `${ip(r)} · ${pick(r, BROWSERS)}`;
    if (t.getTime() <= limit)
      out.push({ at: t, by, module: a.module, action: a.action, old, nu, device, i });
  }
  return out.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export const userActivity: ReportDef = {
  key: 'user-activity',
  label: 'User Activity Report',
  icon: 'pulse',
  section: 'Common Reports',
  subject: 'users',
  conditions: [
    {
      key: 'module',
      label: 'Module',
      kind: 'select',
      options: () => MODULES.map((m) => ({ value: m, label: m })),
    },
    {
      key: 'action',
      label: 'Action',
      kind: 'select',
      options: () => ACTION_NAMES.map((m) => ({ value: m, label: m })),
    },
  ],
  columns: [
    { key: 'company', header: 'Company ID', width: 130 },
    { key: 'module', header: 'Module Name', strong: true, width: 150 },
    { key: 'action', header: 'Action', width: 170 },
    { key: 'old', header: 'Old Value', width: 150 },
    { key: 'new', header: 'New Value', width: 150 },
    { key: 'at', header: 'Activity Date & Time', width: 200 },
    { key: 'by', header: 'Performed By', width: 170 },
    { key: 'device', header: 'Device & IP Address', width: 240 },
  ],
  build: (input) =>
    [...input.days]
      .reverse()
      .flatMap((day) => activity(input, day))
      .filter(
        (e) =>
          (!input.cond.module || e.module === input.cond.module) &&
          (!input.cond.action || e.action === input.cond.action),
      )
      .map<ReportRow>((e) => ({
        id: `${iso(e.at)}-${e.i}`,
        company: input.companyId,
        module: e.module,
        action: e.action,
        old: e.old,
        new: e.nu,
        at: input.fmt.dateTime(e.at),
        by: e.by.name,
        device: e.device,
      })),
  empty: 'No user activity in this period.',
};

const SESSION_HUE: Record<string, Hue> = {
  'Logged out': 'grey',
  Active: 'green',
  'Timed out': 'amber',
};

export const userLogs: ReportDef = {
  key: 'user-logs',
  label: 'User Logs Report',
  icon: 'enter',
  section: 'Common Reports',
  subject: 'users',
  conditions: [
    {
      key: 'user',
      label: 'User',
      kind: 'select',
      options: (c) => c.users.map((u) => ({ value: u.id, label: u.name })),
    },
  ],
  columns: [
    { key: 'userId', header: 'User ID', width: 110 },
    { key: 'name', header: 'User Name', strong: true, width: 200 },
    { key: 'role', header: 'Role', width: 160 },
    { key: 'login', header: 'Login Date & Time', width: 200 },
    { key: 'logout', header: 'Logout Date & Time', width: 200 },
    { key: 'length', header: 'Session Duration', width: 150 },
    {
      key: 'status',
      header: 'Session Status',
      width: 150,
      chip: (r) => SESSION_HUE[String(r.status)] ?? 'grey',
    },
    { key: 'device', header: 'Device & IP Address', width: 280 },
  ],
  build: (input) => {
    const rows: { t: number; row: ReportRow }[] = [];
    for (const day of input.days) {
      const today = daysAgo(day, input.now) === 0;
      for (const u of input.users) {
        if (input.cond.user && u.id !== input.cond.user) continue;
        const r = rng(u.id + 'logs' + iso(day));
        const n = Math.floor(r() * 3) + (hash(u.id) % 2);
        let h = 7 + r() * 3;
        for (let i = 0; i < n && h < 21; i++) {
          const len = 0.4 + r() * 3.6;
          const login = at(day, h);
          const out = at(day, h + len);
          const timedOut = r() < 0.15;
          h += len + 0.5 + r() * 3;
          if (login > input.now) break;
          const active = today && out > input.now;
          const status = active ? 'Active' : timedOut ? 'Timed out' : 'Logged out';
          const channel = r() < 0.7 ? 'WEB' : 'MOBILE';
          rows.push({
            t: login.getTime(),
            row: {
              id: `${u.id}-${iso(day)}-${i}`,
              userId: u.id,
              name: u.name,
              role: u.role,
              login: input.fmt.dateTime(login),
              logout: active ? '—' : input.fmt.dateTime(out),
              length: dur(((active ? input.now : out).getTime() - login.getTime()) / 3_600_000),
              status,
              device: `${channel} · ${ip(r)} · ${pick(r, BROWSERS)}`,
            },
          });
        }
      }
    }
    return rows.sort((a, b) => b.t - a.t).map((x) => x.row);
  },
  empty: 'No sign-ins in this period.',
};
