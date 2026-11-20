// Telecom Passive Infrastructure Monitoring (N028, Base).
import { defineProduct } from '@iotify/app-kit';
import { telecomSpec } from './spec';

export const manifest = defineProduct({ id: 'N028', scene: 'telecom', spec: telecomSpec });
