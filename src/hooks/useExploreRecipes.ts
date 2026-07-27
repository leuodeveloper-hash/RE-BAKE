import {useCallback, useEffect, useMemo, useState} from 'react';
import {collection, deleteField, getDocs, query, updateDoc, where} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {db} from '@config/firebase';
import {useTranslation} from '@contexts/LanguageContext';
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

/**
 * 기존 데이터 마이그레이션(1회, 어드민):
 *  1) explore_recipes의 레거시 `category` → `cookbook`으로 이동 + `category` 제거
 *     (migrateRecipe는 읽을 때만 변환 → 문서엔 category가 남아 rename 쿼리가 놓치던 문제 해소)
 *  2) 모든 explore_recipes / explore_cookbooks에 `hidden` 필드 백필(없으면 false)
 *     → 보안 규칙(비어드민은 where hidden==false 제약 쿼리)이 모든 문서를 매칭하도록.
 * 멱등: 바꿀 게 있는 문서만 갱신. 성공 시 플래그로 재실행 스킵.
 */
const EXPLORE_MIGRATION_FLAG = 'explore_migrated_v2';
export async function migrateExploreCategoryToCookbook(): Promise<number> {
  const done = await AsyncStorage.getItem(EXPLORE_MIGRATION_FLAG).catch(() => null);
  if (done) return 0;
  let count = 0;
  // 1) recipes: category→cookbook + hidden 백필
  const recSnap = await getDocs(collection(db, 'explore_recipes'));
  await Promise.all(recSnap.docs.map(d => {
    const data = d.data() as any;
    const patch: any = {};
    if (data.category != null && data.cookbook == null) {
      patch.cookbook = data.category;
      patch.category = deleteField();
    }
    if (data.hidden == null) patch.hidden = false;
    if (Object.keys(patch).length > 0) { count++; return updateDoc(d.ref, patch); }
    return Promise.resolve();
  }));
  // 2) cookbooks: hidden 백필
  const cbSnap = await getDocs(collection(db, 'explore_cookbooks'));
  await Promise.all(cbSnap.docs.map(d => {
    if ((d.data() as any).hidden == null) { count++; return updateDoc(d.ref, {hidden: false}); }
    return Promise.resolve();
  }));
  await AsyncStorage.setItem(EXPLORE_MIGRATION_FLAG, '1').catch(() => {});
  return count;
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
  /** 숨김 — 어드민만 보임, 다른 유저 둘러보기에서 이 쿡북과 소속 레시피 전부 미노출 */
  hidden?: boolean;
}

/**
 * @param isAdmin 어드민(개발자)이면 숨김 콘텐츠도 전부 노출(작업용). 아니면 숨김 필터링.
 */
export function useExploreRecipes(onError?: (msg: string) => void, isAdmin = false) {
  const {t} = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [exploreCookbooks, setExploreCookbooks] = useState<ExploreCookbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /** Firestore에서 recipes + cookbooks를 1회 읽고 상태·캐시 갱신 */
  const fetchFromFirestore = useCallback(async () => {
    // 보안 규칙과 짝: 비어드민은 hidden==false만 쿼리(제약 없으면 규칙이 전체 거부).
    // 어드민은 전체(숨김 포함) 로드해 작업 가능. (모든 문서에 hidden 필드 백필 전제)
    const recRef = collection(db, 'explore_recipes');
    const cbRef = collection(db, 'explore_cookbooks');
    const [recSnap, cbSnap] = await Promise.all([
      getDocs(isAdmin ? recRef : query(recRef, where('hidden', '==', false))),
      getDocs(isAdmin ? cbRef : query(cbRef, where('hidden', '==', false))),
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
  }, [isAdmin]);

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

      // 2) 캐시가 있으면 즉시 로딩 종료(체감 빠름). 단 Firestore 갱신은 아래에서 계속 진행
      //    (stale-while-revalidate) → 새 필드(작성자 등)가 캐시에 없어도 백그라운드로 최신화된다.
      //    캐시가 신선(TTL 이내)하고 비어드민이면 읽기 비용 절약 위해 여기서 종료.
      if (cacheFresh && !isAdmin) {
        setIsLoading(false);
        // 스키마가 바뀌어도 반영되도록, 캐시가 신선해도 백그라운드 1회 갱신은 수행
        fetchFromFirestore().catch(() => {});
        return;
      }

      // 3) 만료/없음 → 1회 getDocs로 갱신
      try {
        await fetchFromFirestore();
      } catch {
        onError?.(t('useExploreRecipes.loadFailed'));
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
      onError?.(t('useExploreRecipes.reloadFailed'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFromFirestore]);

  // 숨김 필터: 비어드민은 숨김 쿡북 + 그 소속 레시피 + 개별 숨김 레시피를 제외.
  // (원본은 상태/캐시에 그대로 두고 노출 시점에만 필터 → 어드민 토글이 즉시 반영)
  const hiddenCookbookNames = useMemo(
    () => new Set(exploreCookbooks.filter(c => c.hidden).map(c => c.name)),
    [exploreCookbooks],
  );
  const visibleRecipes = useMemo(
    () => (isAdmin ? recipes : recipes.filter(r => !r.hidden && !hiddenCookbookNames.has(r.cookbook ?? ''))),
    [recipes, isAdmin, hiddenCookbookNames],
  );
  const visibleCookbooks = useMemo(
    () => (isAdmin ? exploreCookbooks : exploreCookbooks.filter(c => !c.hidden)),
    [exploreCookbooks, isAdmin],
  );

  return {recipes: visibleRecipes, exploreCookbooks: visibleCookbooks, isLoading, reload};
}
