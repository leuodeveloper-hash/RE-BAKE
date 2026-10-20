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

// ---- 올라가는 중인 사진 — 썸네일에 로딩을 띄운다(useUploadingUri) ----
const uploading = new Set<string>();
const uploadListeners = new Set<() => void>();
const notifyUploads = () => uploadListeners.forEach(l => l());
export function isUploadingUri(uri: string): boolean { return uploading.has(uri); }
export function subscribeUploads(l: () => void): () => void {
  uploadListeners.add(l);
  return () => { uploadListeners.delete(l); };
}

/** 업로드 사진 긴 변 최대(px) — 화면·뷰어에서 충분히 선명하고 용량은 수백 KB */
const UPLOAD_MAX_EDGE = 1600;
/** 한 장 최대 용량 — Storage 규칙(storage.rules)과 같은 값 */
const UPLOAD_MAX_BYTES = 1024 * 1024;
/** 용량을 넘으면 차례로 — [긴 변, JPEG 품질] */
const COMPRESS_STEPS: [number, number][] = [[UPLOAD_MAX_EDGE, 0.75], [1280, 0.7], [1024, 0.6]];

/**
 * 올리기 전 압축 — 긴 변을 UPLOAD_MAX_EDGE로 줄이고 JPEG로 다시 저장한다(작으면 크기는 그대로, 품질만).
 * 원본은 절대 올리지 않는다 — 압축이 안 되면 업로드를 멈추고 에러를 낸다(사진은 기기에 남아 다음 저장 때 다시 시도).
 */
async function compressForUpload(uri: string): Promise<string> {
  try {
    const {ImageManipulator, SaveFormat} = require('expo-image-manipulator');
    const original = await ImageManipulator.manipulate(uri).renderAsync();
    const web = Platform.OS === 'web';
    // 용량 제한 — 넘으면 크기·품질을 한 단계씩 낮춰 다시. 끝까지 넘으면 올리지 않는다
    for (const [edge, quality] of COMPRESS_STEPS) {
      const long = Math.max(original.width, original.height);
      const image = long > edge
        ? await ImageManipulator.manipulate(uri)
          .resize(original.width >= original.height ? {width: edge} : {height: edge})
          .renderAsync()
        : original;
      const out = await image.saveAsync({compress: quality, format: SaveFormat.JPEG, base64: web});
      const bytes = web ? Math.floor((out.base64?.length ?? 0) * 3 / 4) : await fileSize(out.uri);
      if (bytes > 0 && bytes < UPLOAD_MAX_BYTES) return web ? `data:image/jpeg;base64,${out.base64}` : out.uri;
    }
  } catch (e) {
    console.warn('[imageUpload] 압축 실패 — 원본은 올리지 않는다:', e);
    throw new Error('image/compress-failed');
  }
  throw new Error('image/too-large');
}

async function fileSize(uri: string): Promise<number> {
  const FileSystem = require('expo-file-system/legacy');
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? (info.size ?? 0) : 0;
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
export async function uploadImageTo(rawUri: string, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  uploading.add(rawUri);
  notifyUploads();
  try {
    return await uploadCompressed(rawUri, storageRef, path);
  } finally {
    uploading.delete(rawUri);
    notifyUploads();
  }
}

async function uploadCompressed(rawUri: string, storageRef: ReturnType<typeof ref>, path: string): Promise<string> {
  // 폰 원본(수 MB)을 그대로 올리면 느리고 실패도 잦다 — 올리기 전에 줄인다
  const uri = await compressForUpload(rawUri);

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

/** 폰·브라우저 안 사진 주소인지 — 다른 기기에서는 열리지 않는다 */
const LOCAL_IMAGE_RE = /^(file:|ph:|content:|assets-library:|blob:|data:image)/i;

/**
 * 레시피 안에 남은 폰 안 사진 주소를 모두 찾는다(대표·추가·과정·조언·회고 사진 어디든).
 * 서버에 저장하기 직전 검사용 — 하나라도 있으면 업로드가 빠졌거나 실패한 것.
 */
export function findLocalImageUris(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    if (LOCAL_IMAGE_RE.test(value)) out.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) findLocalImageUris(v, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) findLocalImageUris(v, out);
  }
  return out;
}

/** 사진 못 올림 오류인지 — 저장 실패 안내를 사진 문구로 바꿀 때 */
export const isImagesNotUploaded = (e: any): e is {code: 'images-not-uploaded'; count: number} => e?.code === 'images-not-uploaded';
