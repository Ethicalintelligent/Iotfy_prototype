// DG Monitoring (N026, Base).
import { defineProduct } from '@iotify/app-kit';
import { dgSpec } from './spec';

export const manifest = defineProduct({ id: 'N026', scene: 'dg', spec: dgSpec });
