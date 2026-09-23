import {Platform} from 'react-native';
// SDK 54에서 expo-file-system 기본 진입점이 새 API로 바뀌어 cacheDirectory/
// downloadAsync가 없다. 기존 API는 /legacy에 남아 있다.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * 사진을 기기에 저장한다.
 *
 * expo-media-library(갤러리 직접 저장) 대신 공유 시트를 쓴다 — 새 네이티브 의존성과
 * 사진첩 쓰기 권한을 늘리지 않고도 "이미지 저장"을 고를 수 있다.
 * 웹은 <a download>로 곧바로 내려받는다.
 *
 * @returns 성공 여부. 사용자가 공유 시트를 닫은 경우도 true(실패가 아니다).
 */
export async function savePhoto(uri: string, filename = 'bakle-photo.jpg'): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      const a = document.createElement('a');
      a.href = uri;
      a.download = filename;
      // 원격 이미지는 download 속성이 무시될 수 있다(교차 출처) → 새 탭으로라도 연다
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    if (!(await Sharing.isAvailableAsync())) return false;

    // 원격 URL이면 먼저 내려받는다 — 공유 시트는 로컬 파일만 받는다
    let localUri = uri;
    if (/^https?:/.test(uri)) {
      const target = `${FileSystem.cacheDirectory}${Date.now()}-${filename}`;
      const {uri: downloaded} = await FileSystem.downloadAsync(uri, target);
      localUri = downloaded;
    }

    await Sharing.shareAsync(localUri, {
      mimeType: 'image/jpeg',
      dialogTitle: filename,
      UTI: 'public.jpeg',
    });
    return true;
  } catch (e) {
    console.warn('[savePhoto] 저장 실패:', e);
    return false;
  }
}
