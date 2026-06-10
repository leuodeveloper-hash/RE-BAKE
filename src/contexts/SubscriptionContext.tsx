import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Platform} from 'react-native';
import {useAuth} from './AuthContext';

// ──────────────────────────────────────────────
// 기능 플래그: false면 구독 기능 비활성 (광고 기반 동작 유지)
// true로 전환하면 RevenueCat 구독 상태 반영 + paywall 활성화
// ──────────────────────────────────────────────
export const SUBSCRIPTION_ENABLED = true;

// 실제 결제 연동 여부 (false면 UI만 표시, RevenueCat 초기화 안 함)
export const PURCHASES_ENABLED = false;

// RevenueCat API 키 (프로덕션 배포 시 실제 키로 교체)
const REVENUECAT_API_KEY_IOS = 'appl_test_ZmSXPUTutGSzSNLHEhtPDKRNNqf';
const REVENUECAT_API_KEY_ANDROID = 'appl_test_ZmSXPUTutGSzSNLHEhtPDKRNNqf';

// RevenueCat Entitlement ID (대시보드에서 설정)
const PRO_ENTITLEMENT_ID = 'pro';

interface SubscriptionContextValue {
  isPro: boolean;
  offerings: any | null;
  purchasePackage: (pkg: any) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  isLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({children}: {children: React.ReactNode}) {
  const {user, isAdmin} = useAuth();
  const [isProFromPurchases, setIsProFromPurchases] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const purchasesRef = useRef<any>(null);

  // 어드민이면 즉시 프로 (useEffect 타이밍 이슈 없이 파생 값으로 계산)
  const isPro = isAdmin || isProFromPurchases;

  const sdkReady = SUBSCRIPTION_ENABLED && PURCHASES_ENABLED && Platform.OS !== 'web';

  // 네이티브 모듈 lazy 로드
  const getPurchases = useCallback(() => {
    if (purchasesRef.current) return purchasesRef.current;
    if (!sdkReady) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      purchasesRef.current = require('react-native-purchases').default;
      return purchasesRef.current;
    } catch {
      return null;
    }
  }, [sdkReady]);

  const checkProStatus = useCallback((customerInfo: any) => {
    const entitlement = customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID];
    setIsProFromPurchases(!!entitlement);
  }, []);

  // RevenueCat 초기화
  useEffect(() => {
    if (!sdkReady) {
      setIsLoading(false);
      return;
    }
    const P = getPurchases();
    if (!P) { setIsLoading(false); return; }

    const apiKey = Platform.OS === 'ios'
      ? REVENUECAT_API_KEY_IOS
      : REVENUECAT_API_KEY_ANDROID;
    P.configure({apiKey});
  }, [sdkReady, getPurchases]);

  // 유저 동기화
  useEffect(() => {
    if (!sdkReady) return;
    const P = getPurchases();
    if (!P) return;

    const syncUser = async () => {
      setIsLoading(true);
      try {
        if (user?.uid) {
          const {customerInfo} = await P.logIn(user.uid);
          checkProStatus(customerInfo);
        } else {
          if (!(await P.isAnonymous())) await P.logOut();
          setIsProFromPurchases(false);
        }
        const offers = await P.getOfferings();
        setOfferings(offers);
      } catch {
        setIsProFromPurchases(false);
      } finally {
        setIsLoading(false);
      }
    };
    syncUser();
  }, [user?.uid, checkProStatus, sdkReady, getPurchases]);

  // 구독 상태 변경 리스너
  useEffect(() => {
    if (!sdkReady) return;
    const P = getPurchases();
    if (!P) return;

    const listener = (info: any) => checkProStatus(info);
    P.addCustomerInfoUpdateListener(listener);
    return () => P.removeCustomerInfoUpdateListener(listener);
  }, [checkProStatus, sdkReady, getPurchases]);

  const purchasePackage = useCallback(async (pkg: any): Promise<boolean> => {
    const P = getPurchases();
    if (!P) return false;
    try {
      const {customerInfo} = await P.purchasePackage(pkg);
      checkProStatus(customerInfo);
      return !!customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
    } catch { return false; }
  }, [checkProStatus, getPurchases]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const P = getPurchases();
    if (!P) return false;
    try {
      const customerInfo = await P.restorePurchases();
      checkProStatus(customerInfo);
      return !!customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
    } catch { return false; }
  }, [checkProStatus, getPurchases]);

  const value = useMemo<SubscriptionContextValue>(() => ({
    isPro, offerings, purchasePackage, restorePurchases, isLoading,
  }), [isPro, offerings, purchasePackage, restorePurchases, isLoading]);

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
