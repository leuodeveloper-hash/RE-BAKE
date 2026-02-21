import React from 'react';
import {Pressable, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import {SvgProps} from 'react-native-svg';
import {AppIcon, AppIconSize} from '@components/Icon/AppIcon';
import {useColors} from '@contexts/ThemeContext';

export type IconButtonStyle =
  | 'filled'
  | 'soft'
  | 'outlined'
  | 'ghost'
  | 'ghost-secondary'
  | 'ghost-inverse';

export type IconButtonSize = 'small' | 'medium' | 'large';

export interface IconButtonProps {
  icon: React.FC<SvgProps>;
  onPress?: () => void;
  variant?: IconButtonStyle;
  size?: IconButtonSize;
  disabled?: boolean;
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
  forcePressed = false,
  onImage = false,
  iconColor,
  style,
}: IconButtonProps) {
  const colors = useColors();
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
          ? colors['background-statelayers-disabled']
          : colors['surface-surfaceinverse'];
        break;
      case 'soft':
        baseStyle.backgroundColor = disabled
          ? colors['background-statelayers-disabled']
          : onImage
            ? colors['surface-surfacecontainertransparent-onimage']
            : colors['surface-surfacecontainertransparent'];
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
      case 'ghost-secondary':
      case 'ghost-inverse':
        baseStyle.backgroundColor = 'transparent';
        break;
    }

    // Pressed state (실제 pressed 또는 forcePressed)
    if ((pressed || forcePressed) && !disabled) {
      if (variant === 'filled' || variant === 'ghost-inverse' || onImage) {
        baseStyle.backgroundColor =
          colors['background-statelayers-inversesurfacefocus_press'];
      } else {
        baseStyle.backgroundColor =
          colors['background-statelayers-surfacefocus_press'];
      }
    }

    return baseStyle;
  };

  const getIconColor = (): string => {
    if (disabled) {
      return colors['foreground-onsurfacedisabled'];
    }
    if (onImage) {
      return colors['foreground-onimage'];
    }
    if (variant === 'filled') {
      return colors['foreground-onsurfaceinverse'];
    }
    if (variant === 'ghost-secondary') {
      return colors['foreground-onsurfacemuted'];
    }
    if (variant === 'ghost-inverse') {
      return colors['foreground-onsurfaceinverse'];
    }
    if (variant === 'soft') {
      return colors['foreground-onsurfacevar'];
    }
    return colors['foreground-onsurface'];
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
        onPress={onPress}
        disabled={disabled}
        style={{
          width: sizeConfig.touchArea,
          height: sizeConfig.touchArea,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {({pressed, focused}: {pressed: boolean; focused: boolean}) => (
          <View style={getContainerStyle(pressed || focused)}>
            <AppIcon icon={Icon} size={getIconSize()} color={iconColor || getIconColor()} />
          </View>
        )}
      </Pressable>
    </View>
  );
}
