import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconChevronDown} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';

export type SelectorVariant = 'ghost' | 'filled' | 'outlined';

export interface SelectorProps {
  label: string;
  showDropdown?: boolean;
  onPress?: () => void;
  variant?: SelectorVariant;
  disabled?: boolean;
  forcePressed?: boolean;
  /** 텍스트 색상 muted 적용 (disabled와 독립) */
  muted?: boolean;
  style?: import('react-native').ViewStyle;
}

export function Selector({
  label,
  showDropdown = false,
  onPress,
  variant = 'ghost',
  disabled = false,
  forcePressed = false,
  muted = false,
  style,
}: SelectorProps) {
  const colors = useColors();

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
          ? colors['background-statelayers-disabled']
          : colors['surface-surfaceinverse'];
        break;
      case 'outlined':
        baseStyle.backgroundColor =
          colors['surface-surfacecontainerlowest'];
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = disabled
          ? colors['border-borderlight']
          : colors['border-border'];
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
          colors['background-statelayers-inversesurfacefocus_press'];
      } else {
        baseStyle.backgroundColor =
          colors['background-statelayers-surfacefocus_press'];
      }
    }

    return baseStyle;
  };

  const getTextColor = (): string => {
    if (muted) {
      return colors['foreground-onsurfacemuted'];
    }
    if (disabled) {
      return colors['foreground-onsurfacedisabled'];
    }
    if (variant === 'filled') {
      return colors['foreground-onsurfaceinverse'];
    }
    return colors['foreground-onsurface'];
  };

  const getIconColor = (): string => {
    if (disabled) {
      return colors['foreground-onsurfacedisabled'];
    }
    if (variant === 'filled') {
      return colors['foreground-onsurfaceinverse'];
    }
    return colors['foreground-onsurfacemuted'];
  };

  return (
    <Pressable onPress={onPress} disabled={disabled} style={style}>
      {({pressed}) => (
        <View style={getContainerStyle(pressed)}>
          <Text style={[styles.label, {color: getTextColor()}]} numberOfLines={1}>{label}</Text>
          {showDropdown && (
            <View style={{width: 12}}>
              <AppIcon
                icon={IconChevronDown}
                size="xs"
                color={getIconColor()}
              />
            </View>
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
