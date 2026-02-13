import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Radius, SemanticColorsLight} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

export type ButtonVariant = 'filled' | 'soft' | 'outlined' | 'ghost';
export type ButtonSize = 'small' | 'medium';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
}

const SIZE_CONFIG = {
  small: {height: 32, paddingHorizontal: Spacing.smd},
  medium: {height: 40, paddingHorizontal: Spacing.md},
} as const;

export function Button({
  label,
  onPress,
  variant = 'filled',
  size = 'medium',
  disabled = false,
  style,
}: ButtonProps) {
  const sizeConfig = SIZE_CONFIG[size];

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    const base: ViewStyle = {
      height: sizeConfig.height,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      borderRadius: Radius['radius-md'],
      alignItems: 'center',
      justifyContent: 'center',
    };

    switch (variant) {
      case 'filled':
        base.backgroundColor = disabled
          ? SemanticColorsLight['background-statelayers-disabled']
          : SemanticColorsLight['surface-surfaceinverse'];
        break;
      case 'soft':
        base.backgroundColor = disabled
          ? SemanticColorsLight['background-statelayers-disabled']
          : SemanticColorsLight['surface-surfacecontainertransparent'];
        break;
      case 'outlined':
        base.backgroundColor = SemanticColorsLight['surface-surfacecontainerlowest'];
        base.borderWidth = 1;
        base.borderColor = disabled
          ? SemanticColorsLight['border-borderlight']
          : SemanticColorsLight['border-border'];
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
    }

    if (pressed && !disabled) {
      base.backgroundColor =
        variant === 'filled'
          ? SemanticColorsLight['background-statelayers-inversesurfacefocus_press']
          : SemanticColorsLight['background-statelayers-surfacefocus_press'];
    }

    return base;
  };

  const getTextColor = (): string => {
    if (disabled) return SemanticColorsLight['foreground-onsurfacedisabled'];
    if (variant === 'filled') return SemanticColorsLight['foreground-onsurfaceinverse'];
    return SemanticColorsLight['foreground-onsurface'];
  };

  return (
    <View style={[{flex: 1}, style]}>
      <Pressable onPress={onPress} disabled={disabled}>
        {({pressed}) => (
          <View style={getContainerStyle(pressed)}>
            <Text style={[styles.label, {color: getTextColor()}]}>{label}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Typography.label['large - semibold'].fontFamily,
    fontSize: Typography.label['large - semibold'].fontSize,
    fontWeight: Typography.label['large - semibold'].fontWeight as '600',
    lineHeight: Typography.label['large - semibold'].lineHeight,
    marginTop: FONT_BASELINE_OFFSET,
  },
});
