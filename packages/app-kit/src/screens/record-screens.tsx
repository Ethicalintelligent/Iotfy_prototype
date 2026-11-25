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
  Subhead,
} from '@iotify/ui';
import {
  useAppUser,
  useAssetGroup,
  useAssetTypes,
  useBranch,
  useDeleteRecord,
  useNextIds,
  useNodes,
  usePricePlans,
  useRoles,
  useSaveRecord,
  useSubscriptions,
  useTrackedAsset,
  useUpdateRecord,
  useZones,
  type AppUserRow,
  type BranchRow,
  type SubscriptionsRow,
  type TrackedAssetRow,
  type ZonesRow,
} from '@iotify/data';
import { RecordCard, useRecordEdit } from '../edit';

// IT-0040: assets are gps.tracked_asset (code = plate / serial, group_id → gps.asset_group, site_id →
// gps.branch), sites are gps.branch (location = address), users are gps.app_user. Their ids are
// numbers, given by the database.
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  MAINTENANCE: 'Maintenance',
};
const statusLabel = (s: string | null | undefined) => STATUS_LABEL[s ?? ''] ?? s ?? '';
/** A select's text value → the number to save, or null. */
const idOf = (v: string | null | undefined) => (v ? Number(v) : null);
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
  const company = Number(companyId);
  const assets = useTrackedAsset({ company_id: company });
  const types = useAssetTypes();
  const sites = useBranch({ company_id: company });
  const groups = useAssetGroup({ company_id: company });
  const save = useSaveRecord();
  const nextIds = useNextIds();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const typeName = (id: string | null | undefined) =>
    types.data?.find((t) => t.id === id)?.name ?? id ?? '—';
  const siteName = (id: number | null | undefined) =>
    sites.data?.find((s) => s.id === id)?.name ?? '—';
  const groupName = (id: number | null | undefined) =>
    groups.data?.find((g) => g.id === id)?.name ?? '';
  const rows = (assets.data ?? []).filter(
    (a) =>
      (!assetTypes || assetTypes.has(a.asset_type_id ?? '')) &&
      (!assetGroup || groupName(a.group_id) === assetGroup) &&
      contains(q, a.name, a.code, typeName(a.asset_type_id)),
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
      <Table<TrackedAssetRow>
        label="Assets"
        rows={rows}
        empty={
          assets.isLoading
            ? 'Loading…'
            : 'No assets yet. Your dealer adds them when devices are installed.'
        }
        onRowClick={(a) => setSel(a.id ?? null)}
        columns={[
          { header: 'Name', cell: (a) => <b>{a.name}</b> },
          { header: 'Type', cell: (a) => typeName(a.asset_type_id) },
          { header: 'Plate / serial', cell: 'code' },
          { header: 'Group', cell: (a) => groupName(a.group_id) },
          { header: 'Site', cell: (a) => siteName(a.site_id) },
          { header: 'Status', cell: (a) => <StatusChip status={statusLabel(a.status)} /> },
        ]}
      />
      {selected && (
        <AssetCard
          key={selected.id}
          asset={selected}
          readOnly={readOnly}
          typeName={typeName(selected.asset_type_id)}
          sites={sites.data ?? []}
          groups={groups.data ?? []}
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
            const [id] = await nextIds('tracked_asset');
            const type = types.data?.find((t) => t.id === row.asset_type_id);
            await save.mutateAsync('tracked_asset', {
              ...row,
              id,
              public_id: crypto.randomUUID(),
              company_id: company,
              asset_type: (type?.name ?? 'OTHER').toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
              status: 'ACTIVE',
            } as TrackedAssetRow);
            setAdding(false);
            setSel(id!);
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
  groups,
  onDeleted,
}: {
  asset: TrackedAssetRow;
  readOnly?: boolean;
  typeName: string;
  sites: BranchRow[];
  groups: { id?: number; name: string }[];
  onDeleted: () => void;
}) {
  const update = useUpdateRecord();
  const del = useDeleteRecord();
  const e = useRecordEdit<TrackedAssetRow>(asset, {
    label: `Asset ${asset.name}`,
    readOnly,
    onSave: (changes) => update.mutateAsync('tracked_asset', changes),
  });
  return (
    <RecordCard
      title={asset.name}
      edit={e}
      deleteLabel={`Delete ${asset.name}`}
      onDelete={async () => {
        await del.mutateAsync('tracked_asset', { id: asset.id });
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
          value={e.value('code')}
          readOnly={e.readOnly}
          onChange={(v) => e.set('code', v)}
        />
        <TextField label="Type" value={typeName} readOnly hint="Set by your dealer" />
        <SelectField
          label="Group"
          value={e.value('group_id') == null ? '' : String(e.value('group_id'))}
          readOnly={e.readOnly}
          placeholder="—"
          options={groups.map((g) => ({ value: String(g.id), label: g.name }))}
          onChange={(v) => e.set('group_id', idOf(v))}
        />
        <SelectField
          label="Site"
          value={e.value('site_id') == null ? '' : String(e.value('site_id'))}
          readOnly={e.readOnly}
          placeholder="—"
          options={sites.map((s) => ({ value: String(s.id), label: s.name }))}
          onChange={(v) => e.set('site_id', idOf(v))}
        />
        <SelectField
          label="Status"
          value={e.value('status')}
          readOnly={e.readOnly}
          options={[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
            { value: 'MAINTENANCE', label: 'Maintenance' },
          ]}
          onChange={(v) => e.set('status', v as TrackedAssetRow['status'])}
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
  sites: BranchRow[];
  onClose: () => void;
  onSave: (row: Partial<TrackedAssetRow>) => Promise<void>;
}) {
  const [row, setRow] = useState<Partial<TrackedAssetRow>>({ asset_type_id: types[0]?.id ?? null });
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
          value={row.code}
          onChange={(v) => setRow({ ...row, code: v })}
        />
        <SelectField
          label="Type"
          value={row.asset_type_id}
          options={types.map((t) => ({ value: t.id, label: t.name ?? t.id }))}
          onChange={(v) => setRow({ ...row, asset_type_id: v })}
        />
        <SelectField
          label="Site"
          value={row.site_id == null ? '' : String(row.site_id)}
          placeholder="—"
          options={sites.map((s) => ({ value: String(s.id), label: s.name }))}
          onChange={(v) => setRow({ ...row, site_id: idOf(v) })}
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
  const sites = useBranch({ company_id: Number(companyId) });
  const zones = useZones();
  const [sel, setSel] = useState<number | null>(null);
  const site = sites.data?.find((s) => s.id === sel);
  const siteZones = (siteId: number | undefined) => {
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
      <Table<BranchRow>
        label="Sites"
        rows={sites.data ?? []}
        empty={sites.isLoading ? 'Loading…' : 'No sites yet.'}
        onRowClick={(s) => setSel(s.id ?? null)}
        columns={[
          { header: 'Site', cell: (s) => <b>{s.name}</b> },
          { header: 'Address', cell: 'location' },
          {
            header: 'Zones',
            cell: (s) => (zones.data ?? []).filter((z) => z.site_id === s.id).length,
          },
          { header: 'Status', cell: (s) => <StatusChip status={s.status ?? ''} /> },
        ]}
      />
      {site && (
        <SiteCard key={site.id} site={site} readOnly={readOnly}>
          <Subhead>Zones</Subhead>
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
  site: BranchRow;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const update = useUpdateRecord();
  const del = useDeleteRecord();
  const e = useRecordEdit<BranchRow>(site, {
    label: `Site ${site.name}`,
    readOnly,
    onSave: (c) => update.mutateAsync('branch', c),
  });
  return (
    <RecordCard
      title={site.name}
      edit={e}
      deleteLabel={`Delete ${site.name}`}
      onDelete={() => del.mutateAsync('branch', { id: site.id })}
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
          value={e.value('location')}
          readOnly={e.readOnly}
          onChange={(v) => e.set('location', v)}
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
  const users = useAppUser({ company_id: Number(companyId) });
  const roles = useRoles();
  const [sel, setSel] = useState<number | null>(null);
  const companyRoles = (roles.data ?? []).filter(
    (r) => r.level === 'Company' || r.level === 'User',
  );
  const roleName = (id: string | null | undefined) =>
    roles.data?.find((r) => r.id === id)?.name ?? '—';
  const user = users.data?.find((u) => u.id === sel);
  return (
    <>
      <Table<AppUserRow>
        label="Users"
        rows={users.data ?? []}
        empty={users.isLoading ? 'Loading…' : 'No users yet.'}
        onRowClick={(u) => setSel(u.id ?? null)}
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
  user: AppUserRow;
  readOnly?: boolean;
  roles: { id: string; name?: string | null }[];
}) {
  const update = useUpdateRecord();
  const e = useRecordEdit<AppUserRow>(user, {
    label: `User ${user.name}`,
    readOnly,
    onSave: (c) => update.mutateAsync('app_user', c),
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
          onChange={(v) => e.set('email', v)}
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
  const assets = useTrackedAsset({ company_id: Number(companyId) });
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
