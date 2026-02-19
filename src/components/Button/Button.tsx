import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {useColors} from '@contexts/ThemeContext';

export type ButtonVariant = 'filled' | 'soft' | 'outlined' | 'ghost';
export type ButtonSize = 'small' | 'medium';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** 에러/삭제 등 위험한 액션 (빨간색 스타일) */
  destructive?: boolean;
  style?: ViewStyle;
  icon?: React.FC<SvgProps>;
  trailingIcon?: React.FC<SvgProps>;
}

const SIZE_CONFIG = {
  small: {height: 32, paddingHorizontal: Spacing.smd, gap: 4, borderRadius: Radius['radius-full']},
  medium: {height: 48, paddingHorizontal: 20, gap: 6, borderRadius: Radius['radius-full']},
} as const;

export function Button({
  label,
  onPress,
  variant = 'filled',
  size = 'medium',
  disabled = false,
  destructive = false,
  style,
  icon: Icon,
  trailingIcon: TrailingIcon,
}: ButtonProps) {
  const colors = useColors();
  const sizeConfig = SIZE_CONFIG[size];

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    const base: ViewStyle = {
      height: sizeConfig.height,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      borderRadius: sizeConfig.borderRadius,
      alignItems: 'center',
      justifyContent: 'center',
    };

    switch (variant) {
      case 'filled':
        base.backgroundColor = disabled
          ? colors['background-statelayers-disabled']
          : destructive
            ? colors['background-error']
            : colors['surface-surfaceinverse'];
        break;
      case 'soft':
        base.backgroundColor = disabled
          ? colors['background-statelayers-disabled']
          : destructive
            ? colors['background-errorcontainer']
            : colors['surface-surfacecontainertransparent'];
        break;
      case 'outlined':
        base.backgroundColor = colors['surface-surfacecontainerlowest'];
        base.borderWidth = 1;
        base.borderColor = disabled
          ? colors['border-borderlight']
          : colors['border-border'];
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
    }

    if (pressed && !disabled) {
      base.backgroundColor =
        destructive && variant === 'filled'
          ? colors['background-statelayers-errorfocused_pressed']
          : variant === 'filled'
            ? colors['background-statelayers-inversesurfacefocus_press']
            : colors['background-statelayers-surfacefocus_press'];
    }

    return base;
  };

  const getTextColor = (): string => {
    if (disabled) return colors['foreground-onsurfacedisabled'];
    if (destructive && variant === 'filled') return colors['foreground-onerror'];
    if (destructive) return colors['foreground-error'];
    if (variant === 'filled') return colors['foreground-onsurfaceinverse'];
    return colors['foreground-onsurface'];
  };

  return (
    <View style={style}>
      <Pressable onPress={onPress} disabled={disabled}>
        {({pressed}) => (
          <View style={[getContainerStyle(pressed), (Icon || TrailingIcon) && {flexDirection: 'row' as const, gap: sizeConfig.gap}]}>
            {Icon && <Icon width={18} height={18} color={getTextColor()} />}
            <Text style={[styles.label, {color: getTextColor()}]}>{label}</Text>
            {TrailingIcon && <TrailingIcon width={18} height={18} color={getTextColor()} />}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Typography.label['xlarge - semibold'].fontFamily,
    fontSize: Typography.label['xlarge - semibold'].fontSize,
    fontWeight: Typography.label['xlarge - semibold'].fontWeight as '600',
    lineHeight: Typography.label['xlarge - semibold'].lineHeight,
    marginTop: FONT_BASELINE_OFFSET,
  },
});
