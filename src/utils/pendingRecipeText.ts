/**
 * [+] → 텍스트/이미지 시트에서 [적용]한 글을 새 레시피 편집 화면으로 넘긴다.
 * 주소(쿼리)에 긴 글을 싣지 않으려고 잠깐 들고 있다가, 편집 화면이 한 번 꺼내 쓴다.
 */
let pending: string | null = null;

export function setPendingRecipeText(text: string) {
  pending = text;
}

/** 꺼내면서 비운다 — 뒤로 갔다 다시 와도 같은 글이 또 들어가지 않게 */
export function takePendingRecipeText(): string | null {
  const t = pending;
  pending = null;
  return t;
}
