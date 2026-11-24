// Add / Edit User drawer of the approved design (Desktop/vs/Manage-User.html): a person of the
// company who signs in to its apps. Same rules as the customer app's Team screen (IT-0010):
// core.users row (level Company, account = the company, a company role from core.roles), the
// sign-in email must be unique, and the company keeps at least one Company Admin. The profile
// (names, mobile, address) goes to proto_vehicle.user_profiles. Both in one transaction.
// Demo sign-in has no real passwords: the two password fields are checked but not stored.
import { useState } from 'react';
import { Button, Drawer, FormSection, FullRow, Note, SelectField, TextField } from '@iotify/ui';
import {
  useRoles,
  useSaveBatch,
  useUsers,
  type RolesRow,
  type UserProfilesRow,
  type UsersRow,
} from '@iotify/data';
import { nextId } from '@iotify/app-kit';
import { str, txt } from './lookups';

/** The roles a company gives its people, in the Team screen's order. */
export const COMPANY_ROLES = ['Company Admin', 'Fleet Manager', 'Fleet Supervisor'];
export const KEEP_ROLE = 'Company Admin';

/**
 * The email a person signs in with: their own, or a demo address made from the name. Same rule
 * as `userEmail` in @iotify/auth (this product doesn't depend on that package).
 */
export const loginEmail = (u: Pick<UsersRow, 'email' | 'name'>) =>
  u.email ||
  `${String(u.name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')}@iotify.demo`;

/** Company roles (level Company or User) by name, in COMPANY_ROLES order. */
export const companyRoles = (roles: RolesRow[] | undefined) =>
  COMPANY_ROLES.map((n) =>
    (roles ?? []).find((r) => r.name === n && (r.level === 'Company' || r.level === 'User')),
  ).filter((r): r is RolesRow => !!r);

/** Why this change would leave the company without an active Company Admin, or null. */
export function lastAdminProblem(
  user: UsersRow,
  change: { roleId?: string | null; suspended?: boolean },
  everyone: UsersRow[],
  roles: RolesRow[],
  suspendedIds: Set<string>,
): string | null {
  const admin = roles.find((r) => r.name === KEEP_ROLE)?.id;
  if (!admin || user.role_id !== admin) return null;
  const staysAdmin = (change.roleId ?? user.role_id) === admin;
  const staysActive = !(change.suspended ?? suspendedIds.has(user.id));
  if (staysAdmin && staysActive) return null;
  const others = everyone.filter(
    (u) => u.id !== user.id && u.role_id === admin && !suspendedIds.has(u.id),
  );
  return others.length
    ? null
    : `${user.name} is the only active ${KEEP_ROLE}. Add another ${KEEP_ROLE} first, so someone can still manage the team.`;
}

const formOf = (u?: UsersRow, p?: UserProfilesRow) => {
  const [first, ...rest] = str(u?.name).split(' ');
  return {
    first: p?.first_name ?? (u ? (first ?? '') : ''),
    last: p?.last_name ?? (u ? rest.join(' ') : ''),
    role: str(u?.role_id),
    email: u ? loginEmail(u) : '',
    password: '',
    confirm: '',
    userName: str(p?.user_name),
    mobile: str(p?.mobile),
    postal: str(p?.postal_code),
    line1: str(p?.address_line1),
    line2: str(p?.address_line2),
    city: str(p?.city),
    state: str(p?.state),
    country: str(p?.country),
  };
};
type Form = ReturnType<typeof formOf>;

export interface UserDrawerProps {
  companyId: string;
  /** Edit (or view) this person instead of adding one. */
  user?: UsersRow;
  profile?: UserProfilesRow;
  /** Every person of the company (unique email, last Company Admin). */
  people: UsersRow[];
  /** Ids of suspended people (last active Company Admin). */
  suspended: Set<string>;
  viewFirst?: boolean;
  readOnly?: boolean;
  onClose: () => void;
}

export function UserDrawer({
  companyId,
  user,
  profile,
  people,
  suspended,
  viewFirst,
  readOnly,
  onClose,
}: UserDrawerProps) {
  const isNew = !user;
  const [mode, setMode] = useState<'view' | 'edit'>(
    !isNew && (viewFirst || readOnly) ? 'view' : 'edit',
  );
  const ro = mode === 'view';
  const start = formOf(user, profile);
  const [f, setF] = useState<Form>(start);
  const [error, setError] = useState<string | null>(null);
  const roles = useRoles();
  const everyone = useUsers();
  const save = useSaveBatch();
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const choices = companyRoles(roles.data);

  const submit = async () => {
    setError(null);
    const email = f.email.trim().toLowerCase();
    const missing = [
      !f.first.trim() && 'First Name',
      !f.role && 'Role',
      !email && 'Email Id',
      isNew && !f.password && 'Password',
      isNew && !f.confirm && 'Confirm Password',
    ].filter(Boolean);
    if (missing.length) return setError(`Fill in: ${missing.join(', ')}.`);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError('Email Id: a valid email address, e.g. name@company.com.');
    if (f.password || f.confirm) {
      if (f.password.length < 8) return setError('Password: at least 8 characters.');
      if (f.password !== f.confirm) return setError('The two passwords are not the same.');
    }
    const all = everyone.data ?? [];
    const taken = all.find((u) => u.id !== user?.id && loginEmail(u).toLowerCase() === email);
    if (taken) return setError(`${email} is already used by ${taken.name}. Use another email.`);
    if (user) {
      const problem = lastAdminProblem(
        user,
        { roleId: f.role },
        people,
        roles.data ?? [],
        suspended,
      );
      if (problem) return setError(problem);
    }
    const id = user?.id ?? nextId('U', all);
    const name = [f.first.trim(), f.last.trim()].filter(Boolean).join(' ');
    const row: Partial<UsersRow> = {
      id,
      name,
      email,
      level: 'Company',
      account_id: companyId,
      role_id: f.role,
    };
    const prof: Partial<UserProfilesRow> = {
      user_id: id,
      first_name: f.first.trim(),
      last_name: txt(f.last),
      user_name: txt(f.userName),
      mobile: txt(f.mobile),
      postal_code: txt(f.postal),
      address_line1: txt(f.line1),
      address_line2: txt(f.line2),
      city: txt(f.city),
      state: txt(f.state),
      country: txt(f.country),
    };
    try {
      await save.mutateAsync(
        isNew
          ? {
              upserts: [
                { table: 'users', rows: [row] },
                { table: 'user_profiles', rows: [prof] },
              ],
            }
          : {
              updates: [{ table: 'users', rows: [row] }],
              upserts: [{ table: 'user_profiles', rows: [prof] }],
            },
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const text = (k: keyof Form, label: string, extra?: { placeholder?: string; type?: 'tel' }) => (
    <TextField
      label={label}
      readOnly={ro}
      value={f[k]}
      onChange={set(k)}
      type={extra?.type}
      placeholder={ro ? '—' : extra?.placeholder}
    />
  );

  return (
    <Drawer
      open
      onClose={onClose}
      title={isNew ? 'Add User' : ro ? (user!.name ?? user!.id) : 'Edit User'}
      subtitle={
        isNew ? 'Add and configure a portal user' : ro ? loginEmail(user!) : 'Update portal user'
      }
      icon={isNew ? 'plus' : ro ? 'user' : 'edit'}
      notice={
        error && (
          <Note tone="red" role="alert">
            {error}
          </Note>
        )
      }
      footer={
        ro ? (
          <>
            <Button onClick={onClose}>Close</Button>
            {!readOnly && (
              <Button variant="primary" icon="edit" onClick={() => setMode('edit')}>
                Edit User
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              onClick={() => {
                setF(start);
                setError(null);
                if (!isNew && viewFirst) setMode('view');
              }}
            >
              {!isNew && viewFirst ? 'Cancel' : 'Reset'}
            </Button>
            <Button variant="primary" disabled={save.isPending || !everyone.data} onClick={submit}>
              {save.isPending ? 'Saving…' : isNew ? 'Add User' : 'Save User'}
            </Button>
          </>
        )
      }
    >
      <FormSection id="info" title="User Information" icon="info">
        <TextField
          label="First Name"
          required
          readOnly={ro}
          value={f.first}
          onChange={set('first')}
        />
        {text('last', 'Last Name')}
        <SelectField
          label="Role"
          required
          readOnly={ro}
          value={f.role}
          onChange={set('role')}
          placeholder={ro ? '—' : 'Select role...'}
          options={choices.map((r) => ({ value: r.id, label: r.name ?? r.id }))}
        />
        <TextField
          label="Email Id"
          required
          type="email"
          readOnly={ro}
          value={f.email}
          onChange={set('email')}
          hint={ro ? undefined : 'They sign in with this email.'}
        />
        {!ro && (
          <>
            <TextField
              label="Password"
              required={isNew}
              type="password"
              value={f.password}
              onChange={set('password')}
              placeholder={ro ? '—' : isNew ? 'At least 8 characters' : 'Leave empty to keep'}
            />
            <TextField
              label="Confirm Password"
              required={isNew}
              type="password"
              value={f.confirm}
              onChange={set('confirm')}
            />
            <FullRow>
              <Note tone="amber">
                Prototype: passwords are checked here but not stored. Demo sign-in works with any
                password for a known email.
              </Note>
            </FullRow>
          </>
        )}
      </FormSection>
      <FormSection id="profile" title="Profile" icon="user">
        {text('userName', 'User Name', { placeholder: 'e.g. areyes' })}
        {text('mobile', 'Mobile Number', { placeholder: 'e.g. +966 50 123 4567', type: 'tel' })}
        {text('postal', 'Postal/Pin Code')}
        {text('line1', 'Address Line 1')}
        {text('line2', 'Address Line 2')}
        {text('city', 'City')}
        {text('state', 'State')}
        {text('country', 'Country')}
      </FormSection>
    </Drawer>
  );
}
