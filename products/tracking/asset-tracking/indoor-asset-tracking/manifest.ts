// Indoor Asset Tracking (N021, Base).
import { defineProduct } from '@iotify/app-kit';
import { indoorAssetSpec } from './spec';

export const manifest = defineProduct({ id: 'N021', scene: 'indoorasset', spec: indoorAssetSpec });
