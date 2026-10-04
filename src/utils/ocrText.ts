/**
 * OCR 텍스트 정리 — 웹(Tesseract)·네이티브(ML Kit)가 같은 규칙을 쓴다.
 *
 * 레시피는 보통 용지에 표로 인쇄돼 있다. OCR은 표의 세로선을 글자로 읽거나
 * 열 구분을 통째로 잃어버려서, 손대지 않으면 "박력분 400g 설탕 260g"이
 * 재료 하나로 들어간다.
 */

/** 재료 한 줄 — 이름과 분량이 갈려 있다 */
export interface ParsedIngredient {
  name: string;
  amount?: string;
}

/**
 * OCR이 흘린 쓰레기 글자를 걷어낸다.
 *
 * 표의 괘선(|│┃─━ 등)은 글자로 읽히고, 한글·영문·숫자 어디에도 없는
 * 기호(◇▣☞ 등)는 인쇄 얼룩이거나 오인식이다. 남겨 두면 재료 이름에
 * 그대로 박힌다.
 */
export function stripOcrNoise(s: string): string {
  return s
    // 표 괘선·박스 그리기 문자
    .replace(/[|｜│┃┆┇┊┋║╎╏─━┄┅┈┉═▔▁▏▕]/g, ' ')
    // 도형·화살표 등 레시피에 쓰일 일 없는 기호 (단위·괄호·문장부호는 남긴다)
    .replace(/[▣◇◆◈○●◎□■△▲▽▼☆★※◀▶▲▼☞☜♠♣♥♦¶§]/g, ' ')
    // 홀로 남은 알파벳/기호 부스러기: 앞뒤가 공백인 한 글자 특수기호
    .replace(/(^|\s)[^\w가-힣()%.,\-+/~][\s]/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 분량으로 읽히는 꼬리 — 숫자 + 단위, 또는 "약간/한 꼬집" 같은 말 */
const AMOUNT_TAIL = /([\d０-９]+(?:[.,][\d０-９]+)?\s*(?:g|kg|ml|l|L|개|장|큰술|작은술|컵|스푼|티스푼|T|t|cc|%)|약간|적당량|한\s*꼬집|소량)\s*$/;

/**
 * 표에서 뽑힌 한 줄을 재료들로 가른다.
 *
 * 표는 열 사이가 넓은 공백으로 남는 경우가 많아, 2칸 이상 공백을 열 경계로 본다.
 * 그게 안 되면 "이름 분량" 쌍이 반복되는 패턴으로 끊는다 —
 * OCR이 공백을 한 칸으로 뭉개 놓아도 분량 단위가 경계를 알려준다.
 */
export function splitTableRow(line: string): string[] {
  const cleaned = stripOcrNoise(line);
  if (!cleaned) return [];

  // 1) 쉼표류가 있으면 그게 가장 확실한 구분자
  if (/[,、・]/.test(cleaned)) {
    return cleaned.split(/[,、・]/).map(s => s.trim()).filter(Boolean);
  }

  // 2) 넓은 공백(2칸 이상) = 표의 열 경계
  const byGap = cleaned.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
  if (byGap.length > 1) return byGap;

  // 3) "이름 분량"이 반복되는 줄 — 분량 뒤에서 끊는다
  const pairs = cleaned.match(
    /[^\s\d][^\d]*?[\d０-９]+(?:[.,][\d０-９]+)?\s*(?:g|kg|ml|l|L|개|장|큰술|작은술|컵|스푼|티스푼|T|t|cc|%)/g,
  );
  if (pairs && pairs.length > 1) return pairs.map(s => s.trim());

  return [cleaned];
}

/** "박력분 400g" → {name: '박력분', amount: '400g'} */
export function splitNameAmount(entry: string): ParsedIngredient {
  const s = stripOcrNoise(entry);
  const m = s.match(AMOUNT_TAIL);
  if (!m) return {name: s};
  const name = s.slice(0, m.index).trim();
  // 이름이 비면 분량만 읽힌 것 — 통째로 이름에 둔다(버리면 사용자가 뭘 잃었는지 모른다)
  return name ? {name, amount: m[1].trim()} : {name: s};
}

/**
 * 표 형태 재료 목록을 한 항목씩 가른다.
 * 줄 단위로 끊고, 각 줄을 다시 열 단위로 가른다.
 */
export function parseIngredientLines(lines: string[]): ParsedIngredient[] {
  return lines
    .flatMap(splitTableRow)
    .map(splitNameAmount)
    .filter(i => i.name.length > 0 && i.name.length <= 40);
}

const INGREDIENT_HEADINGS = /^(재료|반죽\s*재료|필요\s*재료|배합|배합표|ingredients?)(?=$|[\s:：(（])/i;
const STEP_HEADINGS = /^(만드는\s*법|만들기|과정|조리\s*과정|조리법|방법|순서|공정|steps?|method|directions?)(?=$|[\s:：(（])/i;
const TOOL_HEADINGS = /^(도구|기구|준비물|tools?|equipment)(?=$|[\s:：(（])/i;

/**
 * 사진에서 읽은 글 → 쓰기 규칙 글(# 제목 / ## 재료 / ## 과정 …).
 * 그대로 넣으면 `##`가 없어 [적용] 때 모든 줄이 과정이 됐다 — 읽은 글을 규칙에 맞춰 정리해 준다.
 *  - "재료", "만드는 법" 같은 머리글이 있으면 그 기준으로 나눈다
 *  - 머리글이 없으면 분량(200g, 2개, 1큰술…)이 붙은 줄은 재료, 나머지 문장은 과정
 *  - 맨 첫 줄이 짧고 분량이 없으면 제목
 * 정리한 글은 사용자가 시트에서 확인·수정한 뒤 적용한다(완벽하지 않아도 고치기 쉽게).
 */
export function ocrTextToMarkdown(text: string): string {
  const lines = (text ?? '').split(/\r?\n/).map(l => stripOcrNoise(l)).filter(Boolean);
  if (lines.length === 0) return '';

  let title: string | undefined;
  const ingredients: string[] = [];
  const tools: string[] = [];
  const steps: string[] = [];
  let section: 'ingredient' | 'tool' | 'step' | null = null;

  lines.forEach((line, idx) => {
    const bare = line.replace(/[:：\-\s]+$/, '').trim();
    if (INGREDIENT_HEADINGS.test(bare) && bare.length <= 12) { section = 'ingredient'; return; }
    if (STEP_HEADINGS.test(bare) && bare.length <= 12) { section = 'step'; return; }
    if (TOOL_HEADINGS.test(bare) && bare.length <= 12) { section = 'tool'; return; }
    // 첫 줄 — 짧고 분량이 없으면 제목
    if (idx === 0 && !section && line.length <= 24 && !AMOUNT_TAIL.test(line) && !/^\d+[.)]/.test(line)) {
      title = line;
      return;
    }
    const kind = section ?? (splitTableRow(line).some(e => AMOUNT_TAIL.test(e)) ? 'ingredient' : 'step');
    if (kind === 'ingredient') {
      for (const it of parseIngredientLines([line])) ingredients.push([it.name, it.amount].filter(Boolean).join(' '));
    } else if (kind === 'tool') {
      tools.push(...line.split(/[,、·]/).map(s => s.trim()).filter(Boolean));
    } else {
      steps.push(line.replace(/^\s*(?:\d+[.)]|[①-⑳]|[-*•])\s*/, '').trim());
    }
  });

  const out: string[] = [];
  if (title) out.push(`# ${title}`);
  if (ingredients.length) out.push('', '## 재료', ...ingredients.map(x => `- ${x}`));
  if (tools.length) out.push('', '## 도구', ...tools.map(x => `- ${x}`));
  if (steps.length) out.push('', '## 과정', ...steps.filter(Boolean).map((x, i) => `${i + 1}. ${x}`));
  return out.join('\n').trim();
}
