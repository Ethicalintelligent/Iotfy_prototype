// The rows the rules work on. Same table and column names as the database (snake_case): core, plus the
// gps tables (company, tracked_asset, device, device_model) whose ids are numbers (IT-0040).
import type {
  AssetTypesRow,
  BundleRulesRow,
  CompanyRow,
  DataPointsRow,
  DeviceDataPointsRow,
  DeviceInterfacesRow,
  AssetGroupRow,
  DeviceManufacturerRow,
  DeviceModelRow,
  DeviceRow,
  FeatureDataPointsRow,
  FeaturesRow,
  HardwarePricesRow,
  NodesRow,
  PricePlansRow,
  PriceRulesRow,
  ProductAssetTypesRow,
  ProductDevicesRow,
  ProductFeaturesRow,
  QuoteLinesRow,
  RoleFeaturesRow,
  RolesRow,
  SensorDataPointsRow,
  SensorInterfacesRow,
  SensorModelsRow,
  SensorUnitsRow,
  SubscriptionsRow,
  TrackedAssetRow,
  ZonesRow,
} from '@iotify/data';

export interface CoreData {
  nodes: NodesRow[];
  bundle_rules: BundleRulesRow[];
  features: FeaturesRow[];
  product_features: ProductFeaturesRow[];
  data_points: DataPointsRow[];
  feature_data_points: FeatureDataPointsRow[];
  device_model: DeviceModelRow[];
  device_manufacturer: DeviceManufacturerRow[];
  device_interfaces: DeviceInterfacesRow[];
  device_data_points: DeviceDataPointsRow[];
  sensor_interfaces: SensorInterfacesRow[];
  sensor_models: SensorModelsRow[];
  sensor_data_points: SensorDataPointsRow[];
  product_devices: ProductDevicesRow[];
  asset_types: AssetTypesRow[];
  product_asset_types: ProductAssetTypesRow[];
  price_plans: PricePlansRow[];
  price_rules: PriceRulesRow[];
  hardware_prices: HardwarePricesRow[];
  roles: RolesRow[];
  role_features: RoleFeaturesRow[];
  company: CompanyRow[];
  zones: ZonesRow[];
  asset_group: AssetGroupRow[];
  tracked_asset: TrackedAssetRow[];
  device: DeviceRow[];
  sensor_units: SensorUnitsRow[];
  subscriptions: SubscriptionsRow[];
  quote_lines: QuoteLinesRow[];
}

/** Any subset of the tables; missing ones count as empty. */
export type CoreDataInput = Partial<CoreData>;

/** A value counts as set when it isn't null, undefined or blank text. */
export const has = (v: unknown): boolean => v != null && String(v).trim() !== '';
export const lc = (v: unknown) =>
  String(v ?? '')
    .trim()
    .toLowerCase();
export const num = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
/** "a, b ,c" → ['a', 'b', 'c'] */
export const list = (v: unknown) =>
  String(v ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/** Markets: gps.company.country_code → the market name products list in nodes.markets (IT-0040). */
export const MARKETS: Record<string, string> = {
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
  OM: 'Oman',
  QA: 'Qatar',
  KW: 'Kuwait',
  BH: 'Bahrain',
  IN: 'India',
};
/** The market name of a company's country code (null when unknown). */
export const marketName = (code: string | null | undefined) =>
  code ? (MARKETS[code.trim().toUpperCase()] ?? null) : null;
