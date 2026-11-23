// Groups (approved design, Desktop/vs/Groups.html): branches or teams, nested. Add a group, rename
// or move it (Edit), delete it when nothing uses it. Saves go to proto_vehicle.asset_groups at
// once. Vehicles and users keep their group's name (core.assets.asset_group,
// core.users.asset_group), so a rename changes them too, in the same transaction.
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  FieldGrid,
  IconButton,
  Loading,
  Modal,
  Note,
  SelectField,
  Table,
  TextField,
  useToast,
  type Column,
} from '@iotify/ui';
import {
  useAssetGroups,
  useAssets,
  useDeleteRecord,
  useSaveBatch,
  useUsers,
  type AssetGroupsRow,
  type Upsert,
} from '@iotify/data';
import { nextId, useCoreRules, type ScreenContext } from '@iotify/app-kit';
import { canMoveUnder, descendants, nameProblem, treeOrder, visibleGroups } from './tree';

interface Form {
  /** null: a new group. */
  id: string | null;
  name: string;
  /** '' = top level. */
  parent: string;
}

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export default function GroupsScreen({ companyId, product, readOnly, assetGroup }: ScreenContext) {
  const on = { enabled: !!companyId };
  const groups = useAssetGroups({ company_id: companyId }, on);
  const assets = useAssets({ company_id: companyId }, on);
  const users = useUsers({ account_id: companyId }, on);
  const { rules } = useCoreRules();
  const save = useSaveBatch();
  const del = useDeleteRecord();
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [tried, setTried] = useState(false);
  const [removing, setRemoving] = useState<AssetGroupsRow | null>(null);

  const all = useMemo(() => groups.data ?? [], [groups.data]);
  const byId = useMemo(() => new Map(all.map((g) => [g.id, g])), [all]);
  const shown = useMemo(() => treeOrder(visibleGroups(all, assetGroup)), [all, assetGroup]);
  const vehicleTypes = rules?.productAssetTypes(product) ?? new Set<string>();

  /** What still uses a group (by its name). */
  const usage = (g: AssetGroupsRow) => {
    const using = (assets.data ?? []).filter((a) => a.asset_group === g.name);
    const vehicles = using.filter((a) => vehicleTypes.has(a.asset_type_id ?? ''));
    return {
      assets: using,
      vehicles: vehicles.length,
      others: using.length - vehicles.length,
      users: (users.data ?? []).filter((u) => u.asset_group === g.name),
      children: all.filter((c) => c.parent_id === g.id),
    };
  };

  const open = (g: AssetGroupsRow | null) => {
    if (readOnly) return;
    save.reset();
    setTried(false);
    setForm(
      g
        ? { id: g.id, name: g.name, parent: g.parent_id ?? '' }
        : { id: null, name: '', parent: '' },
    );
  };
  const close = () => setForm(null);

  const editing = form?.id ? byId.get(form.id) : undefined;
  const problem = form ? nameProblem(all, form.name, form.id) : null;
  const moveProblem =
    form?.id && !canMoveUnder(all, form.id, form.parent || null)
      ? 'A group cannot be inside itself or one of its sub-groups.'
      : null;
  const renamed = !!editing && form!.name.trim() !== editing.name;
  const renameUse = editing && renamed ? usage(editing) : null;

  const submit = () => {
    setTried(true);
    if (!form || problem || moveProblem) return;
    const name = form.name.trim();
    const parent_id = form.parent || null;
    const done = { onSuccess: () => (close(), toast(`Group ${name} saved`)) };
    if (!editing) {
      save.mutate(
        {
          upserts: [
            {
              table: 'asset_groups',
              rows: [
                { id: nextId(`GRP-${companyId}-`, all), company_id: companyId, name, parent_id },
              ],
            } as Upsert,
          ],
        },
        done,
      );
      return;
    }
    // Rename or move; a rename moves the vehicles and users that carry the old name.
    const updates: Upsert[] = [
      { table: 'asset_groups', rows: [{ id: editing.id, name, parent_id }] } as Upsert,
    ];
    if (renameUse) {
      updates.push({
        table: 'assets',
        rows: renameUse.assets.map((a) => ({ id: a.id, asset_group: name })),
      } as Upsert);
      updates.push({
        table: 'users',
        rows: renameUse.users.map((u) => ({ id: u.id, asset_group: name })),
      } as Upsert);
    }
    save.mutate({ updates }, done);
  };

  // Parents a group may have: any group except itself and its sub-groups.
  const parentOptions = useMemo(() => {
    const below = form?.id ? descendants(all, form.id) : new Set<string>();
    return treeOrder(all)
      .filter(({ group }) => group.id !== form?.id && !below.has(group.id))
      .map(({ group, depth }) => ({
        value: group.id,
        label: `${'— '.repeat(depth)}${group.name}`,
      }));
  }, [all, form?.id]);

  const blocked = (() => {
    if (!removing) return null;
    const u = usage(removing);
    const members = [
      u.vehicles ? plural(u.vehicles, 'vehicle') : '',
      u.others ? plural(u.others, 'other asset') : '',
      u.users.length ? plural(u.users.length, 'user') : '',
    ].filter(Boolean);
    const total = u.vehicles + u.others + u.users.length;
    const subs = u.children.map((c) => c.name).join(', ');
    const why = [
      members.length ? `${members.join(' and ')} ${total === 1 ? 'is' : 'are'} still in it` : '',
      u.children.length ? `it has ${plural(u.children.length, 'sub-group')} (${subs})` : '',
    ].filter(Boolean);
    return why.length
      ? `${removing.name} can't be deleted: ${why.join(', and ')}. Move them to another group first.`
      : null;
  })();

  const columns: Column<{ group: AssetGroupsRow; depth: number }>[] = [
    {
      header: 'Group',
      cell: ({ group, depth }) => (
        <span style={{ paddingLeft: depth * 20 }}>
          {depth > 0 && <span className="ui-muted">↳ </span>}
          <b>{group.name}</b>
        </span>
      ),
    },
    {
      header: 'Parent',
      cell: ({ group }) => (
        <span className="ui-muted">
          {(group.parent_id && byId.get(group.parent_id)?.name) || 'Top level'}
        </span>
      ),
    },
    { header: 'Vehicles', cell: ({ group }) => usage(group).vehicles, width: 120 },
    ...(readOnly
      ? []
      : [
          {
            header: '',
            align: 'right' as const,
            width: 100,
            cell: ({ group }: { group: AssetGroupsRow }) => (
              <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', gap: 4 }}>
                <IconButton icon="edit" label={`Edit ${group.name}`} onClick={() => open(group)} />
                <IconButton
                  icon="trash"
                  label={`Delete ${group.name}`}
                  onClick={() => {
                    del.reset();
                    setRemoving(group);
                  }}
                />
              </span>
            ),
          },
        ]),
  ];

  const error = groups.error ?? assets.error ?? users.error;
  return (
    <Card
      icon="list"
      iconHue="orange"
      title="Groups"
      subtitle="Branches or teams. A user limited to a group sees its assets and those of its sub-groups."
      actions={
        !readOnly && (
          <Button variant="primary" icon="plus" onClick={() => open(null)}>
            Add group
          </Button>
        )
      }
    >
      {error ? (
        <Note tone="red">{error.message}</Note>
      ) : !groups.data || !assets.data || !users.data ? (
        <Loading>Loading groups…</Loading>
      ) : (
        <Table
          bare
          label="Groups"
          rows={shown}
          rowKey={(r) => r.group.id}
          columns={columns}
          onRowClick={readOnly ? undefined : (r) => open(r.group)}
          empty={
            assetGroup
              ? `Your group (${assetGroup}) is not in the list of groups yet.`
              : 'No groups yet. Add one for each branch or team.'
          }
        />
      )}

      <Modal
        open={!!form}
        onClose={close}
        title={editing ? 'Edit group' : 'Add group'}
        maxWidth={520}
        footer={
          <>
            <Button onClick={close}>Cancel</Button>
            <Button variant="primary" disabled={save.isPending} onClick={submit}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        {form && (
          <>
            <FieldGrid>
              <TextField
                label="Name"
                required
                value={form.name}
                placeholder="e.g. Riyadh branch"
                onChange={(name) => setForm({ ...form, name })}
              />
              <SelectField
                label="Parent group"
                value={form.parent}
                placeholder="None (top level)"
                options={parentOptions}
                onChange={(parent) => setForm({ ...form, parent })}
              />
            </FieldGrid>
            {renameUse && (renameUse.assets.length > 0 || renameUse.users.length > 0) && (
              <Note tone="grey">
                Renaming also moves{' '}
                {[
                  renameUse.assets.length && plural(renameUse.assets.length, 'asset'),
                  renameUse.users.length && plural(renameUse.users.length, 'user'),
                ]
                  .filter(Boolean)
                  .join(' and ')}{' '}
                from {editing!.name} to the new name.
              </Note>
            )}
            {tried && (problem || moveProblem) && <Note tone="red">{problem ?? moveProblem}</Note>}
            {save.error && (
              <Note tone="red">
                <b>Not saved.</b> {save.error.message}
              </Note>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Delete group ${removing?.name ?? ''}?`}
        maxWidth={460}
        footer={
          <>
            <Button onClick={() => setRemoving(null)}>
              {blocked || del.error ? 'Close' : 'Cancel'}
            </Button>
            {!blocked && !del.error && (
              <Button
                variant="danger"
                disabled={del.isPending}
                onClick={() =>
                  del.mutate(
                    'asset_groups',
                    { id: removing!.id },
                    {
                      onSuccess: () => {
                        toast(`Group ${removing!.name} deleted`);
                        setRemoving(null);
                      },
                    },
                  )
                }
              >
                {del.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </>
        }
      >
        {blocked ? (
          <Note>{blocked}</Note>
        ) : del.error ? (
          <Note tone="red">
            <b>Not deleted.</b> {del.error.message}
          </Note>
        ) : (
          <p className="ui-muted" style={{ margin: 0 }}>
            This removes the group for everyone. It can't be undone.
          </p>
        )}
      </Modal>
    </Card>
  );
}
