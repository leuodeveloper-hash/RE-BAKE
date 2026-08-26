import React, {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';

export interface LinkTarget {
  getValue: () => string;
  setValue: (v: string) => void;
  selection: {start: number; end: number};
}

interface LinkTargetContextValue {
  /** 현재 포커스된 입력의 선택 구간 정보 (없으면 null) */
  targetRef: React.MutableRefObject<LinkTarget | null>;
  /** 텍스트가 실제로 선택돼 있는지 — 툴바 링크 버튼 활성화 조건 */
  hasSelection: boolean;
  /** 입력이 선택 변화를 알릴 때 */
  report: (t: LinkTarget | null) => void;
  /** 편집 화면이 링크 다이얼로그 여는 함수를 등록한다 */
  setEditRequestHandler: (fn: ((t: LinkTarget) => void) | null) => void;
  /** 입력이 링크 구간 탭을 알릴 때 — 해당 링크의 URL 편집 요청 */
  requestEdit: (t: LinkTarget) => void;
}

const Ctx = createContext<LinkTargetContextValue | null>(null);

/**
 * "선택한 텍스트에 링크 넣기"를 위한 공용 배선.
 *
 * 입력칸마다 핸들러를 다는 대신, 공통 입력 컴포넌트가 useLinkTarget()으로
 * 자동 등록한다. 툴바는 useLinkTarget()의 hasSelection/targetRef만 보면 된다.
 */
export function LinkTargetProvider({children}: {children: React.ReactNode}) {
  const targetRef = useRef<LinkTarget | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  const report = useCallback((t: LinkTarget | null) => {
    targetRef.current = t;
    setHasSelection(!!t && t.selection.end > t.selection.start);
  }, []);

  // 링크 구간을 탭하면 바로 URL을 고칠 수 있어야 한다.
  // 다이얼로그는 편집 화면이 가지고 있으므로 그 여는 함수를 여기에 등록해 둔다.
  const editHandlerRef = useRef<((t: LinkTarget) => void) | null>(null);
  const setEditRequestHandler = useCallback((fn: ((t: LinkTarget) => void) | null) => {
    editHandlerRef.current = fn;
  }, []);
  const requestEdit = useCallback((t: LinkTarget) => {
    targetRef.current = t;
    editHandlerRef.current?.(t);
  }, []);

  const value = useMemo(
    () => ({targetRef, hasSelection, report, setEditRequestHandler, requestEdit}),
    [hasSelection, report, setEditRequestHandler, requestEdit],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Provider 밖에서도 안전하게 no-op을 돌려준다(툴바 없는 화면에서도 입력이 동작하도록) */
export function useLinkTarget(): LinkTargetContextValue | null {
  return useContext(Ctx);
}
