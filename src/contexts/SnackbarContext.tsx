import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {SvgProps} from 'react-native-svg';

interface SnackbarAction {
  label: string;
  onPress: () => void;
}

interface SnackbarOptions {
  action?: SnackbarAction;
  icon?: React.FC<SvgProps>;
}

interface SnackbarState {
  message: string;
  action?: SnackbarAction;
  icon?: React.FC<SvgProps>;
}

interface SnackbarContextValue {
  snackbar: SnackbarState | null;
  showSnackbar: (message: string, options?: SnackbarAction | SnackbarOptions) => void;
  clearSnackbar: () => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function SnackbarProvider({children}: {children: React.ReactNode}) {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);

  const showSnackbar = useCallback((message: string, options?: SnackbarAction | SnackbarOptions) => {
    if (options && 'onPress' in options && 'label' in options && !('action' in options)) {
      // Legacy: showSnackbar('msg', {label, onPress})
      setSnackbar({message, action: options as SnackbarAction});
    } else if (options && ('action' in options || 'icon' in options)) {
      const opts = options as SnackbarOptions;
      setSnackbar({message, action: opts.action, icon: opts.icon});
    } else {
      setSnackbar({message});
    }
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
