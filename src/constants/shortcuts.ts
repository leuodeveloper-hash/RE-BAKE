/**
 * 앱 공통 키보드 단축키 — 한 곳에서 정한다(웹·하드웨어 키보드).
 * 새 단축키는 여기에 먼저 적고 useShortcut으로 건다. 같은 키를 다른 뜻으로 겹쳐 쓰지 않는다.
 * 규칙: 앞에서 처리한 키(e.defaultPrevented)는 뒤에서 다시 처리하지 않는다 — 한 번 누르면 한 가지 일만.
 */
export interface ShortcutDef {
  /** 키 이름(KeyboardEvent.key, 소문자 비교) */
  key: string;
  /** Ctrl(윈도우)·⌘(맥) 같이 */
  mod?: boolean;
  /** 무엇을 하는지 — 단축키 안내에 쓴다 */
  label: string;
  /** 어디서 */
  scope: string;
}

export const SHORTCUTS = {
  // 화면
  back: {key: 'escape', label: '뒤로 가기·닫기(입력 중이면 입력만 빠져나오기)', scope: '전체'},
  // 편집
  save: {key: 's', mod: true, label: '저장(편집에 남기)', scope: '레시피 편집'},
  // 입력 제안 칩(도씨 → ℃) — 칩이 떠 있을 때만, 다른 키보다 먼저
  suggestAccept: {key: 'enter', label: '제안 넣기', scope: '입력 제안 칩'},
  suggestDismiss: {key: 'escape', label: '제안 닫기', scope: '입력 제안 칩'},
} as const satisfies Record<string, ShortcutDef>;

export type ShortcutId = keyof typeof SHORTCUTS;

/** 이 키 입력이 그 단축키인지 */
export function matchShortcut(id: ShortcutId, e: {key: string; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean}) {
  const d: ShortcutDef = SHORTCUTS[id];
  if (e.key?.toLowerCase() !== d.key) return false;
  const mod = !!(e.metaKey || e.ctrlKey);
  return d.mod ? mod && !e.altKey : !mod;
}
