import {Platform} from 'react-native';
import type {ExamSchedule} from './examSchedules';
import {getExamTypes, toExamType} from '@constants/examTypes';
import {translate, deviceLanguage} from '../i18n';

const t = (key: string, params?: Record<string, string | number>) =>
  translate(deviceLanguage(), key, params);

// 알림 유형(실기/필기) → 라벨. Firestore examType(baking_practical 등)은 toExamType으로 매핑.
const LABEL_BY_TYPE = Object.fromEntries(getExamTypes(t).map(e => [e.id, e.label]));

/**
 * 시험 일정 기반 로컬 알림 스케줄링.
 * - 5가지 타이밍: 접수 시작 15분 전 / 접수 시작일 9시 / 시험 D-7 9시 / 시험 D-1 9시 / 결과 발표일 9시
 * - 접수 시작 15분 전: registrationStart가 시각까지 포함된 경우 그 시각 기준, 아니면 09:00 기준으로 08:45에 띄움
 * - 웹은 미지원이므로 no-op
 * - 매번 호출 시 기존 시험 관련 알림 모두 취소 후 재등록 (멱등)
 */
export async function scheduleExamNotifications(schedules: ExamSchedule[]): Promise<void> {
  if (Platform.OS === 'web') return;

  const Notifications = require('expo-notifications');

  // 권한 확인
  const settings = await Notifications.getPermissionsAsync();
  if (settings.status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    if (req.status !== 'granted') return;
  }

  // 기존 시험 알림 모두 취소 (categoryIdentifier로 구분)
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n: any) => n.content?.data?.kind === 'exam_schedule')
      .map((n: any) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const now = Date.now();
  const at9am = (iso: string, offsetDays = 0): Date | null => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + offsetDays);
    d.setHours(9, 0, 0, 0);
    return d.getTime() > now ? d : null;
  };

  // 접수 시작 시각 기준 N분 전. registrationStart가 시각까지 포함하면 그 시각을 사용,
  // 날짜만 있으면 09:00을 기준으로 잡음.
  const minutesBeforeRegistration = (iso: string, minutesBefore: number): Date | null => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    // 시·분·초가 모두 0이면 시각 정보가 없는 날짜만 들어온 것으로 간주 → 09:00 기준
    if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
      d.setHours(9, 0, 0, 0);
    }
    d.setMinutes(d.getMinutes() - minutesBefore);
    return d.getTime() > now ? d : null;
  };

  for (const s of schedules) {
    const label = LABEL_BY_TYPE[toExamType(s.examType)] ?? t('examNotifications.defaultExamLabel');
    const round = s.round ? ` (${s.round})` : '';

    const triggers: {date: Date; title: string; body: string}[] = [];

    const reg15Before = minutesBeforeRegistration(s.registrationStart, 15);
    if (reg15Before) {
      triggers.push({
        date: reg15Before,
        title: t('examNotifications.registration15minTitle', {label, round}),
        body: t('examNotifications.registration15minBody'),
      });
    }

    const regAt = at9am(s.registrationStart);
    if (regAt) {
      triggers.push({
        date: regAt,
        title: t('examNotifications.registrationStartTitle', {label, round}),
        body: t('examNotifications.registrationStartBody'),
      });
    }

    const examMinus7 = at9am(s.examDate, -7);
    if (examMinus7) {
      triggers.push({
        date: examMinus7,
        title: t('examNotifications.examWeekBeforeTitle', {label, round}),
        body: t('examNotifications.examWeekBeforeBody'),
      });
    }

    const examMinus1 = at9am(s.examDate, -1);
    if (examMinus1) {
      triggers.push({
        date: examMinus1,
        title: t('examNotifications.examDayBeforeTitle', {label, round}),
        body: t('examNotifications.examDayBeforeBody'),
      });
    }

    const resultAt = at9am(s.resultDate);
    if (resultAt) {
      triggers.push({
        date: resultAt,
        title: t('examNotifications.resultTitle', {label, round}),
        body: t('examNotifications.resultBody'),
      });
    }

    for (const t of triggers) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t.title,
          body: t.body,
          data: {kind: 'exam_schedule', scheduleId: s.id, examType: s.examType},
        },
        // expo-notifications(SDK54)는 trigger에 type이 없으면 거부한다.
        // Date를 그냥 넘기면 hasValidTriggerObject에서 TypeError → 스케줄 등록 실패.
        // 반드시 {type:'date', date} 형태로 넘길 것.
        trigger: {type: 'date', date: t.date},
      });
    }
  }
}

/** 알림 비활성화 시 모든 시험 알림 취소 */
export async function cancelAllExamNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  const Notifications = require('expo-notifications');
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n: any) => n.content?.data?.kind === 'exam_schedule')
      .map((n: any) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
