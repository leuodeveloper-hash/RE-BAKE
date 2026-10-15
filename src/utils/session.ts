/** "1/3 회차" → {current: 1, total: 3}, "2회차" → {current: 2, total: 1} */
export function parseSession(session: string | undefined): {current: number; total: number} {
  const slashMatch = session?.match(/(\d+)\/(\d+)/);
  if (slashMatch) return {current: parseInt(slashMatch[1], 10), total: parseInt(slashMatch[2], 10)};
  const simpleMatch = session?.match(/(\d+)/);
  if (simpleMatch) return {current: parseInt(simpleMatch[1], 10), total: 1};
  return {current: 1, total: 1};
}

/** total > 1 → "1/3 회차", total === 1 → "1회차" */
export function formatSession(current: number, total: number): string {
  return total > 1 ? `${current}/${total} 회차` : `${current}회차`;
}

/**
 * 회차 그룹을 session의 current 기준 오름차순으로 정렬해 반환.
 * 회차 #번호는 session 문자열이 아니라 "정렬된 배열에서의 위치(1-based)"로 매긴다.
 * (편집/삭제로 current 값이 꼬여도 표시 번호는 항상 1,2,3…으로 일관)
 */
export function sortSessionGroup<T extends {session?: string}>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => parseSession(a.session).current - parseSession(b.session).current,
  );
}

/**
 * 회차 #번호(1-based). 정렬된 그룹에서 해당 항목의 위치.
 * @returns 그룹이 1개 이하면 0(=# 표시 안 함), 아니면 1-based 위치
 */
export function sessionDisplayNumber(sortedGroupIds: string[], id: string): number {
  if (sortedGroupIds.length <= 1) return 0;
  const idx = sortedGroupIds.indexOf(id);
  return idx < 0 ? 0 : idx + 1;
}

// ---- 회차(레시피 하나 안의 기록) ----
import type {Recipe, RecipeSession} from '../types/recipe';

/** 회차는 최근 다섯 개만 — 지난 기록 4 + 지금 1. 넘으면 가장 오래된 기록부터 빠진다 */
export const MAX_SESSIONS = 5;

/** 지금(마지막) 회차 id — 회고·스탬프 키 */
export const sessionKey = (r: Pick<Recipe, 'id' | 'sessionId'>) => r.sessionId ?? r.id;

/** 지금 회차 번호 — 새 구조는 sessionNumber, 예전 데이터는 session 글자 */
export const currentSessionNumber = (r: Pick<Recipe, 'sessionNumber' | 'session'>) =>
  r.sessionNumber ?? parseSession(r.session).current;

/** 회차 수(지난 기록 + 지금) */
export const sessionCount = (r: Pick<Recipe, 'sessions'>) => (r.sessions?.length ?? 0) + 1;

/** 레시피의 모든 회차 id(오래된 것부터, 지금 회차가 마지막) — 회고 합계 등 */
export const allSessionKeys = (r: Pick<Recipe, 'id' | 'sessionId' | 'sessions'>) =>
  [...(r.sessions ?? []).map(s => s.id), sessionKey(r)];

/** 지금 내용을 회차 기록으로 — 회차마다 달라질 수 있는 재료·과정 등만(사진·설명·조언은 레시피 하나에) */
export function snapshotOf(r: Recipe, id: string, number: number, createdAt: string): RecipeSession {
  const s: RecipeSession = {
    id, number, createdAt,
    ingredientGroups: r.ingredientGroups, tools: r.tools, toolGroups: r.toolGroups,
    steps: r.steps, stepGroups: r.stepGroups, method: r.method, specificGravity: r.specificGravity,
    time: r.time, servings: r.servings, doughTemp: r.doughTemp, divideWeight: r.divideWeight,
  };
  // 저장소는 undefined 값을 싫어한다 — 빈 칸은 뺀다
  return Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)) as RecipeSession;
}

/**
 * 새 회차 기록하기 — 지금 내용을 지난 회차로 넘기고, 다음 번호의 새 회차를 시작한다(내용은 그대로 이어서 고친다).
 * 최근 MAX_SESSIONS개만 남긴다.
 */
export function recordNewSession(r: Recipe): Recipe {
  const now = new Date().toISOString();
  const num = currentSessionNumber(r);
  const past = [...(r.sessions ?? []), snapshotOf(r, sessionKey(r), num, r.updatedAt ?? r.createdAt ?? now)]
    .slice(-(MAX_SESSIONS - 1));
  return {
    ...r,
    sessions: past,
    sessionId: `s_${Date.now()}`,
    sessionNumber: num + 1,
    session: undefined,
    madeAt: undefined,
    updatedAt: now,
  };
}
