// GPS RFID School Bus (N011, Base).
import { defineProduct } from '@iotify/app-kit';
import { schoolBusSpec } from './spec';

export const manifest = defineProduct({ id: 'N011', scene: 'schoolbus', spec: schoolBusSpec });
