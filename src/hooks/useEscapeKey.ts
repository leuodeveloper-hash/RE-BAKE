import {useEffect} from 'react';
import {Platform, BackHandler} from 'react-native';
import {matchShortcut} from '@constants/shortcuts';

/**
 * ESC 키(웹) 또는 뒤로가기 버튼(Android)을 눌렀을 때 콜백 실행.
 * 콜백이 true를 반환하면 이벤트를 소비한 것으로 간주.
 */
export function useEscapeKey(onEscape: () => boolean) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handler = (e: KeyboardEvent) => {
        // 앞에서 처리한 ESC(입력 위 제안 칩 닫기 등)는 건너뛴다 — 같이 닫히거나 뒤로 가며 엉뚱하게 스크롤됐다
        if (!e.defaultPrevented && matchShortcut('back', e)) {
          const handled = onEscape();
          if (handled) e.preventDefault();
        }
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }

    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener('hardwareBackPress', onEscape);
      return () => sub.remove();
    }
  }, [onEscape]);
}
