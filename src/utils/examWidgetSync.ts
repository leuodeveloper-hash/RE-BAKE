import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchExamSchedules} from '@utils/examSchedules';
import {getExamTypes, toExamType, scheduleExamLabel, type ExamType} from '@constants/examTypes';
import {translate, deviceLanguage} from '../i18n';

const APP_GROUP = 'group.com.bakle.app';
const WIDGET_NAME = 'BakleWidget';
const PREFS_KEY = 'examNotificationPrefs';

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
    // 알림 설정을 그대로 따른다 — 끄면 위젯 배너도 사라진다
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    const prefs = raw ? JSON.parse(raw) : null;
    const targets: ExamType[] = prefs?.enabled ? (prefs.targets ?? []) : [];

    let payload: ExamWidgetData | null = null;

    if (targets.length > 0) {
      const schedules = await fetchExamSchedules(targets);
      const labelByType = Object.fromEntries(getExamTypes(t).map(e => [e.id, e.label]));
      const now = Date.now();

      // 아직 지나지 않은 시험 중 가장 가까운 것
      const upcoming = schedules
        .filter(s => {
          const d = new Date(s.examDate);
          return !Number.isNaN(d.getTime()) && d.getTime() > now;
        })
        .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())[0];

      if (upcoming) {
        payload = {
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
    // 대상이 없으면 빈 문자열 — 위젯은 이걸 보고 배너를 감춘다
    WidgetStorage.setString('upcomingExam', payload ? JSON.stringify(payload) : '', APP_GROUP);
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
  WidgetStorage.setString('upcomingExam', payload ? JSON.stringify(payload) : '', APP_GROUP);
  WidgetStorage.reloadWidget(WIDGET_NAME);
}

/** 미리보기를 끝내고 실제 시험 일정으로 되돌린다 */
export async function restoreExamWidget(): Promise<void> {
  await syncExamWidget();
}
