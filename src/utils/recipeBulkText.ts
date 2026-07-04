/**
 * 한번에 쓰기 (벌크 텍스트) 직렬화/파싱.
 * 예: "감자 22g, 양파 100g, 소금 약간, 베이킹파우더"
 */

export interface IngredientBulkItem {
  name: string;
  amount: string;
  unit: string;
}

export interface ToolBulkItem {
  name: string;
}

/** 재료 객체 → "감자 22g" 형태 문자열 */
export function formatIngredientForBulk(ing: {name?: string; amount?: string; unit?: string}): string {
  const name = (ing.name ?? '').trim();
  if (!name) return '';
  const amount = (ing.amount ?? '').toString().trim();
  const unit = (ing.unit ?? '').trim();
  if (amount) {
    return `${name} ${amount}${unit}`;
  }
  if (unit && unit !== 'g') {
    return `${name} ${unit}`;
  }
  return name;
}

/** 재료 라인("감자 22g") → {name, amount, unit} */
export function parseIngredientBulkLine(line: string): IngredientBulkItem {
  const s = line.replace(/\s+/g, ' ').trim();
  if (!s) return {name: '', amount: '', unit: 'g'};

  const m1 = s.match(/^(.+?)\s+([\d.]+)\s*([a-zA-Z가-힣ㄱ-ㅎ]+)$/);
  if (m1) {
    return {name: m1[1].trim(), amount: m1[2], unit: m1[3]};
  }

  const m2 = s.match(/^(.+?)\s+([\d.]+)$/);
  if (m2) {
    return {name: m2[1].trim(), amount: m2[2], unit: 'g'};
  }

  const m3 = s.match(/^(.+?)\s+(약간|적당량|소량|한꼬집|한꼬집|취향껏|기호껏)$/);
  if (m3) {
    return {name: m3[1].trim(), amount: '', unit: m3[2]};
  }

  return {name: s, amount: '', unit: 'g'};
}

/** 재료 배열 → 벌크 텍스트 */
export function ingredientsToBulkText(ingredients: Array<{name?: string; amount?: string; unit?: string}>): string {
  return ingredients
    .map(formatIngredientForBulk)
    .filter(Boolean)
    .join(', ');
}

/** 벌크 텍스트 → 재료 배열 */
export function bulkTextToIngredients(text: string): IngredientBulkItem[] {
  return text
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(parseIngredientBulkLine);
}

/** 과정(스텝) 배열 → 줄바꿈 구분 벌크 텍스트 (설명만). 과정은 문장이라 줄 단위로 구분 */
export function stepsToBulkText(steps: Array<{description?: string}>): string {
  return steps.map(s => (s.description ?? '').trim()).filter(Boolean).join('\n');
}

/** 벌크 텍스트 → 과정 설명 배열 (줄 단위) */
export function bulkTextToStepDescriptions(text: string): string[] {
  return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

/** 도구 배열 → 벌크 텍스트 (이름만) */
export function toolsToBulkText(tools: Array<{name?: string}>): string {
  return tools.map(t => (t.name ?? '').trim()).filter(Boolean).join(', ');
}

/** 벌크 텍스트 → 도구 이름 배열 */
export function bulkTextToToolNames(text: string): string[] {
  return text.split(',').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}
