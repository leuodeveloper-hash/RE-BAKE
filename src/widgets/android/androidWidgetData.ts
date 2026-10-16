import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 안드로이드 위젯 데이터 — 앱이 저장하고 위젯(백그라운드 JS)이 읽는다.
 * 아이폰은 App Group(UserDefaults)에 같은 모양으로 넣는다(widgetSync·examWidgetSync).
 */
export const ANDROID_WIDGET_NAME = 'BakleWidget';
const SETS_KEY = '@bakle_widget_daily_sets';
const EXAM_KEY = '@bakle_widget_exam';

/** 그날의 레시피 한 세트 — seed(YYYYMMDD)로 찾는다. 사진은 원격 URL(위젯 라이브러리가 받아 그린다) */
export interface AndroidDailySet {
  seed: number;
  id: string;
  title: string;
  imageUrl: string;
}

/** 다가오는 시험 — 아이폰 위젯과 같은 필드 */
export interface AndroidWidgetExam {
  examDate: string;
  label: string;
  round: string;
  registrationStart: string;
}

export async function saveAndroidDailySets(sets: AndroidDailySet[]) {
  await AsyncStorage.setItem(SETS_KEY, JSON.stringify(sets));
}

export async function saveAndroidWidgetExam(exam: AndroidWidgetExam | null) {
  await AsyncStorage.setItem(EXAM_KEY, exam ? JSON.stringify(exam) : '');
}

export async function readAndroidWidgetData(): Promise<{sets: AndroidDailySet[]; exam: AndroidWidgetExam | null}> {
  const [rawSets, rawExam] = await Promise.all([AsyncStorage.getItem(SETS_KEY), AsyncStorage.getItem(EXAM_KEY)]);
  let sets: AndroidDailySet[] = [];
  let exam: AndroidWidgetExam | null = null;
  try { sets = rawSets ? JSON.parse(rawSets) : []; } catch { /* 빈 위젯 */ }
  try { exam = rawExam ? JSON.parse(rawExam) : null; } catch { /* 배너 없음 */ }
  return {sets, exam};
}

/** 로컬 날짜 시드(YYYYMMDD) — 아이폰 위젯과 같은 규칙 */
export function dateSeed(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** 그날 세트 — 없으면 남아 있는 것 중 마지막(앱을 오래 안 열어도 빈칸 대신) */
export function setForToday(sets: AndroidDailySet[], now = new Date()): AndroidDailySet | null {
  const seed = dateSeed(now);
  return sets.find(s => s.seed === seed) ?? sets[sets.length - 1] ?? null;
}

const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
/** 'YYYY-MM-DD'(또는 ISO) → 그날 자정 */
const parseDay = (s: string) => {
  const m = s.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
/** 접수 시작 시각 — 날짜만 오면 09:00(아이폰 위젯·알림과 같은 규칙) */
const parseRegistration = (s: string) => {
  if (!s) return null;
  if (s.length > 10) { const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d; }
  const d = parseDay(s); if (d) d.setHours(9, 0, 0, 0); return d;
};

/**
 * D-day 배너 문구 — 접수 전이면 '○○ 접수', 아니면 시험 라벨. 지났으면 null.
 * (안드로이드 위젯은 초 단위로 다시 그릴 수 없어 아이폰의 접수 타이머는 없다)
 */
export function examBanner(exam: AndroidWidgetExam | null, now = new Date()): {label: string; dday: string} | null {
  if (!exam) return null;
  const reg = parseRegistration(exam.registrationStart);
  const regPending = !!reg && reg.getTime() > now.getTime();
  const target = regPending ? reg : parseDay(exam.examDate);
  if (!target) return null;
  const days = Math.round((dayStart(target) - dayStart(now)) / 86400000);
  if (days < 0) return null;
  const label = regPending ? (exam.label ? `${exam.label} 접수` : '접수') : exam.label;
  return {label, dday: days === 0 ? 'D-day' : `D-${days}`};
}
