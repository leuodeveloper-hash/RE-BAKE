import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import {BlurView} from 'expo-blur';
import {LinearGradient} from 'expo-linear-gradient';
import {useColors, useTheme} from '@contexts/ThemeContext';
import {withOpacity} from '@constants/tokens';
import {APPBAR_HEIGHT, TABBAR_BOTTOM_SPACE} from './ContentContainer';

export interface ContentMaskProps {
  /** 상단 그라디언트 높이 (기본: APPBAR_HEIGHT) */
  topHeight?: number;
  /** 하단 그라디언트 높이 (기본: TABBAR_BOTTOM_SPACE) */
  bottomHeight?: number;
}

/** 블러 + 그라디언트 마스크 페이드 */
function FadeMask({position, height}: {position: 'top' | 'bottom'; height: number}) {
  const colors = useColors();
  const {isDark} = useTheme();
  const surfaceDim = colors['surface/normal'] as string;

  const maskDirection = position === 'top' ? 'to bottom' : 'to top';

  if (Platform.OS === 'web') {
    // Web: backdrop-filter + mask-image로 블러를 그라디언트 마스크
    const webMask = `linear-gradient(${maskDirection}, black 40%, transparent 100%)`;
    return (
      <View
        style={[
          styles.maskContainer,
          position === 'top' ? {top: 0} : {bottom: 0},
          {height},
          {
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            maskImage: webMask,
            WebkitMaskImage: webMask,
          } as any,
        ]}
        pointerEvents="none">
        <LinearGradient
          colors={
            position === 'top'
              ? [withOpacity(surfaceDim, 0.95), withOpacity(surfaceDim, 0)] as [string, string]
              : [withOpacity(surfaceDim, 0), withOpacity(surfaceDim, 0.95)] as [string, string]
          }
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  // Native: MaskedView로 블러 경계를 그라디언트 마스킹
  const maskColors = (position === 'top'
    ? ['black', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.15)', 'transparent']
    : ['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)', 'black']
  ) as [string, string, string, string];
  const maskLocations = (position === 'top'
    ? [0, 0.45, 0.75, 1]
    : [0, 0.25, 0.55, 1]
  ) as [number, number, number, number];
  const colorStops = (position === 'top'
    ? [withOpacity(surfaceDim, 0.85), withOpacity(surfaceDim, 0.4), withOpacity(surfaceDim, 0.1), withOpacity(surfaceDim, 0)]
    : [withOpacity(surfaceDim, 0), withOpacity(surfaceDim, 0.1), withOpacity(surfaceDim, 0.4), withOpacity(surfaceDim, 0.85)]
  ) as [string, string, string, string];

  return (
    <MaskedView
      style={[styles.maskContainer, position === 'top' ? {top: 0} : {bottom: 0}, {height}]}
      pointerEvents="none"
      maskElement={
        <LinearGradient
          colors={maskColors}
          locations={maskLocations}
          style={{flex: 1}}
        />
      }
    >
      <BlurView
        intensity={64}
        tint={isDark ? 'dark' : 'default'}
        style={{flex: 1}}
      />
      <LinearGradient
        colors={colorStops}
        locations={maskLocations}
        style={StyleSheet.absoluteFill}
      />
    </MaskedView>
  );
}

/**
 * 콘텐츠 상하단 마스크 그라디언트
 * - Web: backdrop-filter + mask-image
 * - Native: BlurView + LinearGradient
 * - 부모 View에 position: relative/absolute 가 필요
 */
export function ContentMask({
  topHeight = APPBAR_HEIGHT,
  bottomHeight = TABBAR_BOTTOM_SPACE,
}: ContentMaskProps) {
  return (
    <>
      {topHeight > 0 && <FadeMask position="top" height={topHeight} />}
      {bottomHeight > 0 && <FadeMask position="bottom" height={bottomHeight} />}
    </>
  );
}

const styles = StyleSheet.create({
  maskContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
    overflow: 'hidden',
  },
});
