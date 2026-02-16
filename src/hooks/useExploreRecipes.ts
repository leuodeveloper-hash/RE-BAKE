import {useEffect, useRef, useState} from 'react';
import {collection, onSnapshot} from 'firebase/firestore';
import {db} from '@config/firebase';
import {MOCK_RECIPES, MockRecipe} from '@data/mockRecipes';
import {seedExploreRecipes} from '@utils/seedExploreRecipes';
import type {SerializableRecipe} from '../types/recipe';

/** MOCK_RECIPES에서 id가 일치하는 레시피의 imageSource를 복원 */
function restoreImageSources(recipes: SerializableRecipe[]): MockRecipe[] {
  const mockMap = new Map(MOCK_RECIPES.map(r => [r.id, r.imageSource]));
  return recipes.map(r => ({
    ...r,
    imageSource: mockMap.get(r.id),
  }));
}

/**
 * 둘러보기 레시피를 Firestore explore_recipes 컬렉션에서 구독.
 * 앱 시작 시 seed 버전을 확인하여 자동 업데이트.
 * Firestore 연결 실패 시 MOCK_RECIPES 폴백.
 */
export function useExploreRecipes() {
  const [recipes, setRecipes] = useState<MockRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const seededRef = useRef(false);

  useEffect(() => {
    // 버전 체크 후 필요하면 시딩/업데이트
    if (!seededRef.current) {
      seededRef.current = true;
      seedExploreRecipes().catch(() => {});
    }

    const colRef = collection(db, 'explore_recipes');
    const unsub = onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        setRecipes([]);
      } else {
        const firestoreRecipes: SerializableRecipe[] = snapshot.docs.map(
          d => ({id: d.id, ...d.data()}) as SerializableRecipe,
        );
        setRecipes(restoreImageSources(firestoreRecipes));
      }
      setIsLoading(false);
    }, () => {
      setRecipes(MOCK_RECIPES);
      setIsLoading(false);
    });

    return unsub;
  }, []);

  return {recipes, isLoading};
}
