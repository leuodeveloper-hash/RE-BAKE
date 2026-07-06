import React, {useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useColors} from '@contexts/ThemeContext';
import {triggerHaptic} from '@utils/haptics';
import {GradientGlow} from './GradientGlow';

export type ButtonVariant = 'filled' | 'soft' | 'outlined' | 'ghost';
export type ButtonSize = 'small' | 'medium';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** 에러/삭제 등 위험한 액션 (빨간색 스타일) */
  destructive?: boolean;
  /** 강조 액션 (파란색 스타일) */
  accent?: boolean;
  /** 그라디언트 그림자 (플로팅 CTA용) */
  gradientShadow?: boolean;
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
  loading = false,
  destructive = false,
  accent = false,
  gradientShadow = false,
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
          ? colors['fill/strong']
          : destructive
            ? colors['background/negative']
            : colors['surface/inverse'];
        break;
      case 'soft':
        base.backgroundColor = disabled
          ? colors['fill/strong']
          : destructive
            ? colors['background/negative-container']
            : colors['fill/subtle'];
        break;
      case 'outlined':
        base.backgroundColor = colors['surface/container'];
        base.borderWidth = 1;
        base.borderColor = disabled
          ? colors['border/muted']
          : colors['border/normal'];
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
    }

    if (pressed && !disabled) {
      if (variant === 'filled') {
        base.opacity = 0.85;
      } else {
        base.backgroundColor = destructive
          ? colors['state/negative']
          : colors['state/pressed'];
      }
    }

    return base;
  };

  const getTextColor = (): string => {
    if (disabled) {
      if (variant === 'filled') return colors['foreground/on-surface-inverse-var'];
      return colors['foreground/on-surface-disabled'];
    }
    if (destructive && variant === 'filled') return colors['foreground/on-negative'];
    if (destructive) return colors['foreground/negative'];
    if (accent) return colors['foreground/accent'];
    if (variant === 'filled') return colors['foreground/on-surface-inverse'];
    return colors['foreground/on-surface'];
  };

  const showGlow = gradientShadow && !disabled;
  const [layoutSize, setLayoutSize] = useState<{w: number; h: number} | null>(null);

  return (
    <View
      style={[style, showGlow && {overflow: 'visible' as const}]}
      onLayout={showGlow ? (e) => {
        const {width, height} = e.nativeEvent.layout;
        setLayoutSize({w: width, h: height});
      } : undefined}
    >
      {showGlow && layoutSize && (
        <GradientGlow
          width={layoutSize.w}
          height={layoutSize.h}
          borderRadius={sizeConfig.borderRadius}
        />
      )}
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          onPress?.();
        }}
        disabled={disabled || loading}>
        {({pressed}: {pressed: boolean}) => (
          <View style={[getContainerStyle(pressed), (Icon || TrailingIcon || loading) && {flexDirection: 'row' as const, gap: sizeConfig.gap}]}>
            {loading ? (
              <ActivityIndicator size="small" color={getTextColor()} />
            ) : (
              Icon && <Icon width={18} height={18} color={getTextColor()} />
            )}
            <Text style={[styles.label, {color: getTextColor()}]}>{label}</Text>
            {!loading && TrailingIcon && <TrailingIcon width={18} height={18} color={getTextColor()} />}
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
  },
});
