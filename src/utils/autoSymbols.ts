/**
 * 기호 제안 — 공통 TextInput·RichEditor가 쓴다(앱 입력칸 전부). '도씨' → '℃', '-->'·'->' → '→'
 * 바로 바꾸지 않고 입력칸 위에 제안 칩(EditableChip suggest)을 띄운다. 엔터·칩 = 넣기, X = 그대로
 */

/** 커서 바로 앞이 바꿀 말로 끝나면 그 제안 — '180도씨|' → {from:'도씨', to:'℃', start:3} */
const PENDING_RE = /(도씨|-->|->)$/;
export const symbolFor = (from: string) => (from === '도씨' ? '℃' : '→');
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
export const SYMBOL_DOM_SRC = `function pendingSymbolDom() {
  var sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
  var n = sel.getRangeAt(0).startContainer, o = sel.getRangeAt(0).startOffset;
  if (n.nodeType !== 3) return null;
  var m = n.nodeValue.slice(0, o).match(/(도씨|-->|->)$/);
  return m ? {from: m[1], to: m[1] === '도씨' ? '℃' : '→'} : null;
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
