import type {IngredientGroup, Step, StepGroup} from '../types/recipe';

/** 비교 기준이 되는 1회차 원본 데이터 */
export interface SessionBaseline {
  ingredientGroups?: IngredientGroup[];
  steps?: Step[];
  stepGroups?: StepGroup[];
  method?: string;
  specificGravity?: string;
}

/** 현재(2회차+) 레시피에서 비교에 필요한 필드 */
export interface SessionDiffSource {
  ingredientGroups?: IngredientGroup[];
  steps?: Step[];
  stepGroups?: StepGroup[];
  method?: string;
  specificGravity?: string;
}

export type IngredientStatus = 'added' | 'changed' | 'same';

export interface SessionDiff {
  /** 재료명(trim) → 상태 */
  ingredientStatus: Map<string, {status: IngredientStatus; prevAmount?: string}>;
  /** 1회차엔 있었지만 현재 회차엔 없는 재료 */
  removed: {name: string; amount: string}[];
  /** 평탄화한 스텝 인덱스 → 변경/추가 (same은 저장 안 함) */
  stepStatus: Map<number, 'added' | 'changed'>;
  methodChanged: boolean;
  specificGravityChanged: boolean;
}

const norm = (s: string | undefined) => (s ?? '').trim();
const normAmount = (s: string | undefined) => norm(s).replace(/\s+/g, '');

function flattenIngredients(groups?: IngredientGroup[]): {name: string; amount: string}[] {
  if (!groups) return [];
  const out: {name: string; amount: string}[] = [];
  for (const g of groups) for (const ing of g.ingredients) out.push({name: norm(ing.name), amount: ing.amount});
  return out;
}

function flattenSteps(steps?: Step[], stepGroups?: StepGroup[]): string[] {
  if (stepGroups && stepGroups.length > 0) return stepGroups.flatMap(g => g.steps.map(s => norm(s.description)));
  if (steps) return steps.map(s => norm(s.description));
  return [];
}

/** 현재 회차를 1회차(baseline)와 비교한 diff를 만든다 */
export function buildSessionDiff(current: SessionDiffSource, baseline: SessionBaseline): SessionDiff {
  const curIng = flattenIngredients(current.ingredientGroups);
  const baseIng = flattenIngredients(baseline.ingredientGroups);

  const baseMap = new Map<string, string>();
  for (const ing of baseIng) if (ing.name) baseMap.set(ing.name, ing.amount);

  const ingredientStatus = new Map<string, {status: IngredientStatus; prevAmount?: string}>();
  const curNames = new Set<string>();
  for (const ing of curIng) {
    if (!ing.name) continue;
    curNames.add(ing.name);
    if (!baseMap.has(ing.name)) {
      ingredientStatus.set(ing.name, {status: 'added'});
    } else {
      const prev = baseMap.get(ing.name)!;
      if (normAmount(prev) !== normAmount(ing.amount)) {
        ingredientStatus.set(ing.name, {status: 'changed', prevAmount: prev});
      } else {
        ingredientStatus.set(ing.name, {status: 'same'});
      }
    }
  }
  const removed = baseIng.filter(ing => ing.name && !curNames.has(ing.name));

  const curSteps = flattenSteps(current.steps, current.stepGroups);
  const baseSteps = flattenSteps(baseline.steps, baseline.stepGroups);
  const stepStatus = new Map<number, 'added' | 'changed'>();
  curSteps.forEach((desc, i) => {
    if (i >= baseSteps.length) stepStatus.set(i, 'added');
    else if (desc !== baseSteps[i]) stepStatus.set(i, 'changed');
  });

  const methodChanged =
    norm(current.method) !== norm(baseline.method) &&
    (norm(current.method) !== '' || norm(baseline.method) !== '');
  const specificGravityChanged =
    norm(current.specificGravity) !== norm(baseline.specificGravity) &&
    (norm(current.specificGravity) !== '' || norm(baseline.specificGravity) !== '');

  return {ingredientStatus, removed, stepStatus, methodChanged, specificGravityChanged};
}
