// Screens over real company records (Neon): Assets, Sites & zones, Users, My subscription.
// List → choose a record → its card below: read-only until Edit; Save / Cancel on the card;
// Delete only in Edit mode, confirmed, refused with Neon's reason.
import { useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  FieldGrid,
  Icon,
  Modal,
  Note,
  SearchInput,
  SelectField,
  StatusChip,
  Table,
  TextField,
} from '@iotify/ui';
import {
  useAssetTypes,
  useAssets,
  useDeleteRecord,
  useNodes,
  usePricePlans,
  useRoles,
  useSaveRecord,
  useSites,
  useSubscriptions,
  useUpdateRecord,
  useUsers,
  useZones,
  type AssetsRow,
  type SitesRow,
  type SubscriptionsRow,
  type UsersRow,
  type ZonesRow,
} from '@iotify/data';
import { RecordCard, useRecordEdit } from '../edit';
import { nextId } from '../rules-data';
import { Toolbar } from './demo-screens';

const contains = (q: string, ...vals: (string | null | undefined)[]) =>
  !q ||
  vals.some((v) =>
    String(v ?? '')
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

// ------------------------------------------------------------------ Assets
export interface AssetsScreenProps {
  companyId: string;
  /** Only these asset types (the app's); all when omitted. */
  assetTypes?: Set<string>;
  /** Fleet users see only their asset group. */
  assetGroup?: string | null;
  /** View-only (fleet roles, support sessions). */
  readOnly?: boolean;
}

export function AssetsScreen({ companyId, assetTypes, assetGroup, readOnly }: AssetsScreenProps) {
  const assets = useAssets({ company_id: companyId });
  const types = useAssetTypes();
  const sites = useSites({ company_id: companyId });
  const save = useSaveRecord();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const typeName = (id: string | null | undefined) =>
    types.data?.find((t) => t.id === id)?.name ?? id ?? '—';
  const siteName = (id: string | null | undefined) =>
    sites.data?.find((s) => s.id === id)?.name ?? '—';
  const rows = (assets.data ?? []).filter(
    (a) =>
      (!assetTypes || assetTypes.has(a.asset_type_id ?? '')) &&
      (!assetGroup || a.asset_group === assetGroup) &&
      contains(q, a.name, a.plate_serial, typeName(a.asset_type_id)),
  );
  const selected = rows.find((a) => a.id === sel);
  return (
    <>
      <Toolbar search={<SearchInput placeholder="Search assets" value={q} onChange={setQ} />}>
        {!readOnly && (
          <Button size="sm" variant="primary" icon="plus" onClick={() => setAdding(true)}>
            Add asset
          </Button>
        )}
      </Toolbar>
      <Table<AssetsRow>
        label="Assets"
        rows={rows}
        empty={
          assets.isLoading
            ? 'Loading…'
            : 'No assets yet. Your dealer adds them when devices are installed.'
        }
        onRowClick={(a) => setSel(a.id)}
        columns={[
          { header: 'Name', cell: (a) => <b>{a.name}</b> },
          { header: 'Type', cell: (a) => typeName(a.asset_type_id) },
          { header: 'Plate / serial', cell: 'plate_serial' },
          { header: 'Group', cell: 'asset_group' },
          { header: 'Site', cell: (a) => siteName(a.site_id) },
          { header: 'Status', cell: (a) => <StatusChip status={a.status} /> },
        ]}
      />
      {selected && (
        <AssetCard
          key={selected.id}
          asset={selected}
          readOnly={readOnly}
          typeName={typeName(selected.asset_type_id)}
          sites={sites.data ?? []}
          onDeleted={() => setSel(null)}
        />
      )}
      {adding && (
        <NewAssetModal
          companyId={companyId}
          types={(types.data ?? []).filter((t) => !assetTypes || assetTypes.has(t.id))}
          sites={sites.data ?? []}
          onClose={() => setAdding(false)}
          onSave={async (row) => {
            const id = nextId('A', assets.data ?? []);
            await save.mutateAsync('assets', {
              ...row,
              id,
              company_id: companyId,
              status: 'Active',
            });
            setAdding(false);
            setSel(id);
          }}
        />
      )}
    </>
  );
}

function AssetCard({
  asset,
  readOnly,
  typeName,
  sites,
  onDeleted,
}: {
  asset: AssetsRow;
  readOnly?: boolean;
  typeName: string;
  sites: SitesRow[];
  onDeleted: () => void;
}) {
  const update = useUpdateRecord();
  const del = useDeleteRecord();
  const e = useRecordEdit<AssetsRow>(asset, {
    label: `Asset ${asset.name}`,
    readOnly,
    onSave: (changes) => update.mutateAsync('assets', changes),
  });
  return (
    <RecordCard
      title={asset.name}
      edit={e}
      deleteLabel={`Delete ${asset.name}`}
      onDelete={async () => {
        await del.mutateAsync('assets', { id: asset.id });
        onDeleted();
      }}
    >
      <FieldGrid>
        <TextField
          label="Name"
          value={e.value('name')}
          readOnly={e.readOnly}
          onChange={(v) => e.set('name', v)}
        />
        <TextField
          label="Plate / serial"
          value={e.value('plate_serial')}
          readOnly={e.readOnly}
          onChange={(v) => e.set('plate_serial', v)}
        />
        <TextField label="Type" value={typeName} readOnly hint="Set by your dealer" />
        <TextField
          label="Group"
          value={e.value('asset_group')}
          readOnly={e.readOnly}
          onChange={(v) => e.set('asset_group', v || null)}
        />
        <SelectField
          label="Site"
          value={e.value('site_id')}
          readOnly={e.readOnly}
          placeholder="—"
          options={sites.map((s) => ({ value: s.id, label: s.name ?? s.id }))}
          onChange={(v) => e.set('site_id', v || null)}
        />
        <SelectField
          label="Status"
          value={e.value('status')}
          readOnly={e.readOnly}
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
          onChange={(v) => e.set('status', v as AssetsRow['status'])}
        />
      </FieldGrid>
    </RecordCard>
  );
}

function NewAssetModal({
  types,
  sites,
  onClose,
  onSave,
}: {
  companyId: string;
  types: { id: string; name?: string | null }[];
  sites: SitesRow[];
  onClose: () => void;
  onSave: (row: Partial<AssetsRow>) => Promise<void>;
}) {
  const [row, setRow] = useState<Partial<AssetsRow>>({ asset_type_id: types[0]?.id ?? null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      open
      onClose={onClose}
      title="New · Asset"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={busy || !row.name?.trim()}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onSave({ ...row, name: row.name!.trim() });
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <FieldGrid>
        <TextField
          label="Name"
          value={row.name}
          onChange={(v) => setRow({ ...row, name: v })}
          placeholder="e.g. Tipper 15"
          required
        />
        <TextField
          label="Plate / serial"
          value={row.plate_serial}
          onChange={(v) => setRow({ ...row, plate_serial: v })}
        />
        <SelectField
          label="Type"
          value={row.asset_type_id}
          options={types.map((t) => ({ value: t.id, label: t.name ?? t.id }))}
          onChange={(v) => setRow({ ...row, asset_type_id: v })}
        />
        <SelectField
          label="Site"
          value={row.site_id}
          placeholder="—"
          options={sites.map((s) => ({ value: s.id, label: s.name ?? s.id }))}
          onChange={(v) => setRow({ ...row, site_id: v || null })}
        />
      </FieldGrid>
      {error && (
        <Note tone="red" role="alert">
          <b>Not saved.</b> {error}
        </Note>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ Sites & zones
export function SitesScreen({ companyId, readOnly }: { companyId: string; readOnly?: boolean }) {
  const sites = useSites({ company_id: companyId });
  const zones = useZones();
  const [sel, setSel] = useState<string | null>(null);
  const site = sites.data?.find((s) => s.id === sel);
  const siteZones = (siteId: string) => {
    const out: { z: ZonesRow; depth: number }[] = [];
    const walk = (parent: string, depth: number) =>
      (zones.data ?? [])
        .filter((z) => z.site_id === siteId && (z.parent_zone_id || '') === parent)
        .forEach((z) => {
          out.push({ z, depth });
          walk(z.id, depth + 1);
        });
    walk('', 0);
    return out;
  };
  return (
    <>
      <Table<SitesRow>
        label="Sites"
        rows={sites.data ?? []}
        empty={sites.isLoading ? 'Loading…' : 'No sites yet.'}
        onRowClick={(s) => setSel(s.id)}
        columns={[
          { header: 'Site', cell: (s) => <b>{s.name}</b> },
          { header: 'Address', cell: 'address' },
          {
            header: 'Zones',
            cell: (s) => (zones.data ?? []).filter((z) => z.site_id === s.id).length,
          },
          { header: 'Status', cell: (s) => <StatusChip status={s.status} /> },
        ]}
      />
      {site && (
        <SiteCard key={site.id} site={site} readOnly={readOnly}>
          <b style={{ fontSize: 13 }}>Zones</b>
          {siteZones(site.id).length ? (
            siteZones(site.id).map(({ z, depth }) => (
              <div key={z.id} className="ak-zone" style={{ paddingLeft: depth * 20 }}>
                <Icon name="sites" size={14} />
                <span>{z.name}</span>
                <span className="ui-muted">{z.level}</span>
                {z.restricted && <Chip tone="red">Restricted</Chip>}
              </div>
            ))
          ) : (
            <span className="ui-muted">No zones yet.</span>
          )}
        </SiteCard>
      )}
    </>
  );
}

function SiteCard({
  site,
  readOnly,
  children,
}: {
  site: SitesRow;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const update = useUpdateRecord();
  const del = useDeleteRecord();
  const e = useRecordEdit<SitesRow>(site, {
    label: `Site ${site.name}`,
    readOnly,
    onSave: (c) => update.mutateAsync('sites', c),
  });
  return (
    <RecordCard
      title={site.name}
      edit={e}
      deleteLabel={`Delete ${site.name}`}
      onDelete={() => del.mutateAsync('sites', { id: site.id })}
    >
      <FieldGrid>
        <TextField
          label="Name"
          value={e.value('name')}
          readOnly={e.readOnly}
          onChange={(v) => e.set('name', v)}
        />
        <TextField
          label="Address"
          value={e.value('address')}
          readOnly={e.readOnly}
          onChange={(v) => e.set('address', v)}
        />
      </FieldGrid>
      {children}
    </RecordCard>
  );
}

// ------------------------------------------------------------------ Users
export function UsersScreen({
  companyId,
  readOnly,
  extra,
}: {
  companyId: string;
  readOnly?: boolean;
  extra?: ReactNode;
}) {
  const users = useUsers({ account_id: companyId });
  const roles = useRoles();
  const [sel, setSel] = useState<string | null>(null);
  const companyRoles = (roles.data ?? []).filter(
    (r) => r.level === 'Company' || r.level === 'User',
  );
  const roleName = (id: string | null | undefined) =>
    roles.data?.find((r) => r.id === id)?.name ?? '—';
  const user = users.data?.find((u) => u.id === sel);
  return (
    <>
      <Table<UsersRow>
        label="Users"
        rows={users.data ?? []}
        empty={users.isLoading ? 'Loading…' : 'No users yet.'}
        onRowClick={(u) => setSel(u.id)}
        columns={[
          { header: 'Name', cell: (u) => <b>{u.name}</b> },
          { header: 'Role', cell: (u) => roleName(u.role_id) },
          { header: 'Asset group', cell: 'asset_group' },
          { header: 'Email', cell: 'email' },
        ]}
      />
      {user && <UserCard key={user.id} user={user} readOnly={readOnly} roles={companyRoles} />}
      {extra}
    </>
  );
}

function UserCard({
  user,
  readOnly,
  roles,
}: {
  user: UsersRow;
  readOnly?: boolean;
  roles: { id: string; name?: string | null }[];
}) {
  const update = useUpdateRecord();
  const e = useRecordEdit<UsersRow>(user, {
    label: `User ${user.name}`,
    readOnly,
    onSave: (c) => update.mutateAsync('users', c),
  });
  return (
    <RecordCard title={user.name} edit={e}>
      <FieldGrid>
        <TextField
          label="Name"
          value={e.value('name')}
          readOnly={e.readOnly}
          onChange={(v) => e.set('name', v)}
        />
        <TextField
          label="Email"
          type="email"
          value={e.value('email')}
          readOnly={e.readOnly}
          onChange={(v) => e.set('email', v || null)}
        />
        <SelectField
          label="Role"
          value={e.value('role_id')}
          readOnly={e.readOnly}
          options={roles.map((r) => ({ value: r.id, label: r.name ?? r.id }))}
          onChange={(v) => e.set('role_id', v)}
        />
        <TextField
          label="Asset group"
          value={e.value('asset_group')}
          readOnly={e.readOnly}
          hint="Fleet roles see only this group"
          onChange={(v) => e.set('asset_group', v || null)}
        />
      </FieldGrid>
    </RecordCard>
  );
}

// ------------------------------------------------------------------ My subscription
export function SubscriptionScreen({
  companyId,
  products,
}: {
  companyId: string;
  products?: Set<string>;
}) {
  const subs = useSubscriptions({ buyer_id: companyId });
  const nodes = useNodes();
  const plans = usePricePlans();
  const assets = useAssets({ company_id: companyId });
  const name = (id: string | null | undefined) =>
    nodes.data?.find((n) => n.id === id)?.name ?? id ?? '—';
  const rows = (subs.data ?? []).filter(
    (s) => !products || products.has(s.product_id ?? '') || products.has(s.package_id ?? ''),
  );
  return (
    <>
      <Table<SubscriptionsRow>
        label="Subscriptions"
        rows={rows}
        empty={
          subs.isLoading ? (
            'Loading…'
          ) : (
            <EmptyState title="No subscriptions">Your dealer adds subscriptions.</EmptyState>
          )
        }
        columns={[
          { header: 'Product', cell: (s) => <b>{name(s.product_id)}</b> },
          { header: 'Package', cell: (s) => (s.package_id ? name(s.package_id) : '—') },
          { header: 'Edition', cell: (s) => (s.edition_choice ? name(s.edition_choice) : '—') },
          {
            header: 'Asset',
            cell: (s) => assets.data?.find((a) => a.id === s.asset_id)?.name ?? '—',
          },
          {
            header: 'Plan',
            cell: (s) =>
              plans.data?.find((p) => p.id === s.plan_id)?.period
                ? `${s.tier ?? 'Standard'} · per ${plans.data!.find((p) => p.id === s.plan_id)!.period!.toLowerCase()}`
                : (s.tier ?? '—'),
          },
          { header: 'Since', cell: 'start' },
          {
            header: 'Min. term',
            cell: (s) => (s.min_term_months ? `${s.min_term_months} months` : '—'),
          },
          { header: 'Status', cell: (s) => <StatusChip status={s.status} /> },
        ]}
      />
      <Note tone="grey">
        Your dealer manages subscriptions. Ask them to add a product or an add-on.
      </Note>
    </>
  );
}

/** Placeholder for a menu item a product hasn't built yet. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <Card>
      <EmptyState icon="help" title={title}>
        This screen is being designed.
      </EmptyState>
    </Card>
  );
}
