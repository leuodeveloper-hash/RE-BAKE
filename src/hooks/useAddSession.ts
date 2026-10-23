import {useCallback} from 'react';
import {deleteField, doc, updateDoc} from 'firebase/firestore';
import {db} from '@config/firebase';
import {useRecipes} from '@contexts/RecipeContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {recordNewSession} from '@utils/session';
import type {Recipe} from '../types/recipe';

/**
 * 새 회차 만들기 — 홈 목록·상세 공통.
 * 내 레시피면 내 목록에, 공식 레시피(어드민 홈에 같이 보이는 둘러보기 원본)면 그 공식 문서에 기록한다.
 * 예전엔 내 목록만 고쳐서, 공식 레시피에서 누르면 아무 데도 저장되지 않았다(쌀식빵).
 * 저장되면 true
 */
export function useAddSession() {
  const {recipes, setRecipes} = useRecipes();
  const {recipes: exploreRecipes, reload: exploreReload} = useExploreRecipeContext();

  return useCallback(async (recipe: Recipe): Promise<boolean> => {
    if (recipes.some(r => r.id === recipe.id)) {
      setRecipes(prev => prev.map(r => (r.id === recipe.id ? recordNewSession(r) : r)));
      return true;
    }
    const official = exploreRecipes.find(r => r.id === recipe.id);
    if (!official) return false;
    const next = recordNewSession(official);
    // 공용 데이터 — 바뀐 회차 필드만, 비운 칸은 지운다(undefined는 Firestore가 못 받는다). 수정 시각도 같이
    await updateDoc(doc(db, 'explore_recipes', official.id), {
      sessions: next.sessions ?? [],
      sessionId: next.sessionId,
      sessionNumber: next.sessionNumber,
      session: deleteField(),
      madeAt: deleteField(),
      updatedAt: next.updatedAt,
    });
    exploreReload();
    return true;
  }, [recipes, setRecipes, exploreRecipes, exploreReload]);
}
