import type {IngredientGroup, Step, StepGroup} from '@data/mockRecipes';

/** AsyncStorage / JSON 직렬화 가능한 레시피 타입 (imageSource 제외) */
export interface SerializableRecipe {
  id: string;
  title: string;
  category: string;
  method: string;
  ratio?: string;
  reviewCount: number;
  time?: string;
  servings?: string;
  session?: string;
  ingredientGroups?: IngredientGroup[];
  tools?: {name: string}[];
  steps?: Step[];
  stepGroups?: StepGroup[];
  activeFieldIds?: string[];
}

/** JSON 내보내기 파일 형식 */
export interface RecipeExportData {
  version: 1;
  exportedAt: string;
  recipes: SerializableRecipe[];
}
