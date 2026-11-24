// The Manage modules of the approved design (Desktop/vs/Manage-*.html), in the picker's order.
// Each module is its own lazily loaded file in ./modules and gets the picker to put first in its
// toolbar row (as in the design).
import { lazy, type ComponentType, type ReactNode } from 'react';
import type { IconName } from '@iotify/ui';
import type { ScreenContext } from '@iotify/app-kit';

export interface ModuleProps extends ScreenContext {
  /** The "Manage Module ▾" picker: put it first in the module's toolbar row. */
  picker: ReactNode;
}

export type ModuleKey =
  'vehicle' | 'device' | 'operator' | 'sim' | 'user' | 'alert' | 'geo' | 'assoc';

export const MODULES: {
  key: ModuleKey;
  label: string;
  icon: IconName;
  component: ComponentType<ModuleProps>;
}[] = [
  {
    key: 'vehicle',
    label: 'Vehicle',
    icon: 'vehicles',
    component: lazy(() => import('./modules/VehicleModule')),
  },
  {
    key: 'device',
    label: 'Device',
    icon: 'chip',
    component: lazy(() => import('./modules/DeviceModule')),
  },
  {
    key: 'operator',
    label: 'Operator',
    icon: 'user',
    component: lazy(() => import('./modules/OperatorModule')),
  },
  {
    key: 'sim',
    label: 'SIM Card',
    icon: 'signal',
    component: lazy(() => import('./modules/SimModule')),
  },
  {
    key: 'user',
    label: 'User',
    icon: 'users',
    component: lazy(() => import('./modules/UserModule')),
  },
  {
    key: 'alert',
    label: 'Alert Configuration',
    icon: 'bell',
    component: lazy(() => import('./modules/AlertConfigModule')),
  },
  {
    key: 'geo',
    label: 'Geo Configuration',
    icon: 'geofence',
    component: lazy(() => import('./modules/GeoConfigModule')),
  },
  {
    key: 'assoc',
    label: 'Geo Association',
    icon: 'layers',
    component: lazy(() => import('./modules/GeoAssociationModule')),
  },
];
