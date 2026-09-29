import {addDoc, collection, serverTimestamp} from 'firebase/firestore';
import {Platform} from 'react-native';
import {db} from '@config/firebase';
import {uploadImageTo} from './imageUpload';

/** 어디서 인식을 시도했는지 — 같은 실패라도 자리마다 원인이 다르다 */
export type OcrSource =
  | 'edit.title'        // 편집 화면 제목 필드
  | 'edit.ingredients'  // 편집 화면 재료 필드
  | 'edit.tools'        // 편집 화면 도구 필드
  | 'edit.steps'        // 편집 화면 과정 필드
  | 'inputBar'          // 입력 플로팅바 (필드는 그때그때 다름)
  | 'cookingMode';      // 요리모드 사진 → 텍스트

export interface OcrLogInput {
  source: OcrSource;
  /** 플로팅바처럼 source만으로 필드를 알 수 없을 때 */
  field?: string;
  ok: boolean;
  /** 인식된 글자 수 — 0이면 아무것도 못 읽은 것 */
  textLength: number;
  /** 파싱까지 끝난 항목 수(재료 n개 등). 실패면 0 */
  itemCount?: number;
  /** 실패 사유 — 인식 실패인지 파싱 실패인지 갈린다 */
  error?: string;
  /** 인식에 쓴 이미지 — 무엇을 넣었는지 봐야 왜 실패했는지 안다 */
  imageUrl?: string;
  uid?: string;
}

/**
 * OCR 시도를 기록한다.
 *
 * 실패해도 사용자에겐 "인식할 수 없어요" 한 줄만 뜬다. 어떤 이미지를 어디에
 * 넣었길래 실패했는지 남지 않으면 파서를 고칠 근거가 없다.
 *
 * 기록 실패가 OCR 자체를 막아서는 안 된다 — 조용히 넘긴다.
 */
export async function logOcrAttempt(input: OcrLogInput): Promise<void> {
  try {
    await addDoc(collection(db, 'ocr_logs'), {
      ...input,
      platform: Platform.OS,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[ocrLog] 기록 실패:', e);
  }
}

/**
 * 인식에 쓴 이미지를 올리고 로그를 남긴다.
 *
 * 이미지 업로드가 오래 걸리거나 실패해도 OCR 흐름을 막지 않는다 —
 * 호출하는 쪽은 await하지 않고 흘려보낸다.
 */
export async function logOcrWithImage(
  input: Omit<OcrLogInput, 'imageUrl'>,
  imageUri: string,
): Promise<void> {
  let imageUrl: string | undefined;
  try {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    imageUrl = await uploadImageTo(imageUri, `ocr_logs/${id}`);
  } catch (e) {
    // 이미지를 못 올려도 시도 자체는 기록한다 — 자리·사유만으로도 단서가 된다
    console.warn('[ocrLog] 이미지 업로드 실패:', e);
  }
  await logOcrAttempt({...input, imageUrl});
}
