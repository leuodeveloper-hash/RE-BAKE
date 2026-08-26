import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from './AuthContext';

// ──────────────────────────────────────────────
// 기능 플래그: false면 구독 기능 비활성 (광고 기반 동작 유지)
// true로 전환하면 RevenueCat 구독 상태 반영 + paywall 활성화
// ──────────────────────────────────────────────
export const SUBSCRIPTION_ENABLED = true;

// 실제 결제 연동 여부 (false면 UI만 표시, RevenueCat 초기화 안 함)
export const PURCHASES_ENABLED = true;

// RevenueCat SDK(public) API 키 — 앱에 포함되는 게 정상인 공개 키다.
// iOS는 'appl_', Android는 'goog_'로 시작한다(서로 다른 키를 써야 한다).
const REVENUECAT_API_KEY_IOS = 'appl_hsLvxpgMoTMlSWGGToHrRigttAd';
// TODO: RevenueCat에 Play Store 앱을 추가한 뒤 'goog_' 키로 교체.
// 비어 있으면 안드로이드에서는 초기화를 건너뛴다(아래 sdkReady 참고).
const REVENUECAT_API_KEY_ANDROID = '';

// RevenueCat Entitlement ID (대시보드에서 설정)
const PRO_ENTITLEMENT_ID = 'pro';

const PHOTO_BACKUP_KEY = '@bakle_photo_cloud_backup';

interface SubscriptionContextValue {
  isPro: boolean;
  offerings: any | null;
  purchasePackage: (pkg: any) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  isLoading: boolean;
  /** 사진 클라우드 백업(업로드) 여부. true면 Storage 업로드(구독 필요), false면 이 기기에만 로컬 */
  photoCloudBackup: boolean;
  setPhotoCloudBackup: (v: boolean) => void;
  /** 구독을 구매한 스토어 ('APP_STORE' | 'PLAY_STORE' 등). 구독 없으면 null */
  purchaseStore: string | null;
  /**
   * 이 기기에서 구독을 관리(취소·변경)할 수 있는지.
   * 다른 플랫폼에서 결제했으면 false — 스토어 정책상 교차 관리가 불가능하다.
   */
  canManageSubscription: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({children}: {children: React.ReactNode}) {
  const {user, isAdmin} = useAuth();
  const [isProFromPurchases, setIsProFromPurchases] = useState(false);
  // 구독을 구매한 스토어 ('APP_STORE' | 'PLAY_STORE' | 'PROMOTIONAL' 등)
  const [purchaseStore, setPurchaseStore] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const purchasesRef = useRef<any>(null);
  // 사진 클라우드 백업 선호도 (기본 true — 기존 Pro 업로드 동작 유지)
  const [photoCloudBackup, setPhotoCloudBackupState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(PHOTO_BACKUP_KEY)
      .then(v => { if (v != null) setPhotoCloudBackupState(v === 'true'); })
      .catch(() => {});
  }, []);

  const setPhotoCloudBackup = useCallback((v: boolean) => {
    setPhotoCloudBackupState(v);
    AsyncStorage.setItem(PHOTO_BACKUP_KEY, v ? 'true' : 'false').catch(() => {});
  }, []);

  // 어드민이면 즉시 프로 (useEffect 타이밍 이슈 없이 파생 값으로 계산)
  const isPro = isAdmin || isProFromPurchases;

  // 해당 플랫폼 키가 없으면 초기화하지 않는다(잘못된 키로 SDK가 에러를 뱉는 것 방지).
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  const sdkReady = SUBSCRIPTION_ENABLED && PURCHASES_ENABLED && Platform.OS !== 'web' && !!apiKey;

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
    // 구매한 스토어를 기록한다. 다른 플랫폼에서 결제한 구독은 이 앱에서
    // 취소·변경할 수 없으므로(스토어 정책), UI가 "어디서 구독 중"인지만 알리고
    // 관리 버튼을 감추는 데 쓴다.
    setPurchaseStore(entitlement?.store ?? null);
  }, []);

  // RevenueCat 초기화
  useEffect(() => {
    if (!sdkReady) {
      setIsLoading(false);
      return;
    }
    const P = getPurchases();
    if (!P) { setIsLoading(false); return; }

    P.configure({apiKey});
  }, [sdkReady, getPurchases, apiKey]);

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
    isPro, offerings, purchasePackage, restorePurchases, isLoading, photoCloudBackup, setPhotoCloudBackup,
    purchaseStore,
    // 이 플랫폼에서 산 구독만 여기서 관리할 수 있다(스토어 정책).
    canManageSubscription:
      !purchaseStore ||
      (Platform.OS === 'ios' && purchaseStore === 'APP_STORE') ||
      (Platform.OS === 'android' && purchaseStore === 'PLAY_STORE'),
  }), [isPro, offerings, purchasePackage, restorePurchases, isLoading, photoCloudBackup, setPhotoCloudBackup, purchaseStore]);

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
