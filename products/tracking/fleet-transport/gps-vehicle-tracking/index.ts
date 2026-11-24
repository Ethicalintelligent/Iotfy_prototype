// Public exports: what editions, packages and apps may reuse from GPS Vehicle Tracking.
export { manifest } from './manifest';
export { vehicleSpec } from './spec';
// The vehicle, device and SIM forms (also used by the Partner Portal: Assets, Stock).
export {
  AddVehicleDrawer,
  VEHICLE_TYPE,
  AddDeviceDrawer,
  SimCardDrawer,
  DeleteSimModal,
  simActive,
  DeleteModal,
  AddLookupModal,
  useLookupOptions,
  nextIds,
  num,
  txt,
  type AddVehicleDrawerProps,
  type AddDeviceDrawerProps,
  type SimCardDrawerProps,
  type LookupKind,
  type Owner,
} from './forms';
