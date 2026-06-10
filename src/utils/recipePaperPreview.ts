import type {Recipe} from '../types/recipe';

/**
 * 레시피 종이(StackedThumbnail paper)에 채울 미리보기 텍스트 조각들.
 * RecipeListTemplate의 paperPreview 빌더와 동일 규칙 (재료 → 도구 → 스텝 → 조언).
 */
export function buildPaperPreview(r: Recipe): string[] {
  const parts: string[] = [];
  r.ingredientGroups?.forEach(g =>
    g.ingredients.forEach(i => parts.push(i.amount ? `${i.name} ${i.amount}` : i.name)),
  );
  r.toolGroups?.forEach(g => g.tools.forEach(t => parts.push(t.name)));
  r.tools?.forEach(t => parts.push(t.name));
  const pushStep = (s: {description?: string; tip?: string; caution?: string}) => {
    if (s.description) parts.push(s.description);
    if (s.tip) parts.push(s.tip);
    if (s.caution) parts.push(s.caution);
  };
  r.stepGroups?.forEach(g => g.steps.forEach(pushStep));
  r.steps?.forEach(pushStep);
  if (r.advice) parts.push(r.advice);
  return parts;
}
