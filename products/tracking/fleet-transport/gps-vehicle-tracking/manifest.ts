// GPS Vehicle Tracking (N004, Base). Its add-ons (fuel, temperature, weight, AC, seat belt) have
// no folders of their own; their screens will live here (Step 11).
import { defineProduct } from '@iotify/app-kit';
import { vehicleSpec } from './spec';

export const manifest = defineProduct({ id: 'N004', scene: 'vehicle', spec: vehicleSpec });
