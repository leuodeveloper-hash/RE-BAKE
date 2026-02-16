import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';

interface AddSheetContextValue {
  showAddSheet: boolean;
  setShowAddSheet: (show: boolean) => void;
}

const AddSheetContext = createContext<AddSheetContextValue | null>(null);

export function AddSheetProvider({children}: {children: React.ReactNode}) {
  const [showAddSheet, setShowAddSheet] = useState(false);

  const value = useMemo<AddSheetContextValue>(() => ({
    showAddSheet,
    setShowAddSheet,
  }), [showAddSheet]);

  return (
    <AddSheetContext.Provider value={value}>{children}</AddSheetContext.Provider>
  );
}

export function useAddSheet(): AddSheetContextValue {
  const ctx = useContext(AddSheetContext);
  if (!ctx) throw new Error('useAddSheet must be used within AddSheetProvider');
  return ctx;
}
