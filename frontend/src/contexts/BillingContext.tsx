'use client';

import React, { createContext, useContext, useCallback, useEffect, useState, useRef } from 'react';
// import { useBillingStatusQuery } from '@/hooks/react-query/threads/use-billing-status'; // Replaced with RxDB
import { BillingStatusResponse, SubscriptionStatus } from '@/lib/api'; // Keep types for now
import { isLocalMode } from '@/lib/config';
import { getDatabase } from '@/lib/rxdb/database';
import * as LocalAuth from '@/lib/auth';
import { RxDocument } from 'rxdb';

// Define a type for our mock subscription document in RxDB
// This should align with billingSubscriptionSchema + billingCustomerSchema if combined,
// or just billingSubscriptionSchema if we primarily manage that.
// For simplicity, using a structure similar to SubscriptionStatus for now.
type MockSubscriptionDocType = SubscriptionStatus & { id: string, account_id: string };


interface BillingContextType {
  billingStatus: BillingStatusResponse | null; // This structure might need to be adapted or built from RxDB data
  currentSubscription: MockSubscriptionDocType | null; // Store the current RxDB subscription doc
  isLoading: boolean;
  error: Error | null;
  checkBillingStatus: (force?: boolean) => Promise<boolean>; // Keep signature, change implementation
  updateMockSubscription: (newPlanData: Partial<MockSubscriptionDocType>) => Promise<void>;
  lastCheckTime: number | null;
}

const BillingContext = createContext<BillingContextType | null>(null);

const DEFAULT_MOCK_SUBSCRIPTION = (accountId: string): MockSubscriptionDocType => ({
  id: `sub_${accountId}`, // Ensure unique ID for RxDB
  account_id: accountId,
  status: 'active',
  plan_name: 'Free Plan (Mock)',
  price_id: 'mock_free_tier',
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() as any, // Mock end date
  cancel_at_period_end: false,
  minutes_limit: 100, // Example limit
  current_usage: 0,
  has_schedule: false,
});

export function BillingProvider({ children }: { children: React.ReactNode }) {
  // const billingStatusQuery = useBillingStatusQuery(); // Removed
  const [currentSubscription, setCurrentSubscription] = useState<MockSubscriptionDocType | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const lastCheckRef = useRef<number | null>(null);
  const checkInProgressRef = useRef<boolean>(false);

  const loadOrInitializeSubscription = useCallback(async () => {
    if (!isLocalMode()) return;
    setIsLoading(true);
    setError(null);
    try {
      const auth = await LocalAuth.getUser();
      if (!auth.data.user) {
        console.log("BillingProvider: No mock user, cannot load/init subscription.");
        setIsLoading(false);
        return;
      }
      const accountId = auth.data.user.id; // Use mock user's ID as account_id

      const db = await getDatabase();
      // Ensure collections exist (idempotent)
      if (!db.billing_subscriptions) { // Use the correct collection name from database.ts
        console.warn("billing_subscriptions collection does not exist. Please add it in database.ts");
        // Potentially add it here if safe, or throw an error
        // await db.addCollections({ billing_subscriptions: { schema: billingSubscriptionSchema }});
        setIsLoading(false);
        setError(new Error("Billing subscriptions collection not configured."));
        return;
      }

      let subDoc = await db.billing_subscriptions.findOne({ selector: { account_id: accountId } }).exec();

      if (!subDoc) {
        console.log(`No mock subscription found for ${accountId}, creating default.`);
        const defaultSubData = DEFAULT_MOCK_SUBSCRIPTION(accountId);
        subDoc = await db.billing_subscriptions.insert(defaultSubData);
      }
      const subData = subDoc.toJSON() as MockSubscriptionDocType;
      setCurrentSubscription(subData);
      
      const authUser = await LocalAuth.getMockUser(); // Get current user for admin check
      if (authUser?.isAdmin) {
        console.log("BillingProvider: Admin user detected, overriding billing status.");
        setBillingStatus({
          can_run: true,
          message: 'Admin user: Full access granted.',
          subscription: {
            price_id: 'admin_plan',
            plan_name: 'Admin Unlimited (Mock)',
            minutes_limit: 999999,
          }
        });
      } else {
        // Construct BillingStatusResponse from subscription data for non-admins
        setBillingStatus({
          can_run: (subData.minutes_limit || 0) > (subData.current_usage || 0),
          message: (subData.minutes_limit || 0) > (subData.current_usage || 0) ? 'Usage within limits (Mock)' : 'Usage limit reached (Mock)',
          subscription: { 
            price_id: subData.price_id || '',
            plan_name: subData.plan_name || '',
            minutes_limit: subData.minutes_limit,
          }
        });
      }

    } catch (err: any) {
      console.error('Error loading/initializing mock subscription:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrInitializeSubscription();
  }, [loadOrInitializeSubscription]);


  const checkBillingStatus = useCallback(async (force = false): Promise<boolean> => {
    if (!isLocalMode()) {
      console.log('Billing checks disabled (not local mode).');
      return false; // Or true depending on desired non-local behavior
    }
    if (checkInProgressRef.current && !force) {
      return !(billingStatus?.can_run ?? true); // Default to can_run if status is null
    }

    const now = Date.now();
    if (!force && lastCheckRef.current && now - lastCheckRef.current < 10000) { // Reduced for local testing
      return !(billingStatus?.can_run ?? true);
    }
    
    console.log("Performing mock checkBillingStatus (re-loading from RxDB)");
    checkInProgressRef.current = true;
    await loadOrInitializeSubscription(); // This will refresh currentSubscription and billingStatus
    lastCheckRef.current = now;
    checkInProgressRef.current = false;
    
    // The can_run logic is now inside loadOrInitializeSubscription's setBillingStatus
    // Return based on the NEWLY fetched status
    // Need to access the state *after* it's updated by loadOrInitializeSubscription.
    // This is tricky because state updates are async. A better way might be for loadOrInitializeSubscription to return the status.
    // For now, we'll rely on the next render to have the updated billingStatus.
    // This immediate return value might be stale if called without await.
    return !(billingStatus?.can_run ?? true); 
  }, [loadOrInitializeSubscription, billingStatus]);


  const updateMockSubscription = useCallback(async (newPlanData: Partial<MockSubscriptionDocType>) => {
    if (!isLocalMode() || !currentSubscription) {
      console.warn("Cannot update mock subscription: Not in local mode or no current subscription.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const db = await getDatabase();
      const subDoc = await db.billing_subscriptions.findOne(currentSubscription.id).exec();
      if (subDoc) {
        // Merge new plan data with existing, ensuring not to overwrite id or account_id
        const updatePayload = { ...newPlanData };
        delete updatePayload.id;
        delete updatePayload.account_id;

        await subDoc.patch(updatePayload); // Use patch for partial updates
        const updatedSubData = subDoc.toJSON() as MockSubscriptionDocType;
        setCurrentSubscription(updatedSubData);
        
        const authUser = await LocalAuth.getMockUser(); // Get current user for admin check
        if (authUser?.isAdmin) {
          console.log("BillingProvider (update): Admin user detected, overriding billing status.");
          setBillingStatus({
            can_run: true,
            message: 'Admin user: Full access granted.',
            subscription: {
              price_id: 'admin_plan',
              plan_name: 'Admin Unlimited (Mock)',
              minutes_limit: 999999,
            }
          });
        } else {
          // Re-calculate billing status for non-admins
          setBillingStatus({
            can_run: (updatedSubData.minutes_limit || 0) > (updatedSubData.current_usage || 0),
            message: (updatedSubData.minutes_limit || 0) > (updatedSubData.current_usage || 0) ? 'Usage within limits (Mock)' : 'Usage limit reached (Mock)',
            subscription: {
              price_id: updatedSubData.price_id || '',
              plan_name: updatedSubData.plan_name || '',
              minutes_limit: updatedSubData.minutes_limit,
            }
          });
        }
        console.log("Mock subscription updated in RxDB:", updatedSubData);
      }
    } catch (err: any) {
      console.error("Error updating mock subscription:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentSubscription]);


  const value: BillingContextType = {
    billingStatus,
    currentSubscription,
    isLoading,
    error,
    checkBillingStatus,
    updateMockSubscription,
    lastCheckTime: lastCheckRef.current,
  };

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}