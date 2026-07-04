import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {SvgProps} from 'react-native-svg';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconChevronDown} from '@components/Icon/IconIndex';
import {useColorsV2} from '@contexts/ThemeContext';

export type SelectorVariant = 'ghost' | 'filled' | 'outlined' | 'soft';

export interface SelectorProps {
  label: string;
  showDropdown?: boolean;
  onPress?: () => void;
  variant?: SelectorVariant;
  disabled?: boolean;
  forcePressed?: boolean;
  /** 텍스트 색상 muted 적용 (disabled와 독립) */
  muted?: boolean;
  /** 드롭다운 아이콘 override (기본: chevron-down). 예: 소팅/익스펜드(IconSorting) */
  dropdownIcon?: React.FC<SvgProps>;
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
  dropdownIcon,
  style,
}: SelectorProps) {
  const colors = useColorsV2();

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 64,
      paddingHorizontal: Spacing.md, // 16px
      paddingVertical: Spacing.xs, // 4px
      gap: Spacing.sm, // 8px
      borderRadius: Radius['radius-full'],
    };

    // Background color by variant
    switch (variant) {
      case 'filled':
        baseStyle.backgroundColor = disabled
          ? colors['fill/strong']
          : colors['surface/inverse'];
        break;
      case 'outlined':
        baseStyle.backgroundColor =
          colors['surface/container'];
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = disabled
          ? colors['border/muted']
          : colors['border/normal'];
        break;
      case 'soft':
        baseStyle.backgroundColor = colors['surface/container'];
        baseStyle.borderRadius = Radius['radius-md'];
        baseStyle.paddingHorizontal = Spacing.smd;
        baseStyle.minHeight = 48;
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
          colors['state/pressed'];
      } else {
        baseStyle.backgroundColor =
          colors['state/pressed'];
      }
    }

    return baseStyle;
  };

  const getTextColor = (): string => {
    if (muted) {
      return colors['foreground/on-surface-muted'];
    }
    if (disabled) {
      return colors['foreground/on-surface-disabled'];
    }
    if (variant === 'filled') {
      return colors['foreground/on-surface-inverse'];
    }
    return colors['foreground/on-surface'];
  };

  const getIconColor = (): string => {
    if (disabled) {
      return colors['foreground/on-surface-disabled'];
    }
    if (variant === 'filled') {
      return colors['foreground/on-surface-inverse'];
    }
    return colors['foreground/on-surface-muted'];
  };

  return (
    <Pressable onPress={onPress} disabled={disabled} style={style}>
      {({pressed, focused}: {pressed: boolean; focused: boolean}) => (
        <View style={getContainerStyle(pressed || focused)}>
          <Text style={[styles.label, {color: getTextColor()}]} numberOfLines={1}>{label}</Text>
          {showDropdown && (
            <View style={{width: 12}}>
              <AppIcon
                icon={dropdownIcon ?? IconChevronDown}
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
