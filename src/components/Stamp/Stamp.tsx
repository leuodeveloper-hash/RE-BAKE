import React, {useEffect, useRef} from 'react';
import {Animated, Easing, View, type StyleProp, type ViewStyle} from 'react-native';
import Svg, {ClipPath, Defs, Image as SvgImage, Path, Rect} from 'react-native-svg';
import {useColors} from '@contexts/ThemeContext';
import {STAMP_VIEWBOX, stampShapeAt} from './shapes';

/** 스탬프 안쪽 여백 — 칸에 꽉 차면 옆 스탬프와 붙어 보인다 */
const INNER_PADDING = 8;

export interface StampProps {
  /** 스탬프에 들어갈 사진. 없으면 빈 스탬프 */
  imageUri?: string;
  /** 한 변 길이(정사각) */
  size: number;
  /**
   * 몇 번째로 모은 스탬프인지 — 이 순서로 모양이 정해진다(모양 수만큼 순환).
   * 랜덤이 아니라 순서인 이유는 shapes.ts 참고.
   */
  index?: number;
  /** 살짝 기울임(도). 0이면 반듯하게 */
  rotate?: number;
  /**
   * 아직 채우지 않은 자리 — 사진 대신 점선 윤곽만 그린다.
   * "여기에 이런 게 붙는다"를 알려주는 용도.
   */
  outline?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * 스탬프 — 만든 요리 사진을 모양대로 오려 낸다.
 *
 * 사진 자체가 콘텐츠라 라벨을 따로 두지 않는다(이름·날짜는 눌렀을 때).
 *
 * MaskedView나 CSS mask를 쓰지 않는 이유: 전자는 웹에서 내용을 못 그리고,
 * 후자는 RN Web의 View가 비표준 스타일을 버려 마스크가 걸리지 않는다.
 * SVG clipPath는 네이티브·웹이 같은 구현을 쓴다.
 */
export function Stamp({imageUri, size, index = 0, rotate = 0, outline = false, style}: StampProps) {
  const colors = useColors();
  const d = stampShapeAt(index);
  const clipId = `stamp-clip-${index}`;

  // 사진이 없을 때 은은하게 깜빡인다 — 빈 칸이 아니라 "아직 채워지지 않은 자리"로
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

  const wrapStyle: StyleProp<ViewStyle> = [
    // 안쪽 여백 — 칸 크기는 그대로 두고 스탬프만 작게 그려 서로 붙지 않게
    {width: size, height: size, padding: INNER_PADDING, alignItems: 'center', justifyContent: 'center'},
    rotate !== 0 && {transform: [{rotate: `${rotate}deg`}]},
    style,
  ];
  // 여백을 뺀 실제 그림 크기
  const inner = Math.max(0, size - INNER_PADDING * 2);

  if (outline) {
    return (
      <View style={wrapStyle}>
        <Svg width={inner} height={inner} viewBox={`0 0 ${STAMP_VIEWBOX} ${STAMP_VIEWBOX}`}>
          <Path
            d={d}
            fill="none"
            stroke={colors['border/normal']}
            // viewBox가 24라 선 굵기·간격도 그 기준 — 얇으면 작은 칸에서 안 보인다
            strokeWidth={1.2}
            strokeDasharray="2 1.6"
            strokeLinecap="round"
          />
        </Svg>
      </View>
    );
  }

  if (!imageUri) {
    return (
      <Animated.View style={[wrapStyle, {opacity: pulse}]}>
        <Svg width={inner} height={inner} viewBox={`0 0 ${STAMP_VIEWBOX} ${STAMP_VIEWBOX}`}>
          <Path d={d} fill={colors['fill/faint']} />
        </Svg>
      </Animated.View>
    );
  }

  return (
    <View style={wrapStyle}>
      <Svg width={inner} height={inner} viewBox={`0 0 ${STAMP_VIEWBOX} ${STAMP_VIEWBOX}`}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={d} />
          </ClipPath>
        </Defs>
        {/* 사진이 비칠 바탕 — 투명 PNG도 모양이 유지된다 */}
        <Rect
          width={STAMP_VIEWBOX}
          height={STAMP_VIEWBOX}
          fill={colors['surface/bright']}
          clipPath={`url(#${clipId})`}
        />
        <SvgImage
          href={{uri: imageUri}}
          width={STAMP_VIEWBOX}
          height={STAMP_VIEWBOX}
          // 가장자리가 잘리므로 피사체가 가운데 크게 들어오도록 채운다
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      </Svg>
    </View>
  );
}

export default Stamp;
