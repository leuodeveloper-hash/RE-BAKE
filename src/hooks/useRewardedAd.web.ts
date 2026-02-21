import {useCallback} from 'react';

/**
 * 웹 플랫폼용 보상형 광고 스텁.
 * 네이티브 모듈이 없으므로 no-op으로 동작.
 */
export function useRewardedAd() {
  const show = useCallback((_onRewarded: () => void) => {}, []);
  return {isLoaded: false, isLoading: false, show};
}
