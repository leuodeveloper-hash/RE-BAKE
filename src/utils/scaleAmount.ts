/**
 * 재료 비율 조정 — 분량 글자 속 첫 숫자에 배율을 곱한다(단위·나머지 글자는 그대로).
 * "500g" ×0.5 → "250g", "1,000g" → "500g", "2개" ×0.5 → "1개", "약간" → 그대로.
 * 반올림: 무게·부피는 10 이상 정수, 10 미만 소수 한 자리. 개수(개·알·장 등)는 0.5 단위.
 */
const COUNT_UNIT = /^\s*(개|알|장|쪽|컵|큰술|작은술|T|t|ts|tbsp|tsp|스푼|봉|팩|줄기|조각)/;

function round(value: number, rest: string): string {
  if (COUNT_UNIT.test(rest)) {
    const v = Math.round(value * 2) / 2;
    return String(v);
  }
  if (value >= 10) return Math.round(value).toLocaleString('en-US');
  const v = Math.round(value * 10) / 10;
  return String(v);
}

export function scaleAmount(amount: string, factor: number): string {
  if (!amount || factor === 1) return amount;
  // 괄호가 있으면("500(510)g") 바깥과 괄호 안을 각각 같은 배율로
  if (/\([^)]*\d[^)]*\)/.test(amount)) {
    return amount.replace(/\(([^)]*)\)|[^()]+/g, (part, inner) =>
      inner != null ? `(${scaleOne(inner, factor)})` : scaleOne(part, factor));
  }
  return scaleOne(amount, factor);
}

function scaleOne(amount: string, factor: number): string {
  // 분수(1/2컵)도 한 숫자로 — 앞 숫자만 곱하면 '2/2컵'이 됐다
  const m = amount.match(/(\d+\s*\/\s*\d+|\d[\d,]*(?:\.\d+)?)/);
  if (!m || m.index == null) return amount;
  const frac = m[1].match(/^(\d+)\s*\/\s*(\d+)$/);
  const n = frac ? Number(frac[1]) / Number(frac[2]) : parseFloat(m[1].replace(/,/g, ''));
  if (!isFinite(n)) return amount;
  const rest = amount.slice(m.index + m[1].length);
  return amount.slice(0, m.index) + round(n * factor, rest) + rest;
}

/** 배율 표시 — 0.5 → "×0.5" */
export const scaleLabel = (factor: number) => `×${Math.round(factor * 100) / 100}`;

/** 보기용 분량 — 숫자가 없으면(단위만 'g' 등) 비운다. 그람을 안 쓴 재료에 'g'만 덩그러니 보이지 않게 */
export const displayAmount = (amount?: string) => (amount && /\d/.test(amount) ? amount : '');

/**
 * 2g 단위 저울용 — 소수점이거나 홀수인 무게·부피(g·ml)엔 가장 가까운 짝수를 괄호로 같이.
 * "513g" → "513(514)g", "512.6g" → "512.6(512)g". 짝수·다른 단위·이미 괄호가 있는 분량은 그대로.
 * 입력·저장은 숫자 그대로 두고 화면에서만 붙인다.
 */
export function withRoundedHint(raw: string): string {
  // 예전에 글로 적어 둔 괄호("500(510)g")는 지우고 숫자만 — 반올림 값은 아래에서 다시 붙인다
  const amount = stripAmountParens(raw);
  if (!amount) return amount;
  const m = amount.match(/^(\d[\d,]*(?:\.\d+)?)\s*(g|ml|mL|그램|kg)?$/i);
  if (!m) return amount;
  const n = parseFloat(m[1].replace(/,/g, ''));
  if (!isFinite(n)) return amount;
  const even = Math.round(n / 2) * 2;
  if (even === n) return amount;
  // 단위는 한 번만, 괄호 뒤에 — "513(514)g"
  return `${m[1]}(${even.toLocaleString('en-US')})${m[2] ?? ''}`;
}

/** 분량 안의 괄호 부분을 지운다 — "500(510)g" → "500g". 분량은 숫자로만 두고 괄호는 화면이 붙인다 */
export function stripAmountParens(amount: string): string {
  if (!amount || !amount.includes('(')) return amount;
  return amount.replace(/\s*\([^)]*\)/g, '').trim();
}
