import {useCallback, useEffect, useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchExamSchedules} from '@utils/examSchedules';
import {getExamTypes, toExamType, type ExamType} from '@constants/examTypes';
import {useTranslation} from '@contexts/LanguageContext';

const PREFS_KEY = 'examNotificationPrefs';
/** 이 일수 이내로 다가와야 배너를 띄운다 — 너무 멀면 홈이 늘 배너로 덮인다 */
const SHOW_WITHIN_DAYS = 7;

export interface UpcomingExam {
  /** 남은 일수 (0 = 오늘) */
  days: number;
  /** '제과 실기' 등 */
  label: string;
  /** '2026년 1회' 등 */
  round: string;
}

/** 오늘 자정 기준 남은 일수. 지났으면 null. */
function daysUntil(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = startOf(d) - startOf(new Date());
  const days = Math.round(diff / 86400000);
  return days >= 0 ? days : null;
}

/**
 * 홈 배너용 "다가오는 시험".
 *
 * 알림과 같은 설정(사용자가 고른 종목)·같은 데이터를 쓴다.
 * 알림은 정해진 시각에 한 번 울리고 끝이라 놓치기 쉬운데,
 * 배너는 앱을 열 때마다 보이므로 남은 일수를 계속 상기시킨다.
 */
export function useUpcomingExam() {
  const {t} = useTranslation();
  const [exam, setExam] = useState<UpcomingExam | null>(null);

  const load = useCallback(async () => {
    try {
      // 알림을 꺼두면 배너도 띄우지 않는다 — 설정 하나로 함께 움직인다
      const raw = await AsyncStorage.getItem(PREFS_KEY);
      const prefs = raw ? JSON.parse(raw) : null;
      const targets: ExamType[] = prefs?.enabled ? (prefs.targets ?? []) : [];
      if (targets.length === 0) { setExam(null); return; }

      const schedules = await fetchExamSchedules(targets);
      const labelByType = Object.fromEntries(getExamTypes(t).map(e => [e.id, e.label]));

      // 아직 안 지난 시험 중 가장 가까운 것
      const upcoming = schedules
        .map(s => ({s, days: daysUntil(s.examDate)}))
        .filter((x): x is {s: typeof schedules[number]; days: number} => x.days !== null)
        .sort((a, b) => a.days - b.days)[0];

      if (!upcoming || upcoming.days > SHOW_WITHIN_DAYS) { setExam(null); return; }

      setExam({
        days: upcoming.days,
        label: labelByType[toExamType(upcoming.s.examType)] ?? t('examNotifications.defaultExamLabel'),
        round: upcoming.s.round ?? '',
      });
    } catch {
      // 조회 실패 시 배너를 숨긴다 — 홈을 막지 않는 편이 낫다
      setExam(null);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  // 날짜가 바뀌거나 설정을 고치고 돌아오면 다시 계산한다
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') load(); });
    return () => sub.remove();
  }, [load]);

  return exam;
}
