import {Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Spacing} from '@constants/spacing';

/**
 * 하단 안전영역 — 플랫폼마다 다르다.
 * 네이티브: 기기 값(홈 인디케이터·내비게이션 바, iOS/안드로이드 기종별로 다름). 웹: 16(바닥에 딱 붙지 않게).
 * 화면에서 insets.bottom을 직접 더하지 말고 이 값을 쓴다.
 */
export const safeBottomInset = (safeBottom: number) => (Platform.OS === 'web' ? Spacing.md : safeBottom);

export function useSafeBottom() {
  return safeBottomInset(useSafeAreaInsets().bottom);
}
