import React from 'react';
import {ActivityIndicator, Animated, Pressable, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import {SvgProps} from 'react-native-svg';
import {AppIcon, AppIconSize} from '@components/Icon/AppIcon';
import {useColors} from '@contexts/ThemeContext';
import {triggerHaptic} from '@utils/haptics';
import {usePressScale} from '@hooks/usePressScale';

export type IconButtonStyle =
  | 'filled'
  | 'soft'
  | 'tonal'
  | 'outlined'
  | 'ghost'
  | 'ghost-primary'
  | 'ghost-secondary'
  | 'ghost-inverse'
  | 'ghost-yellow';

export type IconButtonSize = 'small' | 'medium' | 'large';

export interface IconButtonProps {
  icon: React.FC<SvgProps>;
  onPress?: () => void;
  variant?: IconButtonStyle;
  size?: IconButtonSize;
  disabled?: boolean;
  loading?: boolean;
  forcePressed?: boolean; // 외부에서 pressed 상태 강제 (메뉴 열림 등)
  /** 이미지 위에 배치될 때 on-image 컬러 적용 */
  onImage?: boolean;
  /** 아이콘 색상 직접 지정 (variant 기본 색상 override) */
  iconColor?: string;
  style?: ViewStyle;
}

const SIZE_CONFIG = {
  small: {container: 28, touchArea: 40, icon: 16},
  medium: {container: 40, touchArea: 48, icon: 20},
  large: {container: 48, touchArea: 56, icon: 20},
} as const;

export function IconButton({
  icon: Icon,
  onPress,
  variant = 'ghost',
  size = 'medium',
  disabled = false,
  loading = false,
  forcePressed = false,
  onImage = false,
  iconColor,
  style,
}: IconButtonProps) {
  const colors = useColors();
  const {pressHandlers, animatedStyle} = usePressScale();
  const sizeConfig = SIZE_CONFIG[size];

  const getIconSize = (): AppIconSize => {
    switch (size) {
      case 'small':
        return 'xs';
      case 'large':
        return 'md';
      case 'medium':
      default:
        return 'sm';
    }
  };

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    const baseStyle: ViewStyle = {
      width: sizeConfig.container,
      height: sizeConfig.container,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    };

    // Border radius - 모든 아이콘버튼은 circle
    baseStyle.borderRadius = Radius['radius-full'];

    // Background color
    switch (variant) {
      case 'filled':
        baseStyle.backgroundColor = disabled
          ? colors['fill/strong']
          : colors['surface/inverse'];
        break;
      case 'soft':
        baseStyle.backgroundColor = disabled
          ? colors['fill/strong']
          : onImage
            ? colors['fill/subtle-inverse']
            : colors['fill/glass-normal'];
        break;
      case 'tonal':
        // tonal = fill/faint 배경 (글래스가 아닌 옅은 채움)
        baseStyle.backgroundColor = disabled
          ? colors['fill/strong']
          : colors['fill/faint'];
        break;
      case 'outlined':
        baseStyle.backgroundColor =
          colors['surface/container'];
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = disabled
          ? colors['border/muted']
          : colors['border/normal'];
        break;
      case 'ghost':
      case 'ghost-primary':
      case 'ghost-secondary':
      case 'ghost-inverse':
      case 'ghost-yellow':
        baseStyle.backgroundColor = 'transparent';
        break;
    }

    // Pressed state (실제 pressed 또는 forcePressed)
    if ((pressed || forcePressed) && !disabled) {
      if (variant === 'filled' || variant === 'ghost-inverse' || onImage) {
        baseStyle.backgroundColor =
          colors['state/pressed'];
      } else if (variant === 'ghost-yellow') {
        baseStyle.backgroundColor =
          colors['custom/yellow-subtle'];
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors['custom/yellow-var'];
      } else {
        baseStyle.backgroundColor =
          colors['state/pressed'];
      }
    }

    return baseStyle;
  };

  const getIconColor = (): string => {
    if (disabled) {
      return colors['foreground/on-surface-disabled'];
    }
    if (onImage) {
      return colors['foreground/on-image'];
    }
    if (variant === 'filled') {
      return colors['foreground/on-surface-inverse'];
    }
    if (variant === 'ghost-primary') {
      return colors['foreground/on-surface'];
    }
    if (variant === 'ghost-secondary') {
      return colors['foreground/on-surface-muted'];
    }
    if (variant === 'ghost-yellow') {
      return colors['custom/yellow'];
    }
    if (variant === 'ghost-inverse') {
      return colors['foreground/on-surface-inverse'];
    }
    if (variant === 'soft' || variant === 'tonal') {
      return colors['foreground/on-surface-var'];
    }
    return colors['foreground/on-surface'];
  };

  return (
    <View
      style={[
        {
          width: sizeConfig.container,
          height: sizeConfig.container,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        },
        style,
      ]}>
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          onPress?.();
        }}
        // 눌림 스케일 — 색 변화만으로는 반응이 약해 햅틱까지 약하게 느껴진다
        {...(disabled || loading ? {} : pressHandlers)}
        disabled={disabled || loading}
        style={{
          width: sizeConfig.touchArea,
          height: sizeConfig.touchArea,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {({pressed, focused}: {pressed: boolean; focused: boolean}) => (
          <Animated.View style={[getContainerStyle(pressed || focused), animatedStyle]}>
            {loading ? (
              <ActivityIndicator size="small" color={iconColor || getIconColor()} />
            ) : (
              <AppIcon icon={Icon} size={getIconSize()} color={iconColor || getIconColor()} />
            )}
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
}
