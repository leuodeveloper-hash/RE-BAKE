import type {Recipe} from './recipe';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

/**
 * 둘러보기 공개 신청 — 유저가 자기 레시피를 둘러보기에 올려달라고 제출한 것.
 * 어드민이 검토해 승인하면 explore_recipes로 이동(작성자는 유저 본인 유지), 반려하면 사유와 함께 남는다.
 *
 * Firestore 최상위 컬렉션 `submissions/{id}` (어드민이 전체 대기 목록을 status로 쿼리).
 */
export interface Submission extends Recipe {
  /** 작성자(유저) — 승인돼도 authorId는 유저 본인 uid 유지 */
  authorId: string;
  authorHandle?: string;
  authorAvatarSeed?: string;
  status: SubmissionStatus;
  /** 신청 시각 ISO */
  submittedAt: string;
  /** 검토(승인/반려) 시각 ISO */
  reviewedAt?: string;
  /** 반려 사유 */
  rejectReason?: string;
  /** 원본 내 레시피 id — 중복 신청 방지·상태 역표시용 */
  sourceRecipeId?: string;
}
