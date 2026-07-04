/**
 * 레시피 데이터를 PDF용 HTML 문서로 변환
 */

export interface PdfIngredient {
  name: string;
  amount: string;
}

export interface PdfIngredientGroup {
  title: string;
  ingredients: PdfIngredient[];
}

export interface PdfStep {
  step: number;
  description: string;
  tip?: string;
  caution?: string;
}

export interface PdfStepGroup {
  title: string;
  steps: PdfStep[];
}

export interface RecipePdfData {
  title: string;
  cookbook?: string;
  method?: string;
  reviewCount?: number;
  time?: string;
  servings?: string;
  session?: string;
  ingredientGroups: PdfIngredientGroup[];
  tools: {name: string}[];
  steps?: PdfStep[];
  stepGroups?: PdfStepGroup[];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseAmountGrams(amount: string): number {
  const match = amount.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function formatPercentage(value: number): string {
  if (value === 0) return '-';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

function buildSubtitle(data: RecipePdfData): string {
  const parts: string[] = [];
  if (data.cookbook) parts.push(data.cookbook);
  if (data.method) parts.push(data.method);
  if (data.reviewCount != null) parts.push(`${data.reviewCount}회차`);
  return parts.join(' · ');
}

function buildMetaHtml(data: RecipePdfData): string {
  // 박스 없이 인라인 텍스트로 (문서형 정리)
  const items: string[] = [];
  if (data.time) items.push(`시간 ${escapeHtml(data.time)}`);
  if (data.servings) items.push(`분량 ${escapeHtml(data.servings)}`);
  if (data.session) items.push(`회차 ${escapeHtml(data.session)}`);

  if (items.length === 0) return '';

  return `<div class="meta-row">${items.join('<span class="meta-sep">·</span>')}</div>`;
}

function buildIngredientsHtml(data: RecipePdfData): string {
  const baseAmount = parseAmountGrams(
    data.ingredientGroups[0]?.ingredients[0]?.amount ?? '0',
  );
  const multiGroup = data.ingredientGroups.length > 1;

  return data.ingredientGroups
    .map(group => {
      const titleHtml = multiGroup
        ? `<div class="section-title"><span>재료</span><span class="chevron">›</span><span>${escapeHtml(group.title)}</span></div>`
        : '<div class="section-title">재료</div>';

      const rows = group.ingredients
        .map(ing => {
          const amount = parseAmountGrams(ing.amount);
          const pct = baseAmount > 0 ? (amount / baseAmount) * 100 : 0;
          return `
          <div class="ingredient-row">
            <span class="ingredient-pct">${formatPercentage(pct)}</span>
            <span class="ingredient-name">${escapeHtml(ing.name)} ${escapeHtml(ing.amount)}</span>
          </div>`;
        })
        .join('');

      return `${titleHtml}<div class="card">${rows}</div>`;
    })
    .join('');
}

function buildToolsHtml(data: RecipePdfData): string {
  if (!data.tools || data.tools.length === 0) return '';
  const names = data.tools.map(t => escapeHtml(t.name)).join(', ');
  return `
    <div class="section-title">도구</div>
    <div class="card">
      <div class="tools-text">${names}</div>
    </div>`;
}

function buildStepsHtml(steps: PdfStep[]): string {
  return steps
    .map(
      step => `
      <div class="step-row">
        <div class="step-number">${step.step}</div>
        <div class="step-content">
          <div class="step-desc">${escapeHtml(step.description)}</div>
          ${step.tip ? `<div class="step-tip">${escapeHtml(step.tip)}</div>` : ''}
          ${step.caution ? `<div class="step-caution">${escapeHtml(step.caution)}</div>` : ''}
        </div>
      </div>`,
    )
    .join('');
}

function buildProcessHtml(data: RecipePdfData): string {
  if (data.stepGroups && data.stepGroups.length > 0) {
    return data.stepGroups
      .map(
        group => `
        <div class="section-title"><span>과정</span><span class="chevron">›</span><span>${escapeHtml(group.title)}</span></div>
        <div class="card">${buildStepsHtml(group.steps)}</div>`,
      )
      .join('');
  }

  if (data.steps && data.steps.length > 0) {
    return `
      <div class="section-title">과정</div>
      <div class="card">${buildStepsHtml(data.steps)}</div>`;
  }

  return '';
}

// 공용 PDF 스타일 — 배경/카드 박스 없이 구분선·타이포 기반의 깔끔한 문서형.
// (PDF는 흰 배경에 저장되므로 흰 카드 박스는 안 보이고 구조만 붕 떠 보였음 → 제거)
const PDF_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1a1a1a;
    padding: 40px 34px;
    max-width: 640px;
    margin: 0 auto;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .recipe-page { padding-bottom: 8px; }
  .header { margin-bottom: 16px; }
  .title { font-size: 26px; font-weight: 700; line-height: 1.25; margin-bottom: 6px; letter-spacing: -0.01em; }
  .subtitle { font-size: 13px; color: #6b6f76; }
  .meta-row { font-size: 13px; color: #4a4d52; margin-bottom: 24px; }
  .meta-sep { color: #cfd2d6; margin: 0 7px; }
  .section-title {
    font-size: 13px; font-weight: 700; color: #1a1a1a;
    margin: 28px 0 4px; padding-bottom: 7px;
    border-bottom: 1.5px solid #1a1a1a;
    display: flex; align-items: center; gap: 5px;
  }
  .chevron { color: #a9adb3; font-weight: 400; }
  .card { display: block; }
  .ingredient-row { display: flex; align-items: baseline; padding: 7px 1px; border-bottom: 1px solid #eef0f2; }
  .ingredient-row:last-child { border-bottom: none; }
  .ingredient-pct { width: 46px; font-size: 12px; font-weight: 500; color: #9aa0a6; text-align: right; margin-right: 14px; flex-shrink: 0; }
  .ingredient-name { font-size: 14px; color: #1a1a1a; }
  .tools-text { padding: 8px 1px; font-size: 14px; color: #1a1a1a; line-height: 1.6; }
  .step-row { display: flex; gap: 12px; padding: 11px 1px; border-bottom: 1px solid #eef0f2; }
  .step-row:last-child { border-bottom: none; }
  .step-number { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid #1a1a1a; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #1a1a1a; }
  .step-content { flex: 1; min-width: 0; }
  .step-desc { font-size: 14px; line-height: 1.6; color: #1a1a1a; }
  .step-tip { margin-top: 6px; font-size: 12px; line-height: 1.5; color: #6b6f76; padding-left: 10px; border-left: 2px solid #e3e5e8; }
  .step-caution { margin-top: 6px; font-size: 12px; line-height: 1.5; color: #9a6a00; padding-left: 10px; border-left: 2px solid #e6c17a; }
  @media print { body { padding: 24px 20px; } }
`;

function pdfDocument(inner: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>${PDF_CSS}</style>
</head>
<body>
${inner}
</body>
</html>`;
}

export function generateRecipeListHtml(recipes: RecipePdfData[]): string {
  const recipeSections = recipes
    .map((data, index) => {
      const subtitle = buildSubtitle(data);
      const isLast = index === recipes.length - 1;
      return `
    <div class="recipe-page"${!isLast ? ' style="page-break-after: always;"' : ''}>
      <div class="header">
        <div class="title">${escapeHtml(data.title)}</div>
        ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      ${buildMetaHtml(data)}
      ${data.ingredientGroups.length > 0 ? buildIngredientsHtml(data) : ''}
      ${buildToolsHtml(data)}
      ${buildProcessHtml(data)}
    </div>`;
    })
    .join('');

  return pdfDocument(recipeSections);
}

/** Recipe → RecipePdfData 변환 헬퍼. PDF 미리보기/카드 썸네일 공통 사용. */
export function recipeToPdfData(recipe: {
  title: string;
  cookbook?: string;
  method?: string;
  reviewCount?: number;
  time?: string;
  servings?: string;
  session?: string;
  ingredientGroups?: PdfIngredientGroup[];
  tools?: {name: string}[];
  toolGroups?: {title: string; tools: {name: string}[]}[];
  steps?: PdfStep[];
  stepGroups?: PdfStepGroup[];
}): RecipePdfData {
  const tools: {name: string}[] = [];
  recipe.toolGroups?.forEach(g => g.tools.forEach(t => tools.push(t)));
  recipe.tools?.forEach(t => tools.push(t));
  return {
    title: recipe.title,
    cookbook: recipe.cookbook,
    method: recipe.method,
    reviewCount: recipe.reviewCount,
    time: recipe.time,
    servings: recipe.servings,
    session: recipe.session,
    ingredientGroups: recipe.ingredientGroups ?? [],
    tools,
    steps: recipe.steps,
    stepGroups: recipe.stepGroups,
  };
}

export function generateRecipeHtml(data: RecipePdfData): string {
  const subtitle = buildSubtitle(data);

  const inner = `
  <div class="header">
    <div class="title">${escapeHtml(data.title)}</div>
    ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
  </div>
  ${buildMetaHtml(data)}
  ${data.ingredientGroups.length > 0 ? buildIngredientsHtml(data) : ''}
  ${buildToolsHtml(data)}
  ${buildProcessHtml(data)}`;
  return pdfDocument(inner);
}
