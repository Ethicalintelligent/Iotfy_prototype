// IT-0040 (@iotify/app-kit, shared by every product): the fleet's vehicles, devices, SIMs, users, groups and device models as the screens use
// them, read from the gps tables (gps.tracked_asset, device, sim_card, app_user, asset_group,
// device_model + device_manufacturer) through @iotify/data.
//
// The gps tables number their ids; the screens keep ids as text (the page markup, option lists and
// links all use text). So every id below is the gps id as text, and a screen that saves turns it
// back into a number (Number(id)) for the gps table. The screens' field names are kept where the
// pages use them; where a gps column has another name it is listed here, once:
//   vehicle   plate_serial = tracked_asset.code, asset_group = asset_group.name (via group_id),
//             attributes = tracked_asset.asset_info, status ACTIVE/INACTIVE/MAINTENANCE → Active/…
//   device    device_model_id = device.model_id, status ACTIVE → Installed, IN_STOCK → In stock,
//             serial_number = serial_no, extended_warranty = additional_warranty
//   SIM       number = sim_card.msisdn, identifier = sim_card.iccid, support_number = support_no,
//             device_unit_id = the device whose sim_card_id is this SIM
//   model     maker = device_manufacturer.name, model = device_model.name, type = device_type
import { useMemo } from 'react';
import {
  useAppUser,
  useAssetGroup,
  useDevice,
  useDeviceManufacturer,
  useDeviceModel,
  useSimCard,
  useTrackedAsset,
} from '@iotify/data';

/** The gps id as text (screens use text ids), or null. */
export const sid = (v: unknown): string | null => (v == null || v === '' ? null : String(v));
/** A text id back to the gps number, or null. */
export const nid = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const ASSET_STATUS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  MAINTENANCE: 'Maintenance',
};
/** Active / Inactive / Maintenance → the gps value. */
export const assetStatusCode = (s: string) =>
  s === 'Inactive' ? 'INACTIVE' : s === 'Maintenance' ? 'MAINTENANCE' : 'ACTIVE';
const DEVICE_STATUS: Record<string, string> = {
  ACTIVE: 'Installed',
  IN_STOCK: 'In stock',
  FAULTY: 'Faulty',
  INACTIVE: 'Inactive',
};
/** Installed / In stock / Faulty / Inactive → the gps value. */
export const deviceStatusCode = (s: string) =>
  s === 'In stock' ? 'IN_STOCK' : s === 'Faulty' ? 'FAULTY' : s === 'Inactive' ? 'INACTIVE' : 'ACTIVE';

export interface FleetAsset {
  id: string;
  company_id: string;
  name: string;
  plate_serial: string | null;
  asset_type_id: string | null;
  asset_group: string | null;
  group_id: string | null;
  site_id: string | null;
  status: string;
  attributes: unknown;
}
export interface FleetDevice {
  id: string;
  company_id: string | null;
  imei: string;
  asset_id: string | null;
  device_model_id: string | null;
  owner_dealer_id: string | null;
  zone_id: string | null;
  status: string;
  sim_card_id: string | null;
  device_type: string | null;
  primary_unit_id: string | null;
  device_name: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  extended_warranty: string | null;
  expiry_reminder: string | null;
  active: boolean;
}
export interface FleetSim {
  id: string;
  number: string | null;
  identifier: string | null;
  identifier_type: string | null;
  provider: string | null;
  owner_dealer_id: string | null;
  device_unit_id: string | null;
  reminders: string[];
  plan: string | null;
  pin_code: string | null;
  puk_code: string | null;
  support_number: string | null;
  purchase_date: string | null;
  subscription_date: string | null;
  expiry_reminder: string | null;
  active: boolean;
  status: string;
}
export interface FleetUser {
  id: string;
  name: string;
  email: string;
  role_id: string | null;
  asset_group: string | null;
  account_id: string;
  password_hash: string;
}
export interface FleetGroup {
  id: string;
  company_id: string;
  name: string;
  parent_id: string | null;
}
export interface FleetModel {
  id: string;
  maker: string;
  model: string;
  type: string | null;
  network: string | null;
  status: string | null;
  certifications: string | null;
  placement: string | null;
  own_hardware: boolean | null;
}

/** What a list hook gives: the rows (undefined while loading) and the query state. */
export interface FleetQuery<T> {
  data: T[] | undefined;
  isPending: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  /** Read again from Neon. */
  refetch: () => Promise<unknown>;
}
type Q = {
  data?: unknown;
  isPending: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
};
function combine<T>(qs: Q[], build: () => T[]): FleetQuery<T> {
  const ready = qs.every((q) => q.data !== undefined);
  return {
    data: ready ? build() : undefined,
    isPending: qs.some((q) => q.isPending),
    isLoading: qs.some((q) => q.isLoading),
    isError: qs.some((q) => !!q.error),
    error: qs.find((q) => q.error)?.error ?? null,
    refetch: () => Promise.all(qs.map((q) => q.refetch())),
  };
}
const opt = (companyId: string | null | undefined) => ({ enabled: !!nid(companyId) });
const companyFilter = (companyId: string | null | undefined) => ({
  company_id: nid(companyId) ?? -1,
});

export function useFleetGroups(companyId: string | null | undefined): FleetQuery<FleetGroup> {
  const q = useAssetGroup(companyFilter(companyId), opt(companyId));
  return useMemo(
    () =>
      combine([q], () =>
        (q.data ?? []).map((g) => ({
          id: String(g.id),
          company_id: String(g.company_id),
          name: g.name,
          parent_id: sid(g.parent_id),
        })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.data, q.isPending, q.isLoading, q.error],
  );
}

export function useFleetAssets(companyId: string | null | undefined): FleetQuery<FleetAsset> {
  const q = useTrackedAsset(companyFilter(companyId), opt(companyId));
  const g = useAssetGroup(companyFilter(companyId), opt(companyId));
  return useMemo(
    () =>
      combine([q, g], () => {
        const groupName = new Map((g.data ?? []).map((x) => [x.id, x.name]));
        return (q.data ?? []).map((a) => ({
          id: String(a.id),
          company_id: String(a.company_id),
          name: a.name,
          plate_serial: a.code ?? null,
          asset_type_id: a.asset_type_id ?? null,
          asset_group: a.group_id == null ? null : (groupName.get(a.group_id) ?? null),
          group_id: sid(a.group_id),
          site_id: sid(a.site_id),
          status: ASSET_STATUS[a.status ?? 'ACTIVE'] ?? 'Active',
          attributes: a.asset_info ?? {},
        }));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.data, q.isPending, q.isLoading, q.error, g.data, g.isPending, g.isLoading, g.error],
  );
}

export function useFleetDevices(companyId: string | null | undefined): FleetQuery<FleetDevice> {
  const q = useDevice(companyFilter(companyId), opt(companyId));
  return useMemo(
    () =>
      combine([q], () =>
        (q.data ?? []).map((d) => ({
          id: String(d.id),
          company_id: sid(d.company_id),
          imei: d.imei,
          asset_id: sid(d.asset_id),
          device_model_id: sid(d.model_id),
          owner_dealer_id: d.owner_dealer_id ?? null,
          zone_id: d.zone_id ?? null,
          status: DEVICE_STATUS[d.status ?? 'ACTIVE'] ?? 'Installed',
          sim_card_id: sid(d.sim_card_id),
          device_type: d.device_type ?? null,
          primary_unit_id: sid(d.primary_unit_id),
          device_name: d.device_name ?? null,
          serial_number: d.serial_no ?? null,
          purchase_date: d.purchase_date ?? null,
          warranty_expiry: d.warranty_expiry ?? null,
          extended_warranty: d.additional_warranty ?? null,
          expiry_reminder: d.expiry_reminder ?? null,
          active: d.active !== false,
        })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.data, q.isPending, q.isLoading, q.error],
  );
}

/**
 * The company's SIMs: those of its devices, plus SIMs in stock at the dealers who own its devices
 * (they can be fitted to a new device).
 */
export function useFleetSims(companyId: string | null | undefined): FleetQuery<FleetSim> {
  const sims = useSimCard();
  const devices = useDevice(companyFilter(companyId), opt(companyId));
  return useMemo(
    () =>
      combine([sims, devices], () => {
        const company = nid(companyId);
        const devs = devices.data ?? [];
        const onDevice = new Map(
          devs.filter((d) => d.sim_card_id != null).map((d) => [d.sim_card_id!, String(d.id)]),
        );
        const dealers = new Set(devs.map((d) => d.owner_dealer_id).filter(Boolean));
        return (sims.data ?? [])
          .filter(
            (s) =>
              onDevice.has(s.id!) ||
              s.company_id === company ||
              (s.company_id == null && !!s.owner_dealer_id && dealers.has(s.owner_dealer_id)),
          )
          .map((s) => ({
            id: String(s.id),
            number: s.msisdn ?? null,
            identifier: s.iccid,
            identifier_type: s.identifier_type ?? null,
            provider: s.provider ?? null,
            owner_dealer_id: s.owner_dealer_id ?? null,
            device_unit_id: onDevice.get(s.id!) ?? null,
            reminders: s.reminders ?? [],
            plan: s.plan ?? null,
            pin_code: s.pin_code ?? null,
            puk_code: s.puk_code ?? null,
            support_number: s.support_no ?? null,
            purchase_date: s.purchase_date ?? null,
            subscription_date: s.subscription_date ?? null,
            expiry_reminder: s.expiry_reminder ?? null,
            active: s.active !== false,
            status: s.status ?? 'ACTIVE',
          }));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sims.data, sims.isPending, sims.isLoading, sims.error, devices.data, devices.isPending, devices.isLoading, devices.error, companyId],
  );
}

export function useFleetUsers(companyId: string | null | undefined): FleetQuery<FleetUser> {
  const q = useAppUser(companyFilter(companyId), opt(companyId));
  return useMemo(
    () =>
      combine([q], () =>
        (q.data ?? []).map((u) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          role_id: u.role_id ?? null,
          asset_group: u.asset_group ?? null,
          account_id: String(u.company_id ?? ''),
          password_hash: u.password_hash,
        })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.data, q.isPending, q.isLoading, q.error],
  );
}

export function useFleetModels(): FleetQuery<FleetModel> {
  const q = useDeviceModel();
  const makers = useDeviceManufacturer();
  return useMemo(
    () =>
      combine([q, makers], () => {
        const maker = new Map((makers.data ?? []).map((m) => [m.id, m.name]));
        return (q.data ?? []).map((m) => ({
          id: String(m.id),
          maker: maker.get(m.manufacturer_id) ?? '',
          model: m.name,
          type: m.device_type ?? null,
          network: m.network ?? null,
          status: m.status ?? null,
          certifications: m.certifications ?? null,
          placement: m.placement ?? null,
          own_hardware: m.own_hardware ?? null,
        }));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.data, q.isPending, q.isLoading, q.error, makers.data, makers.isPending, makers.isLoading, makers.error],
  );
}
