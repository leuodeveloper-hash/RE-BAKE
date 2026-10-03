import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, getDoc, setDoc} from 'firebase/firestore';
import {auth, db} from '@config/firebase';
import {isPracticalSchedule, type ExamSchedule} from '@utils/examSchedules';

/**
 * 내가 고른 시험일 — 필기처럼 기간(examDate~examEndDate)으로 치르는 시험에서
 * 실제로 볼 날을 고르면, D-day(시험 일정·홈 배너·위젯)가 그날 기준이 된다.
 *
 * 기기(AsyncStorage)에 두고, 로그인했으면 계정(users/{uid}.examChosenDates)에도 둬서
 * 다른 기기에서 이어진다. 키는 회차+실기/필기 — 제과·제빵 일정이 같아 하나로 묶는다.
 */
export const EXAM_CHOSEN_DATES_KEY = '@bakle_exam_chosen_dates';

export type ExamChosenDates = Record<string, string>;

/** 회차별 키 ('2026년 1회__written') */
export function chosenDateKey(s: Pick<ExamSchedule, 'round' | 'examType'>): string {
  return `${s.round}__${isPracticalSchedule(s as ExamSchedule) ? 'practical' : 'written'}`;
}

/** 날짜를 고를 수 있는 일정인지 — 필기이면서 기간이 있을 때 */
export function canChooseExamDate(s: ExamSchedule): boolean {
  return !isPracticalSchedule(s) && !!s.examEndDate && s.examEndDate > s.examDate;
}

/** 기간 안의 날짜들 ('YYYY-MM-DD') */
export function examPeriodDays(s: ExamSchedule): string[] {
  if (!s.examEndDate) return [s.examDate.slice(0, 10)];
  const out: string[] = [];
  const [y, m, d] = s.examDate.slice(0, 10).split('-').map(Number);
  const end = s.examEndDate.slice(0, 10);
  for (let i = 0; i < 62; i++) {
    const day = new Date(y, m - 1, d + i);
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    if (iso > end) break;
    out.push(iso);
  }
  return out;
}

/** D-day 기준일 — 고른 날이 기간 안이면 그날, 아니면 시험 시작일 */
export function effectiveExamDate(s: ExamSchedule, chosen: ExamChosenDates): string {
  const picked = chosen[chosenDateKey(s)];
  // 시험 일정과 같은 형식(KST 09:00)으로 — 'YYYY-MM-DD'만 넘기면 UTC 자정으로 읽혀 해외에선 하루 밀린다
  if (picked && canChooseExamDate(s) && examPeriodDays(s).includes(picked)) return `${picked}T09:00:00+09:00`;
  return s.examDate;
}

export async function loadChosenDates(): Promise<ExamChosenDates> {
  try {
    const raw = await AsyncStorage.getItem(EXAM_CHOSEN_DATES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** 계정에 저장된 값을 기기로 합친다(계정 값 우선) — 다른 기기에서 고른 날을 이어받는다 */
export async function pullChosenDatesFromAccount(): Promise<ExamChosenDates> {
  const local = await loadChosenDates();
  const uid = auth.currentUser?.uid;
  if (!uid) return local;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const remote = (snap.data()?.examChosenDates ?? {}) as ExamChosenDates;
    const merged = {...local, ...remote};
    await AsyncStorage.setItem(EXAM_CHOSEN_DATES_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return local;
  }
}

/** 고르기/해제(null) — 기기와 계정에 함께 저장 */
export async function setChosenDate(key: string, iso: string | null): Promise<ExamChosenDates> {
  const current = await loadChosenDates();
  const next = {...current};
  if (iso) next[key] = iso; else delete next[key];
  await AsyncStorage.setItem(EXAM_CHOSEN_DATES_KEY, JSON.stringify(next));
  const uid = auth.currentUser?.uid;
  if (uid) {
    // 계정 쪽은 통째로 덮는다 — 해제한 키가 merge로 되살아나지 않게
    setDoc(doc(db, 'users', uid), {examChosenDates: next}, {mergeFields: ['examChosenDates']}).catch(() => {});
  }
  return next;
}
