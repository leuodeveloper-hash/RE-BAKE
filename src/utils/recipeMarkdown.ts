import {parseIngredientBulkLine} from './recipeBulkText';
import type {IngredientGroup, StepGroup, Step} from '../types/recipe';

/**
 * 마크다운으로 쓴 레시피를 통째로 읽는다.
 *
 * 섹션을 하나씩 옮겨 적는 것보다 한 칸에 붙여넣는 편이 빠르다 —
 * 다른 데서 정리해 둔 레시피를 그대로 가져올 수 있다.
 *
 * 인식하는 형태:
 *   # 제목
 *   레시피북: 쿠키 / 공법: 크림법 / 시간: 40분 / 분량: 20개 / 비중: 0.85 / 회차: 2 / 참고: https://…
 *                           → 정보 줄 — 첫 ## 섹션 전에만 읽는다(재료·과정 줄과 헷갈리지 않게)
 *   ## 조언                  → 베이키의 조언(어드민만 반영)
 *   ## 재료 / 가루 / 반죽   → 재료 묶음(제목이 그대로 묶음 이름)
 *   ## 도구
 *   ## 과정 / 만들기        → 과정 묶음
 *   ### 반죽 / 굽기          → 하위 묶음 — 바로 위 ## 섹션(재료·과정)의 묶음 이름이 된다
 *   - 박력분 400g           → 재료 한 줄
 *   1. 거품기에 치기        → 과정 한 줄
 *   > 팁: ...               → 바로 앞 과정의 팁
 *   > 주의: ...             → 바로 앞 과정의 주의
 */
export interface ParsedMarkdownRecipe {
  title?: string;
  ingredientGroups: IngredientGroup[];
  tools: {name: string}[];
  stepGroups: StepGroup[];
  /** 정보 줄 — 첫 ## 섹션 전의 '이름: 값' */
  meta: Partial<Record<RecipeMetaKey, string>>;
  /** ## 조언 섹션 본문 */
  advice?: string;
}

export type RecipeMetaKey = 'cookbook' | 'method' | 'time' | 'servings' | 'specificGravity' | 'session' | 'referenceUrl';

/** 정보 줄 이름 → 칸. 정해진 이름만 받는다(모르는 이름은 무시) */
const META_NAMES: Record<string, RecipeMetaKey> = {
  '레시피북': 'cookbook', '레시피 북': 'cookbook', 'cookbook': 'cookbook',
  '공법': 'method', 'method': 'method',
  '시간': 'time', 'time': 'time',
  '분량': 'servings', '인분': 'servings', 'servings': 'servings', 'yield': 'servings',
  '비중': 'specificGravity', 'specific gravity': 'specificGravity',
  '회차': 'session', 'session': 'session',
  '참고': 'referenceUrl', '참고 링크': 'referenceUrl', 'reference': 'referenceUrl', 'link': 'referenceUrl',
};
const ADVICE_WORDS = ['조언', 'advice'];

/** 섹션 제목으로 무엇을 담는 묶음인지 가른다 */
type SectionKind = 'ingredient' | 'tool' | 'step' | 'advice';

const TOOL_WORDS = ['도구', '기구', '장비', 'tool', 'equipment'];
const STEP_WORDS = ['과정', '만들기', '조리', '순서', '방법', 'step', 'method', 'instruction'];

function sectionKind(title: string): SectionKind {
  const t = title.toLowerCase();
  if (ADVICE_WORDS.some(w => t.includes(w))) return 'advice';
  if (TOOL_WORDS.some(w => t.includes(w))) return 'tool';
  if (STEP_WORDS.some(w => t.includes(w))) return 'step';
  // 나머지는 재료로 본다 — "가루", "반죽재료"처럼 이름이 제각각이라
  // 재료 쪽을 기본으로 두는 편이 덜 틀린다
  return 'ingredient';
}

/** 목록 기호(-, *, 1., ①)를 떼어낸다 */
function stripBullet(line: string): string {
  return line.replace(/^\s*(?:[-*+•]|\d+[.)]|[①-⑳])\s*/, '').trim();
}

export function parseRecipeMarkdown(text: string): ParsedMarkdownRecipe {
  const out: ParsedMarkdownRecipe = {ingredientGroups: [], tools: [], stepGroups: [], meta: {}};
  const adviceLines: string[] = [];
  let seenSection = false;
  if (!text?.trim()) return out;

  // 섹션이 하나도 없는 글도 받는다 — 그때는 전부 과정으로 본다
  let kind: SectionKind = 'step';
  let ingGroup: IngredientGroup | undefined;
  let stepGroup: StepGroup | undefined;

  const pushIngGroup = (title: string) => {
    ingGroup = {title, ingredients: []};
    out.ingredientGroups.push(ingGroup);
  };
  const pushStepGroup = (title: string) => {
    stepGroup = {title, steps: []};
    out.stepGroups.push(stepGroup);
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    // 제목 — # 하나는 레시피 이름, ## 이상은 섹션
    const heading = line.match(/^(#{1,6})\s*(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      if (level === 1 && !out.title) {
        out.title = title;
        continue;
      }
      // ### 이하는 하위 묶음 — 섹션 종류(재료·도구·과정)는 바로 위 ##를 따르고 이름만 새로 연다.
      // (### 굽기가 '과정' 낱말이 아니어도 과정 섹션 아래면 과정 묶음이다)
      if (level >= 3) {
        if (kind === 'ingredient') pushIngGroup(title);
        else if (kind === 'step') pushStepGroup(title);
        continue;
      }
      seenSection = true;
      kind = sectionKind(title);
      if (kind === 'ingredient') pushIngGroup(title);
      else if (kind === 'step') pushStepGroup(title);
      continue;
    }

    // 정보 줄 — 첫 섹션 전의 '이름: 값'
    if (!seenSection) {
      const m = line.match(/^([^:：]{1,20})[:：]\s*(.+)$/);
      const key = m ? META_NAMES[m[1].trim().toLowerCase()] : undefined;
      if (key) { out.meta[key] = m![2].trim(); continue; }
    }

    // 조언 섹션 — 줄을 그대로 모은다(목록·인용 기호도 글의 일부)
    if (kind === 'advice') { adviceLines.push(line); continue; }

    // 인용 — 바로 앞 과정의 팁/주의
    const quote = line.match(/^>\s*(.*)$/);
    if (quote) {
      const body = quote[1].trim();
      const last = stepGroup?.steps[stepGroup.steps.length - 1];
      if (!last) continue;
      const caution = body.match(/^(?:주의|경고|caution|warning)\s*[:：]?\s*(.*)$/i);
      if (caution) last.caution = caution[1].trim() || body;
      else last.tip = body.replace(/^(?:팁|tip)\s*[:：]?\s*/i, '').trim() || body;
      continue;
    }

    const content = stripBullet(line);
    if (!content) continue;

    if (kind === 'tool') {
      // 한 줄에 여러 도구를 쉼표로 적는 경우가 흔하다
      for (const name of content.split(/[,、·]/).map(x => x.trim()).filter(Boolean)) {
        out.tools.push({name});
      }
    } else if (kind === 'ingredient') {
      if (!ingGroup) pushIngGroup('');
      const {name, amount, unit} = parseIngredientBulkLine(content);
      if (name) ingGroup!.ingredients.push({name, amount: amount ? `${amount}${unit}` : unit});
    } else {
      if (!stepGroup) pushStepGroup('');
      const step: Step = {step: stepGroup!.steps.length + 1, description: content};
      stepGroup!.steps.push(step);
    }
  }

  if (adviceLines.length) out.advice = adviceLines.join('\n');

  // 빈 묶음은 버린다 — 제목만 있고 내용이 없는 섹션
  out.ingredientGroups = out.ingredientGroups.filter(g => g.ingredients.length > 0);
  out.stepGroups = out.stepGroups.filter(g => g.steps.length > 0);
  return out;
}

/**
 * 한번에 쓰기(재료·과정 칸 하나)도 텍스트 시트와 같은 쓰기 규칙으로 읽는다.
 * 칸이 이미 재료/과정으로 정해져 있으므로 섹션 대신 `##`(또는 `###`)가 곧 하위 묶음이다.
 * 규칙 해석은 parseRecipeMarkdown 하나로 — 칸 종류 섹션을 앞에 붙이고, 칸 안 제목은 하위 묶음(###)으로 바꿔 넘긴다.
 * 제목 없이 시작한 줄들은 fallbackTitle(원래 묶음 이름) 묶음에 담긴다.
 */
function asSection(text: string, sectionTitle: string, splitCommas: boolean): string {
  const lines = (text ?? '').split(/\r?\n/).flatMap(raw => {
    const line = raw.trim();
    if (/^#{1,6}\s*\S/.test(line)) return [`### ${line.replace(/^#{1,6}\s*/, '')}`];
    // 재료는 예전처럼 쉼표로 이어 써도 된다 — 한 줄에 여러 개
    return splitCommas && !line.startsWith('>') ? line.split(',').map(s => s.trim()).filter(Boolean) : [line];
  });
  return `## ${sectionTitle}\n${lines.join('\n')}`;
}

export function parseBulkIngredientGroups(text: string, fallbackTitle: string): IngredientGroup[] {
  const groups = parseRecipeMarkdown(asSection(text, '재료', true)).ingredientGroups;
  return groups.map(g => (g.title === '재료' ? {...g, title: fallbackTitle} : g));
}

export function parseBulkStepGroups(text: string, fallbackTitle: string): StepGroup[] {
  const groups = parseRecipeMarkdown(asSection(text, '과정', false)).stepGroups;
  return groups.map(g => (g.title === '과정' ? {...g, title: fallbackTitle} : g));
}

/** 재료 묶음들 → 한번에 쓰기 칸 하나(묶음이 둘 이상이면 `## 이름` 줄로 나눈다) */
export function ingredientGroupsToBulk(groups: {title?: string; ingredients: {name?: string; amount?: string; unit?: string}[]}[]): string {
  const withHeading = groups.length > 1;
  return groups.map(g => {
    const line = g.ingredients
      .map(i => [i.name?.trim(), `${i.amount ?? ''}${i.unit ?? ''}`.trim()].filter(Boolean).join(' '))
      .filter(Boolean)
      .join(', ');
    return withHeading ? `## ${g.title || ''}\n${line}`.trim() : line;
  }).filter(Boolean).join('\n');
}

/** 과정 묶음들 → 한번에 쓰기 칸 하나(팁·주의는 `> 팁:` / `> 주의:` 줄로) */
export function stepGroupsToBulk(groups: {title?: string; steps: {description?: string; tip?: string; caution?: string}[]}[]): string {
  const withHeading = groups.length > 1;
  return groups.map(g => {
    const body = g.steps
      .filter(s => s.description?.trim())
      .map((s, i) => [
        `${i + 1}. ${s.description!.trim()}`,
        s.tip?.trim() ? `> 팁: ${s.tip.trim()}` : '',
        s.caution?.trim() ? `> 주의: ${s.caution.trim()}` : '',
      ].filter(Boolean).join('\n'))
      .join('\n');
    return withHeading ? `## ${g.title || ''}\n${body}`.trim() : body;
  }).filter(Boolean).join('\n');
}

/**
 * 레시피 전체 → 쓰기 규칙 글(텍스트 시트에 미리 채우기). parseRecipeMarkdown으로 다시 읽으면 같은 구성이 된다.
 *   # 제목 / ## 재료 → ### 묶음 → - 재료 분량 / ## 도구 → - 도구 / ## 과정 → ### 묶음 → 1. 설명 (> 팁: / > 주의:)
 */
export function recipeToMarkdown(r: {
  title?: string;
  ingredientGroups: {title?: string; ingredients: {name?: string; amount?: string; unit?: string}[]}[];
  tools?: {name?: string}[];
  stepGroups: {title?: string; steps: {description?: string; tip?: string; caution?: string}[]}[];
}): string {
  const out: string[] = [];
  if (r.title?.trim()) out.push(`# ${r.title.trim()}`);

  const ingGroups = r.ingredientGroups
    .map(g => ({title: g.title?.trim() ?? '', items: g.ingredients
      .map(i => [i.name?.trim(), `${i.amount ?? ''}${i.unit ?? ''}`.trim()].filter(Boolean).join(' '))
      .filter(Boolean)}))
    .filter(g => g.items.length > 0);
  if (ingGroups.length > 0) {
    out.push('', '## 재료');
    for (const g of ingGroups) {
      // 묶음 이름이 '재료'와 같거나 비었으면 따로 적지 않는다(섹션 이름이 곧 묶음)
      if (g.title && g.title !== '재료') out.push(`### ${g.title}`);
      out.push(...g.items.map(x => `- ${x}`));
    }
  }

  const tools = (r.tools ?? []).map(t => t.name?.trim()).filter(Boolean);
  if (tools.length > 0) out.push('', '## 도구', ...tools.map(x => `- ${x}`));

  const stepGroups = r.stepGroups.filter(g => g.steps.some(s => s.description?.trim()));
  if (stepGroups.length > 0) {
    out.push('', '## 과정');
    for (const g of stepGroups) {
      const title = g.title?.trim() ?? '';
      if (title && title !== '과정') out.push(`### ${title}`);
      g.steps.filter(s => s.description?.trim()).forEach((s, i) => {
        out.push(`${i + 1}. ${s.description!.trim()}`);
        if (s.tip?.trim()) out.push(`> 팁: ${s.tip.trim()}`);
        if (s.caution?.trim()) out.push(`> 주의: ${s.caution.trim()}`);
      });
    }
  }
  return out.join('\n').trim();
}
