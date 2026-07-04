import React from 'react';
import {StyleSheet, Text, View, ViewStyle} from 'react-native';
import type {SemanticColorsV2} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useThemedStylesV2} from '@hooks/useThemedStyles';

export interface SubheaderProps {
  title: string;
  style?: ViewStyle;
}

export function Subheader({title, style}: SubheaderProps) {
  const styles = useThemedStylesV2(createStyles);
  return (
    <View style={[styles.header, style]}>
      <Text style={styles.headerText}>{title}</Text>
    </View>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  header: {
    height: 40,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  headerText: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground/on-surface-var'],
  },
});
