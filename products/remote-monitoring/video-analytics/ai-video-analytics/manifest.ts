// AI Video Analytics (N033, Base). Its full set of screens comes in Step 11; for now the ported
// legacy spec, which ConstructSafe composes.
import { defineProduct } from '@iotify/app-kit';
import { videoSpec } from './spec';

export const manifest = defineProduct({ id: 'N033', scene: 'video', spec: videoSpec });
