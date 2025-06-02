// import { createClient } from '@/lib/supabase/server'; // Supabase client removed
import AccountBillingStatus from '@/components/billing/account-billing-status';
// Assuming LocalAuth cannot be used directly in Server Components for localStorage access.
// The AccountBillingStatus component (client-side) will be responsible for getting the accountId.

const returnUrl = process.env.NEXT_PUBLIC_URL as string;

export default async function PersonalAccountBillingPage() {
  // const supabaseClient = await createClient(); // Supabase client removed
  // const { data: personalAccount } = await supabaseClient.rpc( // Supabase RPC removed
  //   'get_personal_account',
  // );

  // The AccountBillingStatus component will now fetch its own accountId via context/local auth
  // or this page could be converted to a client component if server-side fetching of mock ID is needed.
  // For now, we assume AccountBillingStatus is a client component and can use BillingContext.

  return (
    <div>
      <AccountBillingStatus
        // accountId prop might no longer be needed if AccountBillingStatus uses BillingContext
        // accountId={personalAccount.account_id}
        returnUrl={`${returnUrl}/settings/billing`}
      />
    </div>
  );
}
