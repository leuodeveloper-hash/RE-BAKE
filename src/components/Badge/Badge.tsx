import React from 'react';
import {StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Typography} from '@constants/typography';

export interface BadgeProps {
  label: string;
  /** medium(기본, 글 사이) | large(한 단계 큼 — 단축키 패널처럼 뱃지가 주인공일 때) */
  size?: 'medium' | 'large';
  style?: StyleProp<ViewStyle>;
}

/** 회색 뱃지 — 규칙·기호(##, -, 1.) 같은 짧은 표시를 글 사이에 넣을 때 */
export function Badge({label, size = 'medium', style}: BadgeProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.badge, size === 'large' && styles.badgeLarge, style]}>
      <Text style={[styles.text, size === 'large' && styles.textLarge]}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius['radius-sm'],
    backgroundColor: colors['fill/subtle'],
  },
  badgeLarge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  textLarge: {
    ...Typography.label.large,
  },
  text: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-var'],
  },
});
