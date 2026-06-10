import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchExamSchedules} from '@utils/examSchedules';
import {cancelAllExamNotifications, scheduleExamNotifications} from '@utils/examNotifications';
import {EXAM_TYPES, type ExamType} from '@constants/examTypes';

export {EXAM_TYPES};
export type {ExamType};

const STORAGE_KEY = '@bakecycle_exam_notif_prefs';

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

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
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

  // prefs 로드/변경될 때마다 알림 동기화 (idempotent — 기존 취소 후 재등록)
  useEffect(() => {
    if (!loaded) return;
    syncNotifications(prefs).catch(() => {/* 무시 */});
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

  return {prefs, loaded, setEnabled, toggleTarget};
}
