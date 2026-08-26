import React, {createContext, useCallback, useContext, useMemo} from 'react';
import {useAuth} from './AuthContext';

export const SUBSCRIPTION_ENABLED = false;

interface SubscriptionContextValue {
  isPro: boolean;
  offerings: any | null;
  purchasePackage: (pkg: any) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  isLoading: boolean;
  photoCloudBackup: boolean;
  setPhotoCloudBackup: (v: boolean) => void;
  purchaseStore: string | null;
  canManageSubscription: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({children}: {children: React.ReactNode}) {
  const {isAdmin} = useAuth();
  const purchasePackage = useCallback(async (_pkg: any): Promise<boolean> => false, []);
  const restorePurchases = useCallback(async (): Promise<boolean> => false, []);

  // 웹은 결제를 지원하지 않는다(스토어 인앱결제 전용) — 구독 관리도 앱에서만.
  const value = useMemo<SubscriptionContextValue>(() => ({
    isPro: isAdmin, offerings: null, purchasePackage, restorePurchases, isLoading: false,
    photoCloudBackup: false,
    setPhotoCloudBackup: () => {},
    purchaseStore: null,
    canManageSubscription: false,
  }), [isAdmin, purchasePackage, restorePurchases]);

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
