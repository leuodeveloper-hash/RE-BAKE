import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';

interface PlanSheetContextValue {
  visible: boolean;
  open: () => void;
  close: () => void;
}

const PlanSheetContext = createContext<PlanSheetContextValue | null>(null);

export function PlanSheetProvider({children}: {children: React.ReactNode}) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const value = useMemo(() => ({visible, open, close}), [visible, open, close]);

  return <PlanSheetContext.Provider value={value}>{children}</PlanSheetContext.Provider>;
}

export function usePlanSheet(): PlanSheetContextValue {
  const ctx = useContext(PlanSheetContext);
  if (!ctx) throw new Error('usePlanSheet must be used within PlanSheetProvider');
  return ctx;
}
