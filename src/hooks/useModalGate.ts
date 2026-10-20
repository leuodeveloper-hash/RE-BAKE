import {useEffect, useState} from 'react';
import {Platform} from 'react-native';

/**
 * 아이폰 창(Modal) 겹침 막기 — 시트·팝업을 닫자마자 다른 창을 열면 아이폰이 새 창을 무시하고,
 * 앱은 열린 줄 알아 보이지 않는 창이 화면을 막아 먹통이 됐다(회고 시트·사전 수정 등).
 * 닫히는 창이 있으면 다 내려갈 때까지 기다렸다 연다. 안드로이드·웹은 그대로.
 */
let closingUntil = 0;
const CLOSE_MS = 450;

/** 창이 닫히기 시작할 때 — 이 시간 동안 새 창은 기다린다 */
export function markModalClosing(ms: number = CLOSE_MS) {
  if (Platform.OS !== 'ios') return;
  closingUntil = Math.max(closingUntil, Date.now() + ms);
}

/** 열림 상태 — 다른 창이 닫히는 중이면 그 뒤로 미룬다(닫힘은 바로) */
export function useModalGate(visible: boolean, skip = false): boolean {
  const [open, setOpen] = useState(visible);
  useEffect(() => {
    if (!visible) { setOpen(false); return; }
    const wait = skip ? 0 : closingUntil - Date.now();
    if (wait <= 0) { setOpen(true); return; }
    const timer = setTimeout(() => setOpen(true), wait);
    return () => clearTimeout(timer);
  }, [visible, skip]);
  return visible && open;
}
