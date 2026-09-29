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
