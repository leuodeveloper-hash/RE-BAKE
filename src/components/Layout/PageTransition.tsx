import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, ViewStyle} from 'react-native';

export interface PageTransitionProps {
  children: React.ReactNode;
  /** 페이지 표시 여부 (기본: true) */
  visible?: boolean;
  /** 추가 스타일 */
  style?: ViewStyle;
  /** 애니메이션 완료 콜백 */
  onAnimationComplete?: () => void;
}

/**
 * 페이지 진입/퇴장 애니메이션 래퍼
 * - 진입: 아래에서 위로 슬라이드 + 페이드인
 * - 퇴장: 위에서 아래로 슬라이드 + 페이드아웃
 */
export function PageTransition({
  children,
  visible = true,
  style,
  onAnimationComplete,
}: PageTransitionProps) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      // 첫 렌더링 시 진입 애니메이션
      isFirstRender.current = false;
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => onAnimationComplete?.());
      return;
    }

    if (visible) {
      // 진입 애니메이션
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => onAnimationComplete?.());
    } else {
      // 퇴장 애니메이션
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 30,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => onAnimationComplete?.());
    }
  }, [visible, translateY, opacity, onAnimationComplete]);

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity,
          transform: [{translateY}],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
