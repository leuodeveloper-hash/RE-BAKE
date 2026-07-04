/**
 * 레시피 필드용 OCR 유틸 (Web — Tesseract.js)
 */
import {createWorker} from 'tesseract.js';

export type RecipeOcrField = 'title' | 'ingredients' | 'tools' | 'steps';

let workerPromise: ReturnType<typeof createWorker> | null = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('kor+eng');
  }
  return workerPromise;
}

export function normalizeOcrWhitespace(s: string): string {
  if (!s) return '';
  return s
    .replace(/[   ]/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 웹 OCR: tesseract 워커/언어데이터를 CDN에서 로드 → 행(hang) 방지용 타임아웃 + 실패 시 워커 리셋 */
export async function recognizeImageText(imageUri: string): Promise<string> {
  const run = (async () => {
    const worker = await getWorker();
    const result = await worker.recognize(imageUri);
    return normalizeOcrWhitespace(result.data?.text || '');
  })();
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('OCR timeout')), 40000),
  );
  try {
    return await Promise.race([run, timeout]);
  } catch (e) {
    // 워커 로드/인식 실패·타임아웃 시 캐시된 워커를 버려 다음 시도에 재생성 (CDN 실패 복구)
    workerPromise = null;
    throw e;
  }
}

export function parseRecognizedText(text: string, field: RecipeOcrField): string | string[] {
  const trimmed = normalizeOcrWhitespace(text);
  if (!trimmed) return field === 'title' ? '' : [];

  const lines = trimmed
    .split(/[\n\r]+/)
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  switch (field) {
    case 'title':
      return lines[0] || '';
    case 'ingredients':
      return lines.flatMap(l => l.split(/[,、・]/).map(s => s.trim()).filter(Boolean));
    case 'tools':
      return lines.flatMap(l => l.split(/[,、・/]/).map(s => s.trim()).filter(Boolean));
    case 'steps':
      return lines.map(l => l.replace(/^[\d①-⑨ⓐ-ⓩ.\)\-\s]+/, '').trim()).filter(Boolean);
  }
}
