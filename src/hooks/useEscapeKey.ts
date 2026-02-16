import {useEffect} from 'react';
import {Platform, BackHandler} from 'react-native';

/**
 * ESC 키(웹) 또는 뒤로가기 버튼(Android)을 눌렀을 때 콜백 실행.
 * 콜백이 true를 반환하면 이벤트를 소비한 것으로 간주.
 */
export function useEscapeKey(onEscape: () => boolean) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
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
