import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';

export interface ThumbnailProps {
  /** 썸네일 크기 (정사각형, 기본: 62) */
  size?: number;
  /** 플레이스홀더 아이콘 (children 없을 때 표시) */
  icon?: React.FC<SvgProps>;
  /** 아이콘 크기 (기본: 24) */
  iconSize?: number;
  /** 아이콘 색상 */
  iconColor?: string;
  /** 추가 스타일 */
  style?: ViewStyle;
  /** 커스텀 콘텐츠 (이미지 등). 있으면 아이콘 대신 표시 */
  children?: React.ReactNode;
  /** 로딩 중 스켈레톤 표시 */
  loading?: boolean;
}

function SkeletonPulse() {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {toValue: 0.7, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, {backgroundColor: colors['surface/container'], opacity}]} />
  );
}

export function Thumbnail({
  size = 68,
  icon: Icon,
  iconSize = 24,
  iconColor,
  style,
  children,
  loading = false,
}: ThumbnailProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, {width: size, height: size}, style]}>
      {loading ? (
        <SkeletonPulse />
      ) : (
        children || (Icon && (
          <View style={styles.placeholder}>
            <Icon width={iconSize} height={iconSize} color={iconColor} />
          </View>
        ))
      )}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    borderRadius: Radius['radius-sm'],
    overflow: 'hidden',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors['fill/glass-normal'],
  },
});
