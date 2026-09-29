import {useCallback, useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, getDoc, setDoc} from 'firebase/firestore';
import {db} from '@config/firebase';
import {useAuth} from '@contexts/AuthContext';

const CACHE_KEY = 'made_stamps';

/** {레시피 id: 만든 시각 ISO} */
export type MadeStamps = Record<string, string>;

function isStampMap(v: unknown): v is MadeStamps {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * 스탬프 — 레시피가 아니라 계정에 보관한다.
 *
 * Recipe.madeAt에만 두면 공식(둘러보기) 레시피에는 찍을 수 없다. 남의 문서라
 * 내 기록을 박을 수 없고, 가져오기를 강요하면 한 번 만들어보려던 사람이 막힌다.
 * 회고(useRecipeReviews)와 같은 자리에 둬 짝을 맞춘다.
 *
 * 내 레시피의 Recipe.madeAt은 그대로 읽는다 — 옛 기록이 사라지면 안 된다.
 */
export function useMadeStamps() {
  const {user} = useAuth();
  const [stamps, setStamps] = useState<MadeStamps>({});
  const [loaded, setLoaded] = useState(false);
  const uidRef = useRef<string | undefined>(undefined);
  uidRef.current = user?.uid;

  // 1) 캐시 먼저 — 네트워크를 기다리지 않는다
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then(v => {
        if (!v) return;
        const parsed = JSON.parse(v);
        if (isStampMap(parsed)) setStamps(parsed);
      })
      .catch(() => { /* 무시 — 스탬프 없음으로 시작 */ })
      .finally(() => setLoaded(true));
  }, []);

  // 2) 로그인하면 계정 값으로 맞춘다
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let alive = true;
    getDoc(doc(db, 'users', uid))
      .then(snap => {
        if (!alive) return;
        const remote = snap.data()?.madeStamps;
        if (!isStampMap(remote)) return;
        setStamps(remote);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote)).catch(() => {});
      })
      // 조회 실패 시 캐시를 지우지 않는다 — 빈 상태로 덮으면 스탬프가 사라져 보인다
      .catch(e => console.warn('[useMadeStamps] 계정 스탬프 불러오기 실패:', e));
    return () => { alive = false; };
  }, [user?.uid]);

  const setMade = useCallback((recipeId: string, made: boolean) => {
    setStamps(prev => {
      const next = {...prev};
      if (made) next[recipeId] = new Date().toISOString();
      else delete next[recipeId];

      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      const uid = uidRef.current;
      if (uid) {
        // merge: users 문서엔 handle 등 다른 필드가 있어 통째로 덮으면 안 된다
        setDoc(doc(db, 'users', uid), {madeStamps: next}, {merge: true})
          .catch(e => console.warn('[useMadeStamps] 계정 스탬프 저장 실패:', e));
      }
      return next;
    });
  }, []);

  /** 레시피 자체(madeAt)와 계정 보관분을 합쳐 본다 */
  const madeAtOf = useCallback(
    (recipe?: {id: string; madeAt?: string}): string | undefined => {
      if (!recipe) return undefined;
      return stamps[recipe.id] ?? recipe.madeAt;
    },
    [stamps],
  );

  return {stamps, setMade, madeAtOf, loaded};
}
