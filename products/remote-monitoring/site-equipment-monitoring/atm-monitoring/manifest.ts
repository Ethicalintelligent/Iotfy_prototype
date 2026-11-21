// ATM Monitoring (N047, Base).
import { defineProduct } from '@iotify/app-kit';
import { atmSpec } from './spec';

export const manifest = defineProduct({ id: 'N047', scene: 'atm', spec: atmSpec });
