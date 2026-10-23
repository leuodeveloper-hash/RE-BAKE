import {useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import {matchShortcut, SHORTCUTS, type ShortcutDef, type ShortcutId} from '@constants/shortcuts';

/**
 * 공통 단축키 걸기(웹) — 정의는 constants/shortcuts 한 곳.
 * 앞에서 처리한 키는 건너뛰고, 처리하면 브라우저 기본 동작(⌘S 페이지 저장 등)을 막는다.
 * handler가 false를 돌려주면 처리 안 한 것으로 본다.
 */
export function useShortcut(id: ShortcutId, handler: () => boolean | void, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !matchShortcut(id, e)) return;
      if (ref.current() !== false) e.preventDefault();
    };
    // ⌘·Ctrl 조합은 먼저 잡는다(capture) — 입력칸(RN Web TextInput)이 keydown 전파를 멈춰
    // 글을 쓰는 중엔 document까지 안 올라와 ⌘S가 안 먹었다. 조합 키는 입력과 겹칠 일이 없다.
    // 맨 키(ESC·Enter)는 좁은 범위(칩)가 먼저 처리하도록 평소대로(bubble)
    const capture = !!(SHORTCUTS[id] as ShortcutDef).mod;
    document.addEventListener('keydown', onKey, capture);
    return () => document.removeEventListener('keydown', onKey, capture);
  }, [id, enabled]);
}
