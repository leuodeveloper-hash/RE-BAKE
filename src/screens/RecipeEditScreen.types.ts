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
  /** 묶음 타이머("40분" 등) */
  timer?: string;
  /** 요약 한 줄 + 요약할 때의 과정 표시(바뀌면 '확인') */
  summary?: string;
  summarySig?: string;
  /** 이 묶음의 "한번에 쓰기" 모드 여부 */
  bulkMode: boolean;
  /** bulkMode일 때의 텍스트(과정 줄바꿈 나열) */
  bulkText: string;
}

export interface RecipeEditScreenProps {
  /**
   * 새로 만들 때 처음 채우는 방법 — 하단 탭 [+] 시트에서 넘어온다.
   * paste: 시트에서 확인한 글(텍스트·사진 글자)을 적용 / url: 원본 링크 칸을 열어 가져오기
   */
  initialInput?: 'paste' | 'url';
  onClose?: () => void;
  /** 저장된 레시피 id — 이전 버전 기록을 찾는다 */
  recipeId?: string;
  /** 이전 버전 고름 — 부르는 쪽이 그 판을 레시피에 넣고 편집 화면을 다시 연다 */
  onLoadVersion?: (version: import('../types/recipe').Recipe) => void;
  /** ⋮ '옆에 띄우기' — 다른 레시피를 옆 칸에 보기 전용으로 */
  onOpenSide?: () => void;
  onSave?: (data: {
    title: string;
    cookbook?: string;
    method?: string;
    specificGravity?: string;
    time?: string;
    servings?: string;
    doughTemp?: string;
    divideWeight?: string;
    session?: string;
    ingredientGroups: {title: string; ingredients: {name: string; amount: string}[]}[];
    toolGroups: {title: string; tools: {name: string}[]}[];
    stepGroups: {title: string; steps: {step: number; description: string; tip?: string; caution?: string; photos?: (string | StepPhoto)[]}[]}[];
    activeFieldIds: string[];
    reviews?: ReviewData[];
    description?: string;
    advice?: string;
    advicePhotos?: string[];
    kind?: 'recipe' | 'tip';
    imageUri?: string;
    /** 추가 상단 이미지(대표 뒤로 최대 2장) */
    imageUris?: string[];
    referenceUrl?: string;
    sourceUrl?: string;
    hidden?: boolean;
  }, opts?: {stay?: boolean}) => void | Promise<void>;
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
    stepGroups?: {title: string; timer?: string; summary?: string; summarySig?: string; steps: {step: number; description: string; tip?: string; caution?: string; photos?: (string | StepPhoto)[]}[]}[];
    activeFieldIds?: string[];
    imageUri?: string;
    /** 추가 상단 이미지(대표 뒤로 최대 2장) */
    imageUris?: string[];
    /** 만든 시각 — 회고는 만든 뒤에만 쓸 수 있다 */
    madeAt?: string;
    reviews?: ReviewData[];
    description?: string;
    advice?: string;
    advicePhotos?: string[];
    kind?: 'recipe' | 'tip';
    time?: string;
    servings?: string;
    doughTemp?: string;
    divideWeight?: string;
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
  /** 재료·과정을 한번에 쓰기로 열기 */
  initialBulk?: boolean;
  /** 생성 시 초기 레시피 북 */
  initialCookbook?: string;
  /** 둘러보기(공식) 레시피 편집 모드 */
  isExplore?: boolean;
  /** 레시피 북 삭제 콜백 */
  onDeleteCookbook?: (name: string) => void;
}
