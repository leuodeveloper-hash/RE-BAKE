import {hasFlour, flourTotal, bakersPercentOf} from './bakersPercentage';
import {stripRichText} from './richText';
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

function buildSubtitle(data: RecipePdfData): string {
  const parts: string[] = [];
  if (data.cookbook) parts.push(data.cookbook);
  if (data.method) parts.push(data.method);
  return parts.join(' · ');
}

function buildMetaHtml(data: RecipePdfData): string {
  // 박스 없이 인라인 텍스트로 (문서형 정리)
  const items: string[] = [];
  if (data.time) items.push(`시간 ${escapeHtml(data.time)}`);
  if (data.servings) items.push(`분량 ${escapeHtml(data.servings)}`);

  if (items.length === 0) return '';

  return `<div class="meta-row">${items.join('<span class="meta-sep">/</span>')}</div>`;
}

function buildIngredientsHtml(data: RecipePdfData): string {
  // 베이커스 퍼센티지는 상세와 같은 규칙 — 밀가루가 있을 때만, 밀가루 총량이 100%
  const showPct = hasFlour(data.ingredientGroups);
  const baseAmount = flourTotal(data.ingredientGroups);
  const multiGroup = data.ingredientGroups.length > 1;

  // 재료는 한 섹션 — 묶음(가루·유지 등)은 그 안에서 작은 이름 + 묶음 사이 선으로 나눈다
  const groupsHtml = data.ingredientGroups
    .map(group => {
      // 라벨은 '재료 › 가루'처럼 유지(선 없이)
      const titleHtml = multiGroup
        ? `<div class="section-title group-label"><span>재료</span><span class="chevron">›</span><span>${escapeHtml(group.title)}</span></div>`
        : '';

      const rows = group.ingredients
        .map(ing => {
          return `
          <div class="ingredient-row">
            <span class="ingredient-name">${escapeHtml(stripRichText(ing.name, {maskSecret: true}))} ${escapeHtml(ing.amount)}</span>
            ${showPct ? `<span class="ingredient-pct">${bakersPercentOf(ing.amount, baseAmount)}</span>` : ''}
          </div>`;
        })
        .join('');

      return `<div class="group">${titleHtml}<div class="card">${rows}</div></div>`;
    })
    .join('');
  // 묶음이 여럿이면 각 묶음 라벨이 섹션 제목 역할, 하나면 '재료' 하나
  return groupsHtml ? `<div class="section">${multiGroup ? '' : '<div class="section-title">재료</div>'}${groupsHtml}</div>` : '';
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
        <div class="step-number">${step.step}.</div>
        <div class="step-content">
          <div class="step-desc">${escapeHtml(stripRichText(step.description, {maskSecret: true}))}</div>
          ${step.tip ? `<div class="step-tip">${escapeHtml(step.tip)}</div>` : ''}
          ${step.caution ? `<div class="step-caution">${escapeHtml(step.caution)}</div>` : ''}
        </div>
      </div>`,
    )
    .join('');
}

function buildProcessHtml(data: RecipePdfData): string {
  if (data.stepGroups && data.stepGroups.length > 0) {
    // 과정도 한 섹션 — 묶음은 그 안에서 작은 이름 + 묶음 사이 선
    const multi = data.stepGroups.length > 1;
    return `<div class="section">${multi ? '' : '<div class="section-title">과정</div>'}` + data.stepGroups
      .map(
        group => `
        <div class="group">
          ${multi ? `<div class="section-title group-label"><span>과정</span><span class="chevron">›</span><span>${escapeHtml(group.title)}</span></div>` : ''}
          <div class="card">${buildStepsHtml(group.steps)}</div>
        </div>`,
      )
      .join('') + '</div>';
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
  /* 앱과 같은 서체(Pretendard) — 웹폰트로 불러온다 */
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1a1a1a;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  /* 여백은 body가 아니라 각 페이지가 갖는다 — 그래야 화면에서도 한 장씩 보인다 */
  .recipe-page { padding: 40px 34px; max-width: 640px; margin: 0 auto; }
  /* 레시피 하나 = 페이지 하나. 다음 레시피는 항상 새 페이지 처음부터 시작한다.
     break-after(표준)와 page-break-after(구형)를 함께 줘야 렌더러를 가리지 않는다.
     마지막 장 뒤에 빈 페이지가 생기지 않도록 :last-child는 제외한다. */
  .recipe-page { break-after: page; page-break-after: always; }
  .recipe-page:last-child { break-after: auto; page-break-after: auto; }
  /* 제목·재료 표 등이 페이지 경계에서 잘리지 않게 */
  .recipe-page .header { break-after: avoid; page-break-after: avoid; }
  /* 화면 미리보기 — 인쇄 결과와 같은 "한 장씩" 구조로 보여준다.
     페이지 나눔 CSS는 인쇄에만 적용되므로, 화면에서는 종이 모양을 직접 그린다. */
  @media screen {
    body { background: #e9eaec; padding: 24px 0; }
    .recipe-page {
      background: #fff;
      min-height: 297mm;
      width: 210mm;
      max-width: 100%;
      margin: 0 auto 24px;
      padding: 20mm 16mm;
      box-shadow: 0 1px 4px rgba(0,0,0,0.16);
    }
    .recipe-page:last-child { margin-bottom: 0; }
  }
  .header { margin-bottom: 16px; }
  /* A4 한 장 기준 — 본문 14px에 맞춘 위계. 26px은 종이에서 과하게 컸다. */
  .title { font-size: 20px; font-weight: 700; line-height: 1.3; margin-bottom: 5px; letter-spacing: -0.01em; }
  .subtitle { font-size: 13px; color: #6b6f76; }
  .meta-row { font-size: 13px; color: #4a4d52; margin-bottom: 24px; text-align: right; }
  .meta-sep { color: #cfd2d6; margin: 0 6px; }
  .section-title {
    font-size: 13px; font-weight: 700; color: #1a1a1a;
    margin: 28px 0 4px;
    display: flex; align-items: center; gap: 5px;
  }
  /* 한 섹션 안의 묶음 — 라벨('재료 › 가루')은 그대로, 묶음 사이는 섹션 간격 대신 선으로 */
  .group + .group { border-top: 1px solid #d5d8dc; margin-top: 8px; }
  .group + .group .group-label { margin-top: 12px; }
  .chevron { color: #a9adb3; font-weight: 400; }
  .card { display: block; }
  .ingredient-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid #eef0f2; }
  .ingredient-row:last-child { border-bottom: none; }
  .ingredient-pct { font-size: 12px; font-weight: 500; color: #9aa0a6; text-align: right; flex-shrink: 0; }
  .ingredient-name { font-size: 14px; color: #1a1a1a; }
  .tools-text { padding: 8px 0; font-size: 14px; color: #1a1a1a; line-height: 1.6; }
  /* 과정은 번호 붙은 글줄 — 문단처럼 붙여 쓴다(줄 사이 선·큰 간격 없이) */
  .step-row { display: flex; gap: 6px; padding: 3px 0; }
  /* 번호는 원 없이 글줄 그대로 '1.' */
  .step-number { min-width: 18px; font-size: 14px; font-weight: 600; line-height: 1.6; flex-shrink: 0; color: #1a1a1a; }
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
    .map(data => {
      const subtitle = buildSubtitle(data);
      return `
    <div class="recipe-page">
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
