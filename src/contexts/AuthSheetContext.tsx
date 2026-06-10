import React, {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';

interface OpenOptions {
  /** 로그인 성공 시 호출 */
  onSuccess?: () => void;
}

interface AuthSheetContextValue {
  visible: boolean;
  open: (opts?: OpenOptions) => void;
  close: () => void;
  /** 성공 콜백 호출 (AuthSheet 내부용) */
  fireSuccess: () => void;
}

const AuthSheetContext = createContext<AuthSheetContextValue | null>(null);

export function AuthSheetProvider({children}: {children: React.ReactNode}) {
  const [visible, setVisible] = useState(false);
  const onSuccessRef = useRef<(() => void) | null>(null);

  const open = useCallback((opts?: OpenOptions) => {
    onSuccessRef.current = opts?.onSuccess ?? null;
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    onSuccessRef.current = null;
  }, []);

  const fireSuccess = useCallback(() => {
    const cb = onSuccessRef.current;
    onSuccessRef.current = null;
    setVisible(false);
    if (cb) cb();
  }, []);

  const value = useMemo(() => ({visible, open, close, fireSuccess}), [visible, open, close, fireSuccess]);

  return <AuthSheetContext.Provider value={value}>{children}</AuthSheetContext.Provider>;
}

export function useAuthSheet(): AuthSheetContextValue {
  const ctx = useContext(AuthSheetContext);
  if (!ctx) throw new Error('useAuthSheet must be used within AuthSheetProvider');
  return ctx;
}
