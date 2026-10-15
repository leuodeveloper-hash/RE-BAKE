import AsyncStorage from '@react-native-async-storage/async-storage';
import {collection, getDocs, updateDoc} from 'firebase/firestore';
import {db} from '@config/firebase';
import type {Recipe} from '../types/recipe';

/** 제빵에서만 쓰는 칸 — 반죽 온도, 분할 무게 */
export const BREAD_FIELDS = ['doughTemp', 'divideWeight'];

/** 편집 화면의 기본 칸(activeFieldIds가 없던 레시피의 기준) */
const DEFAULT_FIELDS = [
  'info', 'photo', 'time', 'ingredients', 'tools', 'steps', 'servings',
  'method', 'ratio', 'cookbook', 'advice', 'review', 'source', 'origin',
];

/** 제빵 레시피인지 — 레시피북 이름에 '제빵'이 들어가고 팁이 아닌 것('제과제빵 팁' 같은 팁 북 제외) */
export function isBreadRecipe(r: Pick<Recipe, 'cookbook' | 'kind'>): boolean {
  return !!r.cookbook && r.cookbook.includes('제빵') && r.kind !== 'tip';
}

/** 칸 목록에 제빵 칸을 더한다 — 이미 있으면 null(바꿀 것 없음) */
export function withBreadFields(ids: string[] | undefined): string[] | null {
  const base = ids ?? DEFAULT_FIELDS;
  const missing = BREAD_FIELDS.filter(f => !base.includes(f));
  return missing.length ? [...base, ...missing] : null;
}

/**
 * 실제로 켜진 칸 — 편집·상세가 같은 규칙을 쓴다. 제빵 레시피는 저장된 목록에 없어도 반죽 온도·분할 무게를 켠다.
 * (편집만 이 규칙을 써서, 상세에선 값이 있어도 두 칸이 안 보였다)
 * ids가 없으면(예전 레시피) undefined 그대로 — 상세는 '전부 켜짐'으로 본다.
 */
export function effectiveActiveFields(ids: string[] | undefined, r: Pick<Recipe, 'cookbook' | 'kind'>): string[] | undefined {
  if (!ids || !isBreadRecipe(r)) return ids;
  return withBreadFields(ids) ?? ids;
}

const FLAG = 'bread_fields_migrated_v1';

/**
 * 공식(둘러보기) 제빵 레시피에 반죽 온도·분할 무게 칸을 켠다(어드민 1회).
 * 개인 레시피는 호출부가 setRecipes로 같은 규칙을 적용한다.
 */
export async function migrateExploreBreadFields(): Promise<number> {
  if (await AsyncStorage.getItem(FLAG).catch(() => null)) return 0;
  const snap = await getDocs(collection(db, 'explore_recipes'));
  let n = 0;
  await Promise.all(snap.docs.map(d => {
    const r = d.data() as Recipe;
    if (!isBreadRecipe(r)) return null;
    const next = withBreadFields(r.activeFieldIds);
    if (!next) return null;
    n += 1;
    return updateDoc(d.ref, {activeFieldIds: next});
  }));
  await AsyncStorage.setItem(FLAG, '1').catch(() => {});
  return n;
}
