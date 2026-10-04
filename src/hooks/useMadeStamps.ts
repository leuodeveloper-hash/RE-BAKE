import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {track} from '@utils/analytics';
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
function useMadeStampsState() {
  const {user} = useAuth();
  const [stamps, setStamps] = useState<MadeStamps>({});
  const [loaded, setLoaded] = useState(false);
  const uidRef = useRef<string | undefined>(undefined);
  uidRef.current = user?.uid;
  // 직전 로그인 uid — 로그아웃(있다가 없어짐)과 첫 실행 비로그인을 구분한다
  const prevUidRef = useRef<string | undefined>(user?.uid);

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
    if (!uid) {
      // 로그인 상태에서 풀린 경우(로그아웃)에만 비운다. 첫 실행 비로그인은
      // 로컬 퍼스트라 로컬 스탬프를 그대로 둬야 한다.
      if (prevUidRef.current) setStamps({});
      prevUidRef.current = undefined;
      return;
    }
    prevUidRef.current = uid;
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
      if (made) { next[recipeId] = new Date().toISOString(); track('bake_logged', {}); }
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

/**
 * 스탬프는 화면 하나가 아니라 앱 전체가 같이 본다.
 *
 * 훅을 화면마다 부르면 각자 useState를 들어, 상세에서 해제해도 홈·스탬프북은
 * 자기 상태를 그대로 들고 있다(저장은 되는데 화면이 안 따라온다 — 새로고침해야
 * 반영되던 이유). Context로 한 벌만 두고 나눠 쓴다.
 */
type MadeStampsValue = ReturnType<typeof useMadeStampsState>;

const MadeStampsContext = createContext<MadeStampsValue | null>(null);

export function MadeStampsProvider({children}: {children: React.ReactNode}) {
  const value = useMadeStampsState();
  return React.createElement(MadeStampsContext.Provider, {value}, children);
}

export function useMadeStamps(): MadeStampsValue {
  const ctx = useContext(MadeStampsContext);
  if (!ctx) throw new Error('useMadeStamps must be used within MadeStampsProvider');
  return ctx;
}
