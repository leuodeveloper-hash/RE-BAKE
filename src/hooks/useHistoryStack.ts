import {useCallback, useRef, useState} from 'react';

/**
 * 공용 undo/redo 히스토리 스택.
 * 요리모드·편집·생성에서 동일하게 재사용 (사용자 지시: 히스토리도 공통화).
 *
 * 사용법: 변경 "직전" 상태를 push(snapshot) 해두고,
 * undo(current)/redo(current)에 "현재" 상태를 넘기면 반대 스택으로 옮기고 돌려줄 상태를 반환.
 */
export function useHistoryStack<T>() {
  const undoStack = useRef<T[]>([]);
  const redoStack = useRef<T[]>([]);
  // 스택 길이 변화가 canUndo/canRedo에 반영되도록 리렌더 트리거
  const [, bump] = useState(0);
  const rerender = useCallback(() => bump(v => v + 1), []);

  /** 변경 직전 상태 기록 (redo 스택 초기화) */
  const push = useCallback((snapshot: T) => {
    undoStack.current.push(snapshot);
    redoStack.current = [];
    rerender();
  }, [rerender]);

  /** 직전 상태 반환(없으면 null). 현재 상태는 redo 스택으로 이동. */
  const undo = useCallback((current: T): T | null => {
    if (undoStack.current.length === 0) return null;
    redoStack.current.push(current);
    const prev = undoStack.current.pop()!;
    rerender();
    return prev;
  }, [rerender]);

  /** 다음 상태 반환(없으면 null). 현재 상태는 undo 스택으로 이동. */
  const redo = useCallback((current: T): T | null => {
    if (redoStack.current.length === 0) return null;
    undoStack.current.push(current);
    const next = redoStack.current.pop()!;
    rerender();
    return next;
  }, [rerender]);

  const reset = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    rerender();
  }, [rerender]);

  return {
    push,
    undo,
    redo,
    reset,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  };
}
