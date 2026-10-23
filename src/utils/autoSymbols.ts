/**
 * 입력하면서 바로 바꾸는 기호 — 공통 TextInput·RichEditor가 쓴다(앱 입력칸 전부).
 *  '도씨' → '℃', '-->'·'->' → '→'
 */
const RULES: [RegExp, string][] = [
  [/도씨/g, '℃'],
  [/-{1,2}>/g, '→'],
];

export const autoSymbols = (v: string) => RULES.reduce((s, [re, to]) => s.replace(re, to), v);

/**
 * 바꾼 뒤 커서 자리 — 바꾸기 전 글(next)과 그 직전 글(prev)로 타이핑한 자리를 찾고,
 * 그 앞부분만 바꿔 본 길이가 새 커서다('180도씨|' → '180℃|'). 끝으로 튀지 않게
 */
export function autoSymbolsCaret(prev: string, next: string): number {
  let suffix = 0;
  while (suffix < prev.length && suffix < next.length && prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;
  return autoSymbols(next.slice(0, next.length - suffix)).length;
}

/** DOM 글 안에서 바로 바꾸기(리치 에디터용) — 바뀐 글 마디 안 커서는 줄어든 만큼 당긴다. 바뀌었으면 true */
export const AUTO_SYMBOLS_DOM_SRC = `function fixSymbolsDom(root) {
  var sel = window.getSelection();
  var cn = sel && sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
  var co = sel && sel.rangeCount ? sel.getRangeAt(0).startOffset : 0;
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  var t, changed = false;
  while ((t = walker.nextNode())) {
    var s = t.nodeValue;
    if (!/도씨|-{1,2}>/.test(s)) continue;
    var re = /도씨|-{1,2}>/g, m, out = '', i = 0, nc = co;
    while ((m = re.exec(s))) {
      var rep = m[0] === '도씨' ? '℃' : '→';
      out += s.slice(i, m.index) + rep;
      if (t === cn && co >= m.index + m[0].length) nc -= m[0].length - rep.length;
      i = m.index + m[0].length;
    }
    out += s.slice(i);
    t.nodeValue = out;
    changed = true;
    if (t === cn && sel) { var r = document.createRange(); r.setStart(t, Math.min(nc, out.length)); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
  }
  return changed;
}`;
