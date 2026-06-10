import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Easing, Image, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Radius, BaseColors, withOpacity} from '@constants/tokens';
import {getRandomAvatar} from './avatars';
import {SvgProps} from 'react-native-svg';
import {useColorsV2} from '@contexts/ThemeContext';

export type AvatarSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type AvatarShape = 'default' | 'rounded' | 'circle';
export type AvatarType = 'monogram' | 'icon' | 'image' | 'random';
export type AvatarColor =
  | 'gray' | 'greybrown' | 'brown' | 'darkred' | 'red'
  | 'orange' | 'yellow' | 'lime' | 'green' | 'teal'
  | 'lightblue' | 'blue' | 'purple' | 'lavender';

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
  /** 아이콘 색상 override (type='icon'일 때만). 배경 컬러는 그대로, 아이콘만 다른 색 */
  iconColor?: string;
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
  const colors = useColorsV2();

  // 색상별 배경색 (베이스 컬러의 16% opacity → 라이트/다크 모두 자연스럽게 동작)
  const BACKGROUND_COLORS: Record<AvatarColor, string> = {
    gray:      withOpacity(BaseColors['color-base-grey-80'], 0.16),
    greybrown: withOpacity(BaseColors['color-base-greybrown-80'], 0.16),
    brown:     withOpacity(BaseColors['color-base-brown-80'], 0.16),
    darkred:   withOpacity(BaseColors['color-base-darkred-80'], 0.16),
    red:       withOpacity(BaseColors['color-base-red-80'], 0.16),
    orange:    withOpacity(BaseColors['color-base-orange-80'], 0.16),
    yellow:    withOpacity(BaseColors['color-base-yellow-80'], 0.16),
    lime:      withOpacity(BaseColors['color-base-lime-80'], 0.16),
    green:     withOpacity(BaseColors['color-base-green-80'], 0.16),
    teal:      withOpacity(BaseColors['color-base-teal-80'], 0.16),
    lightblue: withOpacity(BaseColors['color-base-lightblue-80'], 0.16),
    blue:      withOpacity(BaseColors['color-base-blue-80'], 0.16),
    purple:    withOpacity(BaseColors['color-base-purple-80'], 0.16),
    lavender:  withOpacity(BaseColors['color-base-lavender-80'], 0.16),
  };

  // 색상별 텍스트/아이콘 색상 (시멘틱 토큰 매핑)
  const FOREGROUND_COLORS: Record<AvatarColor, string> = {
    gray:      colors['custom/grey'],
    greybrown: colors['custom/grey-brown'],
    brown:     colors['custom/brown'],
    darkred:   colors['custom/red'],
    red:       colors['custom/red'],
    orange:    colors['custom/orange'],
    yellow:    colors['custom/yellow'],
    lime:      colors['custom/lime'],
    green:     colors['custom/green'],
    teal:      colors['custom/green'],
    lightblue: colors['custom/light-blue'],
    blue:      colors['custom/blue'],
    purple:    colors['custom/purple'],
    lavender:  colors['custom/purple'],
  };

  const config = SIZE_CONFIG[size];
  const borderRadius = getShapeRadius(shape, size);
  const isImageType = type === 'image' || type === 'random';
  const backgroundColor = isImageType ? colors['surface/container'] : BACKGROUND_COLORS[color];
  const foregroundColor = FOREGROUND_COLORS[color];

  // 랜덤 아바타는 시드 기반으로 일관된 이미지 반환
  const randomAvatarSource = useMemo(() => {
    if (type === 'random') {
      return getRandomAvatar(seed);
    }
    return null;
  }, [type, seed]);

  // 이미지 로딩 스켈레톤
  const [imageLoaded, setImageLoaded] = useState(false);
  const needsSkeleton = type === 'image' && !!imageUrl;
  const pulseOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!needsSkeleton || imageLoaded) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {toValue: 0.7, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
        Animated.timing(pulseOpacity, {toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [needsSkeleton, imageLoaded, pulseOpacity]);

  const handleImageLoad = useCallback(() => setImageLoaded(true), []);

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
            <>
              {!imageLoaded && (
                <Animated.View style={[StyleSheet.absoluteFill, {backgroundColor: colors['surface/container'], opacity: pulseOpacity}]} />
              )}
              <Image
                source={{uri: imageUrl}}
                style={styles.image}
                resizeMode="cover"
                onLoad={handleImageLoad}
              />
            </>
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
