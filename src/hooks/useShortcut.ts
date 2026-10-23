import {useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import {matchShortcut, type ShortcutId} from '@constants/shortcuts';

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
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [id, enabled]);
}
