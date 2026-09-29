import type {Recipe} from '../types/recipe';

/**
 * 사진이 없는 레시피의 "내용 미리보기" — 재료·도구·과정·조언을 순서대로 늘어놓는다.
 *
 * 카드(그리드·리스트)와 스탬프북이 같은 미리보기를 써야 같은 레시피가
 * 어디서나 같은 얼굴로 보인다. 한 곳에서만 만든다.
 */
export function recipePreviewParts(recipe: Partial<Recipe>): string[] {
  const parts: string[] = [];
  recipe.ingredientGroups?.forEach(g => {
    g.ingredients.forEach(i => {
      parts.push(i.amount ? `${i.name} ${i.amount}` : i.name);
    });
  });
  recipe.toolGroups?.forEach(g => g.tools.forEach(t => parts.push(t.name)));
  recipe.tools?.forEach(t => parts.push(t.name));
  const pushStep = (s: {description?: string; tip?: string; caution?: string}) => {
    if (s.description) parts.push(s.description);
    if (s.tip) parts.push(s.tip);
    if (s.caution) parts.push(s.caution);
  };
  recipe.stepGroups?.forEach(g => g.steps.forEach(pushStep));
  recipe.steps?.forEach(pushStep);
  if (recipe.advice) parts.push(recipe.advice);
  return parts;
}
