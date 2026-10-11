import {collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, type DocumentReference} from 'firebase/firestore';

/** 레시피마다 남기는 이전 판 수 — 많이 쌓지 않는다 */
export const MAX_RECIPE_VERSIONS = 3;

function stripUndefined(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [k, stripUndefined(v)]));
  }
  return obj;
}

/**
 * 덮어쓰기 전 판을 레시피의 history에 남기고, 최근 MAX_RECIPE_VERSIONS개만 둔다(오래된 건 지운다).
 * 실패해도 저장을 막지 않는다(기록은 보조).
 */
export async function saveRecipeVersion(recipeRef: DocumentReference, data: Record<string, unknown>): Promise<void> {
  try {
    const col = collection(recipeRef, 'history');
    await setDoc(doc(col, `${Date.now()}`), stripUndefined({...data, savedAt: new Date().toISOString()}));
    const snap = await getDocs(query(col, orderBy('savedAt', 'desc')));
    await Promise.all(snap.docs.slice(MAX_RECIPE_VERSIONS).map(d => deleteDoc(d.ref)));
  } catch { /* 무시 */ }
}
