import {collection, getDocs, query, where} from 'firebase/firestore';
import {db} from '@config/firebase';
import {EXAM_TYPE_IDS, type ExamType} from '@constants/examTypes';

/**
 * Firestore exam_schedules 컬렉션 스키마:
 * {
 *   examType: 'baking_practical' | 'baking_written' | 'pastry_practical' | 'pastry_written',
 *   round: '2026년 1회' 등 회차 라벨,
 *   registrationStart: ISO date string (접수 시작일),
 *   examDate: ISO date string (시험일),
 *   resultDate: ISO date string (결과 발표일),
 * }
 */
export interface ExamSchedule {
  id: string;
  examType: ExamType;
  round: string;
  registrationStart: string;
  examDate: string;
  resultDate: string;
}

export async function fetchExamSchedules(
  targets: ExamType[],
  includePast = false,
): Promise<ExamSchedule[]> {
  if (targets.length === 0) return [];
  const now = new Date().toISOString();
  const result: ExamSchedule[] = [];
  // examType 단일 in 필터만 사용 (Firestore in은 10개 제한 — examType 최대 4개라 안전).
  // examDate 범위까지 같이 걸면 복합 인덱스가 필요해 인덱스 미설정 시 쿼리가 throw →
  // 스케줄이 조용히 0개로 등록됨. 미래 일정 필터는 클라이언트에서 처리해 인덱스 의존 제거.
  const q = query(
    collection(db, 'exam_schedules'),
    where('examType', 'in', targets),
  );
  try {
    const snap = await getDocs(q);
    snap.forEach(doc => {
      const data = doc.data() as Omit<ExamSchedule, 'id'>;
      if (includePast || data.examDate >= now) result.push({id: doc.id, ...data}); // 알림용은 지난 시험 제외
    });
  } catch (e) {
    // Firestore 권한/네트워크/인덱스 에러 — 무음 실패하면 원인 파악이 안 되므로 로그
    console.warn('[examSchedules] fetchExamSchedules 실패:', e);
  }
  return result;
}

/** 전체 시험 유형의 다가오는 일정을 시험일 오름차순으로 반환 (알림 설정 여부와 무관, 안내용) */
export async function fetchAllUpcomingSchedules(): Promise<ExamSchedule[]> {
  const all = await fetchExamSchedules(EXAM_TYPE_IDS);
  return all.sort((a, b) => a.examDate.localeCompare(b.examDate));
}

/** 전체 시험 유형의 지난 일정 포함 전체를 시험일 오름차순으로 반환 (시험일정 화면용) */
export async function fetchAllSchedules(): Promise<ExamSchedule[]> {
  const all = await fetchExamSchedules(EXAM_TYPE_IDS, true);
  return all.sort((a, b) => a.examDate.localeCompare(b.examDate));
}
