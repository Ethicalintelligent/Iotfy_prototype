// Admin console catalogue pages, each described for the TablePage kit (@iotify/app-kit):
// list + search + "+ Add" beside it, the record on a card (Edit → Save / Cancel, Delete in Edit
// mode), and child lists. Ports legacy pFeatures, listPage, pHardware, pPricing, pRoles,
// pLookups (legacy/src/app.js ~1257–1360).
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Tabs } from '@iotify/ui';
import type {
  AssetTypesRow,
  DataPointsRow,
  DeviceModelRow,
  FeaturesRow,
  InterfacesRow,
  LookupsRow,
  NetworksRow,
  PricePlansRow,
  RolesRow,
  SensorModelsRow,
} from '@iotify/data';
import { TablePage, enumOptions, type ChildConfig, type TablePageConfig } from '@iotify/app-kit';

const name = (r: Record<string, unknown>) => String(r.name ?? r.id);
/** gps.device_model has no value lists for these (the old core table had them). */
const PLACEMENTS = ['On asset', 'Site infrastructure'].map((v) => ({ value: v, label: v }));
const MODEL_STATUSES = ['Active', 'Deferred', 'Inactive'].map((v) => ({ value: v, label: v }));
const modelName = (r: Record<string, unknown>) =>
  `${r.maker ?? ''} ${r.model ?? ''}`.trim() || String(r.id);

// ------------------------------------------------------------------ App features
export const FEATURES: TablePageConfig<'features'> = {
  table: 'features',
  noun: 'App feature',
  idPrefix: 'F',
  path: '/features',
  label: (r: FeaturesRow) => r.name ?? r.id,
  columns: ['name', 'feature_group', 'type', 'status'],
  addFields: ['name', 'feature_group', 'type'],
  defaults: { status: 'Active', is_command: false },
  fields: [
    { key: 'name', label: 'Name', required: true },
    { key: 'feature_group', label: 'Group', type: 'select', options: { lookup: 'Feature Group' } },
    { key: 'type', label: 'Type', type: 'select', options: { lookup: 'Feature Type' } },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: enumOptions('features', 'status'),
      placeholder: null,
    },
    { key: 'latency_need', label: 'Latency need', type: 'select', options: { lookup: 'Latency' } },
    { key: 'is_command', label: 'Is a command (sends to the device)', type: 'yesno' },
  ],
  ownRows: [
    ['feature_data_points', 'feature_id'],
    ['role_features', 'feature_id'],
  ],
  children: [
    {
      table: 'feature_data_points',
      title: 'Data points it needs',
      parentKey: 'feature_id',
      idPrefix: 'FD',
      addLabel: 'Add data point',
      fields: [
        {
          key: 'data_point_id',
          label: 'Data point',
          type: 'select',
          options: { table: 'data_points', label: name },
          required: true,
        },
        { key: 'required', label: 'Required', type: 'yesno' },
        {
          key: 'alt_group',
          label: 'Alternative group',
          hint: 'Rows with the same group: one of them is enough',
        },
      ],
    } satisfies ChildConfig<'feature_data_points'>,
  ],
};

// ------------------------------------------------------------------ Data points, interfaces, networks, asset types
export const DATA_POINTS: TablePageConfig<'data_points'> = {
  table: 'data_points',
  noun: 'Data point',
  idPrefix: 'DP',
  path: '/datapoints',
  label: (r: DataPointsRow) => r.name ?? r.id,
  fields: [
    { key: 'name', label: 'Name', required: true },
    { key: 'unit', label: 'Unit' },
    {
      key: 'direction',
      label: 'Direction',
      type: 'select',
      options: enumOptions('data_points', 'direction'),
      hint: 'In = a reading, Out = a command',
    },
  ],
  ownRows: [
    ['feature_data_points', 'data_point_id'],
    ['device_data_points', 'data_point_id'],
    ['sensor_data_points', 'data_point_id'],
  ],
};

export const INTERFACES: TablePageConfig<'interfaces'> = {
  table: 'interfaces',
  noun: 'Interface',
  idPrefix: 'I',
  path: '/interfaces',
  label: (r: InterfacesRow) => r.name ?? r.id,
  fields: [
    { key: 'name', label: 'Name', required: true },
    {
      key: 'direction',
      label: 'Direction',
      type: 'select',
      options: enumOptions('interfaces', 'direction'),
    },
    {
      key: 'medium',
      label: 'Medium',
      type: 'select',
      options: enumOptions('interfaces', 'medium'),
    },
    { key: 'description', label: 'Description' },
  ],
};

export const NETWORKS: TablePageConfig<'networks'> = {
  table: 'networks',
  noun: 'Network',
  idPrefix: 'NW',
  path: '/networks',
  label: (r: NetworksRow) => r.name ?? r.id,
  columns: ['name', 'category', 'downlink', 'status'],
  addFields: ['name', 'category'],
  defaults: { status: 'Active' },
  fields: [
    { key: 'name', label: 'Name', required: true },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: enumOptions('networks', 'category'),
    },
    { key: 'needs', label: 'Needs', type: 'select', options: enumOptions('networks', 'needs') },
    {
      key: 'downlink',
      label: 'Downlink (commands)',
      type: 'select',
      options: enumOptions('networks', 'downlink'),
    },
    { key: 'real_time', label: 'Real-time', type: 'yesno' },
    { key: 'typical_interval_seconds', label: 'Typical report interval (s)', type: 'number' },
    { key: 'markets', label: 'Markets', hint: 'Comma-separated; blank = everywhere' },
    { key: 'connectivity_fee', label: 'Has a connectivity fee', type: 'yesno' },
    {
      key: 'identifier_type',
      label: 'Identifier',
      type: 'select',
      options: enumOptions('networks', 'identifier_type'),
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: enumOptions('networks', 'status'),
      placeholder: null,
    },
    { key: 'notes', label: 'Notes' },
  ],
};

export const ASSET_TYPES: TablePageConfig<'asset_types'> = {
  table: 'asset_types',
  noun: 'Asset type',
  idPrefix: 'AT',
  path: '/assettypes',
  label: (r: AssetTypesRow) => r.name ?? r.id,
  fields: [
    { key: 'name', label: 'Name', required: true },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: enumOptions('asset_types', 'category'),
    },
  ],
  ownRows: [['product_asset_types', 'asset_type_id']],
};

// ------------------------------------------------------------------ Hardware
const hardwarePrices = (kind: 'Device' | 'Sensor') =>
  ({
    table: 'hardware_prices',
    title: 'Prices',
    parentKey: 'model_id',
    idPrefix: 'HP',
    addLabel: 'Add price',
    fixed: { model_kind: kind },
    fields: [
      {
        key: 'sold_to',
        label: 'Sold to',
        type: 'select',
        options: enumOptions('hardware_prices', 'sold_to'),
        required: true,
      },
      {
        key: 'supply',
        label: 'Supply',
        type: 'select',
        options: enumOptions('hardware_prices', 'supply'),
        required: true,
      },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'min_term_months', label: 'Min. term (months)', type: 'number' },
      { key: 'currency', label: 'Currency' },
    ],
  }) satisfies ChildConfig<'hardware_prices'>;

// gps.device_model (IT-0040): the maker is gps.device_manufacturer (manufacturer_id), the model is
// name, the kind is device_type; ids are numbers from the database. New models use the GENERIC
// protocol until the gateway's decoder is known.
export const DEVICE_MODELS: TablePageConfig<'device_model'> = {
  table: 'device_model',
  noun: 'Device model',
  idPrefix: 'D',
  path: '/hardware',
  label: (r: DeviceModelRow) => r.name || String(r.id),
  search: (r) => `${r.name} ${r.device_type ?? ''}`,
  columns: ['manufacturer_id', 'name', 'device_type', 'placement', 'status'],
  addFields: ['manufacturer_id', 'name', 'device_type', 'placement'],
  defaults: {
    status: 'Active',
    placement: 'On asset',
    own_hardware: false,
    protocol_code: 'GENERIC',
  },
  fields: [
    {
      key: 'manufacturer_id',
      label: 'Maker',
      type: 'select',
      options: { table: 'device_manufacturer', label: name },
      required: true,
    },
    { key: 'name', label: 'Model', required: true },
    { key: 'device_type', label: 'Type', type: 'select', options: { lookup: 'Device Type' } },
    {
      key: 'network',
      label: 'Network',
      type: 'select',
      options: { table: 'networks', label: name },
    },
    {
      key: 'placement',
      label: 'Placement',
      type: 'select',
      options: PLACEMENTS,
    },
    { key: 'certifications', label: 'Certifications', hint: 'Comma-separated, e.g. AIS 140' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: MODEL_STATUSES,
      placeholder: null,
    },
    { key: 'own_hardware', label: 'EIT own hardware', type: 'yesno' },
    { key: 'server_configured', label: 'Server configured', type: 'yesno' },
  ],
  ownRows: [
    ['device_interfaces', 'device_model_id'],
    ['device_data_points', 'device_model_id'],
    ['hardware_prices', 'model_id'],
  ],
  children: [
    {
      table: 'device_interfaces',
      title: 'Interfaces',
      parentKey: 'device_model_id',
      idPrefix: 'DI',
      addLabel: 'Add interface',
      fields: [
        {
          key: 'interface_id',
          label: 'Interface',
          type: 'select',
          options: { table: 'interfaces', label: name },
          required: true,
        },
        { key: 'count', label: 'How many', type: 'number' },
      ],
    } satisfies ChildConfig<'device_interfaces'>,
    {
      table: 'device_data_points',
      title: 'Built-in data points',
      parentKey: 'device_model_id',
      idPrefix: 'DD',
      addLabel: 'Add data point',
      fields: [
        {
          key: 'data_point_id',
          label: 'Data point',
          type: 'select',
          options: { table: 'data_points', label: name },
          required: true,
        },
      ],
    } satisfies ChildConfig<'device_data_points'>,
    hardwarePrices('Device'),
  ],
};

export const SENSOR_MODELS: TablePageConfig<'sensor_models'> = {
  table: 'sensor_models',
  noun: 'Sensor model',
  idPrefix: 'S',
  path: '/hardware/sensors',
  label: (r: SensorModelsRow) => modelName(r as unknown as Record<string, unknown>),
  search: (r) => `${r.maker} ${r.model}`,
  columns: ['maker', 'model', 'status'],
  defaults: { status: 'Active' },
  fields: [
    { key: 'maker', label: 'Maker', required: true },
    { key: 'model', label: 'Model', required: true },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: enumOptions('sensor_models', 'status'),
      placeholder: null,
    },
  ],
  ownRows: [
    ['sensor_interfaces', 'sensor_model_id'],
    ['sensor_data_points', 'sensor_model_id'],
    ['hardware_prices', 'model_id'],
  ],
  children: [
    {
      table: 'sensor_interfaces',
      title: 'Plugs into',
      parentKey: 'sensor_model_id',
      idPrefix: 'SI',
      addLabel: 'Add interface',
      fields: [
        {
          key: 'interface_id',
          label: 'Interface',
          type: 'select',
          options: { table: 'interfaces', label: name },
          required: true,
        },
        { key: 'protocol', label: 'Protocol' },
      ],
    } satisfies ChildConfig<'sensor_interfaces'>,
    {
      table: 'sensor_data_points',
      title: 'Data points it gives',
      parentKey: 'sensor_model_id',
      idPrefix: 'SD',
      addLabel: 'Add data point',
      fields: [
        {
          key: 'data_point_id',
          label: 'Data point',
          type: 'select',
          options: { table: 'data_points', label: name },
          required: true,
        },
      ],
    } satisfies ChildConfig<'sensor_data_points'>,
    hardwarePrices('Sensor'),
  ],
};

/** Hardware: device models and sensor models, as two tabs (the address keeps the tab). */
export function HardwarePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = pathname.startsWith('/hardware/sensors') ? 'sensors' : 'devices';
  const setTab = (t: 'devices' | 'sensors') =>
    navigate(t === 'sensors' ? '/hardware/sensors' : '/hardware');
  return (
    <>
      <Tabs
        label="Hardware"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'devices', label: 'Device models' },
          { key: 'sensors', label: 'Sensor models' },
        ]}
      />
      {tab === 'devices' ? (
        <TablePage config={DEVICE_MODELS} />
      ) : (
        <TablePage config={SENSOR_MODELS} />
      )}
    </>
  );
}

// ------------------------------------------------------------------ Pricing
export const PRICE_PLANS: TablePageConfig<'price_plans'> = {
  table: 'price_plans',
  noun: 'Price plan',
  idPrefix: 'PP',
  path: '/pricing',
  label: (r: PricePlansRow) => `${r.product_id} · ${r.sold_to ?? ''}`,
  columns: ['product_id', 'sold_to', 'base_price', 'period', 'currency'],
  addFields: ['product_id', 'sold_to', 'base_price', 'period'],
  defaults: { period: 'Month', currency: 'SAR' },
  fields: [
    {
      key: 'product_id',
      label: 'Product',
      type: 'select',
      options: { table: 'nodes', label: name, filter: { type: 'Product' } },
      required: true,
    },
    {
      key: 'sold_to',
      label: 'Sold to',
      type: 'select',
      options: enumOptions('price_plans', 'sold_to'),
      required: true,
    },
    { key: 'base_price', label: 'Base price', type: 'number' },
    {
      key: 'period',
      label: 'Period',
      type: 'select',
      options: enumOptions('price_plans', 'period'),
    },
    { key: 'currency', label: 'Currency' },
  ],
  ownRows: [['price_rules', 'plan_id']],
  children: [
    {
      table: 'price_rules',
      title: 'Price rules',
      parentKey: 'plan_id',
      idPrefix: 'PR',
      addLabel: 'Add rule',
      fields: [
        {
          key: 'rule_type',
          label: 'Rule type',
          type: 'select',
          options: enumOptions('price_rules', 'rule_type'),
          required: true,
        },
        {
          key: 'condition',
          label: 'Condition',
          hint: 'Tier name, band like 10-49 or 50+, asset type, feature',
        },
        {
          key: 'effect',
          label: 'Effect',
          type: 'select',
          options: enumOptions('price_rules', 'effect'),
          required: true,
        },
        { key: 'value', label: 'Value', type: 'number' },
      ],
    } satisfies ChildConfig<'price_rules'>,
  ],
};

// ------------------------------------------------------------------ Roles & permissions
export const ROLES: TablePageConfig<'roles'> = {
  table: 'roles',
  noun: 'Role',
  idPrefix: 'R',
  path: '/roles',
  label: (r: RolesRow) => r.name ?? r.id,
  fields: [
    { key: 'name', label: 'Name', required: true },
    {
      key: 'level',
      label: 'Level',
      type: 'select',
      options: enumOptions('roles', 'level'),
      required: true,
    },
    { key: 'permissions', label: 'Permissions', hint: 'Comma-separated, e.g. view, commands' },
  ],
  ownRows: [['role_features', 'role_id']],
  children: [
    {
      table: 'role_features',
      title: 'App feature access',
      parentKey: 'role_id',
      idPrefix: 'RF',
      addLabel: 'Add feature',
      fields: [
        {
          key: 'feature_id',
          label: 'App feature',
          type: 'select',
          options: { table: 'features', label: name },
          required: true,
        },
        {
          key: 'access',
          label: 'Access',
          type: 'select',
          options: enumOptions('role_features', 'access'),
          required: true,
        },
      ],
    } satisfies ChildConfig<'role_features'>,
  ],
};

// ------------------------------------------------------------------ Lookups
export const LOOKUPS: TablePageConfig<'lookups'> = {
  table: 'lookups',
  noun: 'Lookup value',
  idPrefix: 'LK',
  path: '/lookups',
  label: (r: LookupsRow) => `${r.list} · ${r.value}`,
  sort: (a, b) => String(a.list).localeCompare(String(b.list)) || (a.sort ?? 0) - (b.sort ?? 0),
  columns: ['list', 'value', 'sort', 'active'],
  addFields: ['list', 'value', 'sort'],
  defaults: { active: true },
  fields: [
    { key: 'list', label: 'List', required: true, hint: 'e.g. Feature Group, Market, Tier' },
    { key: 'value', label: 'Value', required: true },
    { key: 'sort', label: 'Sort', type: 'number' },
    { key: 'active', label: 'Active (offered in drop-downs)', type: 'yesno' },
  ],
};

/** A record path for a page config, e.g. /features/F01 (unknown pages go to the tree). */
export function Missing() {
  return <Navigate to="/tree" replace />;
}
