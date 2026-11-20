// GPS Dashcam (N008, Base).
import { defineProduct } from '@iotify/app-kit';
import { dashcamSpec } from './spec';

export const manifest = defineProduct({ id: 'N008', scene: 'dashcam', spec: dashcamSpec });
