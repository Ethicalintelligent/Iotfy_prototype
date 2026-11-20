// Fleet Management (N003, Standalone).
import { defineProduct } from '@iotify/app-kit';
import { fleetSpec } from './spec';

export const manifest = defineProduct({ id: 'N003', scene: 'fleet', spec: fleetSpec });
