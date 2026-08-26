import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pdf_export_count';

/**
 * PDF 내보내기 누적 사용 횟수 — 등급별 한도(ENTITLEMENTS.quota.pdfExports)와 비교해 쓴다.
 *
 * 로컬(AsyncStorage)에만 저장한다. 앱을 지우면 초기화되지만,
 * 서버 검증까지 붙이는 건 과하고 결제 우회 유인도 크지 않다.
 */
export function usePdfExportQuota() {
  const [used, setUsed] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(v => { if (v != null) setUsed(parseInt(v, 10) || 0); })
      .catch(() => { /* 무시 — 0으로 시작 */ })
      .finally(() => setLoaded(true));
  }, []);

  /** 내보내기 성공 후 호출 */
  const increment = useCallback(() => {
    setUsed(prev => {
      const next = prev + 1;
      AsyncStorage.setItem(KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  return {used, increment, loaded};
}
