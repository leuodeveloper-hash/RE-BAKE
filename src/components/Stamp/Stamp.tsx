import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
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
  style?: StyleProp<ViewStyle>;
}

/**
 * 우표 — 만든 요리 사진을 모양 마스크로 찍어낸다.
 *
 * 사진 자체가 콘텐츠라 라벨을 따로 두지 않는다(이름·날짜는 눌렀을 때).
 */
export function Stamp({imageUri, size, index = 0, rotate = 0, style}: StampProps) {
  const colors = useColors();
  const d = stampShapeAt(index);

  return (
    <View
      style={[
        {width: size, height: size},
        rotate !== 0 && {transform: [{rotate: `${rotate}deg`}]},
        style,
      ]}>
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          // viewBox로 그리면 size가 달라져도 모양이 그대로 늘어난다
          <Svg width={size} height={size} viewBox={`0 0 ${STAMP_VIEWBOX} ${STAMP_VIEWBOX}`}>
            <Path d={d} fill="white" />
          </Svg>
        }>
        <View style={[StyleSheet.absoluteFill, {backgroundColor: colors['surface/bright']}]}>
          {imageUri ? (
            <ExpoImage
              source={{uri: imageUri}}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : null}
        </View>
      </MaskedView>
    </View>
  );
}

export default Stamp;
