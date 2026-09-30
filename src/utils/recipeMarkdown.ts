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
 *   ## 재료 / 가루 / 반죽   → 재료 묶음(제목이 그대로 묶음 이름)
 *   ## 도구
 *   ## 과정 / 만들기        → 과정 묶음
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
}

/** 섹션 제목으로 무엇을 담는 묶음인지 가른다 */
type SectionKind = 'ingredient' | 'tool' | 'step';

const TOOL_WORDS = ['도구', '기구', '장비', 'tool', 'equipment'];
const STEP_WORDS = ['과정', '만들기', '조리', '순서', '방법', 'step', 'method', 'instruction'];

function sectionKind(title: string): SectionKind {
  const t = title.toLowerCase();
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
  const out: ParsedMarkdownRecipe = {ingredientGroups: [], tools: [], stepGroups: []};
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
      kind = sectionKind(title);
      if (kind === 'ingredient') pushIngGroup(title);
      else if (kind === 'step') pushStepGroup(title);
      continue;
    }

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

  // 빈 묶음은 버린다 — 제목만 있고 내용이 없는 섹션
  out.ingredientGroups = out.ingredientGroups.filter(g => g.ingredients.length > 0);
  out.stepGroups = out.stepGroups.filter(g => g.steps.length > 0);
  return out;
}
