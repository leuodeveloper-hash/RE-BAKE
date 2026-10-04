import AsyncStorage from '@react-native-async-storage/async-storage';

/** 내 레시피 로컬 저장 키 */
export const RECIPES_STORAGE_KEY = 'bakle_recipes_v4';
/**
 * 클라우드 동기화가 꺼진 동안(게스트·무료) 로컬에서 만들거나 고친 레시피 id 목록.
 * 다시 Pro가 됐을 때 이것만 클라우드에 합친다 — 로컬 전체를 합치면
 * 다른 기기에서 지운 레시피가 되살아난다.
 */
export const LOCAL_EDITS_KEY = 'bakle_recipes_local_edits';

/**
 * 계정에 딸린 로컬 캐시 키 — 로그아웃 시 전부 지운다.
 * 여기 한 곳에만 모아 둔다. 새 캐시를 만들면 이 목록에 추가할 것.
 * (키를 각 훅에 흩뿌려 두면 로그아웃해도 이전 계정 데이터가 그대로 남는다)
 */
const ACCOUNT_CACHE_KEYS = [
  RECIPES_STORAGE_KEY,  // 내 레시피
  LOCAL_EDITS_KEY,      // 로컬 수정 id
  'made_stamps',        // 스탬프
  'recipe_reviews',     // 회고
  'explore_pins',       // 둘러보기 고정
  'bakle_sync_queue',   // 업로드 대기 큐
  '@bakle_avatar_seed', // 아바타
  '@bakle_photo_cloud_backup',
  '@bakle_exam_notif_prefs',
  '@bakle_exam_chosen_dates', // 내가 고른 시험일
  '@bakle_custom_ddays', // 내 D-day
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

// ── 로그아웃해도 레시피는 이 기기에 남긴다 ──
// 무료 등급은 로컬이 유일한 사본이라 지우면 영영 사라진다.
// 로그아웃 때 계정별 키로 옮겨 두고(다른 계정·게스트에겐 안 보임),
// 같은 계정으로 다시 로그인하면 되돌린다.
const PARKED_KEYS = [RECIPES_STORAGE_KEY, LOCAL_EDITS_KEY];
const parkedKey = (key: string, uid: string) => `${key}@${uid}`;

export async function parkAccountRecipes(uid: string): Promise<void> {
  const entries = await AsyncStorage.multiGet(PARKED_KEYS);
  const toSave = entries
    .filter(([, v]) => v != null)
    .map(([k, v]) => [parkedKey(k, uid), v as string] as [string, string]);
  if (toSave.length > 0) await AsyncStorage.multiSet(toSave);
}

/** 보관해 둔 계정 레시피를 되돌린다. 로그인 전 게스트로 만든 레시피가 있으면 합친다. */
export async function restoreAccountRecipes(uid: string): Promise<void> {
  const [[, parkedRecipes], [, parkedEdits]] = await AsyncStorage.multiGet(
    PARKED_KEYS.map(k => parkedKey(k, uid)),
  );
  if (parkedRecipes == null && parkedEdits == null) return;

  const [[, guestRecipes], [, guestEdits]] = await AsyncStorage.multiGet(PARKED_KEYS);
  const parse = (v: string | null): any[] => {
    try { return v ? JSON.parse(v) : []; } catch { return []; }
  };
  const account = parse(parkedRecipes);
  const accountIds = new Set(account.map(r => r.id));
  const recipes = [...account, ...parse(guestRecipes).filter(r => !accountIds.has(r.id))];
  const edits = Array.from(new Set([...parse(parkedEdits), ...parse(guestEdits)]));

  await AsyncStorage.multiSet([
    [RECIPES_STORAGE_KEY, JSON.stringify(recipes)],
    [LOCAL_EDITS_KEY, JSON.stringify(edits)],
  ]);
  await AsyncStorage.multiRemove(PARKED_KEYS.map(k => parkedKey(k, uid)));
}
