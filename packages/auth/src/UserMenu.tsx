import { useState, type ReactNode } from 'react';
import {
  Avatar,
  IconButton,
  Popover,
  PopoverHeader,
  PopoverItem,
  PopoverSection,
  PopoverSeparator,
  Chip,
} from '@iotify/ui';
import { useAuth } from './AuthProvider';
import { ROLE_NAMES, ROLE_TONE } from './logic';

/**
 * The avatar button (top right) and its menu: who is signed in, the role switcher (demo only),
 * app-specific items, and Sign out.
 */
export function UserMenu({ children }: { children?: ReactNode }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  if (!auth.user || !auth.role) return null;
  const roleName =
    auth.directory?.roles.find((r) => r.id === auth.user!.role_id)?.name || ROLE_NAMES[auth.role];
  const others = auth.support
    ? []
    : auth
        .loginUsers({ app: auth.app })
        .filter((u) => u.id !== auth.user!.id)
        .slice(0, 8);
  return (
    <>
      <IconButton icon="user" label="Account" active={open} onClick={() => setOpen((v) => !v)}>
        <Avatar
          name={auth.user.name ?? '?'}
          tone={ROLE_TONE[auth.role]}
          size={26}
          status="var(--success)"
        />
      </IconButton>
      <Popover open={open} onClose={() => setOpen(false)} label="Account">
        <PopoverHeader label={auth.support ? 'Support session' : 'Signed in'}>
          <Chip tone="green">{roleName}</Chip>
        </PopoverHeader>
        <PopoverItem
          lead={<Avatar name={auth.user.name ?? '?'} tone={ROLE_TONE[auth.role]} />}
          title={auth.user.name}
          subtitle={auth.appName}
          selected
        />
        <div onClick={() => setOpen(false)}>{children}</div>
        {others.length > 0 && (
          <>
            <PopoverSeparator />
            <PopoverSection>Switch user (demo)</PopoverSection>
            {others.map((u) => (
              <PopoverItem
                key={u.id}
                icon="swap"
                title={u.name}
                onClick={() => {
                  setOpen(false);
                  auth.switchUser(u.id);
                }}
              />
            ))}
          </>
        )}
        {!auth.support && (
          <>
            <PopoverSeparator />
            <PopoverItem
              icon="out"
              title="Sign out"
              danger
              onClick={() => {
                setOpen(false);
                auth.signOut();
              }}
            />
          </>
        )}
      </Popover>
    </>
  );
}
