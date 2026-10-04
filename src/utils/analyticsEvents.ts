/**
 * 기록하는 이벤트 목록 — 이름은 '대상_동작'. 여기 없는 이름은 track()에 못 넘긴다(오타·중복 방지).
 * 개인정보·입력 내용(레시피 글, 이메일, 문의 내용)은 절대 넣지 않는다. 종류·개수·경로만.
 */
export interface AnalyticsEvents {
  /** 대표 지표 — 만들었어요 스탬프 */
  bake_logged: {recipe_kind?: 'recipe' | 'tip'};
  /** 대표 지표 — 회고 저장(사진 있는지만) */
  review_written: {has_photo: boolean};
}

export type AnalyticsEventName = keyof AnalyticsEvents;
