import React, {useMemo} from 'react';
import {PackCanvas, type PackBoardItem} from '@components/PackBoard';
import {recipeCoverCards} from '@utils/cookbookCards';
import {parseSession} from '@utils/session';
import type {Recipe} from '../../types/recipe';

export interface RecipePackViewProps {
  /** 위/아래 떠 있는 UI 높이 — 팩이 그 뒤로 숨지 않게 스크롤 경계를 좁힌다 */
  insetTop?: number;
  insetBottom?: number;
  /** 표시 대상 레시피 (이미 필터/정렬된 목록) */
  recipes: Recipe[];
  onRecipePress?: (recipeId: string) => void;
  /** 잠긴 레시피 id (둘러보기 무료 유저) — 뱃지에 자물쇠 */
  lockedRecipeIds?: Set<string>;
  /** 보드 한가운데(첫 칸)에 놓을 화면 — 게스트 랜딩 카드 */
  hero?: React.ReactNode;
}

/**
 * 레시피 리스트의 'pack' 레이아웃 — 각 레시피를 개별 팩 카드로 흩뿌려 표시.
 * 묶음이 아니라 레시피=팩 (전체 축은 묶는 기준이 없으므로 레시피 그대로 팩화).
 * 탭하면 해당 레시피 상세로 이동.
 */
export function RecipePackView({recipes, onRecipePress, lockedRecipeIds, insetTop, insetBottom, hero}: RecipePackViewProps) {
  const packs = useMemo<PackBoardItem[]>(() => {
    // 회차(remakeGroup)는 최신 1개로 묶음 — 3회차여도 1팩(1개 레시피로 계산)
    const byGroup = new Map<string, Recipe>();
    for (const r of recipes) {
      const key = r.remakeGroupId ?? r.id;
      const ex = byGroup.get(key);
      if (!ex || parseSession(r.session).current > parseSession(ex.session).current) byGroup.set(key, r);
    }
    const recipePacks: PackBoardItem[] = [...byGroup.values()].map(r => ({
      id: r.id,
      title: r.title,
      subtitle: r.cookbook || '',
      locked: lockedRecipeIds?.has(r.id),
      cards: recipeCoverCards([r]),
      onPress: () => onRecipePress?.(r.id),
    }));
    // 보드는 첫 항목을 정중앙에 둔다 — 랜딩 카드를 맨 앞에 넣으면 팩들이 그 주위로 퍼진다
    return hero && recipePacks.length > 0
      // 크기는 GuestHero(폭 320, 로고·헤드라인·서브카피·버튼 높이)와 맞춘다
      ? [{id: '__hero__', title: '', subtitle: '', cards: [], custom: hero, customSize: {w: 350, h: 360}}, ...recipePacks]
      : recipePacks;
  }, [recipes, onRecipePress, lockedRecipeIds, hero]);

  return <PackCanvas items={packs} insetTop={insetTop} insetBottom={insetBottom} />;
}
