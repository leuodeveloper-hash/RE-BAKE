import type {Recipe} from '../types/recipe';
import {MAX_SESSIONS, parseSession, snapshotOf} from './session';

/**
 * 예전 회차(복사본 레시피 여러 개, remakeGroupId로 묶임) → 레시피 하나 + 지난 회차 기록(sessions).
 * - 마지막 회차를 본체로 남기고(문서 id 그대로), 앞 회차들은 기록으로 넣는다.
 * - 기록의 id는 예전 문서 id 그대로 — 계정에 회차별로 붙은 회고·스탬프가 그대로 이어진다.
 * - 최근 MAX_SESSIONS개만 남긴다.
 * 몇 번 돌려도 같다(묶음이 없으면 그대로) — 다른 기기에서 이미 합쳤으면 아무것도 안 바뀐다.
 * @returns 바뀌었으면 새 목록, 아니면 null
 */
export function mergeRemakeGroups(recipes: Recipe[]): Recipe[] | null {
  const groups = new Map<string, Recipe[]>();
  for (const r of recipes) {
    if (!r.remakeGroupId) continue;
    const g = groups.get(r.remakeGroupId) ?? [];
    g.push(r);
    groups.set(r.remakeGroupId, g);
  }
  if (groups.size === 0) return null;

  const removed = new Set<string>();
  const replaced = new Map<string, Recipe>();
  for (const members of groups.values()) {
    const sorted = [...members].sort((a, b) => parseSession(a.session).current - parseSession(b.session).current);
    const latest = sorted[sorted.length - 1];
    const past = sorted.slice(0, -1).slice(-(MAX_SESSIONS - 1));
    const sessions = past.map((r, i) => {
      const snap = snapshotOf(r, r.id, i + 1, r.createdAt ?? new Date().toISOString());
      return r.reviews?.length ? {...snap, reviews: r.reviews} : snap;
    });
    sorted.slice(0, -1).forEach(r => removed.add(r.id));
    const {remakeGroupId: _g, session: _s, ...rest} = latest;
    replaced.set(latest.id, {
      ...rest,
      ...(sessions.length ? {sessions} : {}),
      sessionNumber: sessions.length + 1,
      updatedAt: new Date().toISOString(),
    });
  }
  return recipes.filter(r => !removed.has(r.id)).map(r => replaced.get(r.id) ?? r);
}
