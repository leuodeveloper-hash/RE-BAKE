import {Platform} from 'react-native';
import {effectiveExamDate, loadChosenDates} from '@utils/examChosenDate';
import {fetchExamSchedules} from '@utils/examSchedules';
import {getExamTypes, toExamType, scheduleExamLabel} from '@constants/examTypes';
import {translate, deviceLanguage} from '../i18n';

const APP_GROUP = 'group.com.bakle.app';
const WIDGET_NAME = 'BakleWidget';

/**
 * 위젯이 고를 수 있는 종목 — 제과/제빵은 접수일이 달라 한 칸에 담으면 한쪽이 가린다.
 * 위젯 종류를 늘리는 대신(갤러리가 지저분해진다) 같은 위젯을 두 개 놓고
 * 각각 길게 눌러 종목을 고르게 한다(Swift의 ExamWidgetIntent).
 */
export const WIDGET_DISCIPLINES = ['pastry', 'baking'] as const;
export type WidgetDiscipline = (typeof WIDGET_DISCIPLINES)[number];

/** 종목별 저장 키 — Swift가 같은 이름으로 읽는다 */
const storageKey = (d: WidgetDiscipline) => `upcomingExam_${d}`;

/** 접수 시작일과 시험일 중 먼저 오는 시각 */
function nextMomentOf(e: ExamWidgetData): number {
  const times = [e.registrationStart, e.examDate]
    .map(v => (v ? new Date(v).getTime() : NaN))
    .filter(v => !Number.isNaN(v) && v > Date.now());
  return times.length > 0 ? Math.min(...times) : Infinity;
}
const t = (key: string, params?: Record<string, string | number>) =>
  translate(deviceLanguage(), key, params);

/**
 * 위젯에 넘길 "다가오는 시험" 한 건.
 * 위젯(Swift)이 매일 스스로 D-day를 다시 계산할 수 있도록 날짜를 그대로 넘긴다.
 * (남은 일수를 미리 계산해 넣으면 앱을 안 열면 숫자가 멈춘다)
 */
interface ExamWidgetData {
  /** 'YYYY-MM-DD' — 위젯이 이 날짜로 D-day를 계산한다 */
  examDate: string;
  /** '제과 실기' 등 표시용 라벨 */
  label: string;
  /** '2026년 1회' 등 회차 */
  round: string;
  /** 접수 시작일 — 접수 전이면 이쪽을 먼저 알린다 */
  registrationStart: string;
}

/**
 * 사용자가 알림에서 고른 종목 중 가장 가까운 시험을 위젯에 저장한다.
 *
 * 알림과 같은 설정·같은 데이터를 쓴다. 알림은 정해진 시각에 한 번 울리고 끝이지만,
 * 위젯은 홈 화면에서 D-day를 계속 보여주므로 "며칠 남았는지"를 항상 알 수 있다.
 */
export async function syncExamWidget(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    // 위젯은 알림 설정과 무관하다 — 홈 화면에 올려 둔 것을 고른 사람이
    // 알림까지 켜야 보이면 "왜 안 뜨지"가 된다. 종목은 위젯 편집에서 고른다.
    const byDiscipline: Record<WidgetDiscipline, ExamWidgetData | null> = {pastry: null, baking: null};

    {
      // 실기·필기를 모두 가져온다 — 어느 쪽이든 가장 급한 일정을 보여준다
      // 필기처럼 기간이 있는 시험은 내가 고른 날을 시험일로 넘긴다(위젯은 examDate로 D-day를 센다)
      const chosen = await loadChosenDates();
      const schedules = (await fetchExamSchedules(['practical', 'written']))
        .map(s => ({...s, examDate: effectiveExamDate(s, chosen)}));
      const labelByType = Object.fromEntries(getExamTypes(t).map(e => [e.id, e.label]));
      const now = Date.now();

      /**
       * 가장 먼저 알려야 할 시험 하나.
       *
       * 시험일만 보고 고르면 안 된다 — 접수가 코앞인 시험이, 시험일이 더 이른
       * 다른 시험에 밀려 접수 D-day가 아예 안 뜬다(접수를 놓치면 시험을 못 본다).
       * 아직 오지 않은 일정(접수 시작일 또는 시험일) 중 가장 가까운 것을 기준으로 정렬한다.
       */
      const nextMoment = (s: {examDate: string; registrationStart?: string}): number => {
        const times = [s.registrationStart, s.examDate]
          .map(v => (v ? new Date(v).getTime() : NaN))
          .filter(v => !Number.isNaN(v) && v > now);
        return times.length > 0 ? Math.min(...times) : Infinity;
      };

      for (const discipline of WIDGET_DISCIPLINES) {
        const upcoming = schedules
          .filter(s => s.examType.startsWith(discipline) && nextMoment(s) !== Infinity)
          .sort((a, b) => nextMoment(a) - nextMoment(b))[0];
        if (!upcoming) continue;
        byDiscipline[discipline] = {
          examDate: upcoming.examDate,
          // 종목까지 밝힌다 — "기능사 실기"만으로는 제과인지 제빵인지 알 수 없다
          label: scheduleExamLabel(upcoming.examType, t)
            || labelByType[toExamType(upcoming.examType)]
            || t('examNotifications.defaultExamLabel'),
          round: upcoming.round ?? '',
          registrationStart: upcoming.registrationStart ?? '',
        };
      }
    }

    const WidgetStorage = require('../../modules/widget-storage').default;
    for (const discipline of WIDGET_DISCIPLINES) {
      const payload = byDiscipline[discipline];
      // 대상이 없으면 빈 문자열 — 위젯은 이걸 보고 배너를 감춘다
      WidgetStorage.setString(storageKey(discipline), payload ? JSON.stringify(payload) : '', APP_GROUP);
    }
    // 예전 단일 키도 계속 채운다 — 업데이트 전에 설치해 둔 위젯이 빈 화면이 되면 안 된다.
    // 급한 쪽(먼저 오는 일정)을 넣는다.
    const legacy = [byDiscipline.pastry, byDiscipline.baking]
      .filter(Boolean)
      .sort((a, b) => nextMomentOf(a!) - nextMomentOf(b!))[0] ?? null;
    WidgetStorage.setString('upcomingExam', legacy ? JSON.stringify(legacy) : '', APP_GROUP);

    WidgetStorage.reloadWidget(WIDGET_NAME);
  } catch (e) {
    console.warn('[examWidgetSync] 동기화 실패:', e);
  }
}

// ---------------------------------------------------------------------------
// 위젯 미리보기 (어드민 전용)
//
// 접수·시험 D-day 배너는 실제 날짜가 와야 보이므로 확인이 어렵다.
// 아래 함수로 가짜 날짜를 넣어 홈 화면 위젯이 그 상태로 그려지는지 바로 확인한다.
// 실제 시험 데이터를 덮어쓰므로, 확인이 끝나면 restoreExamWidget()으로 되돌린다.
// ---------------------------------------------------------------------------

/** 미리보기 가능한 위젯 상태 */
export type WidgetPreviewCase =
  | 'registrationTomorrow'  // 접수 D-1
  | 'registrationToday'     // 접수 당일 (타이머)
  | 'examTomorrow'          // 시험 D-1
  | 'examToday';            // 시험 당일

/** 미리보기 종목 — 배너 라벨이 종목까지 밝히므로 둘 다 확인할 수 있어야 한다 */
export type PreviewDiscipline = 'pastry' | 'baking';

/** 오늘 기준 n일 뒤 'YYYY-MM-DD' */
function dayOffset(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * 위젯에 미리보기용 가짜 시험 데이터를 넣고 즉시 새로고침한다.
 * 홈 화면으로 나가면 해당 상태의 배너가 보인다.
 */
export function previewExamWidget(
  kind: WidgetPreviewCase,
  discipline: PreviewDiscipline = 'pastry',
): void {
  if (Platform.OS !== 'ios') return;

  let payload: ExamWidgetData | null = null;
  // 실제와 같은 형태로 — 종목까지 보여야 배너 폭/줄바꿈을 제대로 확인할 수 있다
  const label = t(`examTypes.${discipline}_practical`);
  const round = '2026년 1회';

  switch (kind) {
    case 'registrationTomorrow':
      // 접수가 내일 → "접수 D-1"
      payload = {examDate: dayOffset(40), label, round, registrationStart: dayOffset(1)};
      break;
    case 'registrationToday': {
      // "오늘 접수 + 타이머". 날짜만 넣으면 위젯이 09:00으로 보는데, 이미 09시가 지났으면
      // 접수가 시작된 것으로 처리돼 타이머가 안 나온다(미리보기에서 타이머가 안 보이던 이유).
      // → 2시간 뒤 시각을 ISO로 직접 넣어 항상 카운트다운이 보이게 한다.
      const soon = new Date(Date.now() + 2 * 60 * 60 * 1000);
      payload = {examDate: dayOffset(35), label, round, registrationStart: soon.toISOString()};
      break;
    }
    case 'examTomorrow':
      // 접수는 지났고 시험이 내일 → "<라벨> D-1"
      payload = {examDate: dayOffset(1), label, round, registrationStart: dayOffset(-30)};
      break;
    case 'examToday':
      // 시험이 오늘 → "<라벨> 오늘"
      payload = {examDate: dayOffset(0), label, round, registrationStart: dayOffset(-30)};
      break;
  }

  const WidgetStorage = require('../../modules/widget-storage').default;
  // 위젯이 고른 종목의 키를 읽으므로 그 자리에 넣어야 실제와 같은 경로로 확인된다.
  // 어느 종목을 골라 뒀든 보이도록 양쪽 + 예전 단일 키까지 채운다.
  const raw = JSON.stringify(payload);
  for (const d of WIDGET_DISCIPLINES) WidgetStorage.setString(storageKey(d), raw, APP_GROUP);
  WidgetStorage.setString('upcomingExam', raw, APP_GROUP);
  WidgetStorage.reloadWidget(WIDGET_NAME);
}

/** 미리보기를 끝내고 실제 시험 일정으로 되돌린다 */
export async function restoreExamWidget(): Promise<void> {
  await syncExamWidget();
}

// ---------------------------------------------------------------------------
// 위젯 설치 여부
// ---------------------------------------------------------------------------

/**
 * 설치된 우리 위젯 개수. **null은 "알 수 없음"** — 0과 구분할 것.
 * 설치 안내·상태 표시에 쓴다.
 */
export async function getInstalledWidgetCount(): Promise<number | null> {
  if (Platform.OS !== 'ios') return 0;
  try {
    const WidgetStorage = require('../../modules/widget-storage').default;
    const res = await WidgetStorage.getInstalledWidgets();
    if (!res?.supported) return 0;
    if (res.installed === null) return null;  // 조회 실패 — 모른다
    return res.widgets.filter((w: {kind: string}) => w.kind === WIDGET_NAME).length;
  } catch (e) {
    // 네이티브 모듈 없음(구버전 앱·웹) 또는 조회 실패 — 0으로 단정하지 않는다
    console.warn('[examWidgetSync] 위젯 개수 확인 실패:', e);
    return null;
  }
}
