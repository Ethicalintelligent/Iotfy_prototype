// Company sign-in (IT-0010): a dealer adds a company, is asked for its Company Admin at once,
// gets the sign-in details; the new admin signs in to Customer Apps, sees the welcome note and
// adds a Fleet Manager in Team; the last Company Admin can't be deleted. Puts everything back.
import { expect, test } from '@playwright/test';
import { URL, signIn, signInReady, signInWithEmail, sql } from './helpers';

const COMPANY = 'E2E Desert Line Logistics';
const ADMIN_EMAIL = 'e2e.desert.admin@iotify.demo';
const FLEET_EMAIL = 'e2e.desert.fleet@iotify.demo';

async function restore() {
  await sql(
    `DELETE FROM core.users WHERE account_id IN (SELECT id FROM core.companies WHERE name = $1)`,
    [COMPANY],
  );
  await sql(`DELETE FROM core.companies WHERE name = $1`, [COMPANY]);
}
test.beforeAll(restore);
test.afterAll(restore);

test('dealer adds a company and its Company Admin; the admin signs in and builds the team', async ({
  browser,
}) => {
  // Partner Portal: add the company.
  const dealer = await (await browser.newContext()).newPage();
  await dealer.goto(URL.partner + '/');
  await signInReady(dealer);
  await signIn(dealer, 'U2'); // EIT Direct admin
  await expect(dealer).toHaveURL(/\/companies/);
  await dealer.getByRole('button', { name: 'Company', exact: true }).click();
  await dealer.getByLabel('Name').fill(COMPANY);
  await dealer.getByRole('button', { name: 'Save', exact: true }).click();

  // The list shows it with no sign-in, and "Add Company Admin" opens by itself.
  const row = dealer
    .getByRole('table', { name: 'Companys' })
    .getByRole('row', { name: new RegExp(COMPANY) });
  await expect(row).toContainText('No sign-in');
  const add = dealer.getByRole('dialog', { name: `New · Company Admin for ${COMPANY}` });
  await expect(add).toBeVisible();
  await add.getByLabel('Sign-in email').fill(ADMIN_EMAIL);
  await add.getByRole('button', { name: 'Save', exact: true }).click();

  // Sign-in details to send, then the account is listed.
  const details = dealer.getByRole('dialog', { name: /Sign-in details/ });
  await expect(details).toContainText(ADMIN_EMAIL);
  await expect(details).toContainText('IoTIFY Customer Apps');
  await details.getByRole('button', { name: 'Done' }).click();
  await expect(row).toContainText('1 account');

  // Customer Apps: the new admin signs in, sees the welcome note and an empty My apps.
  const cust = await (await browser.newContext()).newPage();
  await cust.goto(URL.customer + '/');
  await signInReady(cust);
  await signInWithEmail(cust, ADMIN_EMAIL);
  await expect(cust).toHaveURL(/\/apps/);
  await expect(cust.getByText(/Welcome, /)).toBeVisible();
  await expect(cust.getByText('No apps yet')).toBeVisible();
  await expect(cust.getByText(/Your dealer, EIT Direct/)).toBeVisible();

  // Team: add a Fleet Manager.
  await cust.getByRole('button', { name: 'Go to Team' }).click();
  await expect(cust).toHaveURL(/\/team/);
  await cust.getByRole('button', { name: 'Person' }).click();
  const person = cust.getByRole('dialog', { name: /New · Person/ });
  await person.getByLabel('Name').fill('E2E Desert fleet');
  await person.getByLabel('Sign-in email').fill(FLEET_EMAIL);
  await person.getByRole('button', { name: 'Save', exact: true }).click();
  await cust.getByRole('dialog', { name: /Sign-in details/ }).getByRole('button', { name: 'Done' }).click();
  const team = cust.getByRole('table');
  await expect(team).toContainText(FLEET_EMAIL);
  await expect(team).toContainText('Fleet Manager');

  // Fleet Manager can be deleted after confirm; the admin's own row has no Delete.
  const fleetRow = team.getByRole('row', { name: /E2E Desert fleet/ });
  await fleetRow.getByRole('button', { name: 'Delete' }).click();
  await cust.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(team).not.toContainText(FLEET_EMAIL);
  await expect(team.getByRole('button', { name: 'Delete' })).toHaveCount(0);
});
