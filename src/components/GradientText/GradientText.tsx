import React, {useId} from 'react';
import {Platform, StyleSheet, Text, View, type StyleProp, type TextStyle} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import {LinearGradient} from 'expo-linear-gradient';
import Svg, {Defs, RadialGradient, Rect, Stop} from 'react-native-svg';

export interface GradientTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
  /**
   * 그라디언트 색.
   * - 선형: 왼쪽→오른쪽
   * - radial: 중심(첫 색)→바깥(마지막 색)
   */
  colors: readonly [string, string, ...string[]];
  /** 색 위치(0~1) — 한 색을 길게 두고 끝에서만 번지게 할 때 */
  locations?: readonly [number, number, ...number[]];
  /**
   * 원형으로 번지게 — 한 지점에서 둥글게 퍼진다(수채화가 번진 느낌).
   * center: 중심 위치(0~1, 글자 상자 기준), radius: 반지름(상자 폭 대비)
   */
  radial?: {center: {x: number; y: number}; radius: number};
}

/**
 * 그라디언트 글자.
 * - 네이티브: 글자 모양으로 그라디언트를 잘라낸다(MaskedView).
 * - 웹: MaskedView가 내용을 못 그려 CSS background-clip:text로 칠한다.
 */
export function GradientText({children, style, colors, locations, radial}: GradientTextProps) {
  const gid = `gt-${useId().replace(/:/g, '')}`;
  const stops = colors.map((c, i) => ({
    color: c,
    offset: locations ? locations[i] : i / (colors.length - 1),
  }));

  if (Platform.OS === 'web') {
    const list = stops.map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
    const image = radial
      // circle은 퍼센트 반지름을 못 받는다(무시돼 그라디언트가 안 먹었다) — ellipse로
      ? `radial-gradient(ellipse ${Math.round(radial.radius * 100)}% ${Math.round(radial.radius * 100)}% at ${Math.round(radial.center.x * 100)}% ${Math.round(radial.center.y * 100)}%, ${list})`
      : `linear-gradient(90deg, ${list})`;
    return (
      <Text
        style={[
          style,
          {
            color: 'transparent',
            backgroundImage: image,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
          } as any,
        ]}>
        {children}
      </Text>
    );
  }

  return (
    <MaskedView maskElement={<Text style={style}>{children}</Text>}>
      {radial ? (
        <View>
          {/* 마스크와 같은 글자를 투명하게 깔아 크기를 잡고, 그 위에 원형 그라디언트를 채운다 */}
          <Text style={[style, styles.invisible]}>{children}</Text>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <RadialGradient
                id={gid}
                cx={`${radial.center.x * 100}%`}
                cy={`${radial.center.y * 100}%`}
                r={`${radial.radius * 100}%`}>
                {stops.map((s, i) => <Stop key={i} offset={s.offset} stopColor={s.color} />)}
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
          </Svg>
        </View>
      ) : (
        <LinearGradient colors={colors} locations={locations} start={{x: 0, y: 0.5}} end={{x: 1, y: 0.5}}>
          <Text style={[style, styles.invisible]}>{children}</Text>
        </LinearGradient>
      )}
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  invisible: {opacity: 0},
});
