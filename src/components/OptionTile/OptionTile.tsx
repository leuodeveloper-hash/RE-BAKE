import React from 'react';
import {StyleSheet, Text, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {SemanticColorsLight} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {Card} from '@components/Layout/Card';
import {AppIcon, AppIconSize} from '@components/Icon/AppIcon';

export interface OptionTileProps {
  icon: React.FC<SvgProps>;
  iconSize?: AppIconSize;
  label: string;
  style?: ViewStyle;
}

export function OptionTile({icon, iconSize = 'sm', label, style}: OptionTileProps) {
  return (
    <Card style={[styles.card, style]}>
      <AppIcon
        icon={icon}
        size={iconSize}
        color={SemanticColorsLight['foreground-onsurfacemuted']}
      />
      <Text style={styles.label}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  label: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: SemanticColorsLight['foreground-onsurface'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
});
