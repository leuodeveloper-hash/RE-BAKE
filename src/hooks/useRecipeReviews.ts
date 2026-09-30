import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
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
function useRecipeReviewsState() {
  const {user} = useAuth();
  const [reviews, setReviews] = useState<RecipeReviews>({});
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
        if (isReviewMap(parsed)) setReviews(parsed);
      })
      .catch(() => { /* 무시 — 회고 없음으로 시작 */ })
      .finally(() => setLoaded(true));
  }, []);

  // 2) 로그인하면 계정 값으로 맞춘다
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      // 로그인 상태에서 풀린 경우(로그아웃)에만 비운다. 첫 실행 비로그인은
      // 로컬 퍼스트라 로컬 회고를 그대로 둬야 한다.
      if (prevUidRef.current) setReviews({});
      prevUidRef.current = undefined;
      return;
    }
    prevUidRef.current = uid;
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

  /**
   * 레시피 하나의 회고 전부 — 계정(여기)과 레시피 자체(Recipe.reviews)를 합친다.
   *
   * 회고를 계정으로 옮기기 전에 쓰인 것들이 레시피에 남아 있다. 읽는 쪽이 한 곳만
   * 보면 그중 절반이 사라져 보이므로, 세는 것도 보여주는 것도 이 함수를 쓴다.
   */
  const reviewsOf = useCallback((recipe?: {id: string; reviews?: ReviewData[]}): ReviewData[] => {
    if (!recipe) return [];
    const own = (recipe.reviews ?? []).filter(rv => rv.evaluation?.trim() || rv.improvement?.trim());
    const mine = reviews[recipe.id];
    return mine ? [...own, mine] : own;
  }, [reviews]);

  return {reviews, saveReview, reviewOf, reviewsOf, loaded};
}

/**
 * 회고도 스탬프와 같은 이유로 한 벌만 둔다([[useMadeStamps]] 참고) —
 * 화면마다 훅을 부르면 상세에서 쓴 회고가 회고 노트에 안 보인다.
 */
type RecipeReviewsValue = ReturnType<typeof useRecipeReviewsState>;

const RecipeReviewsContext = createContext<RecipeReviewsValue | null>(null);

export function RecipeReviewsProvider({children}: {children: React.ReactNode}) {
  const value = useRecipeReviewsState();
  return React.createElement(RecipeReviewsContext.Provider, {value}, children);
}

export function useRecipeReviews(): RecipeReviewsValue {
  const ctx = useContext(RecipeReviewsContext);
  if (!ctx) throw new Error('useRecipeReviews must be used within RecipeReviewsProvider');
  return ctx;
}
