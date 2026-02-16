import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';

interface SnackbarAction {
  label: string;
  onPress: () => void;
}

interface SnackbarState {
  message: string;
  action?: SnackbarAction;
}

interface SnackbarContextValue {
  snackbar: SnackbarState | null;
  showSnackbar: (message: string, action?: SnackbarAction) => void;
  clearSnackbar: () => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function SnackbarProvider({children}: {children: React.ReactNode}) {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);

  const showSnackbar = useCallback((message: string, action?: SnackbarAction) => {
    setSnackbar({message, action});
  }, []);

  const clearSnackbar = useCallback(() => {
    setSnackbar(null);
  }, []);

  const value = useMemo<SnackbarContextValue>(() => ({
    snackbar,
    showSnackbar,
    clearSnackbar,
  }), [snackbar, showSnackbar, clearSnackbar]);

  return (
    <SnackbarContext.Provider value={value}>{children}</SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider');
  return ctx;
}
