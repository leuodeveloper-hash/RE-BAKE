import React, {useEffect, useState} from 'react';

/**
 * 처음 보일 때 만든다 — 시트·팝업·요리모드처럼 열기 전엔 안 보이는 큰 부품을 화면이 열릴 때마다 만들면 무거웠다.
 * 한 번 열린 뒤엔 남겨 둔다(닫힘 애니메이션이 끊기지 않고, 다시 열 때 빠르다).
 *   <LazyMount when={visible}><BottomSheet visible={visible} … /></LazyMount>
 */
export function LazyMount({when, children}: {when: boolean; children: React.ReactNode}) {
  const [mounted, setMounted] = useState(when);
  useEffect(() => { if (when) setMounted(true); }, [when]);
  return mounted ? <>{children}</> : null;
}
