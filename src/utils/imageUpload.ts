import {ref, uploadBytes, uploadString, getDownloadURL, deleteObject} from 'firebase/storage';
import {Platform} from 'react-native';
import {storage} from '@config/firebase';

/**
 * 웹에서 blob: URL을 data: URL(base64)로 즉시 변환.
 * blob URL은 일시적이므로 선택 직후 호출해야 함.
 */
export async function getPersistentUri(uri: string, base64?: string | null): Promise<string> {
  // 네이티브: ImagePicker/카메라가 준 uri는 캐시(임시) 경로라 iOS가 비우면 사라진다.
  // documentDirectory로 복사해 영구 보관 (재진입/앱 재시작 후에도 유지).
  if (Platform.OS !== 'web') {
    try {
      const FileSystem = require('expo-file-system');
      if (!FileSystem?.documentDirectory) return uri;
      const dir = `${FileSystem.documentDirectory}recipe_photos/`;
      await FileSystem.makeDirectoryAsync(dir, {intermediates: true}).catch(() => {});
      const ext = (uri.split('?')[0].split('.').pop() || 'jpg').slice(0, 5);
      const dest = `${dir}${Date.now()}_${Math.floor(Math.random() * 1e9)}.${ext}`;
      await FileSystem.copyAsync({from: uri, to: dest});
      return dest;
    } catch (e) {
      console.warn('[getPersistentUri] native copy failed', e);
      return uri;
    }
  }
  // 이미 base64가 있으면 data URL로
  if (base64) return `data:image/jpeg;base64,${base64}`;
  // blob: URL → data URL 변환
  if (uri.startsWith('blob:')) {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return uri;
}

/**
 * 레시피 이미지를 Firebase Storage에 업로드하고 다운로드 URL을 반환.
 * @param uri 로컬 이미지 URI (file://, data:, blob:)
 * @param recipeId 레시피 ID (Storage 경로에 사용)
 */
export async function uploadRecipeImage(uri: string, recipeId: string): Promise<string> {
  const storageRef = ref(storage, `recipe_images/${recipeId}`);

  if (uri.startsWith('data:')) {
    // data: URL → base64 추출 → uploadString
    const base64 = uri.split(',')[1];
    const contentType = uri.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    await uploadString(storageRef, base64, 'base64', {contentType});
  } else if (Platform.OS === 'web') {
    // 웹: blob: URL → fetch → uploadBytes
    const response = await fetch(uri);
    const blob = await response.blob();
    await uploadBytes(storageRef, blob);
  } else {
    // 네이티브: expo-file-system base64 → uploadString
    const FileSystem = require('expo-file-system');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await uploadString(storageRef, base64, 'base64', {contentType: 'image/jpeg'});
  }

  return getDownloadURL(storageRef);
}

/**
 * Firebase Storage에서 레시피 이미지 삭제.
 */
export async function deleteRecipeImage(recipeId: string): Promise<void> {
  const storageRef = ref(storage, `recipe_images/${recipeId}`);
  try {
    await deleteObject(storageRef);
  } catch {
    // 이미지가 없으면 무시
  }
}

/** 로컬/임시 URI인지 판별 (Firebase Storage URL이 아닌 모든 URI) */
export function isLocalUri(uri: string): boolean {
  if (uri.startsWith('blob:')) return true;
  if (uri.startsWith('data:')) return true;
  return !uri.startsWith('http://') && !uri.startsWith('https://');
}
