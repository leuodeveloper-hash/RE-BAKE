import React, {useCallback, useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTheme} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

const ANIMATION_DURATION = 150;
const AUTO_DISMISS_DELAY = 2500;

export interface TooltipProps {
  /** 툴팁에 표시할 메시지 */
  message: string;
  /** 표시 여부 */
  visible: boolean;
  /** 닫힘 콜백 */
  onClose: () => void;
  /** 트리거 요소 */
  children: React.ReactNode;
  /** 툴팁 위치 (기본: bottom) */
  position?: 'top' | 'bottom';
  /** 컨테이너 스타일 */
  style?: ViewStyle;
}

export function Tooltip({message, visible, onClose, children, position = 'bottom', style}: TooltipProps) {
  const styles = useThemedStyles(createStyles);
  const {elevation} = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(position === 'top' ? 4 : -4)).current;
  const isVisible = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (visible && !isVisible.current) {
      isVisible.current = true;
      translateY.setValue(position === 'top' ? 4 : -4);
      Animated.parallel([
        Animated.timing(opacity, {toValue: 1, duration: ANIMATION_DURATION, useNativeDriver: true}),
        Animated.timing(translateY, {toValue: 0, duration: ANIMATION_DURATION, useNativeDriver: true}),
      ]).start();

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onClose();
      }, AUTO_DISMISS_DELAY);
    } else if (!visible && isVisible.current) {
      clearTimeout(timerRef.current);
      Animated.parallel([
        Animated.timing(opacity, {toValue: 0, duration: ANIMATION_DURATION, useNativeDriver: true}),
        Animated.timing(translateY, {toValue: position === 'top' ? 4 : -4, duration: ANIMATION_DURATION, useNativeDriver: true}),
      ]).start(() => {
        isVisible.current = false;
      });
    }

    return () => clearTimeout(timerRef.current);
  }, [visible]);

  const handlePress = useCallback(() => {
    if (visible) onClose();
  }, [visible, onClose]);

  return (
    <View style={[styles.wrapper, style]}>
      {children}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.tooltipContainer,
          position === 'top' ? styles.positionTop : styles.positionBottom,
          elevation['4'],
          {opacity, transform: [{translateY}]},
        ]}
      >
        <Pressable onPress={handlePress}>
          <View style={styles.tooltip}>
            <Text style={styles.message}>{message}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  tooltipContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 30,
  },
  positionTop: {
    bottom: '100%',
    marginBottom: Spacing.xs,
  },
  positionBottom: {
    top: '100%',
    marginTop: Spacing.xs,
  },
  tooltip: {
    backgroundColor: colors['surface-surfacecontainerhigh'],
    borderRadius: Radius['radius-md'],
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
  },
  message: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground-onsurface'],
    marginTop: FONT_BASELINE_OFFSET,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  } as any,
});
