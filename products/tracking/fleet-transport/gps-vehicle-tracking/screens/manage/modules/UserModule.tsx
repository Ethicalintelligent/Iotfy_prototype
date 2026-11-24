// Manage › User (approved design, Desktop/vs/Manage-User.html): the people of the company who sign
// in to its apps, in the design's grid (Login E-mail, Full Name, Role, Status, Suspend), the Add /
// Edit User drawer (../../../forms/UserDrawer) and the Suspend switch, which saves at once. Real
// records: core.users (level Company) + proto_vehicle.user_profiles. Same rules as the customer
// app's Team screen: unique sign-in email, the company keeps an active Company Admin.
import { useMemo, useState } from 'react';
import {
  Card,
  DataGrid,
  HueChip,
  IconButton,
  Note,
  Stack,
  Switch,
  downloadCsv,
  useToast,
  type GridColumn,
} from '@iotify/ui';
import {
  useRoles,
  useSaveRecord,
  useUserProfiles,
  useUsers,
  type UserProfilesRow,
  type UsersRow,
} from '@iotify/data';
import { UserDrawer, lastAdminProblem, loginEmail } from '../../../forms/UserDrawer';
import { ManageToolbar } from '../ManageToolbar';
import type { ModuleProps } from '../modules';

interface Row {
  id: string;
  user: UsersRow;
  p?: UserProfilesRow;
  email: string;
  name: string;
  role: string | null;
  active: boolean;
  suspended: boolean;
}

export default function UserModule({ picker, companyId, readOnly }: ModuleProps) {
  const on = { enabled: !!companyId };
  const users = useUsers({ account_id: companyId, level: 'Company' }, on);
  const profiles = useUserProfiles(undefined, on);
  const roles = useRoles();
  const save = useSaveRecord();
  const toast = useToast();

  const [q, setQ] = useState('');
  const [freeze, setFreeze] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [open, setOpen] = useState<{ user?: UsersRow; view?: boolean } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    const profileOf = new Map((profiles.data ?? []).map((p) => [p.user_id, p]));
    const roleOf = new Map((roles.data ?? []).map((r) => [r.id, r.name ?? r.id]));
    return (users.data ?? [])
      .map((u) => {
        const p = profileOf.get(u.id);
        return {
          id: u.id,
          user: u,
          p,
          email: loginEmail(u),
          name: u.name ?? u.id,
          role: (u.role_id && roleOf.get(u.role_id)) || null,
          active: p?.active !== false,
          suspended: !!p?.suspended,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users.data, profiles.data, roles.data]);
  const suspended = useMemo(
    () => new Set(rows.filter((r) => r.suspended).map((r) => r.id)),
    [rows],
  );

  /** The Suspend switch: a button action, saved at once. */
  const suspend = async (r: Row, on: boolean) => {
    setError(null);
    const problem = lastAdminProblem(
      r.user,
      { suspended: on },
      users.data ?? [],
      roles.data ?? [],
      suspended,
    );
    if (problem) return setError(problem);
    setSaving(r.id);
    try {
      await save.mutateAsync('user_profiles', { user_id: r.id, suspended: on });
      toast(on ? `${r.name} is suspended.` : `${r.name} is no longer suspended.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const columns: GridColumn<Row>[] = [
    {
      key: 'email',
      header: 'Login E-mail',
      value: (r) => r.email,
      cell: (r) => <b>{r.email}</b>,
      width: 260,
    },
    { key: 'name', header: 'Full Name', value: (r) => r.name, width: 220 },
    {
      key: 'role',
      header: 'Role',
      value: (r) => r.role,
      cell: (r) => r.role ?? <HueChip hue="amber">No role yet</HueChip>,
      width: 200,
    },
    {
      key: 'status',
      header: 'Status',
      value: (r) => (r.active ? 'Active' : 'Inactive'),
      cell: (r) => (
        <HueChip hue={r.active ? 'green' : 'grey'}>{r.active ? 'Active' : 'Inactive'}</HueChip>
      ),
      width: 140,
    },
    {
      key: 'suspend',
      header: 'Suspend',
      value: (r) => (r.suspended ? 'On' : 'Off'),
      filter: false,
      cell: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Switch
            label={`Suspend ${r.name}`}
            checked={r.suspended}
            showState
            disabled={readOnly || saving === r.id}
            onChange={(v) => void suspend(r, v)}
          />
        </span>
      ),
      width: 160,
    },
  ];
  const visible = columns.filter((c) => !hidden.includes(c.key));
  const loading = !users.data || !profiles.data || !roles.data;
  const loadError = users.error ?? profiles.error ?? roles.error;

  return (
    <Stack dir="col" gap={12} align="stretch">
      <ManageToolbar
        picker={picker}
        search={q}
        onSearch={setQ}
        searchPlaceholder="Search user..."
        freeze={freeze}
        onFreeze={setFreeze}
        columns={columns}
        hidden={hidden}
        onHidden={setHidden}
        onDownload={() => downloadCsv('users', visible, rows)}
        addLabel="Add User"
        onAdd={() => setOpen({})}
        readOnly={readOnly}
      />
      {(error || loadError) && (
        <Note tone="red" role="alert">
          {error ?? String((loadError as Error).message ?? loadError)}
        </Note>
      )}
      <Card>
        <DataGrid<Row>
          label="Users"
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          search={q}
          hidden={hidden}
          freeze={freeze}
          onRowClick={(r) => setOpen({ user: r.user, view: true })}
          empty={loading ? 'Loading users…' : 'No users yet. Add User to add the first.'}
          actions={
            readOnly
              ? undefined
              : (r) => (
                  <IconButton
                    icon="edit"
                    label={`Edit ${r.name}`}
                    onClick={() => setOpen({ user: r.user })}
                  />
                )
          }
        />
      </Card>
      {open && (
        <UserDrawer
          key={open.user?.id ?? 'new'}
          companyId={companyId}
          user={open.user}
          profile={open.user ? rows.find((r) => r.id === open.user!.id)?.p : undefined}
          people={users.data ?? []}
          suspended={suspended}
          viewFirst={open.view}
          readOnly={readOnly}
          onClose={() => setOpen(null)}
        />
      )}
    </Stack>
  );
}
