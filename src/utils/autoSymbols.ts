/**
 * 입력 기호 — 공통 TextInput·RichEditor가 쓴다(앱 입력칸 전부).
 *  - '도씨' → '℃': 바로 바꾸지 않고 입력칸 위에 제안 칩(EditableChip suggest). 엔터·칩 = 넣기, X = 그대로
 *  - '->'·'-->' → '→': 칩 없이 바로 바꾼다. 커서는 화살표 바로 뒤
 */

const ARROW_RE = /-{1,2}>/g;
export const fixArrows = (v: string) => v.replace(ARROW_RE, '→');
/** 화살표 바꾼 뒤 커서 — 직전 글(prev)과 비교해 타이핑한 자리를 찾고 그 앞만 바꿔 본 길이 */
export function fixArrowsCaret(prev: string, next: string): number {
  let suffix = 0;
  while (suffix < prev.length && suffix < next.length && prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;
  return fixArrows(next.slice(0, next.length - suffix)).length;
}

/** 커서 바로 앞이 바꿀 말로 끝나면 그 제안 — '180도씨|' → {from:'도씨', to:'℃', start:3} */
const PENDING_RE = /(도씨)$/;
export const symbolFor = (_from: string) => '℃';
export function pendingSymbolAt(text: string, caret: number): {from: string; to: string; start: number} | null {
  const m = text.slice(0, caret).match(PENDING_RE);
  return m ? {from: m[1], to: symbolFor(m[1]), start: caret - m[1].length} : null;
}
/** 제안 받기 — 커서 앞 말만 바꾸고 새 커서는 바뀐 글자 바로 뒤 */
export function acceptSymbolAt(text: string, caret: number): {value: string; caret: number} | null {
  const p = pendingSymbolAt(text, caret);
  if (!p) return null;
  return {value: text.slice(0, p.start) + p.to + text.slice(caret), caret: p.start + p.to.length};
}

/**
 * 리치 에디터(contentEditable) 쪽 같은 일 — 웹 편집기·앱 웹뷰 편집기가 문자열로 넣어 쓴다.
 * pendingSymbolDom(): 커서 앞 제안 {from,to} 또는 null. acceptSymbolDom(): 바꾸고 커서를 바로 뒤로(바뀌면 true)
 */
export const SYMBOL_DOM_SRC = `function fixArrowsDom(root) {
  var sel = window.getSelection();
  var cn = sel && sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
  var co = sel && sel.rangeCount ? sel.getRangeAt(0).startOffset : 0;
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  var t, changed = false;
  while ((t = walker.nextNode())) {
    var s = t.nodeValue;
    if (!/-{1,2}>/.test(s)) continue;
    var re = /-{1,2}>/g, m, out = '', i = 0, nc = co;
    while ((m = re.exec(s))) {
      out += s.slice(i, m.index) + '→';
      if (t === cn && co >= m.index + m[0].length) nc -= m[0].length - 1;
      i = m.index + m[0].length;
    }
    out += s.slice(i);
    t.nodeValue = out;
    changed = true;
    if (t === cn && sel) { var r = document.createRange(); r.setStart(t, Math.min(nc, out.length)); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
  }
  return changed;
}
function pendingSymbolDom() {
  var sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
  var n = sel.getRangeAt(0).startContainer, o = sel.getRangeAt(0).startOffset;
  if (n.nodeType !== 3) return null;
  var m = n.nodeValue.slice(0, o).match(/(도씨)$/);
  return m ? {from: m[1], to: '℃'} : null;
}
function acceptSymbolDom() {
  var p = pendingSymbolDom();
  if (!p) return false;
  var sel = window.getSelection(), n = sel.getRangeAt(0).startContainer, o = sel.getRangeAt(0).startOffset;
  var s = n.nodeValue, start = o - p.from.length;
  n.nodeValue = s.slice(0, start) + p.to + s.slice(o);
  var r = document.createRange(); r.setStart(n, start + p.to.length); r.collapse(true);
  sel.removeAllRanges(); sel.addRange(r);
  return true;
}`;
