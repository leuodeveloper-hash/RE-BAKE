import React, {createContext, useCallback, useContext, useMemo} from 'react';

export const SUBSCRIPTION_ENABLED = false;

interface SubscriptionContextValue {
  isPro: boolean;
  offerings: any | null;
  purchasePackage: (pkg: any) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  isLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({children}: {children: React.ReactNode}) {
  const purchasePackage = useCallback(async (_pkg: any): Promise<boolean> => false, []);
  const restorePurchases = useCallback(async (): Promise<boolean> => false, []);

  const value = useMemo<SubscriptionContextValue>(() => ({
    isPro: false, offerings: null, purchasePackage, restorePurchases, isLoading: false,
  }), [purchasePackage, restorePurchases]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
