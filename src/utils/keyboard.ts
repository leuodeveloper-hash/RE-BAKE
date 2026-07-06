import {Keyboard, Platform} from 'react-native';

/**
 * 키보드를 내리고 실제로 내려갈 때까지(keyboardDidHide) 기다린다.
 *
 * iOS는 키보드/화면 전환이 진행 중일 때 이미지 피커·모달을 present하면 그 요청을
 * 조용히 무시한다("갤러리 선택해도 안 열림"). 고정 딜레이(setTimeout)는 키보드
 * 애니메이션과 레이스라 기기/버전에 따라 재발하므로, keyboardDidHide 이벤트로
 * 실제로 내려간 뒤 present해야 안정적이다.
 *
 * - iOS: dismiss → keyboardDidHide 대기 → 한 프레임 여유 후 resolve.
 *   이미 키보드가 내려가 있으면 이벤트가 안 오므로 폴백 타임아웃으로 진행.
 * - 그 외(Android/web): dismiss만 하고 즉시 resolve.
 */
export function dismissKeyboardAndWait(fallbackMs = 450): Promise<void> {
  Keyboard.dismiss();
  if (Platform.OS !== 'ios') return Promise.resolve();
  return new Promise<void>(resolve => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      sub.remove();
      clearTimeout(fallback);
      // 키보드 정리 후 한 프레임 더 대기 → present 타이밍 안정화
      requestAnimationFrame(() => setTimeout(resolve, 60));
    };
    const sub = Keyboard.addListener('keyboardDidHide', done);
    const fallback = setTimeout(done, fallbackMs); // 이미 내려가 있으면 이벤트 없음 → 폴백
  });
}
