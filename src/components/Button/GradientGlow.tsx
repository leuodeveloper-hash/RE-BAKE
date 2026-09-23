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
      // resizeMode는 스타일이 아니라 prop이다(스타일로 주면 타입이 맞지 않는다)
      resizeMode="contain"
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
    // Image는 pointerEvents prop을 받지 않는다 — 스타일로 준다(장식용이라 터치 통과)
    pointerEvents: 'none',
    bottom: -56,
    height: 140,
  },
});