// Sample product spec for the screens gallery: GPS Vehicle Tracking's spec plus a floor view, so
// every screen type shows. Invented demo content.
import type { ProductSpec } from '@iotify/app-kit';
import { vehicleSpec } from '../../../../products/tracking/fleet-transport/gps-vehicle-tracking';

export const SAMPLE_SPEC: ProductSpec = {
  ...vehicleSpec,
  menu: vehicleSpec.menu.map(([h, items]) =>
    h === 'Monitor'
      ? [h, [items[0]!, items[1]!, ['floor', 'Floor view'], ...items.slice(2)]]
      : [h, items],
  ),
};
