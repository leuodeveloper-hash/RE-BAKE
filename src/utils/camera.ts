import {Platform} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * 촬영 — 찍은 사진을 폰 사진첩에도 남긴다.
 * 예전엔 앱 안 폴더에만 두어, 앱을 지우거나 업로드 전에 문제가 생기면 사진이 사라졌다.
 * 사진첩 저장은 실패해도(권한 거절 등) 촬영 결과는 그대로 쓴다.
 */
export async function launchCamera(options: ImagePicker.ImagePickerOptions = {}): Promise<ImagePicker.ImagePickerResult> {
  const result = await ImagePicker.launchCameraAsync(options);
  if (Platform.OS !== 'web' && !result.canceled) {
    try {
      const MediaLibrary = require('expo-media-library');
      // 저장만(읽기 권한 없이) — 사진첩 전체 접근을 묻지 않는다
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (perm.granted) {
        for (const a of result.assets) {
          if (a.type !== 'video') await MediaLibrary.saveToLibraryAsync(a.uri);
        }
      }
    } catch (e) {
      console.warn('[camera] 사진첩 저장 실패:', e);
    }
  }
  return result;
}
