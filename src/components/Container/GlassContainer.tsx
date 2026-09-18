import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import {ElevationLight, ElevationDark} from '@constants/elevation';
import {useTheme} from '@contexts/ThemeContext';
import {Container} from './Container';

/**
 * Figma `Glass container` 컴포넌트 매칭.
 * Source: Figma 파일 SuXlE5Q4KKIG4LJjJ8j6Jd, COMPONENT id 4101:7411
 *
 * 합성 정의:
 *   GlassContainer = Container material="glass" + elevation/shadow/normal
 *
 * - radius/lg (16) Figma 기본값
 * - 그림자: y=2 blur=20 alpha=0.08 + y=0 blur=2 alpha=0.08 (shadow/normal)
 *
 * Container 의 glass material 은 그림자 없는 순수 글래스 효과.
 * GlassContainer 는 그 위에 그림자를 더한 완성형 UI 엘리먼트.
 */

export interface GlassContainerProps {
  children: React.ReactNode;
  /** border-radius 스타일 (기본: full — 알약 형태) */
  borderRadius?: 'full' | 'xl' | 'lg';
  /** 추가 스타일 */
  style?: ViewStyle;
  /** 내부 콘텐츠 스타일 */
  contentStyle?: StyleProp<ViewStyle>;
  /** blur intensity (기본: 64 — 기존 호환) */
  intensity?: number;
  /**
   * 그림자 단계 (기본: normal).
   * 목록 위에 떠서 더 분리돼 보여야 하는 메뉴/팝오버는 strong.
   */
  elevation?: 'normal' | 'strong';
}

export function GlassContainer({
  children,
  borderRadius = 'full',
  style,
  contentStyle,
  intensity = 64,
  elevation = 'normal',
}: GlassContainerProps) {
  const {isDark} = useTheme();
  const radiusValue =
    borderRadius === 'full'
      ? Radius['radius-full']
      : borderRadius === 'xl'
      ? Radius['radius-xl']
      : Radius['radius-lg'];
  const shadow = isDark ? ElevationDark[elevation] : ElevationLight[elevation];

  return (
    <View style={[styles.shadowWrap, {borderRadius: radiusValue}, shadow, style]}>
      <Container
        material="glass"
        borderRadius={radiusValue}
        intensity={intensity}
        contentStyle={contentStyle}>
        {children}
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    backgroundColor: 'transparent',
  },
});
