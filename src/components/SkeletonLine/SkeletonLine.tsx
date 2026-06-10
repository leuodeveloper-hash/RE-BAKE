import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {useColorsV2} from '@contexts/ThemeContext';
import {Radius} from '@constants/tokens';

export interface SkeletonLineProps {
  /** 라인 개수 (기본 2) */
  lines?: number;
  /** 한 줄 높이 (기본 14) */
  lineHeight?: number;
  /** 줄 간격 (기본 8) */
  gap?: number;
  /** 마지막 줄 너비 비율 (기본 0.6) */
  lastLineRatio?: number;
  style?: StyleProp<ViewStyle>;
}

/** OCR/AI 처리 중 표시할 펄스 스켈레톤 */
export function SkeletonLine({
  lines = 2,
  lineHeight = 14,
  gap = 8,
  lastLineRatio = 0.6,
  style,
}: SkeletonLineProps) {
  const colors = useColorsV2();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      {Array.from({length: lines}).map((_, i) => {
        const isLast = i === lines - 1;
        return (
          <Animated.View
            key={i}
            style={[
              styles.line,
              {
                height: lineHeight,
                marginTop: i === 0 ? 0 : gap,
                width: isLast ? `${lastLineRatio * 100}%` : '100%',
                backgroundColor: colors['foreground/on-surface-muted'],
                opacity: pulse,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  line: {
    borderRadius: Radius['radius-sm'],
  },
});
