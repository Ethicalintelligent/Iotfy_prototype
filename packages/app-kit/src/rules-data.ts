// Live core data for the business rules (@iotify/core), read through @iotify/data hooks.
import { useMemo } from 'react';
import {
  useAssetTypes,
  useAssets,
  useBundleRules,
  useDataPoints,
  useDeviceDataPoints,
  useDeviceInterfaces,
  useDeviceModels,
  useDeviceUnits,
  useFeatureDataPoints,
  useFeatures,
  useNodes,
  usePricePlans,
  usePriceRules,
  useQuoteLines,
  useHardwarePrices,
  useProductAssetTypes,
  useProductFeatures,
  useRoleFeatures,
  useRoles,
  useSensorDataPoints,
  useSensorInterfaces,
  useSensorUnits,
  useSubscriptions,
  useZones,
  type DataError,
} from '@iotify/data';
import { createRules, type Rules } from '@iotify/core';

/** The rules over everything needed for Paid / Possible / Allowed. null while loading. */
export function useCoreRules(): { rules: Rules | null; loading: boolean; error: DataError | null } {
  const q = {
    nodes: useNodes(),
    bundle_rules: useBundleRules(),
    features: useFeatures(),
    product_features: useProductFeatures(),
    data_points: useDataPoints(),
    feature_data_points: useFeatureDataPoints(),
    device_models: useDeviceModels(),
    device_interfaces: useDeviceInterfaces(),
    device_data_points: useDeviceDataPoints(),
    sensor_interfaces: useSensorInterfaces(),
    sensor_data_points: useSensorDataPoints(),
    asset_types: useAssetTypes(),
    product_asset_types: useProductAssetTypes(),
    roles: useRoles(),
    role_features: useRoleFeatures(),
    zones: useZones(),
    assets: useAssets(),
    device_units: useDeviceUnits(),
    sensor_units: useSensorUnits(),
    subscriptions: useSubscriptions(),
    price_plans: usePricePlans(),
    price_rules: usePriceRules(),
    hardware_prices: useHardwarePrices(),
    quote_lines: useQuoteLines(),
  };
  const all = Object.values(q);
  const ready = all.every((x) => x.data);
  const deps = all.map((x) => x.data);
  const rules = useMemo(
    () =>
      ready
        ? createRules(Object.fromEntries(Object.entries(q).map(([k, v]) => [k, v.data])))
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, ...deps],
  );
  return {
    rules,
    loading: all.some((x) => x.isLoading),
    error: (all.find((x) => x.error)?.error as DataError) ?? null,
  };
}

/** Next id with a prefix (A56 after A55), for new records. */
export function nextId(prefix: string, rows: { id: string }[]) {
  const re = new RegExp(`^${prefix}(\\d+)$`);
  let max = 0;
  let width = 0;
  for (const r of rows) {
    const m = re.exec(r.id);
    if (m) {
      max = Math.max(max, Number(m[1]));
      width = Math.max(width, m[1]!.length);
    }
  }
  return prefix + String(max + 1).padStart(width || 1, '0');
}
