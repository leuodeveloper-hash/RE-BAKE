import {useCallback, useEffect, useState} from 'react';
import {collection, getDocs, onSnapshot} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {db} from '@config/firebase';
import type {Recipe} from '../types/recipe';

const CACHE_KEY = 'explore_recipes_cache';

/** 기존 category 필드를 cookbook으로 마이그레이션 + 레거시 필드 제거 */
function migrateRecipe(recipe: any): Recipe {
  let result = recipe;
  if ('category' in result && !('cookbook' in result)) {
    const {category, ...rest} = result;
    result = {...rest, cookbook: category};
  }
  if (!result.createdAt) {
    const tsMatch = result.id?.match(/(\d{13,})/);
    const ts = tsMatch ? Number(tsMatch[1]) : 0;
    result = {...result, createdAt: new Date(ts).toISOString()};
  }
  // 레거시 imageSource / step images (번들 require 결과) 제거
  const {imageSource, ...withoutImageSource} = result;
  result = withoutImageSource;
  if (result.steps) {
    result = {...result, steps: result.steps.map(({images, ...s}: any) => s)};
  }
  if (result.stepGroups) {
    result = {...result, stepGroups: result.stepGroups.map((g: any) => ({
      ...g,
      steps: g.steps.map(({images, ...s}: any) => s),
    }))};
  }
  return result;
}

/**
 * 둘러보기 레시피를 Firestore explore_recipes 컬렉션에서 구독.
 * Firestore 연결 실패 시 캐시 사용.
 */
export interface ExploreCookbook {
  name: string;
  color: string;
}

export function useExploreRecipes(onError?: (msg: string) => void) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [exploreCookbooks, setExploreCookbooks] = useState<ExploreCookbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /** Firestore 데이터를 캐시에 저장 */
  const cacheRecipes = useCallback((firestoreRecipes: Recipe[]) => {
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(firestoreRecipes)).catch(() => {});
  }, []);

  /** Firestore 성공 시: 상태 업데이트 + 캐시 저장 */
  const applyFirestoreRecipes = useCallback((firestoreRecipes: Recipe[]) => {
    setRecipes(firestoreRecipes);
    cacheRecipes(firestoreRecipes);
  }, [cacheRecipes]);

  // explore_cookbooks 구독
  useEffect(() => {
    const colRef = collection(db, 'explore_cookbooks');
    const unsub = onSnapshot(colRef, (snapshot) => {
      setExploreCookbooks(snapshot.docs.map(d => d.data() as ExploreCookbook));
    }, () => {});
    return () => unsub();
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    const init = async () => {
      // 캐시에서 먼저 로드
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && !cancelled) {
          const parsed: Recipe[] = JSON.parse(cached);
          if (parsed.length > 0) {
            setRecipes(parsed.map(migrateRecipe));
          }
        }
      } catch {}

      if (cancelled) return;

      // Firestore 구독 시작
      const colRef = collection(db, 'explore_recipes');
      unsub = onSnapshot(colRef, (snapshot) => {
        if (snapshot.empty) {
          setRecipes([]);
        } else {
          const firestoreRecipes: Recipe[] = snapshot.docs.map(
            d => migrateRecipe({id: d.id, ...d.data()}),
          );
          applyFirestoreRecipes(firestoreRecipes);
        }
        setIsLoading(false);
      }, () => {
        onError?.('레시피를 불러오지 못했어요');
        setIsLoading(false);
      });
    };

    init();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [applyFirestoreRecipes]);

  const reload = useCallback(async () => {
    try {
      const colRef = collection(db, 'explore_recipes');
      const snapshot = await getDocs(colRef);
      if (snapshot.empty) {
        setRecipes([]);
      } else {
        const firestoreRecipes: Recipe[] = snapshot.docs.map(
          d => migrateRecipe({id: d.id, ...d.data()}),
        );
        applyFirestoreRecipes(firestoreRecipes);
      }
    } catch {
      onError?.('새로고침에 실패했어요');
    }
  }, [applyFirestoreRecipes]);

  return {recipes, exploreCookbooks, isLoading, reload};
}
