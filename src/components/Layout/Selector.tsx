import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Radius, SemanticColorsLight} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconChevronDown} from '@components/Icon/IconIndex';

export type SelectorVariant = 'ghost' | 'filled' | 'outlined';

export interface SelectorProps {
  label: string;
  showDropdown?: boolean;
  onPress?: () => void;
  variant?: SelectorVariant;
  disabled?: boolean;
  forcePressed?: boolean;
}

export function Selector({
  label,
  showDropdown = false,
  onPress,
  variant = 'ghost',
  disabled = false,
  forcePressed = false,
}: SelectorProps) {
  const getContainerStyle = (pressed: boolean): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md, // 16px
      paddingVertical: Spacing.xs, // 4px
      gap: Spacing.sm, // 8px
      borderRadius: Radius['radius-full'],
    };

    // Background color by variant
    switch (variant) {
      case 'filled':
        baseStyle.backgroundColor = disabled
          ? SemanticColorsLight['background-statelayers-disabled']
          : SemanticColorsLight['surface-surfaceinverse'];
        break;
      case 'outlined':
        baseStyle.backgroundColor =
          SemanticColorsLight['surface-surfacecontainerlowest'];
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = disabled
          ? SemanticColorsLight['border-borderlight']
          : SemanticColorsLight['border-border'];
        break;
      case 'ghost':
      default:
        baseStyle.backgroundColor = 'transparent';
        baseStyle.height = 40;
        baseStyle.paddingHorizontal = Spacing.smd; // 12px
        break;
    }

    // Pressed state
    if ((pressed || forcePressed) && !disabled) {
      if (variant === 'filled') {
        baseStyle.backgroundColor =
          SemanticColorsLight['background-statelayers-inversesurfacefocus_press'];
      } else {
        baseStyle.backgroundColor =
          SemanticColorsLight['background-statelayers-surfacefocus_press'];
      }
    }

    return baseStyle;
  };

  const getTextColor = (): string => {
    if (disabled) {
      return SemanticColorsLight['foreground-onsurfacedisabled'];
    }
    if (variant === 'filled') {
      return SemanticColorsLight['foreground-onsurfaceinverse'];
    }
    return SemanticColorsLight['foreground-onsurface'];
  };

  const getIconColor = (): string => {
    if (disabled) {
      return SemanticColorsLight['foreground-onsurfacedisabled'];
    }
    if (variant === 'filled') {
      return SemanticColorsLight['foreground-onsurfaceinverse'];
    }
    return SemanticColorsLight['foreground-onsurfacemuted'];
  };

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({pressed}) => (
        <View style={getContainerStyle(pressed)}>
          <Text style={[styles.label, {color: getTextColor()}]}>{label}</Text>
          {showDropdown && (
            <AppIcon
              icon={IconChevronDown}
              size="xs"
              color={getIconColor()}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    marginTop: FONT_BASELINE_OFFSET,
  },
});
