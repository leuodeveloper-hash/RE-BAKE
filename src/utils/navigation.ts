import type {Router} from 'expo-router';

/** 뒤로 갈 곳이 없을 때 기본으로 갈 곳 — 설정(프로필) 탭 */
export const SETTINGS_ROUTE = '/(tabs)/profile';

/**
 * 뒤로 가기 — 뒤로 갈 기록이 없으면(웹에서 주소로 바로 들어오거나 새로고침) 대신 fallback으로.
 * 그냥 router.back()만 부르면 X를 눌러도 아무 일이 안 일어난다.
 */
export function goBackOr(router: Pick<Router, 'canGoBack' | 'back' | 'replace'>, fallback: string = SETTINGS_ROUTE) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as any);
}
