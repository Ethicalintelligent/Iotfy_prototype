// Partner portal pages on the TablePage kit: Users, Sites & zones, Certificates, Subscriptions,
// Stock. Everything is limited to the dealer's own records and customers.
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, StatusChip, Table, Tabs } from '@iotify/ui';
import {
  useCompanies,
  useAssets,
  useNodes,
  useSubscriptions,
  type SubscriptionsRow,
} from '@iotify/data';
import { useAuth } from '@iotify/auth';
import { TablePage, enumOptions, type TablePageConfig } from '@iotify/app-kit';
import { SimCards } from './vehicle/SimCards';

const name = (r: Record<string, unknown>) => String(r.name ?? r.id);
const modelName = (r: Record<string, unknown>) =>
  `${r.maker ?? ''} ${r.model ?? ''}`.trim() || String(r.id);

/** The signed-in dealer and its customer companies. */
function useDealer() {
  const auth = useAuth();
  const dealer = auth.account ?? '';
  const companies = useCompanies({ dealer_id: dealer }, { enabled: !!dealer });
  const ids = (companies.data ?? []).map((c) => c.id);
  return { auth, dealer, companyIds: ids, readOnly: !!auth.support, ready: !!companies.data };
}
const companyOption = (dealer: string) => ({
  table: 'companies' as const,
  label: name,
  filter: { dealer_id: dealer },
});

// ------------------------------------------------------------------ Users (the dealer's staff)
export function UsersPage() {
  const { dealer, readOnly } = useDealer();
  const config: TablePageConfig<'users'> = {
    table: 'users',
    noun: 'User',
    idPrefix: 'U',
    path: '/users',
    filter: { account_id: dealer, level: 'Dealer' },
    label: (r) => r.name ?? r.id,
    columns: ['name', 'email', 'role_id'],
    addFields: ['name', 'email', 'role_id'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'email', label: 'Email', type: 'text' },
      {
        key: 'role_id',
        label: 'Role',
        type: 'select',
        options: { table: 'roles', label: name, filter: { level: 'Dealer' } },
        required: true,
      },
    ],
  };
  return <TablePage config={config} readOnly={readOnly} />;
}

// ------------------------------------------------------------------ Sites & zones
export function SitesPage() {
  const { dealer, companyIds, readOnly, ready } = useDealer();
  if (!ready) return null;
  const config: TablePageConfig<'sites'> = {
    table: 'sites',
    noun: 'Site',
    idPrefix: 'ST',
    path: '/sites',
    filter: { company_id: companyIds },
    label: (r) => r.name ?? r.id,
    columns: ['name', 'company_id', 'address', 'status'],
    addFields: ['company_id', 'name', 'address'],
    defaults: { status: 'Active' },
    fields: [
      {
        key: 'company_id',
        label: 'Company',
        type: 'select',
        options: companyOption(dealer),
        required: true,
      },
      { key: 'name', label: 'Name', required: true },
      { key: 'address', label: 'Address' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: enumOptions('sites', 'status'),
        placeholder: null,
      },
    ],
    ownRows: [['zones', 'site_id']],
    children: [
      {
        table: 'zones',
        title: 'Zones',
        parentKey: 'site_id',
        idPrefix: 'Z',
        addLabel: 'Add zone',
        fields: [
          { key: 'name', label: 'Name', required: true },
          {
            key: 'parent_zone_id',
            label: 'Inside',
            type: 'select',
            options: { table: 'zones', label: name },
            placeholder: '— (top)',
          },
          { key: 'level', label: 'Level', type: 'select', options: enumOptions('zones', 'level') },
          { key: 'restricted', label: 'Restricted (alert on entry)', type: 'yesno' },
        ],
      },
    ],
  };
  return <TablePage config={config} readOnly={readOnly} />;
}

// ------------------------------------------------------------------ Certificates
export function CertificatesPage() {
  const { dealer, companyIds, readOnly, ready } = useDealer();
  const assets = useAssets({ company_id: companyIds }, { enabled: ready });
  if (!assets.data) return null;
  const assetIds = assets.data.map((a) => a.id);
  const config: TablePageConfig<'certificates'> = {
    table: 'certificates',
    noun: 'Certificate',
    idPrefix: 'CT',
    path: '/certs',
    filter: { asset_id: assetIds },
    label: (r) => r.certificate_no || r.id,
    columns: ['asset_id', 'certification', 'certificate_no', 'valid_until', 'status'],
    addFields: ['asset_id', 'certification', 'certificate_no'],
    defaults: { status: 'Pending' },
    fields: [
      {
        key: 'asset_id',
        label: 'Asset',
        type: 'select',
        options: { table: 'assets', label: name, filter: { company_id: companyIds } },
        required: true,
      },
      {
        key: 'device_unit_id',
        label: 'Device unit',
        type: 'select',
        options: {
          table: 'device_units',
          label: (r) => `${r.id} · ${r.imei ?? ''}`,
          filter: { owner_dealer_id: dealer },
        },
      },
      {
        key: 'certification',
        label: 'Certification',
        type: 'select',
        options: { lookup: 'Certification' },
        required: true,
      },
      { key: 'certificate_no', label: 'Certificate no.' },
      { key: 'issued_by', label: 'Issued by' },
      { key: 'issued_on', label: 'Issued on', type: 'date' },
      { key: 'valid_until', label: 'Valid until', type: 'date' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: enumOptions('certificates', 'status'),
        placeholder: null,
      },
    ],
  };
  return <TablePage config={config} readOnly={readOnly} />;
}

// ------------------------------------------------------------------ Subscriptions
export function SubscriptionsPage() {
  const { dealer, companyIds, readOnly } = useDealer();
  const bought = useSubscriptions({ buyer_id: dealer }, { enabled: !!dealer });
  const nodes = useNodes();
  const nodeName = (id: string | null | undefined) =>
    nodes.data?.find((n) => n.id === id)?.name ?? id ?? '—';
  const config: TablePageConfig<'subscriptions'> = {
    table: 'subscriptions',
    noun: 'Subscription',
    idPrefix: 'SUB',
    path: '/subs',
    filter: { seller_id: dealer },
    label: (r) => `${r.id} · ${nodeName(r.product_id)}`,
    sort: (a, b) => a.id.localeCompare(b.id),
    columns: ['buyer_id', 'product_id', 'asset_id', 'qty', 'tier', 'status'],
    addFields: ['buyer_id', 'product_id', 'asset_id', 'qty', 'tier'],
    defaults: {
      seller_id: dealer,
      status: 'Active',
      qty: 1,
      start: new Date().toISOString().slice(0, 10),
    },
    fields: [
      {
        key: 'buyer_id',
        label: 'Company',
        type: 'select',
        options: companyOption(dealer),
        required: true,
      },
      {
        key: 'product_id',
        label: 'Product',
        type: 'select',
        options: { table: 'nodes', label: name, filter: { type: 'Product' } },
        required: true,
      },
      {
        key: 'asset_id',
        label: 'Asset',
        type: 'select',
        options: { table: 'assets', label: name, filter: { company_id: companyIds } },
      },
      { key: 'qty', label: 'Qty', type: 'number' },
      { key: 'tier', label: 'Tier', type: 'select', options: { lookup: 'Tier' } },
      { key: 'start', label: 'Start', type: 'date' },
      { key: 'min_term_months', label: 'Min. term (months)', type: 'number' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: enumOptions('subscriptions', 'status'),
        placeholder: null,
      },
      {
        key: 'edition_choice',
        label: 'Included edition',
        type: 'select',
        options: { table: 'nodes', label: name, filter: { kind: 'Edition' } },
      },
    ],
  };
  return (
    <>
      <TablePage config={config} readOnly={readOnly} />
      <Card title="Bought from EIT">
        <Table<SubscriptionsRow>
          bare
          label="Bought from EIT"
          rows={bought.data ?? []}
          empty="Nothing yet."
          columns={[
            { header: 'Product', cell: (s) => <b>{nodeName(s.product_id)}</b> },
            { header: 'Qty', cell: 'qty' },
            { header: 'Since', cell: 'start' },
            { header: 'Status', cell: (s) => <StatusChip status={s.status} /> },
          ]}
        />
      </Card>
    </>
  );
}

// ------------------------------------------------------------------ Stock
export function StockPage() {
  const { dealer, companyIds, readOnly } = useDealer();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = pathname.startsWith('/stock/sims')
    ? 'sims'
    : pathname.startsWith('/stock/sensors')
      ? 'sensors'
      : 'devices';
  const devices: TablePageConfig<'device_units'> = {
    table: 'device_units',
    noun: 'Device',
    idPrefix: 'DU',
    path: '/stock',
    filter: { owner_dealer_id: dealer },
    label: (r) => `${r.id} · ${r.imei ?? ''}`,
    sort: (a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }),
    search: (r) => `${r.id} ${r.imei} ${r.device_model_id} ${r.status}`,
    columns: ['device_model_id', 'imei', 'company_id', 'asset_id', 'status'],
    addFields: ['device_model_id', 'imei'],
    defaults: { owner_dealer_id: dealer, status: 'In stock' },
    // The Add Device drawer (GPS Vehicle Tracking forms/) was deleted in IT-0025; the standard Add
    // form (addFields) is used until a new one exists.
    fields: [
      {
        key: 'device_model_id',
        label: 'Model',
        type: 'select',
        options: { table: 'device_models', label: modelName },
        required: true,
      },
      { key: 'imei', label: 'IMEI / serial', required: true },
      {
        key: 'company_id',
        label: 'Company',
        type: 'select',
        options: companyOption(dealer),
        readOnly: true,
        hint: 'Set when installed',
      },
      {
        key: 'asset_id',
        label: 'Asset',
        type: 'select',
        options: { table: 'assets', label: name, filter: { company_id: companyIds } },
        readOnly: true,
        hint: 'Install from Assets & installation',
      },
      {
        key: 'zone_id',
        label: 'Zone (site gateways)',
        type: 'select',
        options: { table: 'zones', label: name },
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: enumOptions('device_units', 'status'),
        placeholder: null,
      },
    ],
  };
  // SIM cards: the approved Manage SIM Card screen (GPS Platform design 07-03)
  const sensors: TablePageConfig<'sensor_units'> = {
    table: 'sensor_units',
    noun: 'Sensor',
    idPrefix: 'SU',
    path: '/stock/sensors',
    filter: { owner_dealer_id: dealer },
    label: (r) => `${r.id} · ${r.serial ?? ''}`,
    sort: (a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }),
    columns: ['sensor_model_id', 'serial', 'device_unit_id', 'slot'],
    addFields: ['sensor_model_id', 'serial'],
    defaults: { owner_dealer_id: dealer },
    fields: [
      {
        key: 'sensor_model_id',
        label: 'Model',
        type: 'select',
        options: { table: 'sensor_models', label: modelName },
        required: true,
      },
      { key: 'serial', label: 'Serial', required: true },
      {
        key: 'device_unit_id',
        label: 'On device',
        type: 'select',
        options: {
          table: 'device_units',
          label: (r) => `${r.id} · ${r.imei ?? ''}`,
          filter: { owner_dealer_id: dealer },
        },
        readOnly: true,
      },
      { key: 'slot', label: 'Slot', readOnly: true },
      { key: 'calibration', label: 'Calibration' },
    ],
  };
  return (
    <>
      <Tabs
        label="Stock"
        value={tab}
        onChange={(t) => navigate(t === 'devices' ? '/stock' : `/stock/${t}`)}
        tabs={[
          { key: 'devices', label: 'Devices' },
          { key: 'sims', label: 'SIM cards' },
          { key: 'sensors', label: 'Sensors' },
        ]}
      />
      {tab === 'devices' && <TablePage config={devices} readOnly={readOnly} />}
      {tab === 'sims' && <SimCards dealer={dealer} readOnly={readOnly} />}
      {tab === 'sensors' && <TablePage config={sensors} readOnly={readOnly} />}
    </>
  );
}
