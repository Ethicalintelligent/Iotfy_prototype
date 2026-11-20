// SK MobiCop (N017, Base). School transport like GPS RFID School Bus: the legacy prototype gave
// both the same screens, so it reuses that product's spec through its public exports.
import { defineProduct } from '@iotify/app-kit';
import { schoolBusSpec } from '../gps-rfid-school-bus';

export const manifest = defineProduct({ id: 'N017', scene: 'schoolbus', spec: schoolBusSpec });
