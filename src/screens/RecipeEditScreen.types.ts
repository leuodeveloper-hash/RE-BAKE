/**
 * 레시피 편집 화면에서 쓰는 편집용 타입.
 *
 * 저장 형태(types/recipe.ts)와 다르다 — 편집 중에는 행마다 id가 필요하고
 * (드래그·포커스 대상 식별), 분량도 "600g"이 아니라 {amount, unit}으로 쪼개 둔다.
 */
import type {ReviewData} from '@components/Dialog';
import type {AvatarColor} from '@components/Avatar/Avatar';
import type {StepPhoto} from '../types/recipe';

export interface EditableIngredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

export interface EditableStep {
  id: string;
  description: string;
  tip?: string;
  caution?: string;
  photos?: StepPhoto[];
}

export interface IngredientGroup {
  id: string;
  title: string;
  ingredients: EditableIngredient[];
  /** 이 묶음의 "한번에 쓰기" 모드 여부 */
  bulkMode: boolean;
  /** bulkMode일 때의 텍스트(재료 콤마 나열) */
  bulkText: string;
}

export interface EditableTool {
  id: string;
  name: string;
}

export interface EditableToolGroup {
  id: string;
  title: string;
  tools: EditableTool[];
  /** 이 묶음의 "한번에 쓰기" 모드 여부 */
  bulkMode: boolean;
  /** bulkMode일 때의 텍스트(도구 콤마 나열) */
  bulkText: string;
}

export interface StepGroup {
  id: string;
  title: string;
  steps: EditableStep[];
  /** 이 묶음의 "한번에 쓰기" 모드 여부 */
  bulkMode: boolean;
  /** bulkMode일 때의 텍스트(과정 줄바꿈 나열) */
  bulkText: string;
}

export interface RecipeEditScreenProps {
  onClose?: () => void;
  onSave?: (data: {
    title: string;
    cookbook?: string;
    method?: string;
    specificGravity?: string;
    time?: string;
    servings?: string;
    session?: string;
    ingredientGroups: {title: string; ingredients: {name: string; amount: string}[]}[];
    toolGroups: {title: string; tools: {name: string}[]}[];
    stepGroups: {title: string; steps: {step: number; description: string; tip?: string; caution?: string; photos?: (string | StepPhoto)[]}[]}[];
    activeFieldIds: string[];
    reviews?: ReviewData[];
    advice?: string;
    imageUri?: string;
    referenceUrl?: string;
    sourceUrl?: string;
    hidden?: boolean;
  }) => void | Promise<void>;
  /** 편집 시 전달되는 레시피 데이터 (없으면 빈 생성 화면) */
  recipe?: {
    title: string;
    cookbook?: string;
    method?: string;
    specificGravity?: string;
    ingredients?: {name: string; amount: string}[];
    ingredientGroups?: {title: string; ingredients: {name: string; amount: string}[]}[];
    tools?: {name: string}[];
    toolGroups?: {title: string; tools: {name: string}[]}[];
    steps?: {step: number; description: string; tip?: string; caution?: string; photos?: (string | StepPhoto)[]}[];
    stepGroups?: {title: string; steps: {step: number; description: string; tip?: string; caution?: string; photos?: (string | StepPhoto)[]}[]}[];
    activeFieldIds?: string[];
    imageUri?: string;
    reviews?: ReviewData[];
    advice?: string;
    time?: string;
    servings?: string;
    session?: string;
    referenceUrl?: string;
    sourceUrl?: string;
    hidden?: boolean;
  };
  /** 선택 가능한 레시피 북 목록 */
  cookbooks?: string[];
  /** 레시피 북별 색상 매핑 */
  cookbookColors?: Record<string, AvatarColor>;
  /** 레시피 북 색상 설정 콜백 */
  onSetCookbookColor?: (name: string, color: AvatarColor) => void;
  /** 열릴 때 스크롤할 섹션 ID (ingredients, tools, steps, review) */
  initialSection?: string;
  /** 생성 시 초기 레시피 북 */
  initialCookbook?: string;
  /** 둘러보기(공식) 레시피 편집 모드 */
  isExplore?: boolean;
  /** 레시피 북 삭제 콜백 */
  onDeleteCookbook?: (name: string) => void;
}
