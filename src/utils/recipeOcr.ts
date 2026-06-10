/**
 * 레시피 필드용 OCR 유틸 (iOS / Android — Google ML Kit)
 * Web 구현은 recipeOcr.web.ts 참고.
 */
import TextRecognition, {TextRecognitionScript} from '@react-native-ml-kit/text-recognition';

export type RecipeOcrField = 'title' | 'ingredients' | 'tools' | 'steps';

/** OCR 텍스트의 연속 공백/탭을 단일 공백으로, 줄바꿈 주변 공백 제거 */
export function normalizeOcrWhitespace(s: string): string {
  if (!s) return '';
  return s
    .replace(/[   ]/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 이미지 URI로부터 텍스트 인식.
 * 한국어 스크립트 모델 사용 (기본값 LATIN은 한글을 거의 못 읽음).
 * 한국어 모델은 한글 + 영문/숫자를 함께 인식하므로 혼합 레시피도 처리됨.
 */
export async function recognizeImageText(imageUri: string): Promise<string> {
  const result = await TextRecognition.recognize(imageUri, TextRecognitionScript.KOREAN);
  return normalizeOcrWhitespace(result.text || '');
}

export class OcrValidationError extends Error {
  constructor(public field: RecipeOcrField, message: string) {
    super(message);
    this.name = 'OcrValidationError';
  }
}

/** 인식된 텍스트를 필드 타입에 맞게 파싱. 부적합하면 OcrValidationError 발생. */
export function parseRecognizedText(text: string, field: RecipeOcrField): string | string[] {
  const normalized = normalizeOcrWhitespace(text);
  if (!normalized) {
    throw new OcrValidationError(field, '인식된 텍스트가 없어요');
  }

  const lines = normalized
    .split(/[\n\r]+/)
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  switch (field) {
    case 'title': {
      const candidate = (lines[0] || '').slice(0, 60);
      if (candidate.length < 2) {
        throw new OcrValidationError(field, '제목으로 쓸 만한 텍스트가 없어요');
      }
      if (candidate.length > 50) {
        throw new OcrValidationError(field, '제목으로 쓰기엔 너무 길어요');
      }
      return candidate;
    }

    case 'ingredients': {
      const items = lines
        .flatMap(l => l.split(/[,、・]/).map(s => s.trim()).filter(Boolean))
        .filter(s => s.length <= 40);
      if (items.length === 0) {
        throw new OcrValidationError(field, '재료를 인식할 수 없어요');
      }
      return items;
    }

    case 'tools': {
      const items = lines
        .flatMap(l => l.split(/[,、・/]/).map(s => s.trim()).filter(Boolean))
        .filter(s => s.length <= 30);
      if (items.length === 0) {
        throw new OcrValidationError(field, '도구를 인식할 수 없어요');
      }
      return items;
    }

    case 'steps': {
      const items = lines
        .map(l => l.replace(/^[\d①-⑨ⓐ-ⓩ.\)\-\s]+/, '').trim())
        .filter(Boolean)
        .filter(s => s.length >= 4);
      if (items.length === 0) {
        throw new OcrValidationError(field, '과정을 인식할 수 없어요');
      }
      return items;
    }
  }
}
