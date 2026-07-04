import {useCallback, useEffect, useState} from 'react';
import {collection, getDocs} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {db} from '@config/firebase';
import type {Recipe} from '../types/recipe';

const CACHE_KEY = 'explore_recipes_cache';
const COOKBOOKS_CACHE_KEY = 'explore_cookbooks_cache';
const CACHE_TS_KEY = 'explore_cache_ts';
/**
 * 캐시 신선도(TTL). 이 시간 안이면 Firestore를 아예 호출하지 않고 캐시만 사용한다.
 * 둘러보기 콘텐츠는 자주 바뀌지 않으므로 읽기 비용을 크게 줄인다. 갱신은 당김-새로고침(reload).
 */
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12h

/**
 * 표시용 레시피만 필터. 만료 소프트삭제 문서의 영구 삭제는 서버측(스케줄 Cloud Function)이 담당한다.
 * (예전엔 클라이언트가 스냅샷마다 deleteDoc을 날려 중복 쓰기 비용이 발생 → 제거)
 */
function filterVisible(allRecipes: Recipe[]): Recipe[] {
  return allRecipes.filter(r => !r.deletedAt);
}

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
 * 둘러보기 레시피를 Firestore explore_recipes 컬렉션에서 로드.
 * 실시간 구독(onSnapshot) 대신 캐시-우선 + 1회 getDocs로 읽기 비용을 최소화한다.
 * - 캐시가 TTL 이내면 Firestore 호출 없이 캐시만 사용
 * - TTL 만료/캐시 없음이면 getDocs 1회로 갱신
 * - 명시적 갱신은 reload()
 * Firestore 실패 시 캐시를 유지하고 에러만 알린다.
 */
export interface ExploreCookbook {
  name: string;
  color: string;
}

export function useExploreRecipes(onError?: (msg: string) => void) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [exploreCookbooks, setExploreCookbooks] = useState<ExploreCookbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /** Firestore에서 recipes + cookbooks를 1회 읽고 상태·캐시 갱신 */
  const fetchFromFirestore = useCallback(async () => {
    const [recSnap, cbSnap] = await Promise.all([
      getDocs(collection(db, 'explore_recipes')),
      getDocs(collection(db, 'explore_cookbooks')),
    ]);
    const allRecipes: Recipe[] = recSnap.docs.map(d => migrateRecipe({id: d.id, ...d.data()}));
    const visible = filterVisible(allRecipes);
    const cookbooks: ExploreCookbook[] = cbSnap.docs.map(d => d.data() as ExploreCookbook);
    setRecipes(visible);
    setExploreCookbooks(cookbooks);
    AsyncStorage.multiSet([
      [CACHE_KEY, JSON.stringify(visible)],
      [COOKBOOKS_CACHE_KEY, JSON.stringify(cookbooks)],
      [CACHE_TS_KEY, String(Date.now())],
    ]).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1) 캐시 먼저 로드
      let cacheFresh = false;
      try {
        const [[, rc], [, cbc], [, ts]] = await AsyncStorage.multiGet([
          CACHE_KEY,
          COOKBOOKS_CACHE_KEY,
          CACHE_TS_KEY,
        ]);
        if (!cancelled && rc) {
          const parsed: Recipe[] = JSON.parse(rc);
          if (parsed.length > 0) setRecipes(parsed.map(migrateRecipe));
        }
        if (!cancelled && cbc) {
          setExploreCookbooks(JSON.parse(cbc));
        }
        cacheFresh = !!ts && Date.now() - Number(ts) < CACHE_TTL;
      } catch {}

      if (cancelled) return;

      // 2) 캐시가 신선하면 Firestore 호출 생략 (읽기 0)
      if (cacheFresh) {
        setIsLoading(false);
        return;
      }

      // 3) 만료/없음 → 1회 getDocs로 갱신
      try {
        await fetchFromFirestore();
      } catch {
        onError?.('레시피를 불러오지 못했어요');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
    // onError는 의도적으로 deps에서 제외 (재조회 루프 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFromFirestore]);

  const reload = useCallback(async () => {
    try {
      await fetchFromFirestore();
    } catch {
      onError?.('새로고침에 실패했어요');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFromFirestore]);

  return {recipes, exploreCookbooks, isLoading, reload};
}
