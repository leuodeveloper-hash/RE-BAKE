import React, {useMemo} from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import {Image as ExpoImage} from 'expo-image';
import Svg, {Path} from 'react-native-svg';
import {useColors} from '@contexts/ThemeContext';

/** 한 변에 들어갈 톱니 개수 — 실제 우표와 비슷하게 촘촘히 */
const TEETH = 9;

/**
 * 우표 톱니 외곽선 path.
 *
 * 사각형 테두리를 따라가며 반원을 파내 톱니를 만든다. 이미지 에셋 대신 path로
 * 그리는 이유: 크기가 달라져도(그리드·상세·공유 이미지) 선명하고, 톱니 수·반지름을
 * 숫자로 조절할 수 있다.
 */
function stampPath(size: number, teeth: number): string {
  const r = size / (teeth * 2); // 톱니(반원) 반지름
  const inner = size - r * 2;
  const step = inner / teeth;
  const parts: string[] = [`M ${r} ${r}`];

  // 한 변을 따라가며 반원을 안쪽으로 파낸다
  const edge = (sx: number, sy: number, dx: number, dy: number) => {
    for (let i = 0; i < teeth; i++) {
      const cx = sx + dx * (step * i + step / 2);
      const cy = sy + dy * (step * i + step / 2);
      parts.push(`L ${cx - dx * r} ${cy - dy * r}`);
      parts.push(`A ${r} ${r} 0 0 0 ${cx + dx * r} ${cy + dy * r}`);
    }
    parts.push(`L ${sx + dx * inner} ${sy + dy * inner}`);
  };

  edge(r, r, 1, 0);                // 위
  edge(size - r, r, 0, 1);         // 오른쪽
  edge(size - r, size - r, -1, 0); // 아래
  edge(r, size - r, 0, -1);        // 왼쪽
  parts.push('Z');
  return parts.join(' ');
}

export interface StampProps {
  /** 우표에 들어갈 사진. 없으면 빈 우표(기본 배경) */
  imageUri?: string;
  /** 한 변 길이(정사각) */
  size: number;
  /** 살짝 기울임(도). 붙인 느낌 — 0이면 반듯하게 */
  rotate?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * 우표 — 만든 요리 사진을 톱니 테두리로 찍어낸다.
 *
 * 사진 자체가 콘텐츠라 라벨을 따로 두지 않는다(이름·날짜는 눌렀을 때).
 * 톱니는 SVG path 마스크 — 에셋이 없어 크기를 자유롭게 쓰고 웹에서도 동일하다.
 */
export function Stamp({imageUri, size, rotate = 0, style}: StampProps) {
  const colors = useColors();
  const d = useMemo(() => stampPath(size, TEETH), [size]);

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
          <Svg width={size} height={size}>
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
