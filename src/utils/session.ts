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
