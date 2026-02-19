import {ref, uploadBytes, getDownloadURL, deleteObject} from 'firebase/storage';
import {storage} from '@config/firebase';

/**
 * 레시피 이미지를 Firebase Storage에 업로드하고 다운로드 URL을 반환.
 * @param uri 로컬 이미지 URI
 * @param recipeId 레시피 ID (Storage 경로에 사용)
 */
export async function uploadRecipeImage(uri: string, recipeId: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `recipe_images/${recipeId}`);
  await uploadBytes(storageRef, blob);
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

/** 로컬 파일 경로인지 판별 (http/https가 아닌 모든 URI) */
export function isLocalUri(uri: string): boolean {
  return !uri.startsWith('http://') && !uri.startsWith('https://');
}
