import React from 'react';
import {Pressable, View, ViewStyle} from 'react-native';
import {Radius, SemanticColorsLight} from '@constants/tokens';
import {SvgProps} from 'react-native-svg';
import {AppIcon, AppIconSize} from '@components/Icon/AppIcon';

export type IconButtonStyle =
  | 'filled'
  | 'soft'
  | 'outlined'
  | 'ghost'
  | 'ghost-secondary';

export type IconButtonSize = 'small' | 'medium' | 'large';

export interface IconButtonProps {
  icon: React.FC<SvgProps>;
  onPress?: () => void;
  variant?: IconButtonStyle;
  size?: IconButtonSize;
  disabled?: boolean;
  forcePressed?: boolean; // 외부에서 pressed 상태 강제 (메뉴 열림 등)
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
  style,
}: IconButtonProps) {
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
          ? SemanticColorsLight['background-statelayers-disabled']
          : SemanticColorsLight['surface-surfaceinverse'];
        break;
      case 'soft':
        baseStyle.backgroundColor = disabled
          ? SemanticColorsLight['background-statelayers-disabled']
          : SemanticColorsLight['surface-surfacecontainertransparent'];
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
      case 'ghost-secondary':
        baseStyle.backgroundColor = 'transparent';
        break;
    }

    // Pressed state (실제 pressed 또는 forcePressed)
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

  const getIconColor = (): string => {
    if (disabled) {
      return SemanticColorsLight['foreground-onsurfacedisabled'];
    }
    if (variant === 'filled') {
      return SemanticColorsLight['foreground-onsurfaceinverse'];
    }
    if (variant === 'ghost-secondary') {
      return SemanticColorsLight['foreground-onsurfacemuted'];
    }
    return SemanticColorsLight['foreground-onsurface'];
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
        {({pressed}) => (
          <View style={getContainerStyle(pressed)}>
            <AppIcon icon={Icon} size={getIconSize()} color={getIconColor()} />
          </View>
        )}
      </Pressable>
    </View>
  );
}
