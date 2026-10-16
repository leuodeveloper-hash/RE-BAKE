import {ref, uploadBytes, uploadString, getDownloadURL, deleteObject} from 'firebase/storage';
import {Platform} from 'react-native';
import {auth, storage} from '@config/firebase';

/**
 * 네이티브 파일 업로드 — expo-file-system이 파일을 그대로 보낸다(자바스크립트로 파일을 읽지 않음).
 * 받는 쪽은 Firebase Storage REST. 권한 규칙은 SDK와 똑같이 적용된다(로그인 토큰을 같이 보낸다).
 */
async function uploadNativeFile(uri: string, path: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('storage/unauthenticated');
  const token = await user.getIdToken();
  const bucket = storage.app.options.storageBucket;
  const name = encodeURIComponent(path);
  const FileSystem = require('expo-file-system/legacy');
  const res = await FileSystem.uploadAsync(
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${name}`,
    uri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {Authorization: `Firebase ${token}`, 'Content-Type': 'image/jpeg'},
    },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`storage/upload-failed (${res.status}) ${String(res.body).slice(0, 200)}`);
  }
  const body = JSON.parse(res.body);
  const dl = String(body.downloadTokens ?? '').split(',')[0];
  if (!dl) throw new Error('storage/no-download-token');
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${name}?alt=media&token=${dl}`;
}

/**
 * 웹에서 blob: URL을 data: URL(base64)로 즉시 변환.
 * blob URL은 일시적이므로 선택 직후 호출해야 함.
 */
export async function getPersistentUri(uri: string, base64?: string | null): Promise<string> {
  // 네이티브: ImagePicker/카메라가 준 uri는 캐시(임시) 경로라 iOS가 비우면 사라진다.
  // documentDirectory로 복사해 영구 보관 (재진입/앱 재시작 후에도 유지).
  if (Platform.OS !== 'web') {
    try {
      // SDK 54부터 기본 진입점은 새 API라 documentDirectory가 없다 → 복사를 건너뛰고
      // 임시(캐시) 경로를 그대로 써서, iOS가 캐시를 비우면 사진이 사라졌다. 기존 API는 /legacy.
      const FileSystem = require('expo-file-system/legacy');
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
  return uploadImageTo(uri, `recipe_images/${recipeId}`);
}

/**
 * 임의 경로로 이미지를 올린다 — 레시피 사진 외의 용도(OCR 로그 등).
 * 웹(data:/blob:)과 네이티브(file:)가 올리는 방식이 달라 한 곳에 모은다.
 */
export async function uploadImageTo(uri: string, path: string): Promise<string> {
  const storageRef = ref(storage, path);

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
    // 네이티브: 기기가 파일을 직접 Storage(REST)로 보낸다.
    // base64 → uploadString은 리액트 네이티브에서 Blob을 못 만들어 실패하고, 실패하면 폰 안 경로가
    // 그대로 저장돼 다른 기기에서 사진이 안 보였다. fetch → Blob은 아이폰에서 빈 파일이 올라갔다.
    return uploadNativeFile(uri, path);
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

/** 레시피 상단(대표+추가) 사진 최대 장수 — 편집 화면·상세 뷰어 공용 */
export const MAX_HERO_PHOTOS = 3;
