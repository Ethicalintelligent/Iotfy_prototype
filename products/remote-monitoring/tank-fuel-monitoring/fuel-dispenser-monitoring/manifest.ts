// Fuel Dispenser Monitoring (N031, Base).
import { defineProduct } from '@iotify/app-kit';
import { dispenserSpec } from './spec';

export const manifest = defineProduct({ id: 'N031', scene: 'dispenser', spec: dispenserSpec });
