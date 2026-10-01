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
  fireSuccess: () => (() => void) | null;
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

  /** 로그인 성공 — 시트를 닫고, 원래 하려던 동작(onSuccess)을 돌려준다. 실행은 호출부가 정한다 */
  const fireSuccess = useCallback((): (() => void) | null => {
    const cb = onSuccessRef.current;
    onSuccessRef.current = null;
    setVisible(false);
    return cb;
  }, []);

  const value = useMemo(() => ({visible, open, close, fireSuccess}), [visible, open, close, fireSuccess]);

  return <AuthSheetContext.Provider value={value}>{children}</AuthSheetContext.Provider>;
}

export function useAuthSheet(): AuthSheetContextValue {
  const ctx = useContext(AuthSheetContext);
  if (!ctx) throw new Error('useAuthSheet must be used within AuthSheetProvider');
  return ctx;
}
