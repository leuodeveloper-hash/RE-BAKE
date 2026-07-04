import type {Recipe} from '../types/recipe';
import {buildPaperPreview} from './recipePaperPreview';
import type {PackCardData} from '@components/PackBoard/RecipePack';

/**
 * 레시피 북/그룹 표지 카드 생성 — 홈·둘러보기·리스트·팩·펼침이 전부 이 헬퍼를 쓴다.
 * 여기만 고치면 모든 표지 패턴이 함께 바뀐다.
 *
 * 규칙:
 *  - 빈 북/그룹(레시피 0개) → 일러스트(emptyCoverImage). (호출부에서 emptyCover=true로 투명 렌더)
 *  - 레시피는 있는데 사진이 없음 → 종이 미리보기(paperPreview).
 */

// 빈 커버(레시피/회고 없음)용 일러스트
export const emptyCoverImage = require('../../assets/images/empty_recipe.png');

/** 빈 커버 카드 — 일러스트 1장 */
export function emptyCoverCard(title: string): PackCardData {
  return {imageUrl: emptyCoverImage as unknown as number, title};
}

/**
 * 레시피들 → 표지 카드. 사진 있는 레시피를 앞으로, 최대 max장.
 * 사진 있으면 사진, 없으면 종이 미리보기(paperPreview).
 */
export function recipeCoverCards(recipes: Recipe[], max = 3): PackCardData[] {
  return [...recipes]
    .sort((a, b) => (a.imageUri ? 0 : 1) - (b.imageUri ? 0 : 1))
    .slice(0, max)
    .map(r => ({imageUrl: r.imageUri, title: r.title, paperPreview: buildPaperPreview(r)}));
}

/** 비었으면 빈 종이 커버, 아니면 레시피 표지 카드 */
export function coverCards(recipes: Recipe[], emptyTitle: string, max = 3): PackCardData[] {
  return recipes.length === 0 ? [emptyCoverCard(emptyTitle)] : recipeCoverCards(recipes, max);
}
