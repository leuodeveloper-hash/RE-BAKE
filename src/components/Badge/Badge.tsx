import React from 'react';
import {StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Typography} from '@constants/typography';

export interface BadgeProps {
  label: string;
  style?: StyleProp<ViewStyle>;
}

/** 회색 뱃지 — 규칙·기호(##, -, 1.) 같은 짧은 표시를 글 사이에 넣을 때 */
export function Badge({label, style}: BadgeProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>{label}</Text>
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
  text: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-var'],
  },
});
