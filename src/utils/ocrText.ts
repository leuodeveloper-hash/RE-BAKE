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

// ---- 배합표(비율·재료명·무게) ----
// 제과제빵 배합표는 "비율(%) | 재료명 | 무게(g)" 표다. 그대로 읽으면 비율 숫자가 재료 앞에 붙고
// ("100 박력분 500"), 맨 아래 합계 줄(계 421.5 2,107.5)까지 재료로 들어간다.
// 머리 줄로 표를 알아보고, 재료명과 무게만 짝지어 뽑는다.

/** 표 머리 — 재료명 + (무게|중량|g) 이거나 비율이 함께 있으면 배합표로 본다 */
const TABLE_HEAD = /(재료\s*명?|재료이름)/;
const TABLE_HEAD_AMOUNT = /(무게|중량|분량|\(\s*g\s*\)|비율|%)/;
/** 머리에 들어가는 낱말 — 재료로 세지 않는다 */
const HEAD_WORDS = /^(비율|\(?%\)?|재료명?|재료이름|무게|중량|분량|\(?g\)?|비율\(%\)|무게\(g\)|중량\(g\))$/;
/** 합계 줄 — 여기서 표가 끝난다 */
const TOTAL_WORD = /^(계|합계|총계|총량|total)$/i;
/** 숫자 칸 — 5, 2.5, 2,107.5, 5(4), (2,106), 500g, 100% */
const NUM_CELL = /^\(?[\d０-９][\d０-９.,]*\)?(?:\([\d０-９.,]+\))?\s*(?:g|kg|%)?$/;

/** 배합표면 재료(이름 + 무게)들, 아니면 null */
export function parseIngredientTable(lines: string[]): ParsedIngredient[] | null {
  const cleaned = lines.map(l => stripOcrNoise(l)).filter(Boolean);
  const headIdx = cleaned.findIndex(l => TABLE_HEAD.test(l) && TABLE_HEAD_AMOUNT.test(l));
  // 머리가 여러 줄로 쪼개진 경우(재료명 / 무게(g)가 따로 읽힘)도 앞쪽 몇 줄 안에서 찾는다
  const headLooseIdx = headIdx >= 0 ? headIdx
    : (cleaned.slice(0, 4).some(l => TABLE_HEAD.test(l)) && cleaned.slice(0, 4).some(l => TABLE_HEAD_AMOUNT.test(l))
      ? Math.max(...cleaned.slice(0, 4).map((l, i) => (TABLE_HEAD.test(l) || TABLE_HEAD_AMOUNT.test(l) ? i : -1)))
      : -1);
  if (headLooseIdx < 0) return null;
  const grams = cleaned.slice(0, headLooseIdx + 1).some(l => /\(\s*g\s*\)|무게|중량/.test(l));

  // 칸 단위로 펼친다. 합계 낱말 자리를 기억해 둔다(줄 단위면 거기서 끝, 열 단위면 그 칸만 뺀다)
  const all: string[] = [];
  let totalAt = -1;
  for (const line of cleaned.slice(headLooseIdx + 1)) {
    for (const tok of line.split(/\s+/).filter(Boolean)) {
      if (TOTAL_WORD.test(tok)) { if (totalAt < 0) totalAt = all.length; continue; }
      if (HEAD_WORDS.test(tok)) continue;
      all.push(tok);
    }
  }
  if (!all.length) return null;
  const rowMajor = rowMajorHint(all);
  // 줄 단위: 합계 줄(계 앞 숫자 = 비율 합계)부터 끝까지 버린다
  const tokens = rowMajor && totalAt >= 0 ? all.slice(0, Math.max(0, totalAt - 1)) : all;

  // 이름 칸은 붙여 둔다("바닐라 향"처럼 두 낱말로 읽힌 이름)
  type Cell = {kind: 'num' | 'name'; text: string};
  const cells: Cell[] = [];
  for (const tok of tokens) {
    const kind = NUM_CELL.test(tok) ? 'num' : 'name';
    const last = cells[cells.length - 1];
    if (kind === 'name' && last?.kind === 'name' && rowMajor) last.text += ` ${tok}`;
    else cells.push({kind, text: tok});
  }
  const names = cells.filter(c => c.kind === 'name');
  const nums = cells.filter(c => c.kind === 'num');
  if (!names.length || !nums.length) return null;

  // 무게 칸 정리 — 5(4)는 앞 숫자, 단위가 없으면 머리의 g
  const weight = (raw: string) => {
    const n = raw.replace(/\(.*\)/, '').replace(/,/g, '').replace(/\s+/g, '');
    if (/%$/.test(n)) return undefined;
    return /[a-z]$/i.test(n) ? n : grams ? `${n}g` : n;
  };

  const out: ParsedIngredient[] = [];
  if (rowMajor) {
    // 줄 단위(비율 이름 무게 / 비율 이름 무게 …) — 이름 바로 뒤 숫자가 무게
    cells.forEach((c, i) => {
      if (c.kind !== 'name') return;
      const next = cells[i + 1];
      out.push({name: c.text, amount: next?.kind === 'num' ? weight(next.text) : undefined});
    });
  } else {
    // 열 단위(비율 전부 → 이름 전부 → 무게 전부) — 무게는 마지막 이름 뒤에 나오는 숫자부터 이름 개수만큼(합계 뺌)
    const lastName = cells.map(c => c.kind).lastIndexOf('name');
    const w = cells.slice(lastName + 1).filter(c => c.kind === 'num').slice(0, names.length);
    names.forEach((c, i) => out.push({name: c.text, amount: w[i] ? weight(w[i].text) : undefined}));
  }
  return out.filter(i => i.name.length > 0 && i.name.length <= 40);
}

/** 이름과 숫자가 번갈아 나오면 줄 단위 읽기 — 이름이 연달아 둘 이상 나오는 일이 드물면 */
function rowMajorHint(tokens: string[]): boolean {
  let nameRuns = 0;
  let names = 0;
  for (let i = 0; i < tokens.length; i++) {
    const isName = !NUM_CELL.test(tokens[i]);
    if (isName) { names++; if (i > 0 && !NUM_CELL.test(tokens[i - 1])) nameRuns++; }
  }
  return names > 0 && nameRuns / names < 0.5;
}

/**
 * 표 형태 재료 목록을 한 항목씩 가른다.
 * 줄 단위로 끊고, 각 줄을 다시 열 단위로 가른다.
 */
export function parseIngredientLines(lines: string[]): ParsedIngredient[] {
  // 배합표(비율·재료명·무게)면 재료명 + 무게만 — 비율·합계는 뺀다
  const table = parseIngredientTable(lines);
  if (table && table.length) return table;
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
  // 배합표 사진이면 재료만 깔끔하게(비율·합계 없이)
  const table = parseIngredientTable(lines);
  if (table && table.length) {
    return ['## 재료', ...table.map(it => `- ${[it.name, it.amount].filter(Boolean).join(' ')}`)].join('\n');
  }

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
