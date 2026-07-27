import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Pressable, StyleSheet, ViewStyle} from 'react-native';
import {GlassContainer} from '@components/Container';
import {Spacing} from '@constants/spacing';

export interface PopoverProps {
  /** 표시 여부 */
  visible: boolean;
  /** 바깥(배경) 탭 시 닫기 */
  onClose?: () => void;
  /**
   * 앵커 기준 절대 위치 — 부모(position:relative/absolute 컨테이너) 안에서 top/left/right 등 지정.
   * 예: {position:'absolute', top: 60, left: 16}
   */
  style?: ViewStyle;
  /** 팝오버 내용 (버튼 등 자유). 리스트 선택지는 Menu를 쓸 것. */
  children: React.ReactNode;
  /** 카드 최소 너비 (기본 180) */
  minWidth?: number;
}

/**
 * 앵커(특정 버튼 등) 옆/아래에 붙어 뜨는 범용 팝오버 카드.
 * - 배경 탭으로 닫힘 + scale/opacity 등장 애니메이션 (Menu와 동일 감성)
 * - 내용은 children으로 자유 구성(버튼 그룹 등). 선택지 리스트는 Menu 사용.
 * 다이얼로그(중앙)·바텀시트(하단)와 구분되는, 앵커에 붙는 표시 방식.
 */
export function Popover({visible, onClose, style, children, minWidth = 180}: PopoverProps) {
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(scale, {toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
          Animated.timing(opacity, {toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(scale, {toValue: 0.95, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 0, duration: 100, easing: Easing.in(Easing.cubic), useNativeDriver: true}),
      ]).start(() => setShouldRender(false));
    }
  }, [visible, scale, opacity]);

  if (!shouldRender) return null;

  return (
    <>
      {visible && onClose && <Pressable style={styles.backdrop} onPress={onClose} />}
      <Animated.View
        style={[style, {opacity, transform: [{scale}]}]}
        pointerEvents={visible ? 'auto' : 'none'}>
        <GlassContainer borderRadius="lg" contentStyle={{padding: Spacing.sm, minWidth}}>
          {children}
        </GlassContainer>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {position: 'absolute', top: -9999, left: -9999, right: -9999, bottom: -9999},
});
