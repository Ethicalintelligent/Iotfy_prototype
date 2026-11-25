// IT-0036. Bulk upload of the Manage page (original `RH`/`jH` for vehicles: check every row, then
// save all or none; `NA`/`qH` for operators, devices and SIM cards: save the valid rows, skip the
// rest, "Download failed rows"). CSV in, same texts, checks and template as the original.
// Saving goes to Neon: vehicles in one transaction, the others row by row through the module's
// own save (modules/source.ts).
import { useRef, useState } from 'react';
import { useNextIds, useSaveBatch, type Batch } from '@iotify/data';
import { useFleetAssets } from '../../fleet-rows';
import { ErrorState, Icon, Loading, Modal, Table } from '../../smart-track/kit';
import { exportCsv } from '../grid/export';
import { OPERATOR_LISTS, operatorDateErrors } from '../modules/defs';
import type { ModuleSource, Values } from '../form/types';
import { Pill } from '../ui';

export type Fail = (key: string, message: string) => void;
interface BulkColumn {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
}
export interface BulkConfig {
  plural: string;
  noun: string;
  /** true = valid rows are saved and the rest skipped; false = all or none. */
  partial: boolean;
  maxRows?: number;
  /** Columns left out of the "Download failed rows" file (passwords). */
  secret?: string[];
  columns: BulkColumn[];
  /** Checks one row and turns it into the module's form values. */
  toValues: (cells: Record<string, string>, fail: Fail) => Values;
}

const DATE_HINT = 'A date: YYYY-MM-DD or DD/MM/YYYY';
const MAX_ROWS = 1000;

const SHOWN = 200;
const REMINDERS = [
  { id: '1-weekbefore', label: '1 week before' },
  { id: '2-weekbefore', label: '2 weeks before' },
  { id: '1-monthbefore', label: '1 month before' },
  { id: '2-monthbefore', label: '2 months before' },
];
const REMINDER_LIST = REMINDERS.map((r) => r.label).join(', ');
const PHONE = /^\+?[0-9()-]{6,30}$/;
const FUELS = ['PETROL', 'DIESEL', 'CNG', 'LPG', 'ELECTRIC', 'HYBRID'];

/** CSV with quotes, comma or semicolon (original `pD` / `hD`). */
function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const first = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const end = () => {
    row.push(cell);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    row = [];
    cell = '';
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') end();
    else if (ch !== '\r') cell += ch;
  }
  end();
  return rows;
}
const pad = (n: number) => String(n).padStart(2, '0');
function date(v: string, key: string, fail: Fail): string {
  if (!v) return '';
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const eu = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  const [y, m, d] = iso ? [iso[1], iso[2], iso[3]] : eu ? [eu[3], eu[2], eu[1]] : [];
  const dt = y ? new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))) : null;
  if (
    !dt ||
    dt.getUTCFullYear() !== Number(y) ||
    dt.getUTCMonth() !== Number(m) - 1 ||
    dt.getUTCDate() !== Number(d)
  ) {
    fail(key, 'must be a date: YYYY-MM-DD or DD/MM/YYYY');
    return '';
  }
  return `${y}-${pad(Number(m))}-${pad(Number(d))}`;
}
function oneOf(v: string, list: string[], key: string, fail: Fail) {
  if (!v) return undefined;
  const hit = list.find((x) => x.toLowerCase() === v.toLowerCase());
  if (!hit) fail(key, `must be one of ${list.join(', ')}`);
  return hit;
}
function number(v: string, key: string, fail: Fail, whole = false) {
  if (!v) return '';
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || (whole && !Number.isInteger(n))) {
    fail(key, whole ? 'must be a whole number' : 'must be a number');
    return '';
  }
  return String(n);
}

const VEHICLES: BulkConfig = {
  plural: 'Vehicles',
  noun: 'vehicle',
  partial: false,
  columns: [
    { key: 'plateNo', label: 'Plate Number', required: true },
    { key: 'name', label: 'Call Sign', required: true },
    { key: 'make', label: 'Make' },
    { key: 'model', label: 'Model' },
    { key: 'year', label: 'Year' },
    { key: 'odometerKm', label: 'Odometer (km)' },
    { key: 'fuelType', label: 'Type of Fuel' },
  ],
  toValues(c, fail) {
    const fuel = c.fuelType!.toUpperCase();
    if (fuel && !FUELS.includes(fuel)) fail('fuelType', `must be one of ${FUELS.join(', ')}`);
    if (!c.plateNo) fail('plateNo', 'is required');
    if (!c.name) fail('name', 'is required');
    return {
      plateNo: c.plateNo,
      callSign: c.name,
      make: c.make,
      model: c.model,
      year: number(c.year!, 'year', fail, true),
      odometer: number(c.odometerKm!, 'odometerKm', fail),
      fuelType: fuel ? fuel[0] + fuel.slice(1).toLowerCase() : '',
    };
  },
};

const OPERATORS: BulkConfig = {
  plural: 'Operators',
  noun: 'operator',
  partial: true,
  columns: [
    { key: 'name', label: 'Operator Name', required: true },
    { key: 'tagId', label: 'Tag Id', hint: "e.g. OPR-1042; not yet another operator's" },
    { key: 'designation', label: 'Designation', hint: OPERATOR_LISTS.designations.join(', ') },
    { key: 'email', label: 'Email Address' },
    { key: 'contactNo', label: 'Contact No', required: true, hint: 'e.g. +91 98400 22110' },
    { key: 'emergencyContact', label: 'Emergency Contact No' },
    { key: 'address1', label: 'Address Line 1', required: true },
    { key: 'address2', label: 'Address Line 2' },
    { key: 'city', label: 'City', required: true },
    { key: 'state', label: 'State', required: true },
    { key: 'country', label: 'Country', required: true, hint: OPERATOR_LISTS.countries.join(', ') },
    { key: 'postalCode', label: 'Postal/Pin Code', required: true },
    { key: 'branchLocation', label: 'Branch Location' },
    { key: 'dob', label: 'Date of Birth', hint: DATE_HINT },
    { key: 'doj', label: 'Date of Joining', hint: DATE_HINT },
    { key: 'dol', label: 'Date of Leaving', hint: DATE_HINT },
    { key: 'insuranceNo', label: 'Insurance Number' },
    { key: 'licenseNo', label: 'License Number' },
    {
      key: 'licenseCategory',
      label: 'License Category',
      hint: OPERATOR_LISTS.licenseCategories.join(', '),
    },
    { key: 'licenseExpiry', label: 'License Expiry Date', hint: DATE_HINT },
    { key: 'status', label: 'Status', hint: 'Active or Inactive; empty = Active' },
  ],
  toValues(c, fail) {
    const phone = (k: string) => {
      if (c[k] && !PHONE.test(c[k]!.replace(/\s+/g, '')))
        fail(k, 'must be a phone number, e.g. +91 98400 22110');
      return c[k];
    };
    for (const k of ['name', 'contactNo', 'address1', 'city', 'state', 'country', 'postalCode'])
      if (!c[k]) fail(k, 'is required');
    const dates = {
      dob: date(c.dob!, 'dob', fail),
      doj: date(c.doj!, 'doj', fail),
      dol: date(c.dol!, 'dol', fail),
    };
    operatorDateErrors(dates).forEach((m) => {
      const key = m.startsWith('Date of Birth')
        ? 'dob'
        : m.startsWith('Date of Joining')
          ? 'doj'
          : 'dol';
      fail(key, m.replace(/^Date of \w+ /, '').replace(/\.$/, ''));
    });
    return {
      ...c,
      ...dates,
      designation: oneOf(c.designation!, OPERATOR_LISTS.designations, 'designation', fail) ?? '',
      contactNo: phone('contactNo'),
      emergencyContact: phone('emergencyContact'),
      country: oneOf(c.country!, OPERATOR_LISTS.countries, 'country', fail) ?? '',
      licenseCategory:
        oneOf(c.licenseCategory!, OPERATOR_LISTS.licenseCategories, 'licenseCategory', fail) ?? '',
      licenseExpiry: date(c.licenseExpiry!, 'licenseExpiry', fail),
      status: oneOf(c.status!, ['Active', 'Inactive'], 'status', fail) ?? 'Active',
      documents: [],
    };
  },
};

function reminder(v: string, fail: Fail) {
  const s = v.toLowerCase();
  if (!s) return '';
  const r = REMINDERS.find((x) => x.label.toLowerCase() === s || x.id === s);
  if (!r) fail('expiryReminder', `must be one of ${REMINDER_LIST}`);
  return r?.id ?? '';
}

function devicesConfig(source: ModuleSource): BulkConfig {
  return {
    plural: 'Devices',
    noun: 'device',
    partial: true,
    columns: [
      { key: 'deviceName', label: 'Device Name', hint: 'e.g. Truck 12 Tracker' },
      {
        key: 'imei',
        label: 'IMEI No',
        required: true,
        hint: '8–20 letters or digits; a device not yet in Manage › Device',
      },
      { key: 'serialNo', label: 'Serial Number' },
      {
        key: 'simNumber',
        label: 'SIM Card Number',
        hint: 'The phone number or ICCID of a SIM card already added in Manage › SIM Card and not in another device. Empty = no SIM',
      },
      {
        key: 'protocol',
        label: 'Manufacturer Name',
        required: true,
        hint: 'The tracker type, e.g. GT06, Teltonika, Queclink',
      },
      { key: 'model', label: 'Model', required: true, hint: 'e.g. GT06N, FMB920' },
      { key: 'purchaseDate', label: 'Date of Purchase', hint: DATE_HINT },
      { key: 'warrantyExpiry', label: 'Warranty Expiry Date', hint: DATE_HINT },
      { key: 'extendedWarranty', label: 'Extended Warranty Date', hint: DATE_HINT },
      { key: 'expiryReminder', label: 'Expiry Reminder', hint: REMINDER_LIST },
      { key: 'status', label: 'Status', hint: 'Active or Inactive; empty = Active' },
    ],
    toValues(c, fail) {
      const imei = c.imei!.replace(/\s/g, '').toUpperCase();
      if (!imei) fail('imei', 'is required');
      else if (!/^[0-9A-Z]{8,20}$/.test(imei)) fail('imei', 'must be 8–20 letters or digits');
      else if (source.rows('device').rows.some((r) => String(r.imei).toUpperCase() === imei))
        fail('imei', 'is already in Manage › Device');
      const sim = c.simNumber!.replace(/[\s()-]/g, '');
      let simId = '';
      if (sim && !/^\+?\d{6,22}$/.test(sim))
        fail('simNumber', "must be the SIM's number or ICCID: 6–22 digits, + optional");
      else if (sim) {
        const all = source.rows('sim').rows;
        const hit = all.find(
          (r) =>
            String(r.simNo).replace(/[\s()-]/g, '') === sim ||
            String(source.get('sim', r.id).serialNo) === sim,
        );
        if (!hit) fail('simNumber', 'is not in Manage › SIM Card');
        else if (hit.imei) fail('simNumber', 'is in another device');
        else simId = hit.id;
      }
      const lists = source.options('device');
      const maker = lists.manufacturers?.find(
        (m) => m.label.toLowerCase() === c.protocol!.toLowerCase(),
      )?.id;
      if (!c.protocol) fail('protocol', 'is required');
      else if (!maker)
        fail(
          'protocol',
          `must be one of ${(lists.manufacturers ?? []).map((m) => m.label).join(', ')}`,
        );
      const model = lists.deviceModels?.find(
        (m) => m.parent === maker && m.label.toLowerCase() === c.model!.toLowerCase(),
      )?.id;
      if (!c.model) fail('model', 'is required');
      else if (maker && !model) fail('model', `is not a ${maker} model`);
      return {
        deviceType: 'Primary Device',
        deviceName: c.deviceName,
        imei,
        serialNo: c.serialNo,
        simNo: simId,
        manufacturer: maker ?? '',
        model: model ?? '',
        purchaseDate: date(c.purchaseDate!, 'purchaseDate', fail),
        warrantyExpiry: date(c.warrantyExpiry!, 'warrantyExpiry', fail),
        extendedWarranty: date(c.extendedWarranty!, 'extendedWarranty', fail),
        expiryReminder: reminder(c.expiryReminder!, fail),
        status: oneOf(c.status!, ['Active', 'Inactive'], 'status', fail) ?? 'Active',
        additionalDevices: [],
      };
    },
  };
}

function simsConfig(source: ModuleSource): BulkConfig {
  const clean = (s: string) => s.replace(/[\s()-]/g, '');
  return {
    plural: 'SIM Cards',
    noun: 'SIM card',
    partial: true,
    columns: [
      {
        key: 'msisdn',
        label: 'SIM Card No',
        required: true,
        hint: 'The phone number: 6–15 digits, + optional; not yet in Manage › SIM Card',
      },
      {
        key: 'iccid',
        label: 'Serial Number',
        required: true,
        hint: 'The 18–22 digit ICCID; not yet in Manage › SIM Card',
      },
      { key: 'pinCode', label: 'Pin Code', hint: '4–8 digits' },
      { key: 'pukCode', label: 'Puk Code', hint: '4–16 digits' },
      { key: 'supportNo', label: 'Support Number', hint: 'e.g. 1800 425 1900' },
      { key: 'provider', label: 'Provider', required: true, hint: 'e.g. Airtel, Jio, STC' },
      { key: 'plan', label: 'Plan', required: true },
      { key: 'purchaseDate', label: 'Date of Purchase', hint: DATE_HINT },
      { key: 'subscriptionDate', label: 'Subscription Date', hint: DATE_HINT },
      {
        key: 'expiryReminder',
        label: 'Expiry Reminder',
        hint: `One or more of ${REMINDER_LIST}, comma-separated; empty = none`,
      },
      { key: 'status', label: 'Status', hint: 'Active or Inactive; empty = Active' },
    ],
    toValues(c, fail) {
      const msisdn = clean(c.msisdn!);
      if (!msisdn) fail('msisdn', 'is required');
      else if (!/^\+?\d{6,15}$/.test(msisdn)) fail('msisdn', 'must be 6–15 digits, + optional');
      else if (source.rows('sim').rows.some((r) => clean(String(r.simNo)) === msisdn))
        fail('msisdn', 'is already in Manage › SIM Card');
      const iccid = clean(c.iccid!);
      if (!iccid) fail('iccid', 'is required');
      else if (!/^\d{18,22}$/.test(iccid)) fail('iccid', 'must be the 18–22 digit ICCID');
      const pin = clean(c.pinCode!);
      if (pin && !/^\d{4,8}$/.test(pin)) fail('pinCode', 'must be 4–8 digits');
      const puk = clean(c.pukCode!);
      if (puk && !/^\d{4,16}$/.test(puk)) fail('pukCode', 'must be 4–16 digits');
      if (!c.provider) fail('provider', 'is required');
      if (!c.plan) fail('plan', 'is required');
      const reminders = new Set<string>();
      for (const part of c.expiryReminder!.split(/[,;]/)) {
        const s = part.trim().toLowerCase();
        if (!s) continue;
        const r = REMINDERS.find((x) => x.label.toLowerCase() === s || x.id === s);
        if (r) reminders.add(r.id);
        else fail('expiryReminder', `must be one or more of ${REMINDER_LIST} (comma-separated)`);
      }
      return {
        simNo: msisdn,
        serialNo: iccid,
        pinCode: pin,
        pukCode: puk,
        supportNo: c.supportNo,
        provider: c.provider,
        plan: c.plan,
        purchaseDate: date(c.purchaseDate!, 'purchaseDate', fail),
        subscriptionDate: date(c.subscriptionDate!, 'subscriptionDate', fail),
        expiryReminder: REMINDERS.map((r) => r.id).filter((r) => reminders.has(r)),
        status: oneOf(c.status!, ['Active', 'Inactive'], 'status', fail) ?? 'Active',
      };
    },
  };
}

interface Parsed {
  row: number;
  cells: Record<string, string>;
  values: Values;
  errors: Record<string, string>;
  saved: boolean;
}
function readFile(
  text: string,
  cfg: BulkConfig,
): { rows: Parsed[]; problem: string | null; ignored: string[] } {
  const none = (problem: string) => ({ rows: [], problem, ignored: [] });
  const [head, ...body] = parseCsv(text);
  if (!head) return none('The file is empty.');
  const names = head.map((h) => h.trim().replace(/\*$/, '').trim().toLowerCase());
  const at = cfg.columns.map((c) =>
    names.findIndex((n) => n === c.label.toLowerCase() || n === c.key.toLowerCase()),
  );
  const missing = cfg.columns.filter((c, i) => c.required && at[i]! < 0).map((c) => c.label);
  if (missing.length)
    return none(
      `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Download the template to see the columns.`,
    );
  if (!body.length) return none('The file has no rows under the header.');
  const verb = cfg.partial ? 'upload' : 'import';
  if (body.length > MAX_ROWS)
    return none(
      `The file has ${body.length} rows; one ${verb} takes up to ${MAX_ROWS}. Split the file and ${verb} each part.`,
    );
  if (cfg.maxRows && body.length > cfg.maxRows)
    return none(
      `The file has ${body.length} rows; one ${verb} takes up to ${cfg.maxRows}. Split the file and ${verb} each part.`,
    );
  const errorsCol = names.indexOf('upload errors');
  const rows = body.map((r, i) => {
    const cells: Record<string, string> = {};
    cfg.columns.forEach((c, j) => (cells[c.key] = at[j]! >= 0 ? (r[at[j]!] ?? '').trim() : ''));
    const errors: Record<string, string> = {};
    const values = cfg.toValues(cells, (k, m) => (errors[k] ??= m));
    return { row: i + 1, cells, values, errors, saved: false };
  });
  // Duplicates inside the file itself.
  const firstKey = cfg.columns.find((c) => c.required)!.key;
  const seen = new Map<string, number>();
  rows.forEach((r) => {
    const k = r.cells[firstKey]!.toLowerCase();
    if (!k) return;
    if (seen.has(k)) r.errors[firstKey] ??= `is also on row ${seen.get(k)}`;
    else seen.set(k, r.row);
  });
  const ignored = head.filter((h, i) => h.trim() && !at.includes(i) && i !== errorsCol);
  return { rows, problem: null, ignored };
}
const hasErrors = (r: Parsed) => Object.keys(r.errors).length > 0;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const columnName = (cfg: BulkConfig, k: string) =>
  k === 'row' ? 'Whole row' : (cfg.columns.find((c) => c.key === k)?.label ?? k);
const template = (cfg: BulkConfig) =>
  exportCsv(
    `${cfg.plural} import template`,
    cfg.columns.map((c) => ({ label: c.required ? `${c.label} *` : c.label, value: () => '' })),
    [],
  );

/* ------------------------------------------------------------------ button */

export function BulkUploadButton({
  module,
  companyId,
  source,
  onDone,
}: {
  module: string;
  companyId: string;
  source: ModuleSource;
  onDone: (n: number, noun: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg =
    module === 'vehicle'
      ? VEHICLES
      : module === 'operator'
        ? OPERATORS
        : module === 'device'
          ? devicesConfig(source)
          : module === 'sim'
            ? simsConfig(source)
            : null;
  if (!cfg) return null;
  const label = `Bulk upload ${cfg.plural === 'SIM Cards' ? 'SIM cards' : cfg.plural.toLowerCase()}`;
  const done = (n: number) => {
    setOpen(false);
    onDone(n, cfg.noun);
  };
  return (
    <>
      <button
        type="button"
        className="td-manage__icon"
        title={label}
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <Icon name="BulkUpload" size={17} />
      </button>
      {open &&
        (cfg.partial ? (
          <PartialImport
            cfg={cfg}
            save={(v) => source.save(module, null, v)}
            onClose={() => setOpen(false)}
            onDone={done}
          />
        ) : (
          <VehicleImport
            cfg={cfg}
            companyId={companyId}
            onClose={() => setOpen(false)}
            onDone={done}
          />
        ))}
    </>
  );
}

function FilePicker({
  name,
  busy,
  onFile,
  onTemplate,
}: {
  name: string | null;
  busy: boolean;
  onFile: (f?: File) => void;
  onTemplate: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <button type="button" className="td-btn td-btn--ghost" onClick={onTemplate}>
        <Icon name="Download" size={16} />
        Download template
      </button>
      <button
        type="button"
        className="td-btn td-btn--primary"
        onClick={() => input.current?.click()}
        disabled={busy}
      >
        <Icon name="FileText" size={16} />
        {name ? 'Choose another file' : 'Choose CSV file'}
      </button>
      {name && <span className="td-mg__text">{name}</span>}
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
function Note({
  error,
  icon,
  children,
}: {
  error?: boolean;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={error ? 'gp-state is-error' : 'gp-state'}
      role={error ? 'alert' : undefined}
      style={{ margin: 0 }}
    >
      <Icon name={icon} size={16} />
      {children}
    </p>
  );
}

/** Vehicles: all rows checked, then all saved in one transaction or none (original `jH`). */
function VehicleImport({
  cfg,
  companyId,
  onClose,
  onDone,
}: {
  cfg: BulkConfig;
  companyId: string;
  onClose: () => void;
  onDone: (n: number) => void;
}) {
  const assets = useFleetAssets(companyId);
  const save = useSaveBatch();
  const nextIds = useNextIds();
  const [name, setName] = useState<string | null>(null);
  const [rows, setRows] = useState<Parsed[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [result, setResult] = useState<{ total: number; valid: number; errors: Parsed[] } | null>(
    null,
  );
  const [busy, setBusy] = useState<'VALIDATE' | 'COMMIT' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    setName(f.name);
    setResult(null);
    setError(null);
    setBusy('VALIDATE');
    const r = readFile(await f.text(), cfg);
    const taken = new Set((assets.data ?? []).map((a) => (a.plate_serial ?? '').toLowerCase()));
    r.rows.forEach((x) => {
      if (taken.has(String(x.values.plateNo).toLowerCase()))
        x.errors.plateNo ??= 'is already in the fleet';
    });
    setRows(r.rows);
    setProblem(r.problem);
    setIgnored(r.ignored);
    if (!r.problem) {
      const bad = r.rows.filter(hasErrors);
      setResult({ total: r.rows.length, valid: r.rows.length - bad.length, errors: bad });
    }
    setBusy(null);
  };
  const commit = async () => {
    setBusy('COMMIT');
    setError(null);
    const now = new Date().toISOString();
    // New vehicles get their ids from gps.tracked_asset's sequence.
    let ids: number[];
    try {
      ids = rows.length ? await nextIds('tracked_asset', rows.length) : [];
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
      return;
    }
    const items = rows.map((r, i) => ({ id: ids[i]!, v: r.values }));
    const batch: Batch = {
      upserts: [
        {
          table: 'tracked_asset',
          rows: items.map(({ id, v }) => ({
            id,
            public_id: crypto.randomUUID(),
            company_id: Number(companyId),
            asset_type: 'VEHICLE',
            asset_type_id: 'AT1',
            name: String(v.callSign),
            code: String(v.plateNo),
            status: 'ACTIVE' as const,
            updated_at: now,
          })),
        },
        {
          table: 'vehicle_details',
          rows: items.map(({ id, v }) => ({
            asset_id: id,
            make: v.make || null,
            model: v.model || null,
            year: v.year ? Number(v.year) : null,
            odometer_km: v.odometer ? Number(v.odometer) : 0,
            fuel_type: v.fuelType || null,
          })),
        },
      ],
    };
    try {
      await save.mutateAsync(batch);
      onDone(items.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setBusy(null);
    }
  };
  const problems = (result?.errors ?? []).flatMap((r) =>
    Object.entries(r.errors).map(([k, m]) => ({
      id: `${r.row}:${k}`,
      line: r.row + 1,
      column: columnName(cfg, k),
      message: m,
    })),
  );
  const ready = !!result && !result.errors.length && result.valid > 0;
  return (
    <Modal
      title={`Import ${cfg.plural.toLowerCase()}`}
      onClose={busy ? () => {} : onClose}
      width={720}
      footer={
        <>
          <button
            type="button"
            className="td-btn td-btn--ghost"
            onClick={onClose}
            disabled={!!busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="td-btn td-btn--primary"
            disabled={!ready || !!busy}
            onClick={() => void commit()}
          >
            {busy === 'COMMIT'
              ? 'Importing…'
              : ready
                ? `Import ${result!.valid} ${cfg.plural.toLowerCase()}`
                : 'Import'}
          </button>
        </>
      }
    >
      <div className="gp-stack">
        <p style={{ margin: 0 }}>
          Fill the template in Excel, save it as CSV, then choose the file. Every row is checked
          first; nothing is saved until you press Import, and then all rows are saved or none.
        </p>
        <FilePicker
          name={name}
          busy={!!busy}
          onFile={(f) => void pick(f)}
          onTemplate={() => template(cfg)}
        />
        {problem && (
          <p className="gp-state is-error" role="alert">
            <Icon name="CircleAlert" size={16} />
            {problem}
          </p>
        )}
        {ignored.length > 0 && (
          <Note icon="Info">Not imported (unknown column): {ignored.join(', ')}</Note>
        )}
        {busy === 'VALIDATE' && <Loading label={`Checking ${rows.length} rows…`} />}
        {error && <ErrorState message={error} />}
        {result && !busy && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill tone="gray">{result.total} rows</Pill>
              <Pill tone="green">{result.valid} ready</Pill>
              {result.errors.length > 0 && (
                <Pill tone="red">{result.errors.length} with errors</Pill>
              )}
            </div>
            {result.errors.length > 0 ? (
              <>
                <Note error icon="CircleAlert">
                  Fix these rows in the file and choose it again.
                </Note>
                <Table
                  rowKey={(r) => r.id}
                  rows={problems.slice(0, SHOWN)}
                  columns={[
                    { key: 'line', header: 'Line', width: 70, render: (r) => r.line },
                    { key: 'column', header: 'Column', width: 160, render: (r) => r.column },
                    { key: 'message', header: 'Problem', render: (r) => r.message },
                  ]}
                />
                {problems.length > SHOWN && (
                  <small>
                    First {SHOWN} of {problems.length} problems shown.
                  </small>
                )}
              </>
            ) : (
              <Note icon="CircleCheck">All rows are valid.</Note>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

/** Operators, devices, SIM cards: valid rows saved, the rest skipped (original `qH`). */
export function PartialImport({
  cfg,
  save,
  onClose,
  onDone,
}: {
  cfg: BulkConfig;
  save: (v: Values) => Promise<unknown>;
  onClose: () => void;
  onDone: (n: number) => void;
}) {
  const [name, setName] = useState<string | null>(null);
  const [rows, setRows] = useState<Parsed[]>([]);
  const [checked, setChecked] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [busy, setBusy] = useState<'VALIDATE' | 'COMMIT' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(0);
  const word = cfg.plural.toLowerCase();
  const pending = rows.filter((r) => !r.saved && !hasErrors(r));
  const failed = rows.filter(hasErrors);
  const savedCount = rows.filter((r) => r.saved).length;
  const close = () => (imported > 0 ? onDone(imported) : onClose());
  const problems = failed.flatMap((r) =>
    Object.entries(r.errors).map(([k, m]) => ({
      id: `${r.row}:${k}`,
      row: r.row,
      column: columnName(cfg, k),
      message: m,
    })),
  );
  const pick = async (f?: File) => {
    if (!f) return;
    setName(f.name);
    setChecked(false);
    setError(null);
    const r = readFile(await f.text(), cfg);
    setRows(r.rows);
    setProblem(r.problem);
    setIgnored(r.ignored);
    if (!r.problem) setChecked(true);
  };
  const commit = async () => {
    setBusy('COMMIT');
    setError(null);
    const next = rows.map((r) => ({ ...r, errors: { ...r.errors } }));
    let n = 0;
    for (const r of next) {
      if (r.saved || hasErrors(r)) continue;
      try {
        await save(r.values);
        r.saved = true;
        n++;
      } catch (e) {
        r.errors.row = e instanceof Error ? e.message : 'Request failed.';
      }
    }
    setRows(next);
    const total = imported + n;
    setImported(total);
    setBusy(null);
    if (n > 0 && !next.some(hasErrors)) onDone(total);
  };
  const downloadFailed = () =>
    exportCsv(
      `${cfg.plural} failed rows`,
      [
        ...cfg.columns.map((c) => ({
          label: c.required ? `${c.label} *` : c.label,
          value: (r: Parsed) => (cfg.secret?.includes(c.key) ? '' : (r.cells[c.key] ?? '')),
        })),
        {
          label: 'Upload Errors',
          value: (r: Parsed) =>
            Object.entries(r.errors)
              .map(([k, m]) => `${columnName(cfg, k)}: ${m}`)
              .join('; '),
        },
      ],
      failed,
    );
  return (
    <Modal
      title={`Bulk upload ${word}`}
      onClose={busy ? () => {} : close}
      width={760}
      footer={
        <>
          <button type="button" className="td-btn td-btn--ghost" onClick={close} disabled={!!busy}>
            {imported > 0 ? 'Close' : 'Cancel'}
          </button>
          <button
            type="button"
            className="td-btn td-btn--primary"
            disabled={!checked || !pending.length || !!busy}
            onClick={() => void commit()}
          >
            {busy === 'COMMIT'
              ? 'Importing…'
              : checked && pending.length
                ? `Import ${plural(pending.length, 'valid row')}`
                : 'Import'}
          </button>
        </>
      }
    >
      <div className="gp-stack">
        <p style={{ margin: 0 }}>
          Fill the template in Excel, save it as CSV, then choose the file. Every row is checked
          first and nothing is saved until you press Import. Import saves the valid rows and skips
          the rows with errors: download those, fix them and upload that file again.
        </p>
        <FilePicker
          name={name}
          busy={!!busy}
          onFile={(f) => void pick(f)}
          onTemplate={() => template(cfg)}
        />
        <details>
          <summary style={{ cursor: 'pointer' }}>
            Template columns ({cfg.columns.filter((c) => c.required).length} required, marked *)
          </summary>
          <Table
            rowKey={(c) => c.key}
            rows={cfg.columns}
            columns={[
              {
                key: 'label',
                header: 'Column',
                width: 190,
                render: (c) => (c.required ? `${c.label} *` : c.label),
              },
              {
                key: 'hint',
                header: 'What to enter',
                render: (c) => c.hint ?? (c.required ? 'Required' : 'Optional'),
              },
            ]}
          />
        </details>
        {problem && (
          <p className="gp-state is-error" role="alert">
            <Icon name="CircleAlert" size={16} />
            {problem}
          </p>
        )}
        {ignored.length > 0 && (
          <Note icon="Info">Not imported (unknown column): {ignored.join(', ')}</Note>
        )}
        {busy === 'COMMIT' && <Loading label={`Importing ${plural(pending.length, 'row')}…`} />}
        {error && <ErrorState message={error} />}
        {checked && !busy && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-live="polite">
              <Pill tone="gray">{plural(rows.length, 'row')}</Pill>
              {savedCount > 0 && <Pill tone="green">{savedCount} imported</Pill>}
              {pending.length > 0 && <Pill tone="blue">{pending.length} ready to import</Pill>}
              {failed.length > 0 && <Pill tone="red">{failed.length} with errors</Pill>}
            </div>
            {failed.length > 0 ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Note error icon="CircleAlert">
                    {savedCount > 0
                      ? 'These rows were not imported.'
                      : 'These rows will not be imported.'}{' '}
                    Row 1 is the first row under the header.
                  </Note>
                  <button type="button" className="td-btn td-btn--ghost" onClick={downloadFailed}>
                    <Icon name="Download" size={16} />
                    Download failed rows
                  </button>
                </div>
                {!!cfg.secret?.length && (
                  <small>
                    Passwords are left out of the downloaded file: type them again before uploading
                    it.
                  </small>
                )}
                <Table
                  rowKey={(r) => r.id}
                  rows={problems.slice(0, SHOWN)}
                  columns={[
                    { key: 'row', header: 'Row', width: 70, render: (r) => r.row },
                    { key: 'column', header: 'Column', width: 170, render: (r) => r.column },
                    { key: 'message', header: 'Problem', render: (r) => r.message },
                  ]}
                />
                {problems.length > SHOWN && (
                  <small>
                    First {SHOWN} of {problems.length} problems shown; the downloaded file has them
                    all.
                  </small>
                )}
              </>
            ) : savedCount === 0 ? (
              <Note icon="CircleCheck">All rows are valid.</Note>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}
