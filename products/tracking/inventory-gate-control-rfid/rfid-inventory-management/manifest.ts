// RFID Inventory Management (N048, Base).
import { defineProduct } from '@iotify/app-kit';
import { rfidSpec } from './spec';

export const manifest = defineProduct({ id: 'N048', scene: 'rfid', spec: rfidSpec });
