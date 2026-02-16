import {collection, doc, setDoc, getDoc} from 'firebase/firestore';
import {db} from '@config/firebase';
import {MOCK_RECIPES} from '@data/mockRecipes';

/** 이 값을 올리면 다음 앱 실행 시 explore_recipes가 자동 업데이트됨 */
export const EXPLORE_SEED_VERSION = 3;

/**
 * MOCK_RECIPES를 Firestore explore_recipes 컬렉션에 시딩/업데이트.
 * imageSource는 직렬화 불가하므로 제외.
 * 버전이 같으면 스킵.
 */
export async function seedExploreRecipes(): Promise<{seeded: number; skipped: boolean}> {
  const metaRef = doc(db, 'explore_meta', 'seed');
  const metaSnap = await getDoc(metaRef);
  const currentVersion = metaSnap.data()?.version ?? 0;

  if (currentVersion >= EXPLORE_SEED_VERSION) {
    return {seeded: 0, skipped: true};
  }

  const colRef = collection(db, 'explore_recipes');
  let seeded = 0;
  for (const recipe of MOCK_RECIPES) {
    const {imageSource, ...serializable} = recipe;
    await setDoc(doc(colRef, recipe.id), serializable);
    seeded++;
  }

  await setDoc(metaRef, {version: EXPLORE_SEED_VERSION});
  return {seeded, skipped: false};
}
