import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchExamSchedules} from '@utils/examSchedules';
import {getExamTypes, toExamType, type ExamType} from '@constants/examTypes';
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
          label: labelByType[toExamType(upcoming.examType)] ?? t('examNotifications.defaultExamLabel'),
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
