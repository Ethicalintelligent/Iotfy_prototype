// GPS RFID Waste Monitoring (N010, Base).
import { defineProduct } from '@iotify/app-kit';
import { wasteSpec } from './spec';

export const manifest = defineProduct({ id: 'N010', scene: 'waste', spec: wasteSpec });
