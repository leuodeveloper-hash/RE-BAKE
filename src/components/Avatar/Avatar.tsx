import React, {useMemo} from 'react';
import {Image, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Radius, SemanticColorsLight} from '@constants/tokens';
import {getRandomAvatar} from '@constants/avatars';
import {SvgProps} from 'react-native-svg';

export type AvatarSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type AvatarShape = 'default' | 'rounded' | 'circle';
export type AvatarType = 'monogram' | 'icon' | 'image' | 'random';
export type AvatarColor = 'gray' | 'yellow';

export interface AvatarProps {
  /** 크기 */
  size?: AvatarSize;
  /** 모양 */
  shape?: AvatarShape;
  /** 타입 */
  type?: AvatarType;
  /** 배경 색상 (image 타입에서는 무시) */
  color?: AvatarColor;
  /** 모노그램 텍스트 (type='monogram'일 때) */
  monogram?: string;
  /** 이미지 URL (type='image'일 때) */
  imageUrl?: string;
  /** 아이콘 컴포넌트 (type='icon'일 때) */
  icon?: React.FC<SvgProps>;
  /** 랜덤 아바타 시드 (type='random'일 때, 같은 시드는 같은 아바타) */
  seed?: string | number;
  /** 추가 스타일 */
  style?: ViewStyle;
}

// 크기별 설정
const SIZE_CONFIG = {
  xsmall: {container: 16, icon: 8, fontSize: 8, lineHeight: 16},
  small: {container: 32, icon: 16, fontSize: 16, lineHeight: 24},
  medium: {container: 36, icon: 20, fontSize: 16, lineHeight: 24},
  large: {container: 48, icon: 24, fontSize: 22, lineHeight: 28},
  xlarge: {container: 72, icon: 32, fontSize: 28, lineHeight: 36},
};

// 모양별 borderRadius
const getShapeRadius = (shape: AvatarShape, size: AvatarSize): number => {
  if (shape === 'circle') {
    return Radius['radius-full'];
  }
  if (shape === 'rounded') {
    if (size === 'small') return Radius['radius-full'];
    if (size === 'large' || size === 'xlarge') return 12;
    return Radius['radius-8'];
  }
  // default
  return Radius['radius-8'];
};

// 색상별 배경색
const BACKGROUND_COLORS = {
  gray: SemanticColorsLight['surface-surfacecontainerhigh'],
  yellow: '#F3EFC2', // custom/yellowcontainer
};

// 색상별 텍스트/아이콘 색상
const FOREGROUND_COLORS = {
  gray: SemanticColorsLight['foreground-onprimarycontainer'],
  yellow: '#BFAC27', // custom/lime
};

export function Avatar({
  size = 'small',
  shape = 'default',
  type = 'monogram',
  color = 'gray',
  monogram = 'A',
  imageUrl,
  icon: IconComponent,
  seed,
  style,
}: AvatarProps) {
  const config = SIZE_CONFIG[size];
  const borderRadius = getShapeRadius(shape, size);
  const isImageType = type === 'image' || type === 'random';
  const backgroundColor = isImageType ? '#4E525E' : BACKGROUND_COLORS[color];
  const foregroundColor = FOREGROUND_COLORS[color];

  // 랜덤 아바타는 시드 기반으로 일관된 이미지 반환
  const randomAvatarSource = useMemo(() => {
    if (type === 'random') {
      return getRandomAvatar(seed);
    }
    return null;
  }, [type, seed]);

  const containerStyle: ViewStyle = {
    width: config.container,
    height: config.container,
    borderRadius,
    backgroundColor,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const renderContent = () => {
    switch (type) {
      case 'random':
        return (
          <Image
            source={randomAvatarSource}
            style={styles.image}
            resizeMode="cover"
          />
        );

      case 'image':
        if (imageUrl) {
          return (
            <Image
              source={{uri: imageUrl}}
              style={styles.image}
              resizeMode="cover"
            />
          );
        }
        return null;

      case 'icon':
        if (IconComponent) {
          return (
            <View style={styles.iconWrapper}>
              <IconComponent
                width={config.icon}
                height={config.icon}
                color={foregroundColor}
                style={{opacity: 0.56}}
              />
            </View>
          );
        }
        return null;

      case 'monogram':
      default:
        return (
          <Text
            style={[
              styles.monogram,
              {
                fontSize: config.fontSize,
                lineHeight: config.lineHeight,
                color: foregroundColor,
              },
            ]}>
            {monogram.charAt(0).toUpperCase()}
          </Text>
        );
    }
  };

  return <View style={[containerStyle, style]}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogram: {
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    textAlign: 'center',
    opacity: 0.56,
  },
});
