// Dealer sign-in accounts: who can sign in to the Partner Portal for a dealer, adding a Dealer
// Admin (saves at once), and the sign-in details to send them. Demo: any password works.
// The list and dialogs are the shared SignInAccounts from @iotify/auth.
import { APPS, SignInAccounts } from '@iotify/auth';
import type { DealersRow } from '@iotify/data';

const ROLES = ['Dealer Admin'];

/** "Sign-in accounts" section on the dealer card. `autoAdd`: open "Add Dealer Admin" at once. */
export function DealerSignIns({
  dealer,
  autoAdd,
  onAutoAddDone,
}: {
  dealer: DealersRow;
  autoAdd?: boolean;
  onAutoAddDone?: () => void;
}) {
  return (
    <SignInAccounts
      level="Dealer"
      account={dealer}
      roleNames={ROLES}
      intro={`People of this dealer who sign in to the ${APPS.partner.name}. Demo: any password works.`}
      emptyText="No one can sign in for this dealer yet. Add a Dealer Admin so they can use the Partner Portal."
      addLabel="Dealer Admin"
      autoAdd={autoAdd}
      onAutoAddDone={onAutoAddDone}
    />
  );
}
