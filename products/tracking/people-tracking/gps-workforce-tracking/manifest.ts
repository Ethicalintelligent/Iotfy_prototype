// GPS Workforce Tracking (N013, Base).
import { defineProduct } from '@iotify/app-kit';
import { workforceSpec } from './spec';

export const manifest = defineProduct({ id: 'N013', scene: 'workforce', spec: workforceSpec });
