import React from 'react';
import {Image, StyleSheet} from 'react-native';

export interface GradientGlowProps {
  width: number;
  height: number;
}

export function GradientGlow({width}: GradientGlowProps) {
  const glowWidth = width * 1.5;

  return (
    <Image
      source={require('../../../assets/images/effect/glow.png')}
      pointerEvents="none"
      style={[
        styles.glow,
        {
          width: glowWidth,
          left: -(glowWidth - width) / 2, // ⭐ 중앙 정렬
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    bottom: -56,
    height: 140,
    resizeMode: 'contain',
  },
});