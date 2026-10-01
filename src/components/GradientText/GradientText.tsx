import React from 'react';
import {Platform, StyleSheet, Text, type StyleProp, type TextStyle} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import {LinearGradient} from 'expo-linear-gradient';

export interface GradientTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
  /** 왼쪽→오른쪽 그라디언트 색 */
  colors: readonly [string, string, ...string[]];
}

/**
 * 그라디언트 글자.
 * - 네이티브: 글자 모양으로 그라디언트를 잘라낸다(MaskedView).
 * - 웹: MaskedView가 내용을 못 그려 CSS background-clip:text로 칠한다.
 */
export function GradientText({children, style, colors}: GradientTextProps) {
  if (Platform.OS === 'web') {
    return (
      <Text
        style={[
          style,
          {
            color: 'transparent',
            backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
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
      {/* 마스크와 같은 글자를 투명하게 깔아 크기를 잡는다 */}
      <LinearGradient colors={colors} start={{x: 0, y: 0.5}} end={{x: 1, y: 0.5}}>
        <Text style={[style, styles.invisible]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  invisible: {opacity: 0},
});
