import React, {useMemo} from 'react';
import {PackCanvas, type PackBoardItem} from '@components/PackBoard';
import {recipeCoverCards} from '@utils/cookbookCards';
import {parseSession} from '@utils/session';
import type {Recipe} from '../../types/recipe';

export interface RecipePackViewProps {
  /** 표시 대상 레시피 (이미 필터/정렬된 목록) */
  recipes: Recipe[];
  onRecipePress?: (recipeId: string) => void;
  /** 잠긴 레시피 id (둘러보기 무료 유저) — 뱃지에 자물쇠 */
  lockedRecipeIds?: Set<string>;
}

/**
 * 레시피 리스트의 'pack' 레이아웃 — 각 레시피를 개별 팩 카드로 흩뿌려 표시.
 * 묶음이 아니라 레시피=팩 (전체 축은 묶는 기준이 없으므로 레시피 그대로 팩화).
 * 탭하면 해당 레시피 상세로 이동.
 */
export function RecipePackView({recipes, onRecipePress, lockedRecipeIds}: RecipePackViewProps) {
  const packs = useMemo<PackBoardItem[]>(() => {
    // 회차(remakeGroup)는 최신 1개로 묶음 — 3회차여도 1팩(1개 레시피로 계산)
    const byGroup = new Map<string, Recipe>();
    for (const r of recipes) {
      const key = r.remakeGroupId ?? r.id;
      const ex = byGroup.get(key);
      if (!ex || parseSession(r.session).current > parseSession(ex.session).current) byGroup.set(key, r);
    }
    return [...byGroup.values()].map(r => ({
      id: r.id,
      title: r.title,
      subtitle: r.cookbook || '',
      locked: lockedRecipeIds?.has(r.id),
      cards: recipeCoverCards([r]),
      onPress: () => onRecipePress?.(r.id),
    }));
  }, [recipes, onRecipePress, lockedRecipeIds]);

  return <PackCanvas items={packs} />;
}
