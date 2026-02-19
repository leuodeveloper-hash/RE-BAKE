import {useCallback, useEffect, useRef, useState} from 'react';
import {collection, getDocs, onSnapshot} from 'firebase/firestore';
import {db} from '@config/firebase';
import {EXPLORE_MOCK_RECIPES, MockRecipe} from '@data/mockRecipes';
import {seedExploreRecipes} from '@utils/seedExploreRecipes';
import type {SerializableRecipe} from '../types/recipe';

/** 기존 category 필드를 cookbook으로 마이그레이션 */
function migrateCategory(recipe: any): SerializableRecipe {
  if ('category' in recipe && !('cookbook' in recipe)) {
    const {category, ...rest} = recipe;
    recipe = {...rest, cookbook: category};
  }
  // createdAt이 없으면 ID의 타임스탬프에서 추출, 없으면 epoch
  if (!recipe.createdAt) {
    const tsMatch = recipe.id?.match(/(\d{13,})/);
    const ts = tsMatch ? Number(tsMatch[1]) : 0;
    return {...recipe, createdAt: new Date(ts).toISOString()};
  }
  return recipe;
}

/** EXPLORE_MOCK_RECIPES에서 id가 일치하는 레시피의 imageSource 및 step images를 머지 */
function restoreImageSources(recipes: SerializableRecipe[]): MockRecipe[] {
  const mockMap = new Map(EXPLORE_MOCK_RECIPES.map(r => [r.id, r]));
  return recipes.map(r => {
    const migrated = migrateCategory(r);
    const mockRecipe = mockMap.get(migrated.id);

    // step images: mock이 최신이므로 항상 mock 값으로 머지
    let {stepGroups, steps} = migrated;
    if (mockRecipe?.stepGroups && stepGroups) {
      stepGroups = stepGroups.map((g, gIdx) => {
        const mockGroup = mockRecipe.stepGroups?.[gIdx];
        if (!mockGroup) return g;
        return {
          ...g,
          steps: g.steps.map((s, sIdx) => {
            const mockImages = mockGroup.steps[sIdx]?.images;
            return mockImages ? {...s, images: mockImages} : s;
          }),
        };
      });
    }
    if (mockRecipe?.steps && steps) {
      steps = steps.map((s, sIdx) => {
        const mockImages = mockRecipe.steps?.[sIdx]?.images;
        return mockImages ? {...s, images: mockImages} : s;
      });
    }

    return {
      ...migrated,
      ...(stepGroups ? {stepGroups} : {}),
      ...(steps ? {steps} : {}),
      imageSource: mockRecipe?.imageSource,
    };
  });
}

/**
 * 둘러보기 레시피를 Firestore explore_recipes 컬렉션에서 구독.
 * 앱 시작 시 seed 버전을 확인하여 자동 업데이트.
 * 시딩 완료 후 구독을 시작하여 중간 스냅샷으로 인한 깜빡임 방지.
 * Firestore 연결 실패 시 EXPLORE_MOCK_RECIPES 폴백.
 */
export interface ExploreCookbook {
  name: string;
  color: string;
}

export function useExploreRecipes() {
  const [recipes, setRecipes] = useState<MockRecipe[]>([]);
  const [exploreCookbooks, setExploreCookbooks] = useState<ExploreCookbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const seededRef = useRef(false);

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
      // 버전 체크 후 필요하면 시딩/업데이트 (배치 쓰기)
      if (!seededRef.current) {
        seededRef.current = true;
        try {
          const result = await seedExploreRecipes();
          console.log('Seed result:', result);
        } catch (e) {
          console.error('Seed failed:', e);
        }
      }

      if (cancelled) return;

      // 시딩 완료 후 구독 시작 → 첫 스냅샷에 전체 데이터가 포함됨
      const colRef = collection(db, 'explore_recipes');
      unsub = onSnapshot(colRef, (snapshot) => {
        if (snapshot.empty) {
          setRecipes(EXPLORE_MOCK_RECIPES);
        } else {
          const firestoreRecipes: SerializableRecipe[] = snapshot.docs.map(
            d => ({id: d.id, ...d.data()}) as SerializableRecipe,
          );
          setRecipes(restoreImageSources(firestoreRecipes));
        }
        setIsLoading(false);
      }, () => {
        setRecipes(EXPLORE_MOCK_RECIPES);
        setIsLoading(false);
      });
    };

    init();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      const colRef = collection(db, 'explore_recipes');
      const snapshot = await getDocs(colRef);
      if (snapshot.empty) {
        setRecipes(EXPLORE_MOCK_RECIPES);
      } else {
        const firestoreRecipes: SerializableRecipe[] = snapshot.docs.map(
          d => ({id: d.id, ...d.data()}) as SerializableRecipe,
        );
        setRecipes(restoreImageSources(firestoreRecipes));
      }
    } catch {
      setRecipes(EXPLORE_MOCK_RECIPES);
    }
  }, []);

  return {recipes, exploreCookbooks, isLoading, reload};
}
