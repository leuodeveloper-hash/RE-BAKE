import {useCallback, useEffect, useRef, useState} from 'react';

/** 되돌리기 최대 단계 — 넘으면 오래된 것부터 버린다(메모리 상한) */
const MAX_HISTORY = 50;
/** 타이핑이 멈춘 뒤 이만큼 지나야 한 단계로 쌓는다(글자마다 쌓이지 않게) */
const DEBOUNCE_MS = 500;

export interface EditHistory<T> {
  /** 이전 상태로 (없으면 no-op) */
  undo: () => void;
  /** 되돌린 것을 다시 (없으면 no-op) */
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** 히스토리 초기화 — 편집 시작 시점 등에서 호출 */
  reset: (snapshot: T) => void;
}

/**
 * 폼 전체 상태를 스냅샷으로 쌓아 되돌리기/다시하기를 제공한다.
 *
 * 타이핑 중 매 글자마다 쌓으면 되돌리기가 한 글자씩 되고 메모리도 낭비라,
 * 입력이 멈춘 뒤(DEBOUNCE_MS)에만 한 단계로 기록한다.
 *
 * @param snapshot 현재 상태 — 값이 바뀌면 자동으로 기록된다
 * @param apply    되돌릴 때 이 스냅샷을 실제 상태에 반영하는 함수
 */
export function useEditHistory<T>(snapshot: T, apply: (s: T) => void): EditHistory<T> {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const current = useRef<T>(snapshot);
  // undo/redo로 상태를 되돌리는 중엔 그 변화를 다시 기록하지 않는다(무한 루프 방지)
  const restoring = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 스택은 ref라 렌더를 유발하지 않으므로, 버튼 활성 상태 갱신용 카운터를 둔다
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  const applyRef = useRef(apply);
  applyRef.current = apply;

  // 스냅샷 변경 감지 → 디바운스 후 기록
  useEffect(() => {
    if (restoring.current) { restoring.current = false; current.current = snapshot; return; }
    if (snapshot === current.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      past.current.push(current.current);
      if (past.current.length > MAX_HISTORY) past.current.shift();
      future.current = []; // 새 편집이 생기면 redo 이력은 무효
      current.current = snapshot;
      bump();
    }, DEBOUNCE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [snapshot, bump]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    // 디바운스 대기 중인 변경은 버린다(방금 친 글자까지 되돌아가는 게 자연스럽다)
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const prev = past.current.pop()!;
    future.current.push(current.current);
    current.current = prev;
    restoring.current = true;
    applyRef.current(prev);
    bump();
  }, [bump]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const next = future.current.pop()!;
    past.current.push(current.current);
    current.current = next;
    restoring.current = true;
    applyRef.current(next);
    bump();
  }, [bump]);

  const reset = useCallback((s: T) => {
    past.current = [];
    future.current = [];
    current.current = s;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    bump();
  }, [bump]);

  return {
    undo,
    redo,
    // version에 의존해 스택 변화를 렌더에 반영한다
    canUndo: version >= 0 && past.current.length > 0,
    canRedo: version >= 0 && future.current.length > 0,
    reset,
  };
}
