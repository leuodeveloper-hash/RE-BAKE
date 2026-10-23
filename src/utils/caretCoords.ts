/**
 * 웹 input·textarea 안 커서 좌표(입력 칸 기준) — 보이지 않는 거울 div에 같은 글꼴·폭으로 글을 써 재는 방식.
 * 입력 위 제안 칩을 커서 바로 위에 띄울 때 쓴다. 웹이 아니거나 못 재면 null
 */
const PROPS = [
  'boxSizing', 'width', 'height', 'overflowX', 'overflowY', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
  'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'tabSize',
] as const;

export function caretCoords(el: any, pos: number): {left: number; top: number} | null {
  if (typeof document === 'undefined' || !el || typeof el.value !== 'string') return null;
  const cs = window.getComputedStyle(el);
  const div = document.createElement('div');
  const st = div.style as any;
  for (const p of PROPS) st[p] = (cs as any)[p];
  st.position = 'absolute';
  st.visibility = 'hidden';
  st.whiteSpace = el.tagName === 'TEXTAREA' ? 'pre-wrap' : 'pre';
  st.wordWrap = 'break-word';
  div.textContent = el.value.slice(0, pos);
  const span = document.createElement('span');
  span.textContent = el.value.slice(pos) || '.';
  div.appendChild(span);
  document.body.appendChild(div);
  const left = span.offsetLeft - el.scrollLeft;
  const top = span.offsetTop - el.scrollTop;
  document.body.removeChild(div);
  return {left, top};
}
