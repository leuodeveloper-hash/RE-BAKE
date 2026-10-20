import type {Step} from '../types/recipe';

/**
 * 과정 묶음 내용 표시(짧은 해시) — 요약을 쓴 뒤 과정이 바뀌었는지 알아보는 데 쓴다.
 * 글·팁·주의만 본다(사진·순번은 요약과 상관없다).
 */
export function stepsSignature(steps: Pick<Step, 'description' | 'tip' | 'caution'>[]): string {
  const text = steps.map(s => [s.description, s.tip, s.caution].map(x => (x ?? '').trim()).join('\u0001')).join('\u0002');
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** 요약 이후 과정이 바뀌었는지 — 요약이 없으면 false */
export function isSummaryStale(g: {summary?: string; summarySig?: string; steps: Pick<Step, 'description' | 'tip' | 'caution'>[]}): boolean {
  if (!g.summary?.trim()) return false;
  return g.summarySig !== stepsSignature(g.steps);
}

/** 동그라미 번호 ①~⑳ — 과정 번호·요약 번호 공통. 넘으면 '21.' */
export const circledNumber = (n: number) => (n >= 1 && n <= 20 ? String.fromCharCode(0x2460 + n - 1) : `${n}.`);
