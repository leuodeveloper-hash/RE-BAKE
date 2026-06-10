export interface IngredientGroup {
  title: string;
  ingredients: {name: string; amount: string}[];
}

export interface Step {
  step: number;
  description: string;
  tip?: string;
  caution?: string;
  /** 사진 URI (최대 3장) */
  photos?: string[];
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
  /** 둘러보기에서 가져온 경우 원본 레시피 ID */
  sourceId?: string;
  /** 참고 링크 URL (유튜브, 블로그 등) */
  referenceUrl?: string;
  /** 다시 만들기 회차 그룹 식별자 */
  remakeGroupId?: string;
  /** 생성 시각 (ISO 문자열) */
  createdAt?: string;
  /** 소프트 삭제 시각 (ISO 문자열). 24시간 후 영구 삭제 */
  deletedAt?: string;
}

/** JSON 내보내기 파일 형식 */
export interface RecipeExportData {
  version: 1;
  exportedAt: string;
  recipes: Recipe[];
}
