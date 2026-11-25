// IT-0036. The company's vehicles: its core.assets rows that have vehicle details (other assets of
// the company, e.g. from other products, are not vehicles), like the other converted pages.
import { useMemo } from 'react';
import { useAssets, useVehicleDetails } from '@iotify/data';

export function useVehicleAssets(companyId: string) {
  const assets = useAssets({ company_id: companyId });
  const details = useVehicleDetails();
  const data = useMemo(() => {
    if (!assets.data || !details.data) return undefined;
    const has = new Set(details.data.map((d) => d.asset_id));
    return assets.data.filter((a) => has.has(a.id));
  }, [assets.data, details.data]);
  return {
    data,
    isPending: assets.isPending || details.isPending,
    isSuccess: !!data,
    error: assets.error ?? details.error,
    refetch: () => {
      void assets.refetch();
      void details.refetch();
    },
  };
}
