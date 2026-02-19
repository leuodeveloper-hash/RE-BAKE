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
  const items: {label: string; value: string}[] = [];
  if (data.time) items.push({label: '시간', value: data.time});
  if (data.servings) items.push({label: '분량', value: data.servings});
  if (data.session) items.push({label: '회차', value: data.session});

  if (items.length === 0) return '';

  return `
    <div class="meta-row">
      ${items.map(item => `<div class="meta-item"><span class="meta-value">${escapeHtml(item.value)}</span></div>`).join('')}
    </div>`;
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

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #F3F4F6;
    color: #121318;
    padding: 32px 24px;
    max-width: 600px;
    margin: 0 auto;
  }

  .recipe-page { padding-bottom: 40px; }
  .header { margin-bottom: 24px; }
  .title { font-size: 24px; font-weight: 700; line-height: 1.3; margin-bottom: 4px; }
  .subtitle { font-size: 14px; font-weight: 400; color: #1F2126A3; }
  .meta-row { display: flex; gap: 8px; margin-bottom: 20px; }
  .meta-item { flex: 1; background: #FFFFFF; border-radius: 12px; padding: 12px; text-align: center; }
  .meta-value { font-size: 14px; font-weight: 600; color: #121318; }
  .section-title { font-size: 14px; font-weight: 600; color: #1F2126A3; margin-bottom: 8px; margin-top: 20px; display: flex; align-items: center; gap: 4px; }
  .chevron { font-size: 12px; color: #1F2126A3; }
  .card { background: #FFFFFF; border-radius: 12px; overflow: hidden; }
  .ingredient-row { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #ECEEF2; }
  .ingredient-row:last-child { border-bottom: none; }
  .ingredient-pct { width: 48px; font-size: 13px; font-weight: 500; color: #1F2126A3; text-align: right; margin-right: 12px; flex-shrink: 0; }
  .ingredient-name { font-size: 14px; font-weight: 400; color: #121318; }
  .tools-text { padding: 12px 16px; font-size: 14px; font-weight: 400; color: #121318; line-height: 1.5; }
  .step-row { display: flex; padding: 12px 16px; border-bottom: 1px solid #ECEEF2; gap: 12px; }
  .step-row:last-child { border-bottom: none; }
  .step-number { width: 24px; height: 24px; border-radius: 50%; background: #F3F4F6; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #1F2126A3; }
  .step-content { flex: 1; min-width: 0; }
  .step-desc { font-size: 14px; font-weight: 400; line-height: 1.5; color: #121318; }
  .step-tip { margin-top: 6px; font-size: 12px; font-weight: 400; line-height: 1.4; color: #1F21265C; background: #F3F4F6; border-radius: 8px; padding: 6px 10px; }
</style>
</head>
<body>
  ${recipeSections}
</body>
</html>`;
}

export function generateRecipeHtml(data: RecipePdfData): string {
  const subtitle = buildSubtitle(data);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #F3F4F6;
    color: #121318;
    padding: 32px 24px;
    max-width: 600px;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 24px;
  }

  .title {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.3;
    margin-bottom: 4px;
  }

  .subtitle {
    font-size: 14px;
    font-weight: 400;
    color: #1F2126A3;
  }

  .meta-row {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }

  .meta-item {
    flex: 1;
    background: #FFFFFF;
    border-radius: 12px;
    padding: 12px;
    text-align: center;
  }

  .meta-value {
    font-size: 14px;
    font-weight: 600;
    color: #121318;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #1F2126A3;
    margin-bottom: 8px;
    margin-top: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .chevron {
    font-size: 12px;
    color: #1F2126A3;
  }

  .card {
    background: #FFFFFF;
    border-radius: 12px;
    overflow: hidden;
  }

  .ingredient-row {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #ECEEF2;
  }

  .ingredient-row:last-child {
    border-bottom: none;
  }

  .ingredient-pct {
    width: 48px;
    font-size: 13px;
    font-weight: 500;
    color: #1F2126A3;
    text-align: right;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .ingredient-name {
    font-size: 14px;
    font-weight: 400;
    color: #121318;
  }

  .tools-text {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 400;
    color: #121318;
    line-height: 1.5;
  }

  .step-row {
    display: flex;
    padding: 12px 16px;
    border-bottom: 1px solid #ECEEF2;
    gap: 12px;
  }

  .step-row:last-child {
    border-bottom: none;
  }

  .step-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #F3F4F6;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #1F2126A3;
  }

  .step-content {
    flex: 1;
    min-width: 0;
  }

  .step-desc {
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
    color: #121318;
  }

  .step-tip {
    margin-top: 6px;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.4;
    color: #1F21265C;
    background: #F3F4F6;
    border-radius: 8px;
    padding: 6px 10px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="title">${escapeHtml(data.title)}</div>
    ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
  </div>
  ${buildMetaHtml(data)}
  ${buildIngredientsHtml(data)}
  ${buildToolsHtml(data)}
  ${buildProcessHtml(data)}
</body>
</html>`;
}
