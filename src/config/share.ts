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
