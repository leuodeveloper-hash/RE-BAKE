import React, {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';

interface PlanSheetContextValue {
  visible: boolean;
  /** onClose: 시트가 닫힌 뒤 이어서 할 일(로그인 직후 플랜을 보여주고 원래 동작으로 돌아갈 때) */
  open: (opts?: {onClose?: () => void}) => void;
  close: () => void;
}

const PlanSheetContext = createContext<PlanSheetContextValue | null>(null);

export function PlanSheetProvider({children}: {children: React.ReactNode}) {
  const [visible, setVisible] = useState(false);
  const afterCloseRef = useRef<(() => void) | null>(null);
  const open = useCallback((opts?: {onClose?: () => void}) => {
    afterCloseRef.current = opts?.onClose ?? null;
    setVisible(true);
  }, []);
  const close = useCallback(() => {
    setVisible(false);
    const cb = afterCloseRef.current;
    afterCloseRef.current = null;
    if (cb) setTimeout(cb, 300); // 시트가 내려간 뒤
  }, []);

  const value = useMemo(() => ({visible, open, close}), [visible, open, close]);

  return <PlanSheetContext.Provider value={value}>{children}</PlanSheetContext.Provider>;
}

export function usePlanSheet(): PlanSheetContextValue {
  const ctx = useContext(PlanSheetContext);
  if (!ctx) throw new Error('usePlanSheet must be used within PlanSheetProvider');
  return ctx;
}
