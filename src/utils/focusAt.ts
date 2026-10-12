/**
 * 입력칸에 포커스를 주고 커서를 caret 위치에 둔다.
 *
 * 편집 화면의 행 ref는 RichEditor(focus(caret))일 때도, 일반 TextInput일 때도 있다.
 * 웹 TextInput의 ref는 HTML 요소라 focus(숫자)를 넘기면
 * "Failed to execute 'focus' on 'HTMLElement'"로 터진다 — 요소면 focus() 뒤 선택 범위로 커서를 옮긴다.
 */
export function focusAt(ref: any, caret: number = 0): void {
  if (!ref) return;
  try {
    if (typeof ref.setSelectionRange === 'function') {
      ref.focus();
      const len = typeof ref.value === 'string' ? ref.value.length : 0;
      const at = Math.max(0, Math.min(caret, len));
      ref.setSelectionRange(at, at);
      return;
    }
    ref.focus?.(caret);
  } catch {
    try { ref.focus?.(); } catch { /* 무시 */ }
  }
}
