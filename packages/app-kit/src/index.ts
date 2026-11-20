// @iotify/app-kit: the shared app shell and the generic screens every product reuses.
export { AppShell, type AppShellProps, type ShellNotification } from './AppShell';
export {
  EditSessionProvider,
  useLeaveGuard,
  useRecordEdit,
  RecordCard,
  type EditState,
  type RecordEdit,
} from './edit';
export {
  demoContext,
  demoAlerts,
  cellTone,
  type DemoAsset,
  type DemoCell,
  type DemoContext,
} from './demo';
export type { ProductSpec, TableSpec, KpiSpec, ScreenContext, CustomScreen } from './spec';
export { useCoreRules, nextId } from './rules-data';
export {
  DemoNote,
  Cell,
  Toolbar,
  DashboardScreen,
  MapScreen,
  AlertsScreen,
  ReportsScreen,
  RulesScreen,
  SpecTableScreen,
} from './screens/demo-screens';
export {
  AssetsScreen,
  SitesScreen,
  UsersScreen,
  SubscriptionScreen,
  ComingSoon,
  type AssetsScreenProps,
} from './screens/record-screens';
export { DevicesFeaturesScreen, type DevicesFeaturesProps } from './screens/DevicesFeaturesScreen';
export { GENERIC_SPEC } from './generic-spec';
export { productMenu, screenInfo, ProductScreen, type ProductScreenProps } from './product-app';
export {
  TablePage,
  TableRecordCard,
  RecordFormModal,
  ChildGrid,
  FieldInputs,
  enumOptions,
  useCellText,
  type FieldDef,
  type FieldType,
  type RecordConfig,
  type ChildConfig,
  type TablePageConfig,
} from './table-kit';
export { DataSourceScreen } from './screens/DataSourceScreen';
export { CompatibilityScreen } from './screens/CompatibilityScreen';
export {
  defineProduct,
  resolveSpec,
  resolveScene,
  createRegistry,
  type ProductManifest,
  type ManifestAdditions,
  type ProductRegistry,
} from './manifest';
