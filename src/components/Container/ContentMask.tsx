import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useColors} from '@contexts/ThemeContext';
import {EDGE_FADE_ALPHAS, EDGE_FADE_LOCATIONS} from '@constants/fade';
import {colorAlpha, colorRgb} from '@utils/color';
import {APPBAR_HEIGHT, TABBAR_BOTTOM_SPACE} from './ContentContainer';

export interface ContentMaskProps {
  /** 상단 그라디언트 높이 (기본: APPBAR_HEIGHT) */
  topHeight?: number;
  /** 하단 그라디언트 높이 (기본: TABBAR_BOTTOM_SPACE) */
  bottomHeight?: number;
}

export interface EdgeFadeProps {
  position: 'top' | 'bottom';
  /** 높이 — style로 위치·크기를 직접 줄 때는 생략 */
  height?: number;
  /** 가림 색(기본: 페이지 배경 surface/normal). 앱바처럼 배경이 다른 곳은 그 색 */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * 가장자리 가림 그라디언트 — 콘텐츠 위아래 마스크와 앱바 배경이 모두 이걸 쓴다.
 * 블러 없이 배경색만: 가장자리 절반은 꽉 막고 안쪽으로 사라진다(값은 constants/fade).
 */
export function EdgeFade({position, height, color, style}: EdgeFadeProps) {
  const colors = useColors();
  const surfaceDim = color ?? (colors['surface/normal'] as string);


  // 앱바와 같은 가림 그라디언트(블러 없음) — 위 마스크는 그대로, 아래 마스크는 뒤집는다
  const maskLocations = (position === 'top'
    ? EDGE_FADE_LOCATIONS
    : EDGE_FADE_LOCATIONS.map(l => 1 - l).reverse()) as unknown as [number, number, ...number[]];
  const alphas = position === 'top' ? [...EDGE_FADE_ALPHAS] : [...EDGE_FADE_ALPHAS].reverse();
  // 색이 rgba(반투명)여도 되게 — hex만 읽으면 rgba 색은 NaN이 돼 안드로이드에서 검게 칠해졌다(상세 앱바)
  const [r, g, b] = colorRgb(surfaceDim);
  const base = colorAlpha(surfaceDim);
  const colorStops = alphas.map(a => `rgba(${r}, ${g}, ${b}, ${a * base})`) as unknown as [string, string, ...string[]];

  // 웹·앱 같은 그라디언트 하나(블러 없음). style을 주면 위치·크기는 그쪽이 정한다
  // 터치는 통과 — 웹은 LinearGradient에 준 pointerEvents가 안 먹어, 앱바 밑 가림 띠가 그 아래 글자(상세 제목·메타)의 탭을 가로챘다.
  // 감싸는 View에 걸어야 웹·앱 모두 통과한다
  return (
    <View
      style={style ?? [styles.maskContainer, position === 'top' ? {top: 0} : {bottom: 0}, {height}]}
      pointerEvents="none">
      <LinearGradient colors={colorStops} locations={maskLocations} style={StyleSheet.absoluteFill} />
    </View>
  );
}

/**
 * 콘텐츠 상하단 마스크 그라디언트
 * - 블러 없이 그라디언트만(웹·앱 같음)
 * - 부모 View에 position: relative/absolute 가 필요
 */
export function ContentMask({
  topHeight = APPBAR_HEIGHT,
  bottomHeight = TABBAR_BOTTOM_SPACE,
}: ContentMaskProps) {
  return (
    <>
      {topHeight > 0 && <EdgeFade position="top" height={topHeight} />}
      {bottomHeight > 0 && <EdgeFade position="bottom" height={bottomHeight} />}
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
