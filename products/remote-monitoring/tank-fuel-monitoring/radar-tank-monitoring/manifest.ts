// Radar Tank Monitoring (N030, Base).
import { defineProduct } from '@iotify/app-kit';
import { tankSpec } from './spec';

export const manifest = defineProduct({ id: 'N030', scene: 'tank', spec: tankSpec });
