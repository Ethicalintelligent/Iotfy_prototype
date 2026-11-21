// Data Centre Environment Monitoring (N027, Base).
import { defineProduct } from '@iotify/app-kit';
import { dataCentreSpec } from './spec';

export const manifest = defineProduct({ id: 'N027', scene: 'datacenter', spec: dataCentreSpec });
