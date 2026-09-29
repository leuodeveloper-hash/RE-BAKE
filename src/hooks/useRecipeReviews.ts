import {useCallback, useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, getDoc, setDoc} from 'firebase/firestore';
import {db} from '@config/firebase';
import {useAuth} from '@contexts/AuthContext';
import type {ReviewData} from '@components/Dialog/ReviewDialog';

const CACHE_KEY = 'recipe_reviews';

/** {레시피 id: 회고} */
export type RecipeReviews = Record<string, ReviewData>;

function isReviewMap(v: unknown): v is RecipeReviews {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * 레시피별 회고 — 레시피가 아니라 계정에 보관한다.
 *
 * Recipe.reviews에 넣으면 공식(둘러보기) 레시피에는 쓸 수 없다. 남의 문서라
 * 내 회고를 박을 수 없고, 새로고침하면 서버 데이터로 덮인다.
 * 스탬프(madeAt)와 같은 성격 — "내가 그 레시피를 어떻게 했는지"라서 여기 둔다.
 *
 * 저장은 계정(users/{uid}.recipeReviews)이라 기기를 바꿔도 유지된다.
 * AsyncStorage는 그 캐시.
 */
export function useRecipeReviews() {
  const {user} = useAuth();
  const [reviews, setReviews] = useState<RecipeReviews>({});
  const [loaded, setLoaded] = useState(false);
  const uidRef = useRef<string | undefined>(undefined);
  uidRef.current = user?.uid;

  // 1) 캐시 먼저 — 네트워크를 기다리지 않는다
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then(v => {
        if (!v) return;
        const parsed = JSON.parse(v);
        if (isReviewMap(parsed)) setReviews(parsed);
      })
      .catch(() => { /* 무시 — 회고 없음으로 시작 */ })
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
        const remote = snap.data()?.recipeReviews;
        if (!isReviewMap(remote)) return;
        setReviews(remote);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote)).catch(() => {});
      })
      // 조회 실패 시 캐시를 지우지 않는다 — 빈 상태로 덮으면 회고가 사라져 보인다
      .catch(e => console.warn('[useRecipeReviews] 계정 회고 불러오기 실패:', e));
    return () => { alive = false; };
  }, [user?.uid]);

  const saveReview = useCallback((recipeId: string, review: ReviewData) => {
    setReviews(prev => {
      const next = {...prev};
      const empty = !review.evaluation?.trim() && !review.improvement?.trim();
      if (empty) delete next[recipeId];
      else next[recipeId] = review;

      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      const uid = uidRef.current;
      if (uid) {
        // merge: users 문서엔 handle 등 다른 필드가 있어 통째로 덮으면 안 된다
        setDoc(doc(db, 'users', uid), {recipeReviews: next}, {merge: true})
          .catch(e => console.warn('[useRecipeReviews] 계정 회고 저장 실패:', e));
      }
      return next;
    });
  }, []);

  const reviewOf = useCallback((recipeId: string) => reviews[recipeId], [reviews]);

  return {reviews, saveReview, reviewOf, loaded};
}
