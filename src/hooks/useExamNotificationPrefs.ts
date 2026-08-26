import {useCallback, useEffect, useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchExamSchedules} from '@utils/examSchedules';
import {syncExamWidget} from '@utils/examWidgetSync';
import {cancelAllExamNotifications, scheduleExamNotifications} from '@utils/examNotifications';
import {getExamTypes, type ExamType} from '@constants/examTypes';

export {getExamTypes};
export type {ExamType};

const STORAGE_KEY = '@bakle_exam_notif_prefs';

interface ExamNotificationPrefs {
  enabled: boolean;
  targets: ExamType[];
}

const DEFAULT_PREFS: ExamNotificationPrefs = {
  enabled: false,
  targets: [],
};

/** prefs 변경/로드 시 Firestore에서 일정 가져와 로컬 알림 재등록 (또는 전체 취소) */
async function syncNotifications(prefs: ExamNotificationPrefs) {
  if (!prefs.enabled || prefs.targets.length === 0) {
    await cancelAllExamNotifications();
    return;
  }
  const schedules = await fetchExamSchedules(prefs.targets);
  await scheduleExamNotifications(schedules);
}

export function useExamNotificationPrefs() {
  const [prefs, setPrefs] = useState<ExamNotificationPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    return AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.enabled === 'boolean' && Array.isArray(parsed.targets)) {
            setPrefs(parsed);
          }
        } catch {/* ignore */}
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // prefs 로드/변경될 때마다 알림 동기화 (idempotent — 기존 취소 후 재등록)
  //
  // 실패를 삼키지 않는다. 권한 거부·일정 조회 실패·trigger 오류가 조용히 묻히면
  // 토글은 켜져 있는데 알림이 0건인 상태를 아무도 알 수 없다.
  const [syncError, setSyncError] = useState<string | null>(null);
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    syncNotifications(prefs)
      .then(() => { if (!cancelled) setSyncError(null); })
      .then(() => syncExamWidget())
      .catch((e: any) => {
        if (cancelled) return;
        const msg = e?.message ?? String(e);
        console.warn('[examNotifications] 동기화 실패:', msg);
        setSyncError(msg);
      });
    // 토글을 빠르게 여러 번 누르면 이전 sync의 "취소" 뒤에 다음 sync의 "등록"이
    // 끼어들 수 있다. 마지막 요청만 반영되게 한다.
    return () => { cancelled = true; };
  }, [loaded, prefs]);

  // 앱이 포그라운드로 돌아올 때 다시 동기화한다.
  // prefs 변경 시점에만 등록하면, 서버 일정이 갱신되거나 지난 알림이 소진된 뒤에도
  // 재등록될 기회가 없어 알림이 점점 비어간다.
  useEffect(() => {
    if (!loaded) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      syncNotifications(prefs)
        .then(() => syncExamWidget())
        .catch((e: any) => {
          console.warn('[examNotifications] 복귀 동기화 실패:', e?.message ?? e);
        });
    });
    return () => sub.remove();
  }, [loaded, prefs]);

  const update = useCallback((next: ExamNotificationPrefs) => {
    setPrefs(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    update({...prefs, enabled});
  }, [prefs, update]);

  const toggleTarget = useCallback((type: ExamType) => {
    const has = prefs.targets.includes(type);
    const targets = has ? prefs.targets.filter(t => t !== type) : [...prefs.targets, type];
    update({...prefs, targets});
  }, [prefs, update]);

  /** 시험 유형별 알림을 켜고 끔. enabled는 켜진 유형 유무에 따라 자동 동기화. */
  const setTargetEnabled = useCallback((type: ExamType, on: boolean) => {
    const has = prefs.targets.includes(type);
    const targets = on
      ? (has ? prefs.targets : [...prefs.targets, type])
      : prefs.targets.filter(t => t !== type);
    update({enabled: targets.length > 0, targets});
  }, [prefs, update]);

  return {prefs, loaded, reload, setEnabled, toggleTarget, setTargetEnabled, syncError};
}
