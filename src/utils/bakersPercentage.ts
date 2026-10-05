/**
 * 베이커스 퍼센티지 — 상세·PDF 공용.
 * 밀가루 전체가 100%다. 밀가루가 없는 배합엔 표시하지 않는다(임의 재료를 100%로 잡아 봐야 의미 없는 숫자).
 */
type IngredientLike = {name: string; amount: string};
type GroupLike = {ingredients: IngredientLike[]};

export function parseAmountGrams(amount: string): number {
  const match = amount.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function formatPercentage(value: number): string {
  if (value === 0) return '-';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

const FLOUR_KEYWORDS = ['강력분', '중력분', '박력분', '밀가루', '통밀', '쌀가루'];
export const isFlour = (name: string) => FLOUR_KEYWORDS.some(k => name.includes(k));

/** 밀가루가 들어 있는지 — 없으면 퍼센티지를 아예 안 보여준다 */
export function hasFlour(groups: GroupLike[]): boolean {
  return groups.some(g => g.ingredients.some(i => isFlour(i.name)));
}

/**
 * 기준이 되는 밀가루 총량 — 박력분 400g + 강력분 600g이면 1000g이 100%.
 * 첫 재료 하나만 기준으로 삼으면 밀가루를 섞는 배합에서 비율이 다 어긋난다.
 */
export function flourTotal(groups: GroupLike[]): number {
  return groups.reduce(
    (sum, g) => sum + g.ingredients.reduce((s, i) => s + (isFlour(i.name) ? parseAmountGrams(i.amount) : 0), 0),
    0,
  );
}

/** 재료 한 줄의 퍼센티지 글자 — 기준(밀가루 총량)이 0이면 '-' */
export function bakersPercentOf(amount: string, base: number): string {
  return formatPercentage(base > 0 ? (parseAmountGrams(amount) / base) * 100 : 0);
}
