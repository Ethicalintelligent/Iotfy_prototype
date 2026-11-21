// Indoor People Tracking (N014, Base). Its full set of screens comes in Step 11; for now the
// ported legacy spec, which ConstructSafe composes.
import { defineProduct } from '@iotify/app-kit';
import { peopleSpec } from './spec';

export const manifest = defineProduct({ id: 'N014', scene: 'indoorpeople', spec: peopleSpec });
