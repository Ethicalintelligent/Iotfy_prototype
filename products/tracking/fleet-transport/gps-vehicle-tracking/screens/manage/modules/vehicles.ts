// IT-0036. The company's vehicles: its gps.tracked_asset rows that have vehicle details (other assets of
// the company, e.g. from other products, are not vehicles), like the other converted pages.
import { useMemo } from 'react';
import { useVehicleDetails } from '@iotify/data';
import { useFleetAssets } from '../../fleet-rows';

export function useVehicleAssets(companyId: string) {
  const assets = useFleetAssets(companyId);
  const details = useVehicleDetails();
  const data = useMemo(() => {
    if (!assets.data || !details.data) return undefined;
    const has = new Set(details.data.map((d) => String(d.asset_id)));
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
