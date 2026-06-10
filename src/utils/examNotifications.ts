import {Platform} from 'react-native';
import type {ExamSchedule} from './examSchedules';
import {EXAM_TYPES} from '@constants/examTypes';

const LABEL_BY_TYPE = Object.fromEntries(EXAM_TYPES.map(t => [t.id, t.label]));

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
    const label = LABEL_BY_TYPE[s.examType] ?? '시험';
    const round = s.round ? ` (${s.round})` : '';

    const triggers: {date: Date; title: string; body: string}[] = [];

    const reg15Before = minutesBeforeRegistration(s.registrationStart, 15);
    if (reg15Before) {
      triggers.push({
        date: reg15Before,
        title: `${label} 접수 15분 전${round}`,
        body: '곧 접수가 열려요. 준비됐나요?',
      });
    }

    const regAt = at9am(s.registrationStart);
    if (regAt) {
      triggers.push({
        date: regAt,
        title: `${label} 접수 시작${round}`,
        body: '오늘부터 접수예요. 신청했나요?',
      });
    }

    const examMinus7 = at9am(s.examDate, -7);
    if (examMinus7) {
      triggers.push({
        date: examMinus7,
        title: `${label} 시험 1주일 전${round}`,
        body: '시험까지 일주일이에요. 준비는 잘 되고 있나요?',
      });
    }

    const examMinus1 = at9am(s.examDate, -1);
    if (examMinus1) {
      triggers.push({
        date: examMinus1,
        title: `${label} 시험 D-1${round}`,
        body: '내일이 시험이에요. 준비물 챙겼나요?',
      });
    }

    const resultAt = at9am(s.resultDate);
    if (resultAt) {
      triggers.push({
        date: resultAt,
        title: `${label} 결과 발표${round}`,
        body: '오늘 결과 발표예요. 확인했나요?',
      });
    }

    for (const t of triggers) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t.title,
          body: t.body,
          data: {kind: 'exam_schedule', scheduleId: s.id, examType: s.examType},
        },
        trigger: t.date,
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
