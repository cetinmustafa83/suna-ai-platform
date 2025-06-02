'use client';

import { useEffect, useState } from 'react'; // Keep useState for isManaging if needed locally
import { Button } from '@/components/ui/button';
import { PricingSection } from '@/components/home/sections/pricing-section';
import { isLocalMode } from '@/lib/config';
// import {
//   getSubscription, // Will come from BillingContext
//   createPortalSession, // Will be mocked or disabled for local
//   SubscriptionStatus, // Type can be kept or use MockSubscriptionDocType from context
// } from '@/lib/api';
// import { useAuth } from '@/components/AuthProvider'; // Auth info can also come from BillingContext or LocalAuth directly if needed
import { useBilling } from '@/contexts/BillingContext'; // Import the new BillingContext
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  // accountId: string; // May not be needed if context handles it
  returnUrl: string;
};

// export default function AccountBillingStatus({ accountId, returnUrl }: Props) {
export default function AccountBillingStatus({ returnUrl }: Props) {
  // const { session, isLoading: authLoading } = useAuth(); // Replaced by BillingContext
  const { 
    currentSubscription, 
    isLoading: billingLoading, 
    error: billingError, 
    updateMockSubscription,
    checkBillingStatus, // To refresh data from RxDB if needed
  } = useBilling();
  
  // const [subscriptionData, setSubscriptionData] =
  //   useState<SubscriptionStatus | null>(null); // Comes from currentSubscription
  const [isManaging, setIsManaging] = useState(false); // For Stripe portal, can be repurposed or removed for local

  // useEffect(() => { // Data now comes from BillingContext, which handles its own effects
  //   async function fetchSubscription() {
  //     if (authLoading || !session) return;

  //     try {
  //       const data = await getSubscription();
  //       setSubscriptionData(data);
  //       setError(null);
  //     } catch (err) {
  //       console.error('Failed to get subscription:', err);
  //       setError(
  //         err instanceof Error
  //           ? err.message
  //           : 'Failed to load subscription data',
  //       );
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }

  //   fetchSubscription();
  // }, [session, authLoading]);

  const handleMockPlanChange = async (newPlan: { price_id: string, plan_name: string, minutes_limit: number }) => {
    console.log("Attempting mock plan change to:", newPlan.plan_name);
    if (currentSubscription) {
      await updateMockSubscription({
        // id: currentSubscription.id, // Not needed for patch
        // account_id: currentSubscription.account_id, // Not needed for patch
        status: 'active',
        plan_name: newPlan.plan_name,
        price_id: newPlan.price_id,
        minutes_limit: newPlan.minutes_limit,
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() as any,
        // Reset usage or adjust as per mock logic
        current_usage: 0, 
      });
      // Optionally refresh billing status display after update
      await checkBillingStatus(true); 
    }
  };

  const handleManageSubscription = async () => {
    // This function is for Stripe. In local mode, it's effectively disabled by isLocalMode() check below.
    // If we wanted a mock portal, this is where it would be handled.
    try {
      setIsManaging(true);
      // const { url } = await createPortalSession({ return_url: returnUrl }); // Real Stripe call
      // window.location.href = url;
      alert("Manage Subscription (Stripe Portal) is disabled in local mock mode.");
    } catch (err) {
      console.error('Failed to create portal session:', err);
      // setError(err instanceof Error ? err.message : 'Failed to create portal session');
    } finally {
      setIsManaging(false);
    }
  };

  // In local development mode, show a UI to manage mock subscriptions
  if (isLocalMode()) {
    if (billingLoading) {
      return <Skeleton className="h-60 w-full" />;
    }
    if (billingError) {
      return <div className="text-destructive">Error loading mock billing data: {billingError.message}</div>;
    }
    return (
      <div className="rounded-xl border shadow-sm bg-card p-6">
        <h2 className="text-xl font-semibold mb-2">Billing Status (Local Mock)</h2>
        <p className="text-sm text-muted-foreground mb-4">
           Agent usage limits are mocked. Current Plan: <span className="font-semibold text-primary">{currentSubscription?.plan_name || 'N/A'}</span>
        </p>
        <div className="mb-6">
          <div className="rounded-lg border bg-background p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground/90">
                Agent Usage This Month
              </span>
              <span className="text-sm font-medium text-card-title">
                {currentSubscription?.current_usage?.toFixed(2) || '0'} /{' '}
                {currentSubscription?.minutes_limit || '0'} minutes
              </span>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground/90">Status</span>
                <span className={`text-sm font-medium ${currentSubscription?.status === 'active' ? 'text-green-500' : 'text-destructive'}`}>
                  {currentSubscription?.status || 'N/A'}
                </span>
              </div>
          </div>
        </div>
        
        <h3 className="text-lg font-semibold mb-3">Change Mock Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button onClick={() => handleMockPlanChange({ price_id: 'mock_free_tier', plan_name: 'Free Plan (Mock)', minutes_limit: 100 })}>
            Set to Free (100 mins)
          </Button>
          <Button onClick={() => handleMockPlanChange({ price_id: 'mock_pro_tier', plan_name: 'Pro Plan (Mock)', minutes_limit: 1000 })}>
            Set to Pro (1000 mins)
          </Button>
           <Button onClick={() => handleMockPlanChange({ price_id: 'mock_unlimited_tier', plan_name: 'Unlimited (Mock)', minutes_limit: 999999 })}>
            Set to Unlimited
          </Button>
          <Button onClick={async () => {
            if (currentSubscription) {
              await updateMockSubscription({ current_usage: (currentSubscription.current_usage || 0) + 50 });
              await checkBillingStatus(true);
            }
          }}>
            Add 50min Usage
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
            Note: Plan changes here only affect local mock data in RxDB.
        </p>
      </div>
    );
  }

  // Show loading state (for non-local mode, or initial context load)
  if (billingLoading) {
    return (
      <div className="rounded-xl border shadow-sm bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Billing Status</h2>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="rounded-xl border shadow-sm bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Billing Status</h2>
        <div className="p-4 mb-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
          <p className="text-sm text-destructive">
            Error loading billing status: {error}
          </p>
        </div>
      </div>
    );
  }

  const isPlan = (planId?: string) => {
    return subscriptionData?.plan_name === planId;
  };

  const planName = isPlan('free')
    ? 'Free'
    : isPlan('base')
      ? 'Pro'
      : isPlan('extra')
        ? 'Enterprise'
        : 'Unknown';

  return (
    <div className="rounded-xl border shadow-sm bg-card p-6">
      <h2 className="text-xl font-semibold mb-4">Billing Status</h2>

      {subscriptionData ? (
        <>
          <div className="mb-6">
            <div className="rounded-lg border bg-background p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground/90">
                  Agent Usage This Month
                </span>
                <span className="text-sm font-medium text-card-title">
                  {subscriptionData.current_usage?.toFixed(2) || '0'} /{' '}
                  {subscriptionData.minutes_limit || '0'} minutes
                </span>
              </div>
            </div>
          </div>

          {/* Plans Comparison */}
          <PricingSection returnUrl={returnUrl} showTitleAndTabs={false} />

          {/* Manage Subscription Button */}
          <Button
            onClick={handleManageSubscription}
            disabled={isManaging}
            className="w-full bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
          >
            {isManaging ? 'Loading...' : 'Manage Subscription'}
          </Button>
        </>
      ) : (
        <>
          <div className="mb-6">
            <div className="rounded-lg border bg-background p-4 gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground/90">
                  Current Plan
                </span>
                <span className="text-sm font-medium text-card-title">
                  Free
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground/90">
                  Agent Usage This Month
                </span>
                <span className="text-sm font-medium text-card-title">
                  {subscriptionData?.current_usage?.toFixed(2) || '0'} /{' '}
                  {subscriptionData?.minutes_limit || '0'} minutes
                </span>
              </div>
            </div>
          </div>

          {/* Plans Comparison */}
          <PricingSection returnUrl={returnUrl} showTitleAndTabs={false} />

          {/* Manage Subscription Button */}
          <Button
            onClick={handleManageSubscription}
            disabled={isManaging}
            className="w-full bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
          >
            {isManaging ? 'Loading...' : 'Manage Subscription'}
          </Button>
        </>
      )}
    </div>
  );
}
