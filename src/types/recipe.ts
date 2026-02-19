import type {IngredientGroup, Step, StepGroup} from '@data/mockRecipes';

/** AsyncStorage / JSON 직렬화 가능한 레시피 타입 (imageSource 제외) */
export interface SerializableRecipe {
  id: string;
  title: string;
  cookbook: string;
  method: string;
  ratio?: string;
  reviewCount: number;
  /** 사용자가 선택한 이미지 URI */
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
  /** 생성 시각 (ISO 문자열) */
  createdAt?: string;
}

/** JSON 내보내기 파일 형식 */
export interface RecipeExportData {
  version: 1;
  exportedAt: string;
  recipes: SerializableRecipe[];
}
