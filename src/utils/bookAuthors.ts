import type {Recipe} from '../types/recipe';
import type {BookAuthor} from '@components/PackBoard/RecipePack';
import {resolveAuthorHandle} from '../types/author';

/**
 * 레시피 묶음(레시피 북)에서 표지 표시용 작성자 목록을 뽑는다.
 * - authorId별로 중복 제거, 레시피 수 많은 순 정렬(대표 작성자가 앞)
 * - 표시는 전부 @handle로 통일(공식 포함). 핸들 없으면 authorId 폴백.
 * - authorId 없는 레시피(구 데이터)는 무시 → 전부 없으면 빈 배열(브랜드명 폴백)
 */
export function deriveBookAuthors(recipes: Recipe[]): BookAuthor[] {
  const byAuthor = new Map<string, {authorId: string; displayName: string; avatarSeed: string | number; count: number}>();
  for (const r of recipes) {
    if (!r.authorId) continue;
    const entry = byAuthor.get(r.authorId);
    if (entry) {
      entry.count += 1;
    } else {
      byAuthor.set(r.authorId, {
        authorId: r.authorId,
        displayName: (() => { const h = resolveAuthorHandle(r.authorId, r.authorHandle); return h ? `@${h}` : r.authorId!; })(),
        avatarSeed: r.authorAvatarSeed ?? r.authorId,
        count: 1,
      });
    }
  }
  return Array.from(byAuthor.values())
    .sort((a, b) => b.count - a.count)
    .map(({authorId, displayName, avatarSeed}) => ({authorId, displayName, avatarSeed}));
}
