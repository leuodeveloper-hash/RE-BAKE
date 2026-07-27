export interface IngredientGroup {
  title: string;
  ingredients: {name: string; amount: string}[];
}

/** 스텝 사진 1장 — URI + 선택적 캡션(사진 설명). 구버전 데이터는 문자열(uri)일 수 있어 정규화 필요. */
export interface StepPhoto {
  uri: string;
  caption?: string;
}

export interface Step {
  step: number;
  description: string;
  tip?: string;
  caution?: string;
  /** 사진 (최대 3장). 구버전은 string[] → normalizeStepPhotos로 흡수. */
  photos?: (string | StepPhoto)[];
}

export interface StepGroup {
  title: string;
  steps: Step[];
}

export interface ToolGroup {
  title: string;
  tools: {name: string}[];
}

import type {ReviewData} from '../components/Dialog/ReviewDialog';

export interface Recipe {
  id: string;
  title: string;
  cookbook: string;
  method: string;
  specificGravity?: string;
  ratio?: string;
  reviewCount: number;
  /** 이미지 URI (Firebase Storage URL 또는 로컬 URI) */
  imageUri?: string;
  time?: string;
  servings?: string;
  session?: string;
  ingredientGroups?: IngredientGroup[];
  tools?: {name: string}[];
  toolGroups?: ToolGroup[];
  steps?: Step[];
  stepGroups?: StepGroup[];
  activeFieldIds?: string[];
  reviews?: ReviewData[];
  /** 베이키의 조언 (어드민 전용 입력 필드) */
  advice?: string;
  /** 베이키의 조언 사진 (최대 3장) */
  advicePhotos?: string[];
  /** 둘러보기에서 가져온 경우 원본 레시피 ID (복사·회차해도 출처로 유지) */
  sourceId?: string;
  /** 원본(둘러보기) 작성자 핸들 — 복사/회차로 내 것이 돼도 "from @핸들" 출처 표시용 박제 */
  sourceHandle?: string;
  /** 원본(둘러보기) 작성자 id — 출처 탭 시 작성자 홈으로 */
  sourceAuthorId?: string;
  /** 참고 링크 URL (유튜브, 블로그 등) */
  referenceUrl?: string;
  /** 원본 링크 URL — 외부 사이트(만개의레시피 등)에서 가져온 레시피의 출처 */
  sourceUrl?: string;
  /** 다시 만들기 회차 그룹 식별자 */
  remakeGroupId?: string;
  /** 생성 시각 (ISO 문자열) */
  createdAt?: string;
  /** 소프트 삭제 시각 (ISO 문자열). 24시간 후 영구 삭제 */
  deletedAt?: string;
  /** 공식(둘러보기) 전용: 숨김 — 어드민(개발자)만 보이고 다른 유저에겐 노출 안 됨. 개발 중 콘텐츠 가림용. */
  hidden?: boolean;
  /**
   * 작성자 ID — 계정(uid)이 아니라 논리적 작성자(authors/{authorId}).
   * 공식 콘텐츠는 "baeki"(여러 어드민이 공동소유), 유저는 각자 authorId.
   * 계정이 소멸/이전돼도 이 값은 불변 → 레시피가 authorId에 묶여 안전.
   */
  authorId?: string;
  /** 작성자 영문 handle 스냅샷 (URL·아이디) */
  authorHandle?: string;
  /** 작성자 화면 표시 이름 스냅샷 — 칩/홈에 보이는 이름(한글 등). 없으면 handle */
  authorDisplayName?: string;
  /** 작성자 아바타 시드 스냅샷 */
  authorAvatarSeed?: string;
}

/** JSON 내보내기 파일 형식 */
export interface RecipeExportData {
  version: 1;
  exportedAt: string;
  recipes: Recipe[];
}
