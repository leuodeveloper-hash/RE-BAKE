/**
 * 레시피 필드용 OCR 유틸 (iOS / Android — Google ML Kit)
 * Web 구현은 recipeOcr.web.ts 참고.
 */
import TextRecognition, {TextRecognitionScript} from '@react-native-ml-kit/text-recognition';
import {parseIngredientLines, splitTableRow, stripOcrNoise} from './ocrText';

export type RecipeOcrField = 'title' | 'ingredients' | 'tools' | 'steps';

/** OCR 텍스트의 연속 공백/탭을 단일 공백으로, 줄바꿈 주변 공백 제거 */
export function normalizeOcrWhitespace(s: string): string {
  if (!s) return '';
  return s
    .replace(/[   ]/g, ' ')
    // 표 칸 사이(두 칸 공백)는 남긴다 — 하나로 합치면 재료 이름과 분량 경계가 사라진다
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/ {3,}/g, '  ')
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
  // 기기 인식기는 로컬 파일만 읽는다 — 레시피에 올라간 사진(https)이면 먼저 내려받는다
  let uri = imageUri;
  if (/^https?:/.test(imageUri)) {
    const FileSystem = require('expo-file-system/legacy');
    const target = `${FileSystem.cacheDirectory}ocr_${Date.now()}.jpg`;
    uri = (await FileSystem.downloadAsync(imageUri, target)).uri;
  }
  const result = await TextRecognition.recognize(uri, TextRecognitionScript.KOREAN);
  return normalizeOcrWhitespace(rebuildRows(result) || result.text || '');
}

/**
 * 표를 줄 단위로 다시 묶는다.
 * ML Kit은 글을 세로 단(블록) 순서로 돌려줘서, 표를 읽으면 "이름 전부 → 분량 전부"로 나와 줄이 어긋났다.
 * 인식된 줄마다 위치(frame)를 보고, 세로 가운데가 비슷한 줄끼리 한 줄로 모아 왼쪽부터 잇는다.
 * 위치가 없으면(드묾) null — 기존 글 그대로.
 */
function rebuildRows(result: {blocks?: {lines?: {text: string; frame?: {top: number; left: number; width: number; height: number}}[]}[]}): string | null {
  const lines = (result.blocks ?? []).flatMap(b => b.lines ?? [])
    .filter(l => l.text?.trim() && l.frame && l.frame.height > 0);
  if (lines.length === 0) return null;
  const items = lines.map(l => ({text: l.text.trim(), x: l.frame!.left, cy: l.frame!.top + l.frame!.height / 2, h: l.frame!.height}));
  // 한 줄로 볼 세로 거리 — 글자 높이의 절반쯤(중간값 기준이라 큰 제목에 흔들리지 않는다)
  const hs = items.map(i => i.h).sort((a, b) => a - b);
  const tol = hs[Math.floor(hs.length / 2)] * 0.55;
  items.sort((a, b) => a.cy - b.cy);
  const rows: {cy: number; cells: typeof items}[] = [];
  for (const it of items) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(it.cy - row.cy) <= tol) {
      row.cells.push(it);
      row.cy = row.cells.reduce((s, c) => s + c.cy, 0) / row.cells.length;
    } else {
      rows.push({cy: it.cy, cells: [it]});
    }
  }
  // 칸 사이는 두 칸 띄움 — 표 칸 나누기(splitTableRow)가 넓은 공백을 칸 경계로 본다
  return rows.map(r => r.cells.sort((a, b) => a.x - b.x).map(c => c.text).join('  ')).join('\n');
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
      const candidate = stripOcrNoise(lines[0] || '').slice(0, 60);
      if (candidate.length < 2) {
        throw new OcrValidationError(field, '제목으로 쓸 만한 텍스트가 없어요');
      }
      if (candidate.length > 50) {
        throw new OcrValidationError(field, '제목으로 쓰기엔 너무 길어요');
      }
      return candidate;
    }

    case 'ingredients': {
      // 레시피는 보통 표로 인쇄돼 있다 — 열을 갈라야 "박력분 400g 설탕 260g"이
      // 재료 하나로 들어가지 않는다. 표 괘선·오인식 기호도 함께 걷어낸다.
      const items = parseIngredientLines(lines)
        .map(i => (i.amount ? `${i.name} ${i.amount}` : i.name));
      if (items.length === 0) {
        throw new OcrValidationError(field, '재료를 인식할 수 없어요');
      }
      return items;
    }

    case 'tools': {
      const items = lines
        .flatMap(splitTableRow)
        .flatMap(l => l.split(/[/]/).map(s => s.trim()).filter(Boolean))
        .filter(s => s.length <= 30);
      if (items.length === 0) {
        throw new OcrValidationError(field, '도구를 인식할 수 없어요');
      }
      return items;
    }

    case 'steps': {
      const items = lines
        // 괘선·오인식 기호를 먼저 걷어낸 뒤 번호 머리를 뗀다
        .map(l => stripOcrNoise(l).replace(/^[\d①-⑨ⓐ-ⓩ.\)\-\s]+/, '').trim())
        .filter(Boolean)
        .filter(s => s.length >= 4);
      if (items.length === 0) {
        throw new OcrValidationError(field, '과정을 인식할 수 없어요');
      }
      return items;
    }
  }
}
