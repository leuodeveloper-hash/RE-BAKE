import React, {useEffect, useRef} from 'react';
import {Animated, Easing, Pressable, StyleSheet, Text, View} from 'react-native';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import type {SemanticColors} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {triggerHaptic} from '@utils/haptics';

/** 손잡이 이동 거리 — 트랙(36) - 손잡이(16) - 좌우 여백(2*2) */
const THUMB_TRAVEL = 16;

interface SwitchProps {
  label?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** 비활성 — 바꿀 수 없는 상태(흐리게, 눌러도 안 바뀜) */
  disabled?: boolean;
}

export function Switch({label, value, onValueChange, disabled = false}: SwitchProps) {
  const styles = useThemedStyles(createStyles);
  // 손잡이가 미끄러지듯 — 값만 바꾸면 툭 점프해 껐는지 켰는지 눈이 못 따라간다
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({inputRange: [0, 1], outputRange: [0, THUMB_TRAVEL]});

  return (
    <Pressable
      style={[styles.container, disabled && {opacity: 0.4}]}
      disabled={disabled}
      onPress={() => { triggerHaptic('light'); onValueChange(!value); }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.track, value && styles.trackActive]}>
        <Animated.View style={[styles.thumb, {transform: [{translateX}]}]} />
      </View>
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      padding: 2,
    },
    label: {
      ...Typography.caption.medium,
      color: colors['foreground/on-surface-muted'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    track: {
      width: 36,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors['foreground/on-surface-muted'],
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    trackActive: {
      backgroundColor: colors['custom/orange-var'],
    },
    thumb: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#fff',
    },
  });
