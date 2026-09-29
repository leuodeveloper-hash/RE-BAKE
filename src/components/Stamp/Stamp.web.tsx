import React, {useEffect, useRef} from 'react';
import {Animated, Easing, View, type StyleProp, type ViewStyle} from 'react-native';
import {Image as ExpoImage} from 'expo-image';
import Svg, {Path} from 'react-native-svg';
import {useColors} from '@contexts/ThemeContext';
import {STAMP_VIEWBOX, stampShapeAt} from './shapes';
import type {StampProps} from './Stamp';

/**
 * 웹 전용 스탬프.
 *
 * @react-native-masked-view는 웹에서 내용을 그리지 못해 마스크 안이 통째로 비어
 * 보인다. 웹은 CSS mask-image가 있으므로 같은 path를 data URI SVG로 만들어 쓴다.
 * (모양·크기 규칙은 네이티브 구현과 동일하게 유지한다)
 */
export function Stamp({imageUri, size, index = 0, rotate = 0, outline = false, style}: StampProps) {
  const colors = useColors();
  const d = stampShapeAt(index);
  const pulse = useRef(new Animated.Value(0.45)).current;
  const idle = !imageUri && !outline;

  useEffect(() => {
    if (!idle) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 0.9, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [idle, pulse]);

  // 점선 윤곽은 네이티브와 같은 방식(SVG stroke) — 마스크가 필요 없다
  if (outline) {
    return (
      <View
        style={[
          {width: size, height: size},
          rotate !== 0 && {transform: [{rotate: `${rotate}deg`}]},
          style,
        ]}>
        <Svg width={size} height={size} viewBox={`0 0 ${STAMP_VIEWBOX} ${STAMP_VIEWBOX}`}>
          <Path
            d={d}
            fill="none"
            stroke={colors['border/normal']}
            strokeWidth={1.2}
            strokeDasharray="2 1.6"
            strokeLinecap="round"
          />
        </Svg>
      </View>
    );
  }

  // path를 그대로 담은 SVG를 마스크 이미지로 — 크기는 CSS가 맞춘다
  const maskSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STAMP_VIEWBOX} ${STAMP_VIEWBOX}">` +
    `<path d="${d}" fill="black"/></svg>`;
  const maskUri = `url("data:image/svg+xml;utf8,${encodeURIComponent(maskSvg)}")`;
  const maskStyle = {
    maskImage: maskUri,
    WebkitMaskImage: maskUri,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
  } as unknown as ViewStyle;

  return (
    <View
      style={[
        {width: size, height: size, overflow: 'hidden'},
        rotate !== 0 && {transform: [{rotate: `${rotate}deg`}]},
        maskStyle,
        style,
      ]}>
      {imageUri ? (
        <ExpoImage
          source={{uri: imageUri}}
          // 네이티브와 같은 규칙: 2배로 그리고 가운데로 당긴다
          style={{width: size * 2, height: size * 2, marginLeft: -size / 2, marginTop: -size / 2}}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />
      ) : (
        <Animated.View
          style={{width: size, height: size, backgroundColor: colors['fill/faint'], opacity: pulse}}
        />
      )}
    </View>
  );
}

export default Stamp;
