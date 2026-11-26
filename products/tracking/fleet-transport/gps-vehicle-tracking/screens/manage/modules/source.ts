// IT-0036. The data behind the four list modules, read from Neon through @iotify/data and saved
// with one useSaveBatch transaction per action (root CLAUDE.md §4). Replaces the original page's
// built-in demo API. Mapping (IT-0040: vehicles, devices, SIMs, users and groups are gps tables,
// read through ../../fleet-rows with text ids; saves turn ids back into gps numbers):
//   Vehicle  = core.tracked_asset (name = call sign, code = plate, group_id = group, status) +
//              gps.vehicle_details + vehicle_io (tracker inputs) + vehicle_geofences; the device
//              is the core.device row whose asset_id is it.
//   Device   = core.device (model_id → core.device_model for make / model, device details in the
//              same row); its SIM is core.device.sim_card_id.
//   SIM Card = core.sim_card (msisdn = number, iccid, provider, plan, PIN / PUK, reminders).
//   Operator = core.operators.
// "+ Add" choices go in core.vehicle_lookups where a kind exists for them; operator
// cities and states in core.lookups (list 'City' / 'State').
// IT-0038: every field is saved. Vehicle category details, trailers, dashcam and fuel monitoring
// (with the calibration matrix) in core.tracked_asset.asset_info; asset status "Maintenance" in
// core.tracked_asset.status; files (vehicle photo / documents, operator
// ID / licence proofs / documents) in core.documents (≤ 1 MB, Neon's error otherwise), their names
// also in the *_name columns; every SIM reminder in core.sim_card.reminders.
import { useMemo } from 'react';
import {
  useDocuments,
  useLookups,
  useGeofences,
  useNextIds,
  useOperators,
  useSaveBatch,
  useVehicleDetails,
  useVehicleGeofences,
  useVehicleIo,
  useVehicleLookups,
  type Batch,
} from '@iotify/data';
import {
  str,
  strList,
  type ListItem,
  type Lists,
  type ModuleSource,
  type Row,
  type Values,
} from '../form/types';
import type { FileRef } from '../ui';
import { docsOf, saveDocs } from './records';
import {
  assetStatusCode,
  nid,
  sid,
  useFleetAssets,
  useFleetDevices,
  useFleetGroups,
  useFleetModels,
  useFleetSims,
  useFleetUsers,
} from '../../fleet-rows';
import { CATEGORIES, categoryOf } from './categories';
import { OPERATOR_LISTS, operatorDateErrors } from './defs';
import {
  PRIMARY,
  SECONDARY,
  extraErrors,
  extrasOf,
  trackerFrom,
  CATEGORY_DETAIL_KEYS,
  calibrationError,
  type Catalogue,
  type ZoneItem,
} from './vehicleSections';

type Rec = Record<string, unknown>;
const newId = (prefix: string, company: string) =>
  `${prefix}-${company}-${crypto.randomUUID().slice(0, 8)}`;
/** A gps id given as text (option lists, form values) → the number to save, or null. */
const num = (v: unknown) => nid(str(v));
const orNull = (v: unknown) => {
  const s = str(v);
  return s === '' ? null : s;
};
const numOrNull = (v: unknown) => {
  const s = str(v).replace(',', '.');
  return s === '' ? null : Number(s);
};
const day = (v: unknown) => (v ? String(v).slice(0, 10) : '');
/** Saved files; older rows have only names (from before files were stored). */
const withNames = (docs: FileRef[], names: string[]): FileRef[] =>
  docs.length ? docs : names.map((n) => ({ name: String(n) }));
const obj = (v: unknown): Rec =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {};
/** core.tracked_asset.asset_info → the form's values (category details, trailers, dashcam, fuel monitoring). */
function attributesOf(raw: unknown): Rec {
  const a = obj(raw);
  return {
    ...obj(a.categoryDetails),
    ...(Array.isArray(a.trailers) ? { trailers: a.trailers } : {}),
    ...(a.dashcam ? { dashcam: obj(a.dashcam) } : {}),
    ...(a.fuelMonitoring ? { fuelMonitoring: obj(a.fuelMonitoring) } : {}),
  };
}
/** The form's values → core.tracked_asset.asset_info, by section. */
function attributesFrom(v: Values, fuelMonitoring: Rec): Rec {
  return {
    categoryDetails: Object.fromEntries(
      CATEGORY_DETAIL_KEYS.filter((k) => str(v[k]) !== '').map((k) => [k, str(v[k])]),
    ),
    trailers: Array.isArray(v.trailers) ? v.trailers : [],
    dashcam: obj(v.dashcam),
    fuelMonitoring,
  };
}
const names = (v: unknown) => (Array.isArray(v) ? (v as FileRef[]).map((f) => f.name) : []);

const REMINDER_IDS = ['1-weekbefore', '2-weekbefore', '1-monthbefore', '2-monthbefore'];
const DEVICE_REMINDERS = [
  '7 days before',
  '15 days before',
  '30 days before',
  '60 days before',
] as const;
const SIM_REMINDERS = [
  '1 week before',
  '2 weeks before',
  '1 month before',
  '2 months before',
] as const;
const OWNERSHIP = ['Owned', 'Leased', 'Rented', 'Contractor', 'Hired'];
const TRACKING_TYPES = ['Tracking', 'Tracking + Dashcam', 'Tracking + Waste', 'Dashcam', 'Trailer'];
/** documents.owner_table of vehicles (the name it had before IT-0040; owner_id is the gps id as text). */
const ASSETS = 'core.assets';
const OPERATORS = 'core.operators';
const slug = (s: string) =>
  s
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Every field of the four list modules is saved (IT-0038): see the mapping above. */
export function useManageSource(companyId: string, readOnly: boolean, refreshAll: () => void) {
  const company = Number(companyId);
  const assets = useFleetAssets(companyId);
  const details = useVehicleDetails();
  const io = useVehicleIo();
  const units = useFleetDevices(companyId);
  const models = useFleetModels();
  const conn = useFleetSims(companyId);
  const operators = useOperators({ company_id: company });
  const users = useFleetUsers(companyId);
  const groups = useFleetGroups(companyId);
  const fences = useGeofences({ company_id: company });
  const links = useVehicleGeofences();
  const lookups = useVehicleLookups();
  const coreLookups = useLookups();
  const documents = useDocuments({ company_id: company });
  const save = useSaveBatch();
  const nextIds = useNextIds();

  const all = [
    assets,
    details,
    io,
    units,
    models,
    conn,
    operators,
    users,
    groups,
    fences,
    links,
    lookups,
    coreLookups,
    documents,
  ];
  const loading = all.some((q) => q.isPending);
  const error = all.find((q) => q.error)?.error ?? null;

  return useMemo(() => {
    const DOCS = documents.data;
    const docKeys = (ownerTable: string, ownerId: string) => {
      const gone = (DOCS ?? []).filter(
        (x) => x.owner_table === ownerTable && x.owner_id === ownerId,
      );
      return gone.length
        ? [{ table: 'documents' as const, keys: gone.map((x) => ({ id: x.id })) }]
        : [];
    };
    const coreList = (list: string) =>
      (coreLookups.data ?? [])
        .filter((l) => l.list === list && l.active !== false && l.value)
        .map((l) => ({ id: l.value!, label: l.value! }));
    // vehicle_details, vehicle_io and vehicle_geofences point to gps ids (numbers): as text here.
    const detailRows = (details.data ?? []).map((d) => ({
      ...d,
      asset_id: String(d.asset_id),
      fleet_manager_id: sid(d.fleet_manager_id),
      supervisor_id: sid(d.supervisor_id),
    }));
    const withDetails = new Set(detailRows.map((d) => d.asset_id));
    const A = (assets.data ?? []).filter((a) => withDetails.has(a.id));
    const assetIds = new Set(A.map((a) => a.id));
    const D = new Map(detailRows.filter((d) => assetIds.has(d.asset_id)).map((d) => [d.asset_id, d]));
    const U = units.data ?? [];
    // The device details are columns of core.device itself.
    const UD = new Map(U.map((u) => [u.id, u]));
    const M = new Map((models.data ?? []).map((m) => [m.id, m]));
    const C = (conn.data ?? []).filter((c) => c.identifier_type !== 'DevEUI');
    const SD = new Map(C.map((c) => [c.id, c]));
    const O = operators.data ?? [];
    const US = users.data ?? [];
    const G = groups.data ?? [];
    const F = fences.data ?? [];
    const L = (links.data ?? [])
      .map((l) => ({ ...l, asset_id: String(l.asset_id) }))
      .filter((l) => assetIds.has(l.asset_id));
    const IO = (io.data ?? [])
      .map((r) => ({ ...r, asset_id: String(r.asset_id) }))
      .filter((r) => assetIds.has(r.asset_id));
    const LK = lookups.data ?? [];
    const unitOf = new Map(U.filter((u) => u.asset_id).map((u) => [u.asset_id!, u]));
    const simOf = new Map(C.filter((c) => c.device_unit_id).map((c) => [c.device_unit_id!, c]));
    const plateOf = (assetId?: string | null) => {
      const a = A.find((x) => x.id === assetId);
      return a ? (a.plate_serial ?? a.name ?? '') : '';
    };
    const userName = (id?: string | null) => US.find((u) => u.id === id)?.name ?? '';
    const opName = new Map(O.map((o) => [o.id, o.name]));
    const groupByName = new Map(G.map((g) => [g.name, g]));
    const lookup = (kind: string) =>
      LK.filter((l) => l.kind === kind).map((l) => ({
        id: l.value,
        label: l.value,
        parent: l.parent ?? undefined,
      }));
    const merge = (base: string[], extra: ListItem[], used: string[] = []) => {
      const out: ListItem[] = base.map((x) => ({ id: x, label: x }));
      for (const x of [...extra, ...used.filter(Boolean).map((u) => ({ id: u, label: u }))])
        if (!out.some((o) => o.id === x.id)) out.push(x);
      return out;
    };
    const modelLabel = (u?: { device_model_id?: string | null }) => M.get(u?.device_model_id ?? '');
    const status = (active?: boolean) => (active === false ? 'Inactive' : 'Active');

    /* ---------------------------------------------------------------- rows */
    const vehicleRows: Row[] = A.map((a) => {
      const d = D.get(a.id);
      const cat = categoryOf(d?.category);
      return {
        id: a.id,
        group: a.asset_group ?? '',
        plateNo: a.plate_serial ?? a.name,
        callSign: a.name,
        category: cat?.label ?? d?.category ?? '—',
        categoryImage: cat?.image,
        operator: (d?.operator_id && opName.get(d.operator_id)) || d?.operator_name || '',
        fleetManager: userName(d?.fleet_manager_id),
        supervisor: userName(d?.supervisor_id),
        make: d?.make ?? '',
        model: d?.model ?? '',
        deviceImei: unitOf.get(a.id)?.imei ?? '',
        odometer: d?.odometer_km == null ? '' : Math.round(Number(d.odometer_km)),
        status: a.status ?? '',
        fuelType: d?.fuel_type ?? '',
        fuelCapacity: d?.tank_capacity_l == null ? '' : String(d.tank_capacity_l),
        fuelSensorId: '',
        calibrationStatus: '',
      };
    });
    const deviceRows: Row[] = U.map((u) => {
      const d = UD.get(u.id);
      const m = modelLabel(u);
      return {
        id: u.id,
        imei: u.imei ?? '',
        plateNo: plateOf(u.asset_id),
        manufacturer: m?.maker ?? '',
        model: m?.model ?? '',
        purchaseDate: d?.purchase_date ?? '',
        warrantyExpiry: d?.warranty_expiry ?? '',
        simNo: simOf.get(u.id)?.number ?? '',
        status: status(d?.active),
      };
    });
    const simRows: Row[] = C.map((c) => {
      const d = SD.get(c.id);
      return {
        id: c.id,
        simNo: c.number ?? '',
        imei: U.find((u) => u.id === c.device_unit_id)?.imei ?? '',
        purchaseDate: d?.purchase_date ?? '',
        subscriptionDate: d?.subscription_date ?? '',
        provider: c.provider ?? '',
        plan: d?.plan ?? '',
        pukCode: d?.puk_code ?? '',
        supportNo: d?.support_number ?? '',
        status: status(d?.active),
      };
    });
    const operatorRows: Row[] = O.map((o) => ({
      id: o.id,
      name: o.name,
      tagId: o.tag_id ?? '',
      email: o.email ?? '',
      contactNo: o.contact_no ?? '',
      emergencyContact: o.emergency_contact_no ?? '',
      licenseNo: o.license_number ?? '',
      licenseExpiry: o.license_expiry ?? '',
      address1: o.address_line1 ?? '',
      branchLocation: o.branch_location ?? '',
      city: o.city ?? '',
      plateNo: A.filter((a) => D.get(a.id)?.operator_id === o.id)
        .map((a) => a.plate_serial ?? a.name)
        .join(', '),
      country: o.country ?? '',
      status: o.status ?? 'Active',
    }));
    const rowsOf: Record<string, Row[]> = {
      vehicle: vehicleRows,
      device: deviceRows,
      sim: simRows,
      operator: operatorRows,
    };

    /* ---------------------------------------------------------------- forms: read */
    const ioOf = (assetId: string) => {
      const rows = IO.filter((r) => r.asset_id === assetId).sort(
        (a, b) => (a.port_no ?? 0) - (b.port_no ?? 0),
      );
      const of = (k: string) => rows.filter((r) => r.kind === k);
      const n = (v?: number | null) => (v == null ? '' : String(v));
      const cfg: Rec = {};
      if (of('Digital input').length)
        cfg.digitalInputs = of('Digital input').map((r) => ({
          sensor: r.signal ?? '',
          reverse: !!r.reverse,
        }));
      if (of('Digital output').length)
        cfg.digitalOutputs = of('Digital output').map((r) => ({
          sensor: r.signal ?? '',
          reverse: !!r.reverse,
        }));
      if (of('Analog').length)
        cfg.analog = of('Analog').map((r) => ({
          type: r.analog_type ?? '',
          unit: r.signal ?? '',
          min: n(r.min_value),
          max: n(r.max_value),
        }));
      if (of('1-Wire').length)
        cfg.oneWire = of('1-Wire').map((r) => ({
          input: r.signal ?? '',
          min: n(r.min_value),
          max: n(r.max_value),
        }));
      if (of('Bluetooth').length)
        cfg.bluetooth = of('Bluetooth').map((r) => ({
          input: r.signal ?? '',
          min: n(r.min_value),
          max: n(r.max_value),
        }));
      if (of('RS232').length) cfg.rs232 = of('RS232').map((r) => r.signal ?? '');
      if (of('RS485').length) cfg.rs485 = of('RS485').map((r) => r.signal ?? '');
      return { rows, cfg };
    };
    const reminderId = (label: string | null | undefined, list: readonly string[]) => {
      const i = list.indexOf(label ?? '');
      return i >= 0 ? REMINDER_IDS[i]! : '';
    };
    const getVehicle = (id: string): Values => {
      const a = A.find((x) => x.id === id);
      const d = D.get(id);
      const unit = unitOf.get(id);
      const spec = modelLabel(unit);
      return {
        ...ioOf(id).cfg,
        vehicleId: id,
        category: categoryOf(d?.category)?.id ?? d?.category ?? '',
        plateNo: a?.plate_serial ?? '',
        callSign: a?.name ?? '',
        vehicleType: d?.vehicle_type ?? '',
        operationCode: d?.operation_code ?? '',
        chassisNo: d?.vin ?? '',
        engineNo: d?.engine_no ?? '',
        color: d?.color ?? '',
        make: d?.make ?? '',
        model: d?.model ?? '',
        assetStatus: a?.status ?? '',
        year: d?.year == null ? '' : String(d.year),
        odometer: d?.odometer_km == null ? '' : String(d.odometer_km),
        speedLimit: d?.speed_limit_kmh == null ? '' : String(d.speed_limit_kmh),
        height: d?.height_cm == null ? '' : String(d.height_cm),
        ownership: d?.ownership ?? '',
        branch: d?.branch ?? '',
        registrationDate: day(d?.registration_date),
        insuranceExpiry: day(d?.insurance_expiry),
        fcExpiry: day(d?.fc_expiry),
        permitExpiry: day(d?.permit_expiry),
        photo: withNames(docsOf(DOCS, ASSETS, id, 'photo'), d?.photo_name ? [d.photo_name] : []),
        documents: withNames(docsOf(DOCS, ASSETS, id, 'document'), d?.document_names ?? []),
        ...attributesOf(a?.attributes),
        fleetManager: d?.fleet_manager_id ?? '',
        supervisor: d?.supervisor_id ?? '',
        operatorId: d?.operator_id ?? '',
        group: (a?.asset_group && groupByName.get(a.asset_group)?.id) || '',
        geofences: L.filter((l) => l.asset_id === id).map((l) => l.geofence_id),
        fuelType: d?.fuel_type ?? '',
        fuelCapacity: d?.tank_capacity_l == null ? '' : String(d.tank_capacity_l),
        mileage: d?.mileage_km_l == null ? '' : String(d.mileage_km_l),
        oilTankCapacity: d?.oil_capacity_l == null ? '' : String(d.oil_capacity_l),
        costPerLiter: d?.cost_per_l == null ? '' : String(d.cost_per_l),
        maxFuelLevel: d?.max_fuel_level_l == null ? '' : String(d.max_fuel_level_l),
        fuelCalibration: d?.fuel_calibration ?? '',
        trackingType: d?.tracking_type ?? (unit ? 'Tracking' : ''),
        debugMode:
          d?.debugging_mode === 'On' ? 'Enabled' : d?.debugging_mode === 'Off' ? 'Disabled' : '',
        deviceImei: unit?.id ?? '',
        trackerMake: spec?.maker ?? '',
        trackerModel: spec?.model ?? '',
      };
    };
    const getDevice = (id: string): Values => {
      const u = U.find((x) => x.id === id);
      const d = UD.get(id);
      const m = modelLabel(u);
      const primary = d?.primary_unit_id ? U.find((x) => x.id === d.primary_unit_id) : undefined;
      return {
        deviceType: d?.device_type === 'Additional Device' ? SECONDARY : PRIMARY,
        primaryImei: primary?.imei ?? '',
        deviceName: d?.device_name ?? '',
        imei: u?.imei ?? '',
        serialNo: d?.serial_number ?? '',
        simNo: simOf.get(id)?.id ?? '',
        manufacturer: m?.maker ?? '',
        model: m?.model ?? '',
        purchaseDate: day(d?.purchase_date),
        warrantyExpiry: day(d?.warranty_expiry),
        extendedWarranty: day(d?.extended_warranty),
        expiryReminder: reminderId(d?.expiry_reminder, DEVICE_REMINDERS),
        status: status(d?.active),
        additionalDevices: U.filter((x) => UD.get(x.id)?.primary_unit_id === id).map((x) => {
          const xd = UD.get(x.id);
          const xm = modelLabel(x);
          return {
            id: x.id,
            deviceName: xd?.device_name ?? '',
            imei: x.imei ?? '',
            serialNo: xd?.serial_number ?? '',
            simNo: simOf.get(x.id)?.id ?? '',
            manufacturer: xm?.maker ?? '',
            model: xm?.model ?? '',
            purchaseDate: day(xd?.purchase_date),
            warrantyExpiry: day(xd?.warranty_expiry),
            extendedWarranty: day(xd?.extended_warranty),
            expiryReminder: reminderId(xd?.expiry_reminder, DEVICE_REMINDERS),
            status: status(xd?.active),
          };
        }),
      };
    };
    const getSim = (id: string): Values => {
      const c = C.find((x) => x.id === id);
      const d = SD.get(id);
      const r = reminderId(d?.expiry_reminder, SIM_REMINDERS);
      return {
        simNo: c?.number ?? '',
        serialNo: c?.identifier ?? '',
        pinCode: d?.pin_code ?? '',
        pukCode: d?.puk_code ?? '',
        supportNo: d?.support_number ?? '',
        provider: c?.provider ?? '',
        plan: d?.plan ?? '',
        purchaseDate: day(d?.purchase_date),
        subscriptionDate: day(d?.subscription_date),
        expiryReminder: c?.reminders?.length
          ? c.reminders.map((x) => reminderId(x, SIM_REMINDERS)).filter(Boolean)
          : r
            ? [r]
            : [],
        status: status(d?.active),
      };
    };
    const getOperator = (id: string): Values => {
      const o = O.find((x) => x.id === id);
      if (!o) return {};
      return {
        name: o.name,
        tagId: o.tag_id ?? '',
        designation: o.designation ?? '',
        email: o.email ?? '',
        contactNo: o.contact_no ?? '',
        emergencyContact: o.emergency_contact_no ?? '',
        address1: o.address_line1 ?? '',
        address2: o.address_line2 ?? '',
        city: o.city ?? '',
        state: o.state ?? '',
        country: o.country ?? '',
        postalCode: o.postal_code ?? '',
        branchLocation: o.branch_location ?? '',
        dob: day(o.date_of_birth),
        doj: day(o.date_of_joining),
        dol: day(o.date_of_leaving),
        insuranceNo: o.insurance_number ?? '',
        licenseNo: o.license_number ?? '',
        licenseCategory: o.license_category ?? '',
        licenseExpiry: day(o.license_expiry),
        status: o.status ?? 'Active',
        idProof:
          withNames(
            docsOf(DOCS, OPERATORS, id, 'id_proof'),
            o.id_proof_name ? [o.id_proof_name] : [],
          )[0] ?? null,
        licenseProof:
          withNames(
            docsOf(DOCS, OPERATORS, id, 'license_proof'),
            o.license_proof_name ? [o.license_proof_name] : [],
          )[0] ?? null,
        documents: withNames(docsOf(DOCS, OPERATORS, id, 'document'), o.document_names ?? []),
      };
    };

    /* ---------------------------------------------------------------- choice lists */
    const catalogue: Catalogue = {};
    for (const m of models.data ?? []) {
      if (!m.maker || !m.model) continue;
      const l = (catalogue[m.maker] ??= []);
      if (!l.includes(m.model)) l.push(m.model);
    }
    const simLabel = (c: (typeof C)[number]) =>
      `${c.number ?? c.identifier ?? c.id}${c.provider ? ` · ${c.provider}` : ''}`;
    const deviceOptions = (): Lists => ({
      manufacturers: Object.keys(catalogue).map((m) => ({ id: m, label: m })),
      deviceModels: Object.entries(catalogue).flatMap(([mk, ms]) =>
        ms.map((m) => ({ id: m, label: m, parent: mk })),
      ),
      sims: C.map((c) => ({ id: c.id, label: simLabel(c), usedBy: c.device_unit_id ?? undefined })),
    });
    const vehicleOptions = (): Lists => {
      const fromDetails = (k: 'vehicle_type' | 'color' | 'make' | 'model') =>
        [...D.values()].map((d) => d[k]).filter(Boolean) as string[];
      return {
        categories: CATEGORIES.map((c) => ({ id: c.id, label: c.label, image: c.image })),
        vehicleTypes: merge(
          VEHICLE_BASE.vehicleTypes,
          lookup('vehicle_type'),
          fromDetails('vehicle_type'),
        ),
        colors: merge(VEHICLE_BASE.colors, lookup('color'), fromDetails('color')),
        makes: merge(VEHICLE_BASE.makes, lookup('make'), fromDetails('make')),
        models: merge(VEHICLE_BASE.models, lookup('model'), fromDetails('model')),
        fleetManagers: US.map((u) => ({ id: u.id, label: u.name ?? u.email ?? u.id })),
        supervisors: US.map((u) => ({ id: u.id, label: u.name ?? u.email ?? u.id })),
        devices: U.filter((u) => UD.get(u.id)?.active !== false || u.asset_id).map((u) => {
          const on = u.asset_id ? plateOf(u.asset_id) : '';
          const m = modelLabel(u);
          return {
            id: u.id,
            label: `${u.imei ?? u.id}${m?.model ? ` · ${m.model}` : ''}${on ? ` (on ${on})` : ''}`,
          };
        }),
        deviceHolders: U.filter((u) => u.asset_id).map((u) => ({
          id: u.id,
          label: plateOf(u.asset_id),
          parent: u.asset_id!,
        })),
        deviceSpecs: U.map((u) => ({
          id: u.id,
          label: modelLabel(u)?.model ?? '',
          parent: modelLabel(u)?.maker ?? '',
        })),
        groups: G.map((g) => ({ id: g.id, label: g.name, parent: g.parent_id ?? undefined })),
        operators: O.map((o) => ({
          id: o.id,
          label: o.status === 'Inactive' ? `${o.name} (Inactive)` : o.name,
        })),
        geofences: F.map((f): ZoneItem =>
          f.shape === 'Circle'
            ? {
                id: f.id,
                label: f.name,
                shape: 'circle',
                geometry: {
                  center: [Number(f.center_lat), Number(f.center_lng)],
                  radius: Number(f.radius_m),
                },
              }
            : {
                id: f.id,
                label: f.name,
                shape: 'freeform',
                geometry: {
                  points: Array.isArray(f.points) ? (f.points as [number, number][]) : [],
                },
              },
        ),
      };
    };
    const options = (m: string): Lists => {
      if (m === 'device') return deviceOptions();
      if (m === 'sim')
        return {
          providers: merge(
            ['Airtel', 'Jio', 'Vi', 'BSNL'],
            lookup('sim_provider'),
            C.map((c) => c.provider ?? ''),
          ),
          plans: lookup('sim_plan'),
        };
      if (m === 'operator')
        return {
          cities: merge(
            OPERATOR_LISTS.cities,
            coreList('City'),
            O.map((o) => o.city ?? ''),
          ),
          states: merge(
            OPERATOR_LISTS.states,
            coreList('State'),
            O.map((o) => o.state ?? ''),
          ),
        };
      return vehicleOptions();
    };

    /* ---------------------------------------------------------------- save */
    const run = async (batch: Batch) => {
      await save.mutateAsync(batch);
    };
    const dealerId = U.find((u) => u.owner_dealer_id)?.owner_dealer_id ?? null;
    const modelIdOf = (maker: unknown, model: unknown) =>
      (models.data ?? []).find((m) => m.maker === str(maker) && m.model === str(model))?.id ?? null;
    const modelName = (maker: unknown, model: unknown) =>
      (models.data ?? []).find((m) => m.maker === str(maker) && m.model === str(model))?.model ??
      null;

    const saveVehicle = async (id: string | null, v: Values) => {
      const errs = [
        ...(
          [
            'category',
            'plateNo',
            'callSign',
            'model',
            'fuelType',
            'fuelCapacity',
            'mileage',
            'trackingType',
          ] as const
        )
          .filter((k) => !str(v[k]))
          .map((k) => `${LABEL[k]} is required.`),
      ];
      const speed = str(v.speedLimit);
      if (speed && (!Number.isInteger(Number(speed)) || Number(speed) < 1 || Number(speed) > 300))
        errs.push('Speed Limit must be a whole number from 1 to 300 km/h.');
      const tracker = trackerFrom({ ...v, make: v.trackerMake, model: v.trackerModel });
      const type = str(v.trackingType);
      if (type && type !== 'Dashcam') {
        const miss = [
          !tracker.make && 'Device Manufacturer',
          !tracker.model && 'Device Model',
        ].filter(Boolean);
        if (miss.length)
          errs.push(`Tracking: ${miss.join(' and ')} ${miss.length > 1 ? 'are' : 'is'} required.`);
      }
      const cal = calibrationError(tracker.fuelMonitoring, Number(v.fuelCapacity) || null);
      if (cal) errs.push(`Tracking: ${cal}`);
      if (errs.length) throw new Error(errs.join(' '));
      // New vehicles get their id from core.tracked_asset's sequence.
      const assetNo = id ? Number(id) : (await nextIds('tracked_asset'))[0]!;
      const assetId = String(assetNo);
      const group = G.find((g) => g.id === str(v.group));
      const now = new Date().toISOString();
      const asset: Rec = {
        id: assetNo,
        name: str(v.callSign),
        code: str(v.plateNo),
        group_id: group ? Number(group.id) : null,
        updated_at: now,
      };
      const st = str(v.assetStatus);
      if (st === 'Active' || st === 'Inactive' || st === 'Maintenance')
        asset.status = assetStatusCode(st);
      asset.asset_info = attributesFrom(v, tracker.fuelMonitoring);
      const detail: Rec = {
        asset_id: assetNo,
        category: orNull(v.category),
        vehicle_type: orNull(v.vehicleType),
        operation_code: orNull(v.operationCode),
        vin: orNull(v.chassisNo),
        engine_no: orNull(v.engineNo),
        color: orNull(v.color),
        make: orNull(v.make),
        model: orNull(v.model),
        year: numOrNull(v.year),
        odometer_km: numOrNull(v.odometer),
        speed_limit_kmh: numOrNull(v.speedLimit),
        height_cm: numOrNull(v.height),
        ownership: OWNERSHIP.includes(str(v.ownership)) ? str(v.ownership) : null,
        branch: orNull(v.branch),
        registration_date: orNull(v.registrationDate),
        insurance_expiry: orNull(v.insuranceExpiry),
        fc_expiry: orNull(v.fcExpiry),
        permit_expiry: orNull(v.permitExpiry),
        photo_name: names(v.photo)[0] ?? null,
        document_names: names(v.documents),
        fleet_manager_id: num(v.fleetManager),
        supervisor_id: num(v.supervisor),
        operator_id: orNull(v.operatorId),
        fuel_type: orNull(v.fuelType),
        tank_capacity_l: numOrNull(v.fuelCapacity),
        mileage_km_l: numOrNull(v.mileage),
        oil_capacity_l: numOrNull(v.oilTankCapacity),
        cost_per_l: numOrNull(v.costPerLiter),
        max_fuel_level_l: numOrNull(v.maxFuelLevel),
        fuel_calibration: orNull(v.fuelCalibration),
        tracking_type: TRACKING_TYPES.includes(type) ? type : null,
        debugging_mode:
          tracker.debugMode === 'Enabled' ? 'On' : tracker.debugMode === 'Disabled' ? 'Off' : null,
        updated_at: now,
      };
      const batch: Batch = { upserts: [], updates: [], deletes: [] };
      if (id) batch.updates!.push({ table: 'tracked_asset', rows: [asset] });
      else
        batch.upserts!.push({
          table: 'tracked_asset',
          rows: [
            {
              ...asset,
              public_id: crypto.randomUUID(),
              company_id: company,
              asset_type: 'VEHICLE',
              asset_type_id: 'AT1',
              status: asset.status ?? 'ACTIVE',
            } as Rec,
          ],
        });
      batch.upserts!.push({ table: 'vehicle_details', rows: [detail] });
      // Tracker inputs and outputs: one vehicle_io row per port.
      const ioRows: Rec[] = [];
      const add = (kind: string, i: number, r: Rec) =>
        ioRows.push({
          id: `${assetId}-${kind.replace(/\W/g, '')}-${i + 1}`,
          asset_id: assetNo,
          kind,
          port_no: i + 1,
          ...r,
        });
      tracker.digitalInputs.forEach((r, i) =>
        add('Digital input', i, { signal: orNull(r.sensor), reverse: r.reverse }),
      );
      tracker.digitalOutputs.forEach((r, i) =>
        add('Digital output', i, { signal: orNull(r.sensor), reverse: r.reverse }),
      );
      tracker.analog.forEach((r, i) =>
        add('Analog', i, {
          signal: orNull(r.unit),
          analog_type: orNull(r.type),
          min_value: numOrNull(r.min),
          max_value: numOrNull(r.max),
        }),
      );
      tracker.oneWire.forEach((r, i) =>
        add('1-Wire', i, {
          signal: orNull(r.input),
          min_value: numOrNull(r.min),
          max_value: numOrNull(r.max),
        }),
      );
      tracker.bluetooth.forEach((r, i) =>
        add('Bluetooth', i, {
          signal: orNull(r.input),
          min_value: numOrNull(r.min),
          max_value: numOrNull(r.max),
        }),
      );
      tracker.rs232.forEach((r, i) => add('RS232', i, { signal: orNull(r) }));
      tracker.rs485.forEach((r, i) => add('RS485', i, { signal: orNull(r) }));
      batch.upserts!.push({ table: 'vehicle_io', rows: ioRows });
      const keep = new Set(ioRows.map((r) => r.id));
      const stale = ioOf(assetId).rows.filter((r) => !keep.has(r.id));
      if (stale.length)
        batch.deletes!.push({ table: 'vehicle_io', keys: stale.map((r) => ({ id: r.id })) });
      // The tracker device: core.device.asset_id.
      const dev = str(v.deviceImei);
      const was = unitOf.get(assetId);
      if (was && was.id !== dev)
        batch.updates!.push({
          table: 'device',
          rows: [{ id: Number(was.id), asset_id: null, status: 'IN_STOCK' }],
        });
      if (dev && was?.id !== dev)
        batch.updates!.push({
          table: 'device',
          rows: [{ id: Number(dev), asset_id: assetNo, status: 'ACTIVE' }],
        });
      // Geofences.
      const want = strList(v.geofences);
      const have = L.filter((l) => l.asset_id === assetId).map((l) => l.geofence_id);
      const added = want.filter((g) => !have.includes(g));
      if (added.length)
        batch.upserts!.push({
          table: 'vehicle_geofences',
          rows: added.map((g) => ({ asset_id: assetNo, geofence_id: g })),
        });
      const gone = have.filter((g) => !want.includes(g));
      if (gone.length)
        batch.deletes!.push({
          table: 'vehicle_geofences',
          keys: gone.map((g) => ({ asset_id: assetNo, geofence_id: g })),
        });
      // Photo and documents: core.documents (the names stay in vehicle_details too).
      saveDocs(batch, DOCS, {
        companyId,
        ownerTable: ASSETS,
        ownerId: assetId,
        kind: 'photo',
        files: (v.photo as FileRef[]) ?? [],
      });
      saveDocs(batch, DOCS, {
        companyId,
        ownerTable: ASSETS,
        ownerId: assetId,
        kind: 'document',
        files: (v.documents as FileRef[]) ?? [],
      });
      await run(batch);
      return { id: assetId };
    };

    /** One core.device row (the device details are its own columns) and its SIM link. */
    const deviceRowsFor = (
      id: number,
      v: Rec,
      type: 'Primary Device' | 'Additional Device',
      primary: number | null,
      isNew: boolean,
    ): Batch => {
      const reminder = REMINDER_IDS.indexOf(str(v.expiryReminder));
      const unit: Rec = {
        id,
        imei: str(v.imei).replace(/\s/g, '').toUpperCase(),
        model_id: num(modelIdOf(v.manufacturer, v.model)),
        model: modelName(v.manufacturer, v.model),
        device_type: type,
        primary_unit_id: primary,
        device_name: orNull(v.deviceName),
        serial_no: orNull(v.serialNo),
        purchase_date: orNull(v.purchaseDate),
        warranty_expiry: orNull(v.warrantyExpiry),
        additional_warranty: orNull(v.extendedWarranty),
        expiry_reminder: reminder >= 0 ? DEVICE_REMINDERS[reminder] : null,
        active: str(v.status) !== 'Inactive',
      };
      const b: Batch = { upserts: [], updates: [] };
      if (isNew)
        b.upserts!.push({
          table: 'device',
          rows: [
            {
              ...unit,
              public_id: crypto.randomUUID(),
              protocol: 'GENERIC',
              company_id: company,
              owner_dealer_id: dealerId,
              status: 'IN_STOCK',
            },
          ],
        });
      else b.updates!.push({ table: 'device', rows: [unit] });
      // The SIM: core.device.sim_card_id (one device per SIM: another device holding it lets go first).
      const sim = str(v.simNo);
      const oldSim = simOf.get(String(id));
      if (sim && oldSim?.id !== sim) {
        const holder = C.find((c) => c.id === sim)?.device_unit_id;
        if (holder && holder !== String(id))
          b.updates!.push({ table: 'device', rows: [{ id: Number(holder), sim_card_id: null }] });
        b.updates!.push({ table: 'device', rows: [{ id, sim_card_id: Number(sim) }] });
      } else if (!sim && oldSim)
        b.updates!.push({ table: 'device', rows: [{ id, sim_card_id: null }] });
      return b;
    };
    const saveDevice = async (id: string | null, v: Values) => {
      if (!modelIdOf(v.manufacturer, v.model))
        throw new Error('Pick a manufacturer and model from the list.');
      const extras = str(v.deviceType) === SECONDARY ? [] : extrasOf(v.additionalDevices);
      const others = U.map((u) => ({ id: u.id, imei: u.imei ?? '', simId: simOf.get(u.id)?.id }));
      const bad = extraErrors(v, extras, others, id)
        .flatMap((e, i) =>
          Object.keys(e).length
            ? [`Additional device ${i + 1}: ${Object.values(e).join(', ')}.`]
            : [],
        )
        .slice(0, 3);
      if (bad.length) throw new Error(bad.join(' '));
      const imei = str(v.imei).replace(/\s/g, '').toUpperCase();
      if (U.some((u) => u.id !== id && (u.imei ?? '').toUpperCase() === imei))
        throw new Error('IMEI No is already another device.');
      // New devices get their ids from core.device's sequence.
      const fresh = (id ? 0 : 1) + extras.filter((x) => !x.id).length;
      const ids = fresh ? await nextIds('device', fresh) : [];
      const unitNo = id ? Number(id) : ids.shift()!;
      const parts = [
        deviceRowsFor(
          unitNo,
          v,
          str(v.deviceType) === SECONDARY ? 'Additional Device' : 'Primary Device',
          null,
          !id,
        ),
      ];
      for (const x of extras)
        parts.push(
          deviceRowsFor(
            x.id ? Number(x.id) : ids.shift()!,
            x as unknown as Rec,
            'Additional Device',
            unitNo,
            !x.id,
          ),
        );
      const removed = U.filter(
        (u) => u.primary_unit_id === String(unitNo) && !extras.some((x) => x.id === u.id),
      );
      const batch: Batch = {
        upserts: parts.flatMap((p) => p.upserts ?? []),
        updates: parts.flatMap((p) => p.updates ?? []),
        deletes: removed.length
          ? [{ table: 'device', keys: removed.map((u) => ({ id: Number(u.id) })) }]
          : [],
      };
      await run(batch);
      return { id: String(unitNo) };
    };
    const saveSim = async (id: string | null, v: Values) => {
      const old = C.find((c) => c.id === id);
      const cid = id ? Number(id) : (await nextIds('sim_card'))[0]!;
      const reminder = REMINDER_IDS.indexOf(strList(v.expiryReminder)[0] ?? '');
      const reminders = strList(v.expiryReminder)
        .map((r) => SIM_REMINDERS[REMINDER_IDS.indexOf(r)])
        .filter((r): r is (typeof SIM_REMINDERS)[number] => !!r);
      const number = str(v.simNo) || old?.number || null;
      const row: Rec = {
        id: cid,
        reminders,
        msisdn: number,
        // core.sim_card.iccid is required: the SIM number stands in until the ICCID is known.
        iccid: str(v.serialNo) || old?.identifier || number || `SIM-${cid}`,
        provider: orNull(v.provider),
        identifier_type: 'ICCID',
        pin_code: str(v.pinCode) || old?.pin_code || null,
        puk_code: str(v.pukCode) || old?.puk_code || null,
        support_no: orNull(v.supportNo),
        plan: orNull(v.plan),
        purchase_date: orNull(v.purchaseDate),
        subscription_date: orNull(v.subscriptionDate),
        expiry_reminder: reminder >= 0 ? SIM_REMINDERS[reminder] : null,
        active: str(v.status) !== 'Inactive',
      };
      const batch: Batch = id
        ? { updates: [{ table: 'sim_card', rows: [row] }] }
        : {
            upserts: [
              {
                table: 'sim_card',
                rows: [
                  {
                    ...row,
                    public_id: crypto.randomUUID(),
                    company_id: company,
                    owner_dealer_id: dealerId,
                    status: 'IN_STOCK',
                    billing: 'Bundled',
                  },
                ],
              },
            ],
          };
      await run(batch);
      return { id: String(cid) };
    };
    const saveOperator = async (id: string | null, v: Values) => {
      const errs = [
        ...(['name', 'contactNo', 'address1', 'city', 'state', 'country', 'postalCode'] as const)
          .filter((k) => !str(v[k]))
          .map((k) => `${OP_LABEL[k]} is required.`),
        ...operatorDateErrors(v),
      ];
      if (errs.length) throw new Error(errs.join(' '));
      const oid = id ?? newId('OP', companyId);
      const row: Rec = {
        id: oid,
        company_id: company,
        name: str(v.name),
        tag_id: orNull(v.tagId),
        designation: orNull(v.designation),
        email: orNull(v.email),
        contact_no: orNull(v.contactNo),
        emergency_contact_no: orNull(v.emergencyContact),
        address_line1: orNull(v.address1),
        address_line2: orNull(v.address2),
        city: orNull(v.city),
        state: orNull(v.state),
        country: orNull(v.country),
        postal_code: orNull(v.postalCode),
        branch_location: orNull(v.branchLocation),
        date_of_birth: orNull(v.dob),
        date_of_joining: orNull(v.doj),
        date_of_leaving: orNull(v.dol),
        insurance_number: orNull(v.insuranceNo),
        license_number: orNull(v.licenseNo),
        license_category: orNull(v.licenseCategory),
        license_expiry: orNull(v.licenseExpiry),
        status: str(v.status) === 'Inactive' ? 'Inactive' : 'Active',
        id_proof_name: (v.idProof as FileRef | null)?.name ?? null,
        license_proof_name: (v.licenseProof as FileRef | null)?.name ?? null,
        document_names: names(v.documents),
        updated_at: new Date().toISOString(),
      };
      const batch: Batch = { upserts: [{ table: 'operators', rows: [row] }] };
      const one = (f: unknown) => (f ? [f as FileRef] : []);
      saveDocs(batch, DOCS, {
        companyId,
        ownerTable: OPERATORS,
        ownerId: oid,
        kind: 'id_proof',
        files: one(v.idProof),
      });
      saveDocs(batch, DOCS, {
        companyId,
        ownerTable: OPERATORS,
        ownerId: oid,
        kind: 'license_proof',
        files: one(v.licenseProof),
      });
      saveDocs(batch, DOCS, {
        companyId,
        ownerTable: OPERATORS,
        ownerId: oid,
        kind: 'document',
        files: (v.documents as FileRef[]) ?? [],
      });
      await run(batch);
      return { id: oid };
    };

    const remove = async (m: string, id: string) => {
      if (m === 'vehicle') {
        const unit = unitOf.get(id);
        const no = Number(id);
        await run({
          updates: unit
            ? [
                {
                  table: 'device',
                  rows: [{ id: Number(unit.id), asset_id: null, status: 'IN_STOCK' }],
                },
              ]
            : [],
          deletes: [
            {
              table: 'vehicle_geofences',
              keys: L.filter((l) => l.asset_id === id).map((l) => ({
                asset_id: no,
                geofence_id: l.geofence_id,
              })),
            },
            {
              table: 'vehicle_io',
              keys: IO.filter((r) => r.asset_id === id).map((r) => ({ id: r.id })),
            },
            { table: 'vehicle_details', keys: D.has(id) ? [{ asset_id: no }] : [] },
            { table: 'tracked_asset', keys: [{ id: no }] },
            ...docKeys(ASSETS, id),
          ],
        });
      } else if (m === 'device') {
        // The SIM link is a column of the device: deleting the device frees the SIM.
        await run({ deletes: [{ table: 'device', keys: [{ id: Number(id) }] }] });
      } else if (m === 'sim') {
        const holder = C.find((c) => c.id === id)?.device_unit_id;
        await run({
          updates: holder
            ? [{ table: 'device', rows: [{ id: Number(holder), sim_card_id: null }] }]
            : [],
          deletes: [{ table: 'sim_card', keys: [{ id: Number(id) }] }],
        });
      } else
        await run({ deletes: [{ table: 'operators', keys: [{ id }] }, ...docKeys(OPERATORS, id)] });
    };

    const LOOKUP_KIND: Record<string, string> = {
      vehicleTypes: 'vehicle_type',
      colors: 'color',
      makes: 'make',
      models: 'model',
      providers: 'sim_provider',
      plans: 'sim_plan',
    };
    const addOption = async (
      m: string,
      list: string,
      value: string,
      parent?: string,
    ): Promise<ListItem> => {
      const v = value.trim();
      if (list === 'groups') {
        const [gid] = await nextIds('asset_group');
        await run({
          upserts: [
            {
              table: 'asset_group',
              rows: [
                {
                  id: gid,
                  public_id: crypto.randomUUID(),
                  company_id: company,
                  name: v,
                  parent_id: nid(parent),
                  solution_code: 'VEHICLE',
                },
              ],
            },
          ],
        });
        return { id: String(gid), label: v, parent };
      }
      const kind = LOOKUP_KIND[list];
      if (kind) {
        await run({
          upserts: [
            {
              table: 'vehicle_lookups',
              rows: [
                {
                  id: `LK-${kind}-${crypto.randomUUID().slice(0, 8)}`,
                  kind,
                  value: v,
                  parent: parent ?? null,
                } as Rec,
              ],
            },
          ],
        });
        return { id: v, label: v, parent };
      }
      if (m === 'operator' && (list === 'cities' || list === 'states')) {
        // core.lookups, list 'City' / 'State' (id LK-CITY-<slug>).
        const kindName = list === 'cities' ? 'City' : 'State';
        await run({
          upserts: [
            {
              table: 'lookups',
              rows: [
                {
                  id: `LK-${kindName.toUpperCase()}-${slug(v)}`,
                  list: kindName,
                  value: v,
                  active: true,
                },
              ],
            },
          ],
        });
        return { id: v, label: v };
      }
      throw new Error('This list can’t be added to.');
    };

    const source: ModuleSource = {
      rows: (m) => ({ rows: rowsOf[m] ?? [], loading, error }),
      get: (m, id) =>
        m === 'vehicle'
          ? getVehicle(id)
          : m === 'device'
            ? getDevice(id)
            : m === 'sim'
              ? getSim(id)
              : getOperator(id),
      options,
      save: (m, id, v) =>
        m === 'vehicle'
          ? saveVehicle(id, v)
          : m === 'device'
            ? saveDevice(id, v)
            : m === 'sim'
              ? saveSim(id, v)
              : saveOperator(id, v),
      remove,
      addOption,
      canEdit: () => !readOnly,
      refresh: refreshAll,
    };
    const unassignDevice = async (deviceId: string) =>
      run({
        updates: [
          { table: 'device', rows: [{ id: Number(deviceId), asset_id: null, status: 'IN_STOCK' }] },
        ],
      });
    return { source, catalogue, unassignDevice, data: { A, D, U, O, US, G, F, L, C, unitOf } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assets.data,
    details.data,
    io.data,
    units.data,
    models.data,
    conn.data,
    operators.data,
    users.data,
    groups.data,
    fences.data,
    links.data,
    lookups.data,
    coreLookups.data,
    documents.data,
    loading,
    error,
    companyId,
    readOnly,
  ]);
}

const VEHICLE_BASE = {
  vehicleTypes: [
    'Light Duty',
    'Medium Duty',
    'Heavy Duty',
    'Passenger',
    'Commercial',
    'Construction',
    'Emergency',
    'Utility',
  ],
  colors: ['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Brown'],
  makes: [
    'Tata',
    'Ashok Leyland',
    'Mahindra',
    'Eicher',
    'BharatBenz',
    'Maruti Suzuki',
    'Toyota',
    'Hyundai',
    'Isuzu',
    'Volvo',
    'JCB',
    'Force Motors',
  ],
  models: [
    'Tata Ace',
    'Tata Signa 4825',
    'Tata LPT 1613',
    'Ashok Leyland Dost',
    'Ashok Leyland 2820',
    'Ashok Leyland Viking',
    'Mahindra Bolero Pickup',
    'Mahindra Furio 14',
    'Eicher Pro 2049',
    'Eicher Skyline',
    'BharatBenz 1617R',
    'Maruti Suzuki Eeco',
    'Toyota Innova Crysta',
    'Toyota Hilux',
    'Isuzu D-Max',
    'Force Traveller',
    'JCB 3DX',
  ],
};
const LABEL = {
  category: 'Category',
  plateNo: 'Plate Number',
  callSign: 'Call Sign',
  model: 'Model',
  fuelType: 'Type of Fuel',
  fuelCapacity: 'Fuel Tank Capacity (Litre)',
  mileage: 'Mileage (km/L)',
  trackingType: 'Tracking Type',
};
const OP_LABEL = {
  name: 'Operator Name',
  contactNo: 'Contact No',
  address1: 'Address Line 1',
  city: 'City',
  state: 'State',
  country: 'Country',
  postalCode: 'Postal/Pin Code',
};
export { CATEGORY_DETAIL_KEYS };
