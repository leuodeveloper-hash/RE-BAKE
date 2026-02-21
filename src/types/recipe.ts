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
  steps?: Step[];
  stepGroups?: StepGroup[];
  activeFieldIds?: string[];
  reviews?: {evaluation: string; improvement: string}[];
  /** 둘러보기에서 가져온 경우 원본 레시피 ID */
  sourceId?: string;
  /** 다시 만들기 회차 그룹 식별자 */
  remakeGroupId?: string;
  /** 생성 시각 (ISO 문자열) */
  createdAt?: string;
}

/** JSON 내보내기 파일 형식 */
export interface RecipeExportData {
  version: 1;
  exportedAt: string;
  recipes: Recipe[];
}
