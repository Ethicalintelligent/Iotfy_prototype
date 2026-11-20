// GPS Asset Tracking (N019, Base).
import { defineProduct } from '@iotify/app-kit';
import { assetSpec } from './spec';

export const manifest = defineProduct({ id: 'N019', scene: 'asset', spec: assetSpec });
