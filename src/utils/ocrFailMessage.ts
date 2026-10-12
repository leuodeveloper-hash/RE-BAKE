import {Platform} from 'react-native';

/**
 * 이미지 인식 실패 문구 — 웹이면 앱 안내로 바꾼다.
 * 웹은 브라우저 안 인식기(Tesseract)라 한글·표를 잘 못 읽는다. 앱(기기 인식기)이 훨씬 정확해서,
 * 실패했을 때 "앱에서 다시"를 알려 주는 편이 막는 것보다 낫다.
 * 인식 실패 스낵바는 모두 이 함수로 문구를 고른다.
 */
export function ocrFailMessage(t: (key: string) => string, key: string): string {
  return Platform.OS === 'web' ? t('ocr.failedWeb') : t(key);
}
