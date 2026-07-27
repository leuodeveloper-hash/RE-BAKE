/**
 * 기능사 시험 알림 유형.
 * 큐넷 기능사 정기 시험일정은 종목(제과/제빵) 무관 동일하므로, 사용자에겐 실기/필기
 * 2개 맥락만 노출한다. 다만 Firestore의 exam_schedules 문서 examType은 여전히
 * 종목별 4종(baking_/pastry_ × practical/written)이라, 알림 조회 시 아래 매핑으로
 * 실기 = baking_practical + pastry_practical (필기도 동일)을 함께 가져온다.
 */
export type ExamType = 'practical' | 'written';

export const EXAM_TYPE_IDS: ExamType[] = ['practical', 'written'];

/** Firestore exam_schedules 문서의 examType 값 (종목별 4종) */
export type ScheduleExamType =
  | 'baking_practical'
  | 'baking_written'
  | 'pastry_practical'
  | 'pastry_written';

export const SCHEDULE_EXAM_TYPE_IDS: ScheduleExamType[] = [
  'baking_practical',
  'baking_written',
  'pastry_practical',
  'pastry_written',
];

/** 알림 유형(실기/필기) → Firestore examType 목록 (종목 공통이라 둘 다 포함) */
export const SCHEDULE_TYPES_FOR: Record<ExamType, ScheduleExamType[]> = {
  practical: ['baking_practical', 'pastry_practical'],
  written: ['baking_written', 'pastry_written'],
};

/** Firestore examType → 알림 유형(실기/필기) */
export function toExamType(scheduleType: string): ExamType {
  return scheduleType.endsWith('practical') ? 'practical' : 'written';
}

export const getExamTypes = (
  t: (key: string) => string,
): {id: ExamType; label: string}[] => [
  {id: 'practical', label: t('examTypes.practical')},
  {id: 'written', label: t('examTypes.written')},
];
