import {Image, Platform} from 'react-native';

/** 영역 선택(OcrCropModal)에 넘길 사진 — 로컬 경로와 원본 픽셀 크기 */
export interface OcrCropTarget {
  uri: string;
  width: number;
  height: number;
}

/**
 * 레시피에 올라간 사진(https)을 영역 선택에 쓸 수 있게 준비한다.
 * - 앱: 자르기(ImageManipulator)·인식은 로컬 파일만 다뤄서 먼저 내려받는다.
 * - 크기는 Image.getSize로 잰다(ImagePicker처럼 크기를 주지 않으므로).
 * [+] 시트와 편집 화면 입력 툴바가 같이 쓴다 — 기존 레시피 사진에서 읽기.
 */
export async function prepareRecipeImageForCrop(remoteUri: string): Promise<OcrCropTarget> {
  let uri = remoteUri;
  if (Platform.OS !== 'web' && /^https?:/.test(remoteUri)) {
    const FileSystem = require('expo-file-system/legacy');
    const target = `${FileSystem.cacheDirectory}ocr_src_${Date.now()}.jpg`;
    uri = (await FileSystem.downloadAsync(remoteUri, target)).uri;
  }
  const {width, height} = await new Promise<{width: number; height: number}>((resolve, reject) =>
    Image.getSize(uri, (w, h) => resolve({width: w, height: h}), reject),
  );
  return {uri, width, height};
}
