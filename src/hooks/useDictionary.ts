import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {collection, deleteField, doc, onSnapshot, setDoc} from 'firebase/firestore';
import {db} from '@config/firebase';
import {
  applyDictionary,
  BUILTIN_METHODS,
  getDictionary,
  getDictionaryVersion,
  subscribeDictionary,
  type BakingMethod,
  type DictionaryOverride,
  type MethodCategory,
} from '@constants/bakingMethods';

const CACHE_KEY = 'dictionary_overrides';
const COLLECTION = 'dictionary';

/** 지금 사전 목록 — 고치면 이 훅을 쓰는 화면(본문 밑줄·검색·사전 페이지)이 다시 그려진다 */
export function useDictionary(): BakingMethod[] {
  const [, setV] = useState(getDictionaryVersion());
  useEffect(() => subscribeDictionary(() => setV(getDictionaryVersion())), []);
  return getDictionary();
}

/**
 * 사전 서버 동기화 — 앱에 한 번만 둔다(_layout).
 * 캐시 먼저 반영(바로 보이게), 그다음 Firestore 실시간 구독. 실패하면 캐시·기본 용어 그대로(빈 목록으로 덮지 않는다).
 */
export function useDictionarySync() {
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then(v => { if (v) applyDictionary(JSON.parse(v)); })
      .catch(() => {});
    const unsub = onSnapshot(
      collection(db, COLLECTION),
      snap => {
        const list = snap.docs.map(d => ({id: d.id, ...(d.data() as Omit<DictionaryOverride, 'id'>)}));
        applyDictionary(list);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list)).catch(() => {});
      },
      e => console.warn('[dictionary] 불러오기 실패:', e),
    );
    return unsub;
  }, []);
}

/** 항목 저장(어드민) — 새 항목이면 id 없이 */
export async function saveDictionaryTerm(term: {id?: string; name: string; description: string; category: MethodCategory}) {
  const id = term.id ?? `t_${Date.now().toString(36)}`;
  const isNew = !term.id;
  await setDoc(doc(db, COLLECTION, id), {
    name: term.name.trim(),
    description: term.description.trim(),
    category: term.category,
    deleted: deleteField(),
    ...(isNew ? {createdAt: new Date().toISOString()} : {}),
    updatedAt: new Date().toISOString(),
  }, {merge: true});
  return id;
}

/** 항목 삭제(어드민) — 기본 용어는 숨김 표시로, 새로 만든 항목도 같은 방식(되살리기 쉽게) */
export async function deleteDictionaryTerm(id: string) {
  await setDoc(doc(db, COLLECTION, id), {deleted: true, updatedAt: new Date().toISOString()}, {merge: true});
}

export {BUILTIN_METHODS};
