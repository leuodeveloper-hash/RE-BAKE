import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 계정에 딸린 로컬 캐시 키 — 로그아웃 시 전부 지운다.
 * 여기 한 곳에만 모아 둔다. 새 캐시를 만들면 이 목록에 추가할 것.
 * (키를 각 훅에 흩뿌려 두면 로그아웃해도 이전 계정 데이터가 그대로 남는다)
 */
const ACCOUNT_CACHE_KEYS = [
  'bakle_recipes_v4',   // 내 레시피
  'made_stamps',        // 스탬프
  'recipe_reviews',     // 회고
  'explore_pins',       // 둘러보기 고정
  'bakle_sync_queue',   // 업로드 대기 큐
  '@bakle_avatar_seed', // 아바타
  '@bakle_photo_cloud_backup',
  '@bakle_exam_notif_prefs',
];

/**
 * 기기(계정 무관) 설정은 남긴다: '@bakle_language',
 * 둘러보기 캐시('explore_*_cache')는 공용 데이터라 지울 필요가 없다.
 */
export async function clearAccountCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(ACCOUNT_CACHE_KEYS);
  } catch {
    // 캐시 삭제 실패로 로그아웃 자체를 막지는 않는다
  }
}
