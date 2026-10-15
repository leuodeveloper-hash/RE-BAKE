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
