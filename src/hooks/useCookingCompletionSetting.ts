import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'cooking_completion_check';

/**
 * 요리모드 마지막에 "레시피 숙지 확인"(슬라이드 완료) 카드를 붙일지 여부.
 * 연습/시험 대비용 기능이라 원치 않는 사용자는 끌 수 있어야 한다.
 * 기본 false — 기존 사용자의 흐름을 바꾸지 않는다(켜야 나타남).
 */
export function useCookingCompletionSetting() {
  const [enabled, setEnabledState] = useState(false);
  // 로드 전에 저장값을 덮어쓰지 않도록 하는 플래그
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(v => { if (v != null) setEnabledState(v === 'true'); })
      .catch(() => { /* 무시 — 기본값 유지 */ })
      .finally(() => setLoaded(true));
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    AsyncStorage.setItem(KEY, v ? 'true' : 'false').catch(() => { /* 무시 */ });
  }, []);

  return {enabled, setEnabled, loaded};
}
