import {useWindowDimensions} from 'react-native';
import {Typography} from '@constants/typography';

/**
 * 반응형 타이포그래피 토큰.
 * 폰에선 기본 Typography, 태블릿(가로 폭 >= TABLET_BREAKPOINT)에선 일부 토큰을 키운다.
 * - 현재 대상: headline.medium (폰 24/30 → 태블릿 30/38)
 * - 사용처는 useThemedStyles와 별개로, 컴포넌트에서 호출해 inline으로 머지해 쓴다
 *   (StyleSheet는 폭 변화를 모르므로 폭 의존 값은 훅으로 주입).
 */
export const TABLET_BREAKPOINT = 600;
// 태블릿 확대 배수 (headline-medium 24 → 28)
const TABLET_SCALE = 7 / 6;

type TypeStyle = {fontSize: number; lineHeight: number; [k: string]: unknown};

const scaleType = <T extends TypeStyle>(t: T, factor: number): T => ({
  ...t,
  fontSize: Math.round(t.fontSize * factor),
  lineHeight: Math.round(t.lineHeight * factor),
});

export function useResponsiveTypography() {
  const {width} = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  return {
    ...Typography,
    isTablet,
    headline: {
      ...Typography.headline,
      // headline-medium 반응형 (폰 24/30 → 태블릿 28/35, 배수 7/6)
      medium: isTablet ? scaleType(Typography.headline.medium, TABLET_SCALE) : Typography.headline.medium,
    },
  };
}
