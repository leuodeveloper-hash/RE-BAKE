import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {BlurView} from 'expo-blur';
import {Radius, SemanticColorsLight} from '@constants/tokens';

export interface GlassContainerProps {
  children: React.ReactNode;
  /** border-radius 스타일 (기본: full) */
  borderRadius?: 'full' | 'xl';
  /** 추가 스타일 */
  style?: ViewStyle;
  /** 내부 콘텐츠 스타일 */
  contentStyle?: ViewStyle;
  /** blur intensity (기본: 64) */
  intensity?: number;
}

/**
 * Glass 효과를 가진 공통 컨테이너
 * - backdrop-filter: blur(32px)
 * - background: rgba(253, 253, 253, 0.88)
 * - shadow: SurfaceGlassElevated
 */
export function GlassContainer({
  children,
  borderRadius = 'full',
  style,
  contentStyle,
  intensity = 64,
}: GlassContainerProps) {
  const radiusValue = borderRadius === 'full'
    ? Radius['radius-full']
    : Radius['radius-xl'];

  return (
    <View style={[styles.shadowContainer, {borderRadius: radiusValue}, style]}>
      <BlurView
        intensity={intensity}
        tint="default"
        style={[styles.blurView, {borderRadius: radiusValue}]}>
        <View
          style={[
            styles.backgroundLayer,
            {borderRadius: radiusValue},
            contentStyle,
          ]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowContainer: {
    // iOS shadow - SurfaceGlassElevated
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 18,
    // Android shadow
    elevation: 4,
  },
  blurView: {
    overflow: 'hidden',
  },
  backgroundLayer: {
    backgroundColor: SemanticColorsLight['background-transparent'],
  },
});
