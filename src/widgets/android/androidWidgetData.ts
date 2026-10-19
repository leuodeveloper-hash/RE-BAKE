import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 안드로이드 위젯 데이터 — 앱이 저장하고 위젯(백그라운드 JS)이 읽는다.
 * 아이폰은 App Group(UserDefaults)에 같은 모양으로 넣는다(widgetSync·examWidgetSync).
 */
export const ANDROID_WIDGET_NAME = 'BakleWidget';
const SETS_KEY = '@bakle_widget_daily_sets';
const EXAM_KEY = '@bakle_widget_exam';
/** 종목별 시험(제과·제빵)·내 D-day 목록·레시피북별 세트 — 위젯 설정에서 고른 것을 그린다(아이폰 위젯 편집과 같은 선택지) */
const EXAMS_KEY = '@bakle_widget_exams';
const DDAYS_KEY = '@bakle_widget_ddays';
const BOOK_SETS_KEY = '@bakle_widget_book_sets';
const cfgKey = (widgetId: number) => `@bakle_widget_cfg_${widgetId}`;

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

export type WidgetDiscipline = 'pastry' | 'baking';
export interface AndroidWidgetDday {id: string; title: string; date: string}

/** 위젯 하나의 설정 — 레시피북(''=전체)과 D-day('auto'=가까운 시험, 'exam:pastry'·'exam:baking', 그 밖은 내 D-day id) */
export interface AndroidWidgetConfig {cookbook: string; dday: string}
export const DEFAULT_WIDGET_CONFIG: AndroidWidgetConfig = {cookbook: '', dday: 'auto'};

export async function saveAndroidWidgetExtras(extras: {
  exams?: Record<WidgetDiscipline, AndroidWidgetExam | null>;
  ddays?: AndroidWidgetDday[];
  bookSets?: Record<string, AndroidDailySet[]>;
}) {
  const pairs: [string, string][] = [];
  if (extras.exams) pairs.push([EXAMS_KEY, JSON.stringify(extras.exams)]);
  if (extras.ddays) pairs.push([DDAYS_KEY, JSON.stringify(extras.ddays)]);
  if (extras.bookSets) pairs.push([BOOK_SETS_KEY, JSON.stringify(extras.bookSets)]);
  if (pairs.length) await AsyncStorage.multiSet(pairs);
}

const parse = <T,>(raw: string | null | undefined, fallback: T): T => {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};

export async function readWidgetConfig(widgetId: number): Promise<AndroidWidgetConfig> {
  const raw = await AsyncStorage.getItem(cfgKey(widgetId)).catch(() => null);
  return {...DEFAULT_WIDGET_CONFIG, ...parse<Partial<AndroidWidgetConfig>>(raw, {})};
}

export async function saveWidgetConfig(widgetId: number, cfg: AndroidWidgetConfig) {
  await AsyncStorage.setItem(cfgKey(widgetId), JSON.stringify(cfg));
}

export async function removeWidgetConfig(widgetId: number) {
  await AsyncStorage.removeItem(cfgKey(widgetId)).catch(() => {});
}

/** 설정 화면 선택지 — 앱이 저장해 둔 레시피북·내 D-day */
export async function readWidgetChoices(): Promise<{cookbooks: string[]; ddays: AndroidWidgetDday[]}> {
  const [rawBooks, rawDdays] = await Promise.all([AsyncStorage.getItem(BOOK_SETS_KEY), AsyncStorage.getItem(DDAYS_KEY)]);
  return {cookbooks: Object.keys(parse<Record<string, unknown>>(rawBooks, {})), ddays: parse<AndroidWidgetDday[]>(rawDdays, [])};
}

/** 그 위젯 설정대로 그릴 데이터 — 고른 북 세트가 없으면 전체, 고른 D-day가 없으면 배너 없음 */
export async function readAndroidWidgetData(cfg: AndroidWidgetConfig = DEFAULT_WIDGET_CONFIG): Promise<{sets: AndroidDailySet[]; exam: AndroidWidgetExam | null}> {
  const [[, rawSets], [, rawExam], [, rawExams], [, rawDdays], [, rawBooks]] =
    await AsyncStorage.multiGet([SETS_KEY, EXAM_KEY, EXAMS_KEY, DDAYS_KEY, BOOK_SETS_KEY]);
  const all = parse<AndroidDailySet[]>(rawSets, []);
  const book = cfg.cookbook ? parse<Record<string, AndroidDailySet[]>>(rawBooks, {})[cfg.cookbook] : undefined;
  const sets = book?.length ? book : all;

  let exam: AndroidWidgetExam | null;
  if (cfg.dday === 'auto') exam = parse<AndroidWidgetExam | null>(rawExam, null);
  else if (cfg.dday.startsWith('exam:')) {
    exam = parse<Record<string, AndroidWidgetExam | null>>(rawExams, {})[cfg.dday.slice(5)] ?? null;
  } else {
    const d = parse<AndroidWidgetDday[]>(rawDdays, []).find(x => x.id === cfg.dday);
    exam = d ? {examDate: d.date, label: d.title, round: '', registrationStart: ''} : null;
  }
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
