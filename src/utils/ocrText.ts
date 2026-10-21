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

/**
 * 숫자와 단위가 떨어져 읽힌 걸 붙인다 — "1000 g", "1000\ng", "50 그램" → "1000g", "50g".
 * 표는 칸마다 따로 읽혀 단위가 옆 칸·다음 줄로 떨어지기 쉽다. 떨어진 단위가 재료 이름이 되거나
 * 숫자만 남아 분량이 비었다.
 */
/**
 * 소수점 바로잡기 — 사진 글자 인식이 소수점을 흘리는 모양들.
 *  "2 . 5"·"2 .5"·"2. 5" → "2.5", 가운뎃점 "2·5" → "2.5",
 *  쉼표 "2,5"·"0,25"(뒤가 세 자리가 아니면 소수점) → "2.5". "2,107"(세 자리)은 천 단위 그대로
 */
export function fixDecimals(line: string): string {
  return line
    .replace(/(\d)\s*[·ㆍ•∙]\s*(\d)/g, '$1.$2')
    .replace(/(\d)\s+\.\s*(\d)/g, '$1.$2')
    .replace(/(\d)\.\s+(\d)(?!\d*\s*[.)])/g, '$1.$2')
    .replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2');
}

export function joinNumberUnits(lines: string[]): string[] {
  const UNIT = '(?:g|kg|ml|mL|l|L|그램|킬로그램|%)';
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(new RegExp(`([\\d０-９])\\s+(${UNIT})(?=$|[\\s,)])`, 'g'), '$1$2').replace(/그램/g, 'g');
    // 단위만 있는 줄 — 앞 줄 끝 숫자에 붙인다
    if (new RegExp(`^\\s*${UNIT}\\s*$`).test(line) && out.length && /[\d０-９]\s*$/.test(out[out.length - 1])) {
      out[out.length - 1] = out[out.length - 1].replace(/\s+$/, '') + line.trim().replace(/그램/g, 'g');
      continue;
    }
    out.push(line);
  }
  return out;
}

/** 배합표면 재료(이름 + 무게)들, 아니면 null */
export function parseIngredientTable(lines: string[]): ParsedIngredient[] | null {
  const cleaned = joinNumberUnits(lines.map(l => fixDecimals(stripOcrNoise(l)))).filter(Boolean);
  const headIdx = cleaned.findIndex(l => TABLE_HEAD.test(l) && TABLE_HEAD_AMOUNT.test(l));
  // 머리가 여러 줄로 쪼개진 경우(재료명 / 무게(g)가 따로 읽힘)도 앞쪽 몇 줄 안에서 찾는다
  const headLooseIdx = headIdx >= 0 ? headIdx
    : (cleaned.slice(0, 4).some(l => TABLE_HEAD.test(l)) && cleaned.slice(0, 4).some(l => TABLE_HEAD_AMOUNT.test(l))
      ? Math.max(...cleaned.slice(0, 4).map((l, i) => (TABLE_HEAD.test(l) || TABLE_HEAD_AMOUNT.test(l) ? i : -1)))
      : -1);
  // 열 단위로 읽히면 머리가 열마다 따로 끼어 나온다(iOS 글자 인식: '비율(%)', 100, 80 … '재료명', 박력분 … '무게(g)', 800 …).
  // 그때는 앞 4줄에 머리가 다 없다 — 머리만 있는 줄이 전체에 흩어져 있으면 첫 머리부터 표로 보고, 머리 줄은 건너뛴다
  const headOnly = (l: string) => l.split(/\s+/).filter(Boolean).every(t => HEAD_WORDS.test(t));
  const scatteredHead = headLooseIdx < 0
    && cleaned.some(l => headOnly(l) && TABLE_HEAD.test(l))
    && cleaned.some(l => headOnly(l) && TABLE_HEAD_AMOUNT.test(l));
  if (headLooseIdx < 0 && !scatteredHead) return null;
  const bodyStart = scatteredHead ? cleaned.findIndex(headOnly) : headLooseIdx + 1;
  const headLines = scatteredHead ? cleaned.filter(headOnly) : cleaned.slice(0, headLooseIdx + 1);
  const grams = headLines.some(l => /\(\s*g\s*\)|무게|중량/.test(l));
  const bodyLines = cleaned.slice(bodyStart).filter(l => !headOnly(l));

  // 칸 단위로 펼친다. 합계 낱말 자리를 기억해 둔다(줄 단위면 거기서 끝, 열 단위면 그 칸만 뺀다)
  const all: string[] = [];
  let totalAt = -1;
  for (const line of bodyLines) {
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
    // 쉼표는 천 단위(뒤 세 자리)만 지운다 — 나머지는 소수점(2,5 → 2.5)
    const n = fixDecimals(raw.replace(/\(.*\)/, '')).replace(/,(?=\d{3}(?!\d))/g, '').replace(/\s+/g, '');
    if (/%$/.test(n)) return undefined;
    return /[a-z]$/i.test(n) ? n : grams ? `${n}g` : n;
  };

  const out: ParsedIngredient[] = [];
  if (rowMajor) {
    // 줄 단위(비율 이름 무게 / 비율 이름 무게 …) — 이름 바로 뒤 숫자가 무게
    // 한 줄 = 한 행이면 줄마다 읽는다: 이름 칸 + 숫자 칸들, 무게는 그 줄의 마지막 숫자(비율이 앞이든 뒤든).
    // 칸을 한 줄로 펼쳐 이름 바로 뒤 숫자를 잡으면 '재료명 | 비율 | 무게' 표에서 비율이 분량이 됐다
    const rows = bodyLines.map(l => l.split(/\s+/).filter(t => t && !HEAD_WORDS.test(t)));
    const rowWise = rows.filter(r => r.some(t => !NUM_CELL.test(t)) && r.some(t => NUM_CELL.test(t)));
    if (rowWise.length >= Math.max(1, Math.floor(names.length / 2))) {
      for (const r of rowWise) {
        if (r.some(t => TOTAL_WORD.test(t))) break;
        const name = r.filter(t => !NUM_CELL.test(t)).join(' ');
        const ns = r.filter(t => NUM_CELL.test(t)).filter(t => !/%$/.test(t));
        out.push({name, amount: ns.length ? weight(ns[ns.length - 1]) : undefined});
      }
    } else {
      cells.forEach((c, i) => {
        if (c.kind !== 'name') return;
        const next = cells[i + 1];
        out.push({name: c.text, amount: next?.kind === 'num' ? weight(next.text) : undefined});
      });
    }
  } else {
    // 열 단위(비율 전부 → 이름 전부 → 무게 전부) — 무게는 마지막 이름 뒤에 나오는 숫자부터 이름 개수만큼(합계 뺌)
    const lastName = cells.map(c => c.kind).lastIndexOf('name');
    const w = cells.slice(lastName + 1).filter(c => c.kind === 'num').slice(0, names.length);
    names.forEach((c, i) => out.push({name: c.text, amount: w[i] ? weight(w[i].text) : undefined}));
  }
  return fatsLast(out.filter(i => i.name.length > 0 && i.name.length <= 40));
}

/** 유지(버터·쇼트닝·마가린 등) — 반죽 끝(클린업 단계)에 넣으니 재료 목록도 맨 뒤로 */
const FAT_NAME = /버터|쇼트닝|마가린|유지|라드|식용유|올리브\s*오일|오일/;
export function fatsLast<T extends {name: string}>(items: T[]): T[] {
  return [...items.filter(i => !FAT_NAME.test(i.name)), ...items.filter(i => FAT_NAME.test(i.name))];
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
  return joinNumberUnits(lines)
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

/** 사진에서 읽은 글 → 레시피 정보 칸(시간·분량·반죽 온도·분할 용량·비중·공법). 못 찾은 칸은 비운다 */
export interface OcrRecipeMeta {
  time?: string;
  servings?: string;
  doughTemp?: string;
  divideWeight?: string;
  specificGravity?: string;
  method?: string;
}

export function parseRecipeMetaFromOcr(text: string): OcrRecipeMeta {
  const t = (text ?? '').split(/\r?\n/).map(l => stripOcrNoise(l)).join('\n');
  const pick = (re: RegExp) => t.match(re)?.[1]?.trim();
  const num = (s?: string) => s?.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.');
  const out: OcrRecipeMeta = {};
  // 시간 — "시간 1시간 40분", "소요 시간: 50분", "굽기 시간 25분"
  const time = pick(/(?:소요\s*)?시간\s*[:：]?\s*((?:\d+\s*시간\s*)?\d+\s*분|\d+\s*시간)/);
  if (time) out.time = time.replace(/\s+/g, ' ');
  // 분량 — "분량 20개", "인분 4", "수량: 12개", "1호 1개"
  const servings = pick(/(?:분량|수량|인분)\s*[:：]?\s*([^\n,]{1,20})/);
  if (servings) out.servings = servings;
  // 반죽 온도 — "반죽 온도 27℃", "반죽온도: 27±1℃" → 27°C
  const temp = num(pick(/반죽\s*온도\s*[:：]?\s*([\d.,]+)/));
  if (temp) out.doughTemp = `${temp}°C`;
  // 분할 — "분할 50g", "분할 무게: 50g", "분할 용량 50 g" → 50g
  // 무게가 앞에 오는 꼴도 — "330g 분할", "30g씩 나누어 분할", "450g씩 5개로 분할", "50g으로 24개를 분할",
  // "분할은 50그램씩 24개". g/그램 단위가 붙은 숫자만 무게로 본다("16분할"의 16은 개수)
  const div = num(pick(/분할\s*(?:무게|용량|중량)?\s*[:：]?\s*([\d.,]+)\s*(?:g|그램)/i))
    ?? num(pick(/분할[은는]?\s*[:：]?\s*([\d.,]+)\s*(?:g|그램)/i))
    ?? num(pick(/([\d.,]+)\s*(?:g|그램)\s*(?:씩|으로|로)?[^\n.]{0,12}?분할/i))
    ?? num(pick(/분할\s*(?:무게|용량|중량)\s*[:：]?\s*([\d.,]+)/));
  if (div) out.divideWeight = `${div}g`;
  // 비중 — "비중 0.45~0.55"
  const sg = pick(/비중\s*[:：]?\s*([\d.]+(?:\s*[~\-]\s*[\d.]+)?)/);
  if (sg) out.specificGravity = sg.replace(/\s+/g, '');
  // 공법 — "공법: 크림법", "제법 스트레이트법"
  const method = pick(/(?:공법|제법)\s*[:：]?\s*([가-힣A-Za-z ]{2,15}법)/);
  if (method) out.method = method.trim();
  return out;
}
