import React from 'react';
import {StyleSheet, Text, View, ViewStyle} from 'react-native';
import {SemanticColorsLight} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface SubheaderProps {
  title: string;
  style?: ViewStyle;
}

export function Subheader({title, style}: SubheaderProps) {
  return (
    <View style={[styles.header, style]}>
      <Text style={styles.headerText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 40,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  headerText: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: SemanticColorsLight['foreground-onsurfacevar'],
  },
});
