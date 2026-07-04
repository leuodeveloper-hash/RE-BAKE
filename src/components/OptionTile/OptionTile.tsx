import React from 'react';
import {Pressable, StyleSheet, Text, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import type {SemanticColorsV2} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {Card} from '@components/Container/Card';
import {AppIcon, AppIconSize} from '@components/Icon/AppIcon';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';

export interface OptionTileProps {
  icon: React.FC<SvgProps>;
  iconSize?: AppIconSize;
  label: string;
  style?: ViewStyle;
  onPress?: () => void;
}

export function OptionTile({icon, iconSize = 'sm', label, style, onPress}: OptionTileProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const content = (
    <Card style={[styles.card, style]}>
      <AppIcon
        icon={icon}
        size={iconSize}
        color={colors['foreground/on-surface-muted']}
      />
      <Text style={styles.label}>{label}</Text>
    </Card>
  );
  if (onPress) {
    return <Pressable style={styles.pressable} onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  pressable: {
    flex: 1,
  },
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
    color: colors['foreground/on-surface'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
});
