import React, {useEffect, useRef} from 'react';
import {Animated, Easing, View, type StyleProp, type ViewStyle} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import {Image as ExpoImage} from 'expo-image';
import Svg, {Path} from 'react-native-svg';
import {useColors} from '@contexts/ThemeContext';
import {STAMP_VIEWBOX, stampShapeAt} from './shapes';

export interface StampProps {
  /** 우표에 들어갈 사진. 없으면 빈 우표(기본 배경) */
  imageUri?: string;
  /** 한 변 길이(정사각) */
  size: number;
  /**
   * 몇 번째로 모은 우표인지 — 이 순서로 모양이 정해진다(모양 수만큼 순환).
   * 랜덤이 아니라 순서인 이유는 shapes.ts 참고.
   */
  index?: number;
  /** 살짝 기울임(도). 붙인 느낌 — 0이면 반듯하게 */
  rotate?: number;
  /**
   * 아직 채우지 않은 자리 — 사진 대신 점선 윤곽만 그린다.
   * "여기에 이런 게 붙는다"를 알려주는 용도.
   */
  outline?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * 우표 — 만든 요리 사진을 모양 마스크로 찍어낸다.
 *
 * 사진 자체가 콘텐츠라 라벨을 따로 두지 않는다(이름·날짜는 눌렀을 때).
 */
export function Stamp({imageUri, size, index = 0, rotate = 0, outline = false, style}: StampProps) {
  const colors = useColors();
  const d = stampShapeAt(index);
  // 사진이 없을 때 마스크 안을 은은하게 깜빡인다 — 빈 칸이 아니라
  // "아직 채워지지 않은 자리"로 읽히게
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

  if (outline) {
    // 마스크로 사진을 자르는 대신 같은 path를 점선으로 그린다 — 빈 자리 표시
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
            // viewBox가 24라 선 굵기·간격도 그 기준 — size가 커져도 비율이 유지된다.
            // 얇으면 작은 칸(약 50px)에서 거의 안 보인다.
            strokeWidth={1.2}
            strokeDasharray="2 1.6"
            strokeLinecap="round"
          />
        </Svg>
      </View>
    );
  }

  return (
    <View
      style={[
        {width: size, height: size},
        rotate !== 0 && {transform: [{rotate: `${rotate}deg`}]},
        style,
      ]}>
      <MaskedView
        // absoluteFill만 주면 웹에서 마스크가 크기를 못 잡아 내용이 안 보인다
        style={{width: size, height: size}}
        maskElement={
          // viewBox로 그리면 size가 달라져도 모양이 그대로 늘어난다
          <Svg width={size} height={size} viewBox={`0 0 ${STAMP_VIEWBOX} ${STAMP_VIEWBOX}`}>
            <Path d={d} fill="white" />
          </Svg>
        }>
        {imageUri ? (
          <View style={{width: size, height: size, backgroundColor: colors['surface/bright'], overflow: 'hidden'}}>
            {/* 2배로 그리고 가운데로 당긴다 — 마스크가 불규칙해 가장자리가 잘리므로
                피사체가 가운데 크게 들어오는 편이 낫다 */}
            <ExpoImage
              source={{uri: imageUri}}
              style={{
                width: size * 2,
                height: size * 2,
                marginLeft: -size / 2,
                marginTop: -size / 2,
              }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          </View>
        ) : (
          // 사진이 없으면 스켈레톤 — surface/bright는 흰 시트 위에서 배경과 같아
          // 아무것도 없는 것처럼 보인다
          <Animated.View
            style={{width: size, height: size, backgroundColor: colors['fill/faint'], opacity: pulse}}
          />
        )}
      </MaskedView>
    </View>
  );
}

export default Stamp;
