import {Platform} from 'react-native';

/**
 * Firebase Hosting 기본 URL.
 * 호스팅 배포 전까지는 링크가 404로 뜨지만, `firebase deploy --only hosting`
 * 한 번 실행하면 그대로 동작합니다.
 */
export const SHARE_BASE_URL = 'https://bakle.web.app';

export function getRecipeShareUrl(id: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/recipe/${id}`;
  }
  return `${SHARE_BASE_URL}/recipe/${id}`;
}

/**
 * 레시피 북 공유 URL.
 * - 공식 북: `/cookbook/o/{name}` (이름 기반, 항상 최신)
 * - 개인 북 스냅샷: `/cookbook/s/{shareId}` (공유 당시 박제본)
 */
export function getCookbookShareUrl(kind: 'o' | 's', key: string): string {
  const path = `/cookbook/${kind}/${encodeURIComponent(key)}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return `${SHARE_BASE_URL}${path}`;
}
