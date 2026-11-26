// IT-0036. Administration › Groups, rebuilt in React from the owner's page
// (Groups.html, removed in IT-0037 (git history), the reference): same layout, texts and behaviour. Groups are read
// and saved in Neon (core.asset_group) through @iotify/data, instead of the page's built-in demo
// data. Vehicles point to their group by id (core.tracked_asset.group_id); users keep the group's
// name (core.app_user.asset_group), so a rename updates users, and a delete takes the group off
// vehicles and users, in the same transaction (IT-0040).
import { useMemo, useState, type FormEvent } from 'react';
import { useNextIds, useSaveBatch, type Batch } from '@iotify/data';
import { nid, useFleetAssets, useFleetGroups, useFleetUsers } from '../fleet-rows';
import type { ScreenContext } from '@iotify/app-kit';
import {
  Card,
  ErrorState,
  Field,
  FormGrid,
  Icon,
  Input,
  Loading,
  Modal,
  SmartTrackPage,
  Table,
  Dropdown,
} from '../smart-track/kit';
import './groups.css';

interface Group {
  id: string;
  name: string;
  parentId: string | null;
}

/** Groups as a tree, in name order: each group followed by its sub-groups (as in the original). */
function tree(groups: Group[]): { g: Group; depth: number }[] {
  const ids = new Set(groups.map((g) => g.id));
  const children = new Map<string | null, Group[]>();
  for (const g of groups) {
    const parent = g.parentId && ids.has(g.parentId) ? g.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), g]);
  }
  const out: { g: Group; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) =>
    [...(children.get(parent) ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((g) => {
        out.push({ g, depth });
        walk(g.id, depth + 1);
      });
  walk(null, 0);
  return out;
}

export default function GroupsScreen({ companyId, readOnly }: ScreenContext) {
  const canEdit = !readOnly;
  const query = useFleetGroups(companyId);
  const groups: Group[] = useMemo(
    () =>
      (query.data ?? []).map((r) => ({ id: r.id, name: r.name, parentId: r.parent_id ?? null })),
    [query.data],
  );
  const [editing, setEditing] = useState<Group | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);
  const rows = tree(groups);
  const names = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <SmartTrackPage scope="st-groups">
      <Card
        title="Groups"
        subtitle="Branches or teams. A user limited to a group sees its assets and those of its sub-groups."
        icon="List"
        tone="orange"
        actions={
          canEdit && (
            <button
              type="button"
              className="td-btn td-btn--primary"
              onClick={() => setEditing('new')}
            >
              <Icon name="Plus" size={16} />
              Add group
            </button>
          )
        }
      >
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState message={query.error?.message ?? ''} onRetry={() => void query.refetch()} />
        ) : (
          <Table
            rows={rows}
            rowKey={(r) => r.g.id}
            onRowClick={canEdit ? (r) => setEditing(r.g) : undefined}
            empty="No groups yet. Without groups every user sees the whole company."
            columns={[
              {
                key: 'name',
                header: 'Group',
                render: ({ g, depth }) => (
                  <strong style={{ paddingLeft: depth * 20 }}>
                    {depth > 0 && '└ '}
                    {g.name}
                  </strong>
                ),
              },
              {
                key: 'parent',
                header: 'Parent',
                render: ({ g }) =>
                  g.parentId ? names.get(g.parentId) : <span className="muted">Top level</span>,
              },
              ...(canEdit
                ? [
                    {
                      key: 'actions',
                      header: '',
                      align: 'right' as const,
                      render: ({ g }: { g: Group }) => (
                        <button
                          type="button"
                          className="td-icon-btn td-icon-btn--sm tone-red"
                          aria-label={`Delete ${g.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(g);
                          }}
                        >
                          <Icon name="RowDelete" size={15} />
                        </button>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        )}
      </Card>
      {editing && (
        <GroupForm
          companyId={companyId}
          group={editing === 'new' ? null : editing}
          all={groups}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <DeleteGroup
          companyId={companyId}
          group={deleting}
          all={groups}
          onClose={() => setDeleting(null)}
        />
      )}
    </SmartTrackPage>
  );
}

/** Vehicles and users that carry a group's name (core keeps the name, not the id). */
function useNamedBy(companyId: string) {
  const assets = useFleetAssets(companyId);
  const users = useFleetUsers(companyId);
  return (name: string) => ({
    assets: (assets.data ?? []).filter((a) => a.asset_group === name).map((a) => a.id),
    users: (users.data ?? []).filter((u) => u.asset_group === name).map((u) => u.id),
  });
}

function GroupForm({
  companyId,
  group,
  all,
  onClose,
}: {
  companyId: string;
  group: Group | null;
  all: Group[];
  onClose: () => void;
}) {
  const save = useSaveBatch();
  const namedBy = useNamedBy(companyId);
  const [name, setName] = useState(group?.name ?? '');
  const [parentId, setParentId] = useState(group?.parentId ?? '');
  const [errors, setErrors] = useState<{ name?: string }>({});

  // A group cannot move under itself or one of its own sub-groups.
  const blocked = new Set<string>();
  if (group) {
    blocked.add(group.id);
    for (let grew = true; grew;) {
      grew = false;
      for (const g of all)
        if (g.parentId && blocked.has(g.parentId) && !blocked.has(g.id)) {
          blocked.add(g.id);
          grew = true;
        }
    }
  }

  const nextIds = useNextIds();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return setErrors({ name: 'Required' });
    setErrors({});
    const now = new Date().toISOString();
    const batch: Batch = group
      ? {
          updates: [
            {
              table: 'asset_group',
              rows: [
                { id: Number(group.id), name: clean, parent_id: nid(parentId), updated_at: now },
              ],
            },
          ],
        }
      : {
          upserts: [
            {
              table: 'asset_group',
              rows: [
                {
                  id: (await nextIds('asset_group'))[0]!,
                  public_id: crypto.randomUUID(),
                  company_id: Number(companyId),
                  name: clean,
                  parent_id: nid(parentId),
                  solution_code: 'VEHICLE',
                },
              ],
            },
          ],
        };
    if (group && clean !== group.name) {
      // Vehicles follow by group_id; users keep the name.
      const linked = namedBy(group.name);
      if (linked.users.length)
        batch.updates!.push({
          table: 'app_user',
          rows: linked.users.map((id) => ({ id: Number(id), asset_group: clean })),
        });
    }
    save.mutate(batch, { onSuccess: onClose });
  };

  return (
    <Modal
      title={group ? `Edit ${group.name}` : 'Add group'}
      onClose={onClose}
      width={520}
      footer={
        <>
          <button type="button" className="td-btn td-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="group-form"
            className="td-btn td-btn--primary"
            disabled={save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="group-form" onSubmit={submit} noValidate className="gp-stack">
        {save.isError && <ErrorState message={save.error.message} />}
        <FormGrid>
          <Field label="Name" required error={errors.name}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              autoFocus
              placeholder="e.g. Riyadh branch"
            />
          </Field>
          <Field label="Parent group">
            <Dropdown
              block
              className="gp-ddl"
              value={parentId}
              onChange={setParentId}
              placeholder="None (top level)"
              options={tree(all)
                .filter(({ g }) => !blocked.has(g.id))
                .map(({ g, depth }) => ({ value: g.id, label: `${'— '.repeat(depth)}${g.name}` }))}
            />
          </Field>
        </FormGrid>
      </form>
    </Modal>
  );
}

function DeleteGroup({
  companyId,
  group,
  all,
  onClose,
}: {
  companyId: string;
  group: Group;
  all: Group[];
  onClose: () => void;
}) {
  const save = useSaveBatch();
  const namedBy = useNamedBy(companyId);
  const [refused, setRefused] = useState<string | null>(null);

  const remove = () => {
    // Same rule as the original: sub-groups must be moved or deleted first.
    if (all.some((g) => g.parentId === group.id))
      return setRefused('Move or delete the subgroups first');
    setRefused(null);
    const linked = namedBy(group.name);
    const updates: Batch['updates'] = [];
    if (linked.assets.length)
      updates.push({
        table: 'tracked_asset',
        rows: linked.assets.map((id) => ({ id: Number(id), group_id: null })),
      });
    if (linked.users.length)
      updates.push({
        table: 'app_user',
        rows: linked.users.map((id) => ({ id: Number(id), asset_group: null })),
      });
    save.mutate(
      { updates, deletes: [{ table: 'asset_group', keys: [{ id: Number(group.id) }] }] },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      title="Delete group"
      onClose={onClose}
      width={440}
      footer={
        <>
          <button type="button" className="td-btn td-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="td-btn gp-btn-danger"
            disabled={save.isPending}
            onClick={remove}
          >
            {save.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </>
      }
    >
      <p style={{ margin: 0 }}>
        Delete <strong>{group.name}</strong>? Sub-groups must be moved or deleted first.
      </p>
      {(refused || save.isError) && <ErrorState message={refused ?? save.error!.message} />}
    </Modal>
  );
}
