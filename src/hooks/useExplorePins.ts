import {useCallback, useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, getDoc, setDoc} from 'firebase/firestore';
import {db} from '@config/firebase';
import {useAuth} from '@contexts/AuthContext';

const CACHE_KEY = 'explore_pins';

/** {레시피 id: 고정시각 ISO} */
export type ExplorePins = Record<string, string>;

function isPinMap(v: unknown): v is ExplorePins {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * 둘러보기 레시피 상단 고정.
 *
 * 홈(내 레시피)은 레시피 자체에 pinnedAt을 남기지만, 둘러보기는 Firestore에서
 * 내려오는 공용 데이터라 같은 방식을 쓸 수 없다 — 내 핀이 공용 레시피 원본에
 * 박히고, 새로고침하면 서버 데이터로 덮여 사라진다.
 * 그래서 핀은 레시피 바깥에 ID → 고정시각으로 따로 보관한다.
 *
 * 저장은 계정(users/{uid}.explorePins)이라 기기를 바꿔도 유지된다.
 * AsyncStorage는 그 캐시 — 앱을 켜자마자 핀이 보이게 하고, 오프라인이거나
 * 로그인 전에도 마지막 상태를 유지한다.
 *
 * 시각을 남기는 이유는 홈과 같다: 여러 개를 고정했을 때 먼저 고정한 것이 위.
 */
export function useExplorePins() {
  const {user} = useAuth();
  const [pins, setPins] = useState<ExplorePins>({});
  // 로드 전에 저장값을 덮어쓰지 않도록 하는 플래그
  const [loaded, setLoaded] = useState(false);
  // 서버 쓰기는 uid가 있을 때만. 로그아웃 상태의 변경은 캐시에만 남는다.
  const uidRef = useRef<string | undefined>(undefined);
  uidRef.current = user?.uid;

  // 1) 캐시 먼저 — 네트워크를 기다리지 않고 바로 보여준다
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then(v => {
        if (!v) return;
        const parsed = JSON.parse(v);
        if (isPinMap(parsed)) setPins(parsed);
      })
      .catch(() => { /* 무시 — 핀 없음으로 시작 */ })
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
        const remote = snap.data()?.explorePins;
        if (!isPinMap(remote)) return;
        setPins(remote);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote)).catch(() => {});
      })
      // 조회 실패 시 캐시를 지우지 않는다 — 빈 상태로 덮으면 핀이 사라져 보인다
      .catch(e => console.warn('[useExplorePins] 계정 핀 불러오기 실패:', e));
    return () => { alive = false; };
  }, [user?.uid]);

  const togglePin = useCallback((recipeId: string) => {
    setPins(prev => {
      const next = {...prev};
      if (next[recipeId]) delete next[recipeId];
      else next[recipeId] = new Date().toISOString();

      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      const uid = uidRef.current;
      if (uid) {
        // merge: users 문서엔 handle 등 다른 필드가 있어 통째로 덮으면 안 된다
        setDoc(doc(db, 'users', uid), {explorePins: next}, {merge: true})
          .catch(e => console.warn('[useExplorePins] 계정 핀 저장 실패:', e));
      }
      return next;
    });
  }, []);

  const isPinned = useCallback((recipeId: string) => !!pins[recipeId], [pins]);

  return {pins, togglePin, isPinned, loaded};
}
