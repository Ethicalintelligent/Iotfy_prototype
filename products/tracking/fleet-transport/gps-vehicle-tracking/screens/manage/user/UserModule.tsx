// IT-0036. Manage › User (original `R8` list + `j8` form + `W8` bulk upload). Users are the
// company's core.users rows (account_id = company) with their role (core.roles) and the profile
// fields in proto_vehicle.user_profiles; Suspend is user_profiles.suspended.
// The password is never stored: only its PBKDF2 hash in core.users.password_hash (IT-0038,
// modules/password.ts), from the form and from bulk upload. An empty password keeps the hash.
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useRoles, useSaveBatch, useUserProfiles, useUsers, type Batch } from '@iotify/data';
import { useAuth } from '@iotify/auth';
import { Icon } from '../../smart-track/kit';
import { DataGrid, type GridColumn, type GridLayout } from '../grid/DataGrid';
import { PartialImport, type BulkConfig } from '../bulk/BulkUpload';
import { hashPassword } from '../modules/password';
import { Banner, Confirm, Drawer, FormSection, Fx, Pill, Select, Toast, errText } from '../ui';

const MIN_PASSWORD = 8;
const PASSWORD_HINT = `At least ${MIN_PASSWORD} characters`;
const ADMIN = 'Company Admin';
const PROFILE: { key: string; col: string; label: string; placeholder?: string; max: number }[] = [
  { key: 'username', col: 'user_name', label: 'User Name', placeholder: 'e.g. areyes', max: 60 },
  {
    key: 'mobile',
    col: 'mobile',
    label: 'Mobile Number',
    placeholder: 'e.g. +91 98400 11220',
    max: 30,
  },
  { key: 'pincode', col: 'postal_code', label: 'Postal/Pin Code', max: 20 },
  { key: 'addressLine1', col: 'address_line1', label: 'Address Line 1', max: 200 },
  { key: 'addressLine2', col: 'address_line2', label: 'Address Line 2', max: 200 },
  { key: 'city', col: 'city', label: 'City', max: 100 },
  { key: 'state', col: 'state', label: 'State', max: 100 },
  { key: 'country', col: 'country', label: 'Country', max: 100 },
];

interface UserRow {
  id: string;
  name: string;
  email: string;
  roleId: string;
  admin: boolean;
  suspended: boolean;
  profile: Record<string, string>;
  firstName: string;
  lastName: string;
}

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`ui-switch ${on ? 'is-on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="ui-switch__track">
        <span className="ui-switch__knob" />
      </span>
      <span>{on ? 'On' : 'Off'}</span>
    </button>
  );
}

function Password(props: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  const label = show ? 'Hide password' : 'Show password';
  return (
    <span className="gp-pwd">
      <input
        type={show ? 'text' : 'password'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        maxLength={128}
        autoComplete="new-password"
        placeholder={props.placeholder}
      />
      <button
        type="button"
        className="gp-pwd__eye"
        onClick={() => setShow((s) => !s)}
        aria-label={label}
        title={label}
      >
        <Icon name={show ? 'EyeOff' : 'Eye'} size={16} />
      </button>
    </span>
  );
}

export function UserModule({
  companyId,
  readOnly,
  picker,
  layout,
  onLayout,
}: {
  companyId: string;
  readOnly: boolean;
  picker: ReactNode;
  layout: GridLayout;
  onLayout: (l: GridLayout) => void;
}) {
  const users = useUsers({ account_id: companyId });
  const profiles = useUserProfiles();
  const roles = useRoles();
  const save = useSaveBatch();
  const { user: me } = useAuth();
  const canEdit = !readOnly;
  const [editing, setEditing] = useState<UserRow | 'new' | null>(null);
  const [suspending, setSuspending] = useState<UserRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast((x) => (x === t ? null : x)), 3500);
  };
  const companyRoles = useMemo(
    () => (roles.data ?? []).filter((r) => r.level === 'Company' || r.level === 'User'),
    [roles.data],
  );
  const roleName = useMemo(
    () => new Map((roles.data ?? []).map((r) => [r.id, r.name ?? r.id])),
    [roles.data],
  );
  const rows: UserRow[] = useMemo(() => {
    const P = new Map((profiles.data ?? []).map((p) => [p.user_id, p]));
    return (users.data ?? []).map((u) => {
      const p = P.get(u.id);
      const [first = '', ...rest] = (u.name ?? '').split(' ');
      return {
        id: u.id,
        name: u.name ?? '',
        email: u.email ?? '',
        roleId: u.role_id ?? '',
        admin: roleName.get(u.role_id ?? '') === ADMIN,
        suspended: !!p?.suspended,
        firstName: p?.first_name ?? first,
        lastName: p?.last_name ?? rest.join(' '),
        profile: Object.fromEntries(
          PROFILE.map((f) => [
            f.key,
            String((p as Record<string, unknown> | undefined)?.[f.col] ?? ''),
          ]),
        ),
      };
    });
  }, [users.data, profiles.data, roleName]);
  const roleText = (u: UserRow) => (u.admin ? ADMIN : (roleName.get(u.roleId) ?? ''));

  const setSuspended = (u: UserRow, on: boolean) =>
    save.mutate(
      {
        upserts: [
          {
            table: 'user_profiles',
            rows: [
              { user_id: u.id, suspended: on, active: !on, updated_at: new Date().toISOString() },
            ],
          },
        ],
      },
      {
        onSuccess: () => {
          setSuspending(null);
          flash(`${u.name} ${on ? 'suspended' : 'reactivated'}.`);
        },
      },
    );

  const columns: GridColumn<UserRow>[] = [
    { key: 'email', label: 'Login E-mail', width: 230, strong: true, value: (u) => u.email },
    { key: 'name', label: 'Full Name', width: 190, value: (u) => u.name },
    {
      key: 'role',
      label: 'Role',
      width: 190,
      value: (u) => roleText(u) || 'No role yet',
      render: (u) =>
        !u.admin && !u.roleId ? (
          <span className="td-tag tone-amber">No role yet</span>
        ) : (
          roleText(u)
        ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 130,
      value: (u) => (u.suspended ? 'Suspended' : 'Active'),
      render: (u) => (
        <Pill tone={u.suspended ? 'gray' : 'green'}>{u.suspended ? 'Suspended' : 'Active'}</Pill>
      ),
    },
    {
      key: 'suspend',
      label: 'Suspend',
      width: 120,
      value: (u) => (u.suspended ? 'On' : 'Off'),
      render: (u) =>
        canEdit && u.id !== me?.id ? (
          <Switch
            on={u.suspended}
            label={`Suspend ${u.name}`}
            onChange={(on) => (on ? setSuspending(u) : setSuspended(u, false))}
          />
        ) : (
          <span className="td-mg__text">{u.suspended ? 'On' : 'Off'}</span>
        ),
    },
  ];

  const bulk: BulkConfig = {
    plural: 'Users',
    noun: 'user',
    partial: true,
    maxRows: 200,
    secret: ['password'],
    columns: [
      { key: 'firstName', label: 'First Name', required: true },
      { key: 'lastName', label: 'Last Name' },
      {
        key: 'email',
        label: 'Email Id',
        required: true,
        hint: 'The login e-mail; must not belong to another user',
      },
      {
        key: 'password',
        label: 'Password',
        required: true,
        hint: `${PASSWORD_HINT}, not the e-mail address`,
      },
      {
        key: 'role',
        label: 'Role',
        required: true,
        hint: companyRoles.length
          ? `One of: ${companyRoles.map((r) => r.name).join(', ')}`
          : 'A role of the company (the company has none yet: add them in Administration › Roles)',
      },
      {
        key: 'username',
        label: 'User Name',
        hint: 'No @ or spaces; must not belong to another user',
      },
      { key: 'mobile', label: 'Mobile Number', hint: 'Digits, spaces and + ( ) -' },
      { key: 'pincode', label: 'Postal/Pin Code' },
      { key: 'addressLine1', label: 'Address Line 1' },
      { key: 'addressLine2', label: 'Address Line 2' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'country', label: 'Country' },
    ],
    toValues(c, fail) {
      if (!c.firstName) fail('firstName', 'is required');
      if (!/^\S+@\S+\.\S+$/.test(c.email ?? '')) fail('email', 'must be a valid e-mail address');
      else if (rows.some((u) => u.email.toLowerCase() === c.email!.toLowerCase()))
        fail('email', 'belongs to another user');
      if ((c.password ?? '').length < MIN_PASSWORD) fail('password', PASSWORD_HINT.toLowerCase());
      else if (c.password === c.email) fail('password', 'must not be the e-mail address');
      const role = companyRoles.find(
        (r) => (r.name ?? '').toLowerCase() === (c.role ?? '').toLowerCase(),
      );
      if (!role)
        fail(
          'role',
          companyRoles.length
            ? `must be one of ${companyRoles.map((r) => r.name).join(', ')}`
            : 'the company has no roles yet',
        );
      if (c.username && /[@\s]/.test(c.username)) fail('username', 'must have no @ or spaces');
      if (c.mobile && !/^[\d\s+()-]+$/.test(c.mobile))
        fail('mobile', 'must be digits, spaces and + ( ) -');
      return { ...c, roleId: role?.id ?? '' };
    },
  };

  return (
    <DataGrid
      picker={picker}
      rows={rows}
      rowKey={(u) => u.id}
      rowLabel={(u) => u.name}
      columns={columns}
      plural="Users"
      upload={
        canEdit ? (
          <UsersUpload
            cfg={bulk}
            save={(v) => saveUser(save.mutateAsync, companyId, null, v as unknown as UserValues)}
            onDone={(n) => flash(`${n} user${n === 1 ? '' : 's'} imported.`)}
          />
        ) : undefined
      }
      searchPlaceholder="Search user..."
      addLabel="Add User"
      onAdd={canEdit ? () => setEditing('new') : undefined}
      onEdit={canEdit ? (u) => setEditing(u) : undefined}
      loading={users.isPending || profiles.isPending}
      error={users.error ?? profiles.error}
      onRetry={() => void users.refetch()}
      layout={layout}
      onLayout={onLayout}
    >
      {editing && (
        <UserForm
          companyId={companyId}
          user={editing === 'new' ? null : editing}
          roles={companyRoles.map((r) => ({ value: r.id, label: r.name ?? r.id }))}
          roleText={editing === 'new' ? '' : roleText(editing)}
          existing={rows}
          onClose={() => setEditing(null)}
          onSaved={(name, added) => {
            setEditing(null);
            flash(`User ${name} ${added ? 'added' : 'updated'}.`);
          }}
        />
      )}
      {suspending && (
        <Confirm
          title="Suspend this user?"
          confirmLabel="Suspend"
          busyLabel="Suspending…"
          busy={save.isPending}
          error={save.error ? save.error.message : null}
          message={`${suspending.name} is signed out everywhere and cannot sign in until reactivated.`}
          onCancel={() => {
            setSuspending(null);
            save.reset();
          }}
          onConfirm={() => setSuspended(suspending, true)}
        />
      )}
      {toast && <Toast>{toast}</Toast>}
    </DataGrid>
  );
}

function UsersUpload({
  cfg,
  save,
  onDone,
}: {
  cfg: BulkConfig;
  save: (v: Record<string, unknown>) => Promise<unknown>;
  onDone: (n: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="td-manage__icon"
        title="Bulk upload users"
        aria-label="Bulk upload users"
        onClick={() => setOpen(true)}
      >
        <Icon name="BulkUpload" size={17} />
      </button>
      {open && (
        <PartialImport
          cfg={cfg}
          save={save}
          onClose={() => setOpen(false)}
          onDone={(n) => {
            setOpen(false);
            onDone(n);
          }}
        />
      )}
    </>
  );
}

interface UserValues {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  [profile: string]: string;
}

/** One transaction: the core user row and its profile. */
async function saveUser(
  run: (b: Batch) => Promise<void>,
  companyId: string,
  id: string | null,
  v: UserValues,
) {
  const uid = id ?? `U-${companyId}-${crypto.randomUUID().slice(0, 8)}`;
  const name = `${v.firstName.trim()} ${(v.lastName ?? '').trim()}`.trim();
  const now = new Date().toISOString();
  const user: Record<string, unknown> = {
    id: uid,
    name,
    role_id: v.roleId || null,
    updated_at: now,
  };
  if (!id) Object.assign(user, { email: v.email.trim(), level: 'Company', account_id: companyId });
  if (v.password) user.password_hash = await hashPassword(v.password);
  const profile: Record<string, unknown> = {
    user_id: uid,
    first_name: v.firstName.trim(),
    last_name: (v.lastName ?? '').trim() || null,
    updated_at: now,
  };
  PROFILE.forEach((f) => (profile[f.col] = (v[f.key] ?? '').trim() || null));
  await run({
    upserts: id
      ? [{ table: 'user_profiles', rows: [profile] }]
      : [
          { table: 'users', rows: [user] },
          { table: 'user_profiles', rows: [profile] },
        ],
    updates: id ? [{ table: 'users', rows: [user] }] : [],
  });
  return { id: uid, name };
}

function UserForm({
  companyId,
  user,
  roles,
  roleText,
  existing,
  onClose,
  onSaved,
}: {
  companyId: string;
  user: UserRow | null;
  roles: { value: string; label: string }[];
  roleText: string;
  existing: UserRow[];
  onClose: () => void;
  onSaved: (name: string, added: boolean) => void;
}) {
  const save = useSaveBatch();
  const start = {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    password: '',
    confirm: '',
    roleId: user?.roleId ?? '',
  };
  const startProfile = user?.profile ?? Object.fromEntries(PROFILE.map((f) => [f.key, '']));
  const [v, setV] = useState(start);
  const [profile, setProfile] = useState<Record<string, string>>(startProfile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const admin = !!user?.admin;
  const field = (k: keyof typeof start) => (e: { target: { value: string } }) =>
    setV((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!`${v.firstName.trim()} ${v.lastName.trim()}`.trim()) err.firstName = 'Required';
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) err.email = 'A valid e-mail address';
    else if (!user && existing.some((u) => u.email.toLowerCase() === v.email.trim().toLowerCase()))
      err.email = 'This e-mail already belongs to another user';
    if (!user) {
      if (v.password.length < MIN_PASSWORD) err.password = PASSWORD_HINT;
      if (!v.confirm) err.confirm = 'Required';
      else if (v.confirm !== v.password) err.confirm = 'Passwords do not match';
    }
    setErrors(err);
    setBanner(null);
    if (Object.keys(err).length) return;
    try {
      const res = await saveUser(save.mutateAsync, companyId, user?.id ?? null, {
        ...profile,
        ...v,
      } as UserValues);
      onSaved(res.name, !user);
    } catch (x) {
      setBanner(errText(x));
    }
  };
  return (
    <Drawer
      title={user ? 'Edit User' : 'Add User'}
      subtitle={
        user ? [user.name, roleText].filter(Boolean).join(' · ') : 'Add and configure a portal user'
      }
      icon={user ? 'Pencil' : 'Plus'}
      onClose={onClose}
      onReset={() => {
        setV(start);
        setProfile(startProfile);
        setErrors({});
        setBanner(null);
      }}
      submitLabel={user ? 'Save Changes' : 'Add User'}
      submitting={save.isPending}
      formId="um-user-form"
    >
      <div className="td-form__scroll">
        <form id="um-user-form" className="td-form" onSubmit={(e) => void submit(e)} noValidate>
          {banner && <Banner>{banner}</Banner>}
          <FormSection title="User Information" icon="Info" cols={3}>
            <Fx label="First Name" required error={errors.firstName}>
              <input value={v.firstName} onChange={field('firstName')} maxLength={100} autoFocus />
            </Fx>
            <Fx label="Last Name" error={errors.lastName}>
              <input value={v.lastName} onChange={field('lastName')} maxLength={100} />
            </Fx>
            <Fx
              label="Role"
              hint={admin ? 'Company Admins have every permission; roles do not apply.' : undefined}
            >
              <Select
                value={v.roleId}
                onChange={(r) => setV((x) => ({ ...x, roleId: r }))}
                disabled={admin}
                placeholder={roles.length ? 'Select role...' : 'No roles yet'}
                options={roles}
              />
            </Fx>
            <Fx
              label="Email Id"
              required
              error={errors.email}
              hint={user ? 'The login e-mail cannot be changed.' : undefined}
            >
              <input
                type="email"
                value={v.email}
                onChange={field('email')}
                maxLength={254}
                disabled={!!user}
                autoComplete="off"
              />
            </Fx>
            {!user && (
              <>
                <Fx label="Password" required error={errors.password}>
                  <Password
                    value={v.password}
                    onChange={(p) => setV((x) => ({ ...x, password: p }))}
                    placeholder={PASSWORD_HINT}
                  />
                </Fx>
                <Fx label="Confirm Password" required error={errors.confirm}>
                  <Password
                    value={v.confirm}
                    onChange={(p) => setV((x) => ({ ...x, confirm: p }))}
                  />
                </Fx>
              </>
            )}
          </FormSection>
          <FormSection title="Profile" icon="UserRound" cols={3}>
            {PROFILE.map((f) => (
              <Fx key={f.key} label={f.label} error={errors[f.key]}>
                <input
                  placeholder={f.placeholder}
                  maxLength={f.max}
                  value={profile[f.key] ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              </Fx>
            ))}
          </FormSection>
        </form>
      </div>
    </Drawer>
  );
}
