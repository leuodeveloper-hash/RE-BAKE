/** 색(hex 또는 rgba)에서 알파 추출 (없으면 1) */
export function colorAlpha(color: string): number {
  if (color.startsWith('rgba')) {
    const n = color.match(/[\d.]+/g);
    return n && n[3] !== undefined ? Number(n[3]) : 1;
  }
  return 1;
}

/** 색(hex 또는 rgb/rgba)에서 rgb 추출 */
export function colorRgb(color: string): [number, number, number] {
  if (color.startsWith('rgb')) {
    const n = (color.match(/[\d.]+/g) || []).map(Number);
    return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0];
  }
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
  ];
}

/** 같은 색의 투명도만 바꾼 rgba — 색 그림자 등 */
export function withAlpha(color: string, alpha: number): string {
  const [r, g, b] = colorRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
