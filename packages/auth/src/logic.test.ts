import { describe, expect, it } from 'vitest';
import type { UsersRow } from '@iotify/data';
import {
  brandOf,
  checkSignIn,
  loginUsers,
  nextSupportId,
  sessionFor,
  supportAllowed,
  supportLinkValid,
  userEmail,
  type Directory,
} from './logic';

const roles = [
  { id: 'R1', name: 'Platform Admin', level: 'Platform' as const },
  { id: 'R2', name: 'Dealer Admin', level: 'Dealer' as const },
  { id: 'R3', name: 'Company Admin', level: 'Company' as const },
  { id: 'R4', name: 'Fleet Manager', level: 'User' as const },
];
const users: UsersRow[] = [
  { id: 'U1', name: 'Platform admin', level: 'Platform', account_id: 'PLATFORM', role_id: 'R1' },
  { id: 'U2', name: 'EIT Direct admin', level: 'Dealer', account_id: 'DL1', role_id: 'R2' },
  { id: 'U3', name: 'Sample Dealer admin', level: 'Dealer', account_id: 'DL2', role_id: 'R2' },
  { id: 'U4', name: 'Company A admin', level: 'Company', account_id: 'C1', role_id: 'R3' },
  { id: 'U5', name: 'Company A fleet manager', level: 'Company', account_id: 'C1', role_id: 'R4' },
  {
    id: 'U8',
    name: 'Company B admin',
    level: 'Company',
    account_id: 'C2',
    role_id: 'R3',
    email: 'B.Admin@Example.test',
  },
];
const apps: Record<string, string[]> = { C1: ['N004', 'N052'], C2: ['N003'] };
const dir = (
  dealers = [
    { id: 'DL1', name: 'EIT Direct' },
    { id: 'DL2', name: 'Sample Dealer' },
  ],
): Directory => ({
  users,
  roles,
  dealers,
  companies: [
    { id: 'C1', name: 'Sample Company A', dealer_id: 'DL1' },
    { id: 'C2', name: 'Sample Company B', dealer_id: 'DL2' },
  ],
  nodes: [
    { id: 'N003', name: 'Fleet Management' },
    { id: 'N004', name: 'GPS Vehicle Tracking' },
    { id: 'N052', name: 'HealthSafe' },
  ],
  companyApps: (c) => new Set(apps[c] ?? []),
});

describe('accounts', () => {
  it('builds demo emails from names', () => {
    expect(userEmail(users[3]!)).toBe('company.a.admin@iotify.demo');
    expect(userEmail(users[5]!)).toBe('B.Admin@Example.test');
  });
  it('maps users to roles and accounts; fleet users are their own account', () => {
    expect(sessionFor(users[0]!, roles)).toEqual({ role: 'platform', account: 'PLATFORM' });
    expect(sessionFor(users[1]!, roles)).toEqual({ role: 'dealer', account: 'DL1' });
    expect(sessionFor(users[3]!, roles)).toEqual({ role: 'company', account: 'C1' });
    expect(sessionFor(users[4]!, roles)).toEqual({ role: 'fleet', account: 'U5' });
  });
  it('each app offers only its own roles', () => {
    expect(loginUsers(dir(), { app: 'admin' }).map((u) => u.id)).toEqual(['U1']);
    expect(loginUsers(dir(), { app: 'partner' }).map((u) => u.id)).toEqual(['U2', 'U3']);
    expect(loginUsers(dir(), { app: 'customer' }).map((u) => u.id)).toEqual(['U4', 'U5', 'U8']);
    expect(loginUsers(dir(), { app: 'customer', product: 'N003' }).map((u) => u.id)).toEqual([
      'U8',
    ]);
  });
  it('a white-label page lists only that dealer’s customers', () => {
    const wl = dir([
      { id: 'DL1', name: 'EIT Direct' },
      { id: 'DL2', name: 'Sample Dealer', reseller_type: 'White-label reseller' } as never,
    ]);
    expect(loginUsers(wl, { app: 'customer', product: 'N004', dealer: 'DL2' })).toEqual([]);
    expect(
      loginUsers(wl, { app: 'customer', product: 'N003', dealer: 'DL2' }).map((u) => u.id),
    ).toEqual(['U8']);
    // not white-label: the dealer part of the address is ignored
    expect(
      loginUsers(dir(), { app: 'customer', product: 'N004', dealer: 'DL2' }).map((u) => u.id),
    ).toEqual(['U4', 'U5']);
  });
});

describe('suspended dealers', () => {
  const suspended = () =>
    dir([
      { id: 'DL1', name: 'EIT Direct' },
      { id: 'DL2', name: 'Sample Dealer', status: 'Suspended' } as never,
    ]);
  it('are not offered as demo accounts', () => {
    expect(loginUsers(suspended(), { app: 'partner' }).map((u) => u.id)).toEqual(['U2']);
  });
  it('can’t sign in, and are told why', () => {
    expect(
      checkSignIn(suspended(), { app: 'partner' }, 'sample.dealer.admin@iotify.demo', 'x'),
    ).toEqual({
      ok: false,
      error: 'Sample Dealer is suspended, so its people can’t sign in. Ask EIT to reactivate it.',
    });
  });
});

describe('sign-in', () => {
  it('any password works for a known email (case ignored)', () => {
    expect(
      checkSignIn(dir(), { app: 'customer' }, ' Company.A.Admin@iotify.demo ', 'x'),
    ).toMatchObject({ ok: true, user: { id: 'U4' } });
  });
  it('asks for both fields', () => {
    expect(checkSignIn(dir(), { app: 'customer' }, 'company.a.admin@iotify.demo', '')).toEqual({
      ok: false,
      error: 'Enter your email and password.',
    });
  });
  it('the wrong app says where to go', () => {
    expect(checkSignIn(dir(), { app: 'partner' }, 'company.a.admin@iotify.demo', 'x')).toEqual({
      ok: false,
      error: 'Company A admin signs in to the IoTIFY Customer Apps, not here.',
    });
    expect(checkSignIn(dir(), { app: 'admin' }, 'eit.direct.admin@iotify.demo', 'x')).toEqual({
      ok: false,
      error: 'EIT Direct admin signs in to the IoTIFY Partner Portal, not here.',
    });
    expect(checkSignIn(dir(), { app: 'customer' }, 'platform.admin@iotify.demo', 'x')).toEqual({
      ok: false,
      error: 'Platform admin signs in to the IoTIFY Admin Console, not here.',
    });
  });
  it('a product page refuses companies without that app', () => {
    expect(
      checkSignIn(dir(), { app: 'customer', product: 'N003' }, 'company.a.admin@iotify.demo', 'x'),
    ).toEqual({
      ok: false,
      error:
        'Sample Company A has no active Fleet Management subscription. Sign in to the app your company bought, or ask your dealer.',
    });
  });
  it('unknown email', () => {
    expect(checkSignIn(dir(), { app: 'customer' }, 'nobody@iotify.demo', 'x')).toMatchObject({
      ok: false,
      error: /No account found/,
    });
  });
});

describe('branding and support', () => {
  it('white-label dealers get their own brand; others show EIT', () => {
    expect(brandOf({ id: 'DL1', name: 'EIT Direct', reseller_type: 'Reseller' })).toMatchObject({
      name: 'EIT',
      whiteLabel: false,
    });
    expect(
      brandOf({
        id: 'DL2',
        name: 'Sample Dealer',
        reseller_type: 'White-label reseller',
        brand_name: 'TrackPro',
      }),
    ).toMatchObject({
      name: 'TrackPro',
      initials: 'T',
      whiteLabel: true,
      color: '#2B6CB0',
      dealerId: 'DL2',
    });
  });
  it('support is allowed through the last day', () => {
    const today = new Date(2026, 10, 19, 12);
    expect(supportAllowed({ support_access_until: '2026-11-19' }, today)).toBe(true);
    expect(supportAllowed({ support_access_until: '2026-11-18' }, today)).toBe(false);
    expect(supportAllowed({ support_access_until: null }, today)).toBe(false);
  });
  it('support links: open, under 2 hours, right app', () => {
    const now = new Date('2026-11-19T12:00:00Z');
    const s = {
      id: 'SS1',
      target_level: 'Company' as const,
      target_account_id: 'C1',
      reason: 'Ticket',
      started_at: '2026-11-19T11:00:00Z',
    };
    expect(supportLinkValid(s, 'customer', now)).toBe(true);
    expect(supportLinkValid(s, 'partner', now)).toBe(false);
    expect(supportLinkValid({ ...s, ended_at: '2026-11-19T11:30:00Z' }, 'customer', now)).toBe(
      false,
    );
    expect(supportLinkValid({ ...s, started_at: '2026-11-19T09:59:00Z' }, 'customer', now)).toBe(
      false,
    );
    expect(supportLinkValid(undefined, 'customer', now)).toBe(false);
    // works once: a link already opened is refused
    expect(
      supportLinkValid({ ...s, link_opened_at: '2026-11-19T11:05:00Z' }, 'customer', now),
    ).toBe(false);
  });
  it('numbers support sessions', () => {
    expect(nextSupportId([])).toBe('SS1');
    expect(nextSupportId([{ id: 'SS2' }, { id: 'SS10' }, { id: 'X' }])).toBe('SS11');
  });
});

describe('dates', () => {
  it('support dates use the UTC calendar day, like the database', async () => {
    const { addDays, isoDay } = await import('./logic');
    // 00:30 in India on 20 Nov is still 19 Nov in UTC
    const lateNight = new Date('2026-11-19T19:00:00Z');
    expect(isoDay(lateNight)).toBe('2026-11-19');
    expect(addDays(lateNight, 7)).toBe('2026-11-26');
  });
});
