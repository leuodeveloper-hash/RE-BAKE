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
