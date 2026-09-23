import {useCallback, useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, getDoc, setDoc} from 'firebase/firestore';
import {db} from '@config/firebase';
import {useAuth} from '@contexts/AuthContext';

const CACHE_KEY = 'explore_made';

/** {레시피 id: 표시시각 ISO} */
export type ExploreMade = Record<string, string>;

function isMadeMap(v: unknown): v is ExploreMade {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * 둘러보기 레시피 "만들었어요" 표시.
 *
 * 핀(useExplorePins)과 같은 이유로 레시피 바깥에 보관한다 — 둘러보기는 Firestore에서
 * 내려오는 공용 데이터라 madeAt을 원본에 박으면 남의 화면에도 보이고, 새로고침하면
 * 서버 데이터로 덮여 사라진다.
 *
 * 개인 학습 기록이므로 저장은 계정(users/{uid}.exploreMade) — 기기를 바꿔도 유지된다.
 * AsyncStorage는 그 캐시.
 *
 * 불린이 아니라 시각을 남기는 이유는 홈의 madeAt과 같다: 나중에 "언제 만들었나"로 넓힐 때 쓴다.
 */
export function useExploreMade() {
  const {user} = useAuth();
  const [made, setMade] = useState<ExploreMade>({});
  const [loaded, setLoaded] = useState(false);
  const uidRef = useRef<string | undefined>(undefined);
  uidRef.current = user?.uid;

  // 1) 캐시 먼저 — 네트워크를 기다리지 않고 바로 보여준다
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then(v => {
        if (!v) return;
        const parsed = JSON.parse(v);
        if (isMadeMap(parsed)) setMade(parsed);
      })
      .catch(() => { /* 무시 — 표시 없음으로 시작 */ })
      .finally(() => setLoaded(true));
  }, []);

  // 2) 로그인하면 계정 값으로 맞춘다(기기 간 동기화)
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let alive = true;
    getDoc(doc(db, 'users', uid))
      .then(snap => {
        if (!alive) return;
        const remote = snap.data()?.exploreMade;
        if (!isMadeMap(remote)) return;
        setMade(remote);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote)).catch(() => {});
      })
      // 조회 실패 시 캐시를 지우지 않는다 — 빈 상태로 덮으면 기록이 사라져 보인다
      .catch(e => console.warn('[useExploreMade] 계정 기록 불러오기 실패:', e));
    return () => { alive = false; };
  }, [user?.uid]);

  /** made=true면 표시, false면 해제 (시트에서 밀어 확정한 결과를 그대로 받는다) */
  const setRecipeMade = useCallback((recipeId: string, next: boolean) => {
    setMade(prev => {
      const updated = {...prev};
      if (next) updated[recipeId] = new Date().toISOString();
      else delete updated[recipeId];

      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated)).catch(() => {});
      const uid = uidRef.current;
      if (uid) {
        // merge: users 문서엔 handle 등 다른 필드가 있어 통째로 덮으면 안 된다
        setDoc(doc(db, 'users', uid), {exploreMade: updated}, {merge: true})
          .catch(e => console.warn('[useExploreMade] 계정 기록 저장 실패:', e));
      }
      return updated;
    });
  }, []);

  const isMade = useCallback((recipeId: string) => !!made[recipeId], [made]);

  return {made, setRecipeMade, isMade, loaded};
}
