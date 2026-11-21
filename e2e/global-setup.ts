import { resetTestData, testDatabaseUrl } from './helpers';

/** Before any test: make sure we're on the test branch, and start from clean demo data. */
export default async function globalSetup() {
  testDatabaseUrl();
  await resetTestData();
}
