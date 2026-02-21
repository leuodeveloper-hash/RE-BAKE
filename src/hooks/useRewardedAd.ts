import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';

/**
 * 보상형 광고(Rewarded Ad) 훅.
 * 네이티브 모듈(react-native-google-mobile-ads)은 런타임에 lazy-require.
 * 모듈이 없으면(리빌드 전) no-op으로 동작.
 */
export function useRewardedAd() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const adsModuleRef = useRef<any>(null);
  const rewardedRef = useRef<any>(null);
  const onRewardedRef = useRef<(() => void) | null>(null);

  // 네이티브 모듈 lazy 로드
  const getAdsModule = useCallback(() => {
    if (adsModuleRef.current) return adsModuleRef.current;
    if (Platform.OS === 'web') return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('react-native-google-mobile-ads');
      adsModuleRef.current = mod;
      return mod;
    } catch {
      return null;
    }
  }, []);

  const loadAd = useCallback(() => {
    if (isLoading || isLoaded) return;
    const ads = getAdsModule();
    if (!ads) return;

    setIsLoading(true);
    const adUnitId = ads.TestIds.REWARDED;
    const rewarded = ads.RewardedAd.createForAdRequest(adUnitId);

    const unsubLoaded = rewarded.addAdEventListener(
      ads.RewardedAdEventType.LOADED,
      () => {
        setIsLoaded(true);
        setIsLoading(false);
      },
    );

    const unsubEarned = rewarded.addAdEventListener(
      ads.RewardedAdEventType.EARNED_REWARD,
      () => {
        onRewardedRef.current?.();
        onRewardedRef.current = null;
      },
    );

    const unsubClosed = rewarded.addAdEventListener(
      ads.AdEventType.CLOSED,
      () => {
        setIsLoaded(false);
        setIsLoading(false);
        rewardedRef.current = null;
        setTimeout(() => loadAd(), 1000);
      },
    );

    const unsubError = rewarded.addAdEventListener(
      ads.AdEventType.ERROR,
      () => {
        setIsLoaded(false);
        setIsLoading(false);
        rewardedRef.current = null;
      },
    );

    rewardedRef.current = rewarded;
    rewarded.load();

    return () => {
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
    };
  }, [isLoading, isLoaded, getAdsModule]);

  // 마운트 시 광고 프리로드
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // 약간의 딜레이 후 로드 시도 (앱 초기화 완료 후)
    const timer = setTimeout(() => loadAd(), 500);
    return () => clearTimeout(timer);
  }, []);

  const show = useCallback(
    (onRewarded: () => void) => {
      if (!isLoaded || !rewardedRef.current) return;
      onRewardedRef.current = onRewarded;
      rewardedRef.current.show();
    },
    [isLoaded],
  );

  return {isLoaded, isLoading, show};
}
