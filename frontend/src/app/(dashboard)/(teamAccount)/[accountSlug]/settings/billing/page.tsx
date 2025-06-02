'use client';

import React from 'react';
// import { createClient } from '@/lib/supabase/server'; // Supabase client removed
import AccountBillingStatus from '@/components/billing/account-billing-status';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useBilling } from '@/contexts/BillingContext'; // Import useBilling
import * as LocalAuth from '@/lib/auth'; // To get current mock user
import { getDatabase } from '@/lib/rxdb/database'; // To potentially fetch account details

const returnUrl = process.env.NEXT_PUBLIC_URL as string;

type AccountParams = {
  accountSlug: string;
};

export default function TeamBillingPage({
  params,
}: {
  params: AccountParams; // Params are already resolved in Next.js 13+ app router for client components
}) {
  // const unwrappedParams = React.use(params); // React.use is for Promises
  const { accountSlug } = params;

  const [teamAccountId, setTeamAccountId] = React.useState<string | null>(null);
  const [isOwner, setIsOwner] = React.useState<boolean>(false); // Assume not owner until checked
  const [isLoadingAccount, setIsLoadingAccount] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { currentSubscription } = useBilling(); // Get subscription status from context

  React.useEffect(() => {
    async function loadTeamAccountAndRole() {
      setIsLoadingAccount(true);
      setError(null);
      try {
        const authUser = await LocalAuth.getUser();
        if (!authUser.data.user) {
          setError("User not authenticated.");
          setIsLoadingAccount(false);
          return;
        }
        const currentUserId = authUser.data.user.id;

        const db = await getDatabase();
        // TODO: Fetch account by slug from RxDB 'accounts' collection
        // For now, we'll use a mock mapping or assume slug is account_id for mock
        const accountDoc = await db.accounts?.findOne({ selector: { slug: accountSlug } }).exec();
        
        if (!accountDoc) {
          // Fallback: maybe the slug *is* the ID in some mock scenarios
          const accountByIdDoc = await db.accounts?.findOne(accountSlug).exec();
          if (!accountByIdDoc) {
            setError(`Team account with slug '${accountSlug}' not found in local DB.`);
            setIsLoadingAccount(false);
            return;
          }
          setTeamAccountId(accountByIdDoc.id);
          // Check role
          const accountUserDoc = await db.account_users?.findOne({ selector: { account_id: accountByIdDoc.id, user_id: currentUserId } }).exec();
          setIsOwner(accountUserDoc?.account_role === 'owner');
        } else {
          setTeamAccountId(accountDoc.id);
          // Check role
          const accountUserDoc = await db.account_users?.findOne({ selector: { account_id: accountDoc.id, user_id: currentUserId } }).exec();
          setIsOwner(accountUserDoc?.account_role === 'owner');
        }
        
      } catch (err) {
        setError('Failed to load team account data or role.');
        console.error(err);
      } finally {
        setIsLoadingAccount(false);
      }
    }

    loadTeamAccountAndRole();
  }, [accountSlug]);

  if (isLoadingAccount) {
    return <div>Loading account details...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-300 dark:border-red-800 rounded-xl">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!isOwner) {
    return (
      <Alert variant="destructive" className="border-red-300 dark:border-red-800 rounded-xl">
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to access this team's billing page.
        </AlertDescription>
      </Alert>
    );
  }
  
  // teamAccountId should be set if isOwner is true after loading.
  // If teamAccountId is still null here, it implies an issue.
  if (!teamAccountId) {
     return (
      <Alert variant="destructive" className="border-red-300 dark:border-red-800 rounded-xl">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Team account ID could not be determined.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-card-title">Team Billing ({accountSlug})</h3>
        <p className="text-sm text-foreground/70">
          Manage your team's subscription and billing details.
        </p>
      </div>

      {/* AccountBillingStatus will use BillingContext, which internally uses the *current user's*
          mock subscription. For team billing, the context might need to be adapted or this
          component needs to pass the team's specific subscription if it's different.
          For now, assuming team billing page shows the current mock user's billing context.
          The accountId prop is removed from AccountBillingStatus.
      */}
      <AccountBillingStatus
        returnUrl={`${returnUrl}/team/${accountSlug}/settings/billing`} // Adjusted for potential team context
      />
    </div>
  );
}
