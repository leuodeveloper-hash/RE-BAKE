import type {Recipe} from '../types/recipe';

/**
 * 공유 링크로 연 공개 레시피북(남의 북)의 레시피.
 * 내 레시피·둘러보기 어디에도 없어서, 팩을 눌러 상세로 갈 때 여기서 찾는다.
 */
const cache = new Map<string, Recipe>();

export function putSharedRecipes(recipes: Recipe[]) {
  recipes.forEach(r => cache.set(r.id, r));
}

export function getSharedRecipe(id: string): Recipe | undefined {
  return cache.get(id);
}
