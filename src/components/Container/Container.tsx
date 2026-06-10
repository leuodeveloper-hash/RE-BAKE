import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {BlurView} from 'expo-blur';
import {Radius} from '@constants/tokens';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useTheme} from '@contexts/ThemeContext';

/**
 * Figma `Container` 컴포넌트 매칭.
 * Source: Figma 파일 SuXlE5Q4KKIG4LJjJ8j6Jd, COMPONENT_SET id 4100:12266
 *
 * Material variants:
 * - subtle: fill/subtle (#0E0E0D 6%), border 없음 — 기본
 * - faint:  fill/faint (3%) + border/muted 1px
 * - glass:  fill/glass-normal (rgba 255 72%) + BACKGROUND_BLUR
 *
 * Figma 정의 기본 radius=16 (radius-lg).
 * Glass intensity 의 BlurView 매핑: Figma blur radius 와 iOS BlurView intensity
 * 단위가 다르므로 시각 동등성을 위해 64를 기본값으로 사용 (기존 GlassContainer 호환).
 */

export type ContainerMaterial = 'subtle' | 'faint' | 'glass';

export interface ContainerProps {
  children: React.ReactNode;
  /** Figma `Material` variant. 기본값 'subtle' */
  material?: ContainerMaterial;
  /** 모서리 반경 override. 기본 radius-lg (16) */
  borderRadius?: number;
  /** Glass material 만 적용. BlurView intensity (0-100). 기본 64 */
  intensity?: number;
  /** Glass material 의 inner content View 스타일 (padding/min-size 등) */
  contentStyle?: ViewStyle;
  style?: ViewStyle;
}

export function Container({
  children,
  material = 'subtle',
  borderRadius,
  intensity = 64,
  contentStyle,
  style,
}: ContainerProps) {
  const styles = useThemedStylesV2(createStyles);
  const {isDark} = useTheme();
  const radius = borderRadius ?? Radius['radius-lg'];

  if (material === 'glass') {
    return (
      <View style={[styles.glassWrapper, {borderRadius: radius}, style]}>
        <BlurView
          intensity={intensity}
          tint={isDark ? 'dark' : 'default'}
          style={[styles.glassBlur, {borderRadius: radius}]}>
          <View style={[styles.glassFill, {borderRadius: radius}, contentStyle]}>
            {children}
          </View>
        </BlurView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.base,
        {borderRadius: radius},
        material === 'subtle' && styles.subtle,
        material === 'faint' && styles.faint,
        style,
      ]}>
      {children}
    </View>
  );
}

const createStyles = (colors: SemanticColorsV2) =>
  StyleSheet.create({
    base: {
      overflow: 'hidden',
    },
    subtle: {
      backgroundColor: colors['fill/subtle'],
    },
    faint: {
      backgroundColor: colors['fill/faint'],
      borderWidth: 1,
      borderColor: colors['border/muted'],
    },
    glassWrapper: {
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    glassBlur: {
      overflow: 'hidden',
    },
    glassFill: {
      backgroundColor: colors['fill/glass-normal'],
    },
  });
