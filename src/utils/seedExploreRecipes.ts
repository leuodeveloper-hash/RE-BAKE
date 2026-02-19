import {collection, doc, getDoc, writeBatch} from 'firebase/firestore';
import {db} from '@config/firebase';
import {EXPLORE_MOCK_RECIPES} from '@data/mockRecipes';

/** 이 값을 올리면 다음 앱 실행 시 explore_recipes가 자동 업데이트됨 */
export const EXPLORE_SEED_VERSION = 5;

/**
 * EXPLORE_MOCK_RECIPES를 Firestore explore_recipes 컬렉션에 시딩/업데이트.
 * imageSource는 직렬화 불가하므로 제외.
 * 버전이 같으면 스킵.
 * writeBatch로 원자적으로 쓰기하여 onSnapshot이 한 번만 트리거되도록 함.
 */
export async function seedExploreRecipes(): Promise<{seeded: number; skipped: boolean}> {
  const metaRef = doc(db, 'explore_meta', 'seed');
  const metaSnap = await getDoc(metaRef);
  const currentVersion = metaSnap.data()?.version ?? 0;

  if (currentVersion >= EXPLORE_SEED_VERSION) {
    return {seeded: 0, skipped: true};
  }

  const batch = writeBatch(db);
  const colRef = collection(db, 'explore_recipes');
  for (const recipe of EXPLORE_MOCK_RECIPES) {
    const {imageSource, ...serializable} = recipe;
    batch.set(doc(colRef, recipe.id), serializable);
  }
  batch.set(metaRef, {version: EXPLORE_SEED_VERSION});
  await batch.commit();

  return {seeded: EXPLORE_MOCK_RECIPES.length, skipped: false};
}
