import React, {useEffect, useId, useRef, useState} from 'react';
import {Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import Svg, {ClipPath, Defs, Image as SvgImage, Path, Rect} from 'react-native-svg';
import {useColors} from '@contexts/ThemeContext';
import {STAMP_VIEWBOX, stampShapeAt} from './shapes';
import {StampPreview} from './StampPreview';
import type {Recipe} from '../../types/recipe';

/** 점선 굵기(viewBox 24 기준) */
const OUTLINE_STROKE = 0.5;

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
   * 안쪽 여백 — 칸에 붙어 서지 않도록 기본 8.
   * 표지처럼 이미 여백이 있는 자리에서는 0을 줘 그림을 꽉 채운다.
   */
  padding?: number;
  /**
   * 아직 채우지 않은 자리 — 사진 대신 점선 윤곽만 그린다.
   * "여기에 이런 게 붙는다"를 알려주는 용도.
   */
  outline?: boolean;
  /**
   * 사진 대신 모양 안에 넣을 내용 — 사진 없는 레시피의 내용 미리보기.
   * imageUri가 있으면 무시된다.
   */
  children?: React.ReactNode;
  /**
   * 사진이 없을 때 모양 안을 채울 레시피 — 재료·과정 글이 들어간다.
   * children을 직접 넘기면 그쪽이 우선한다.
   */
  recipe?: Partial<Recipe>;
  /** 미리보기 글자 크기 — 큰 스탬프(시트)에선 키운다 */
  previewFontSize?: number;
  /**
   * 모양 안에서 사진을 확대하는 배수(1 = 모양에 꼭 맞게).
   * 키우면 피사체가 크게 들어오고 그만큼 가장자리가 더 잘린다.
   */
  imageScale?: number;
  /**
   * 모양 바깥을 덮을 색 — 미리보기를 오려 낼 때 쓴다.
   * 스탬프가 놓인 바탕과 같아야 파낸 것처럼 보인다.
   * 기본은 시트·카드 바탕(surface/bright) — 목록처럼 바탕이 다르면 넘긴다.
   */
  cutoutColor?: string;
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
export function Stamp({imageUri, size, index = 0, rotate = 0, outline = false, padding = INNER_PADDING, children, recipe, previewFontSize, imageScale = 1, cutoutColor, style}: StampProps) {
  const colors = useColors();
  const d = stampShapeAt(index);
  /**
   * clipPath id는 인스턴스마다 달라야 한다 — url(#id)는 문서 전체에서 찾으므로
   * 같은 모양(index)을 쓰는 스탬프가 둘 이상이면 id가 겹쳐 웹에서 클립이 풀린다
   * (겹침 표시용 뒷장까지 더하면 한 칸 안에서도 겹친다).
   */
  const uid = useId().replace(/:/g, '');
  const clipId = `stamp-clip-${uid}`;

  // 사진이 없을 때 은은하게 깜빡인다 — 빈 칸이 아니라 "아직 채워지지 않은 자리"로
  const pulse = useRef(new Animated.Value(0.45)).current;
  // 사진이 없거나(빈 칸) 아직 안 떴을 때(로딩) 스켈레톤을 깐다 —
  // 바탕이 흰색이면 로딩 중 아무것도 없다가 툭 나타난다
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(false); }, [imageUri]);
  const idle = (!imageUri || !loaded) && !outline;
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
    {width: size, height: size, padding, alignItems: 'center', justifyContent: 'center'},
    rotate !== 0 && {transform: [{rotate: `${rotate}deg`}]},
    style,
  ];
  // 여백을 뺀 실제 그림 크기
  const inner = Math.max(0, size - padding * 2);

  if (outline) {
    // 선은 path를 중심으로 양쪽으로 퍼진다 — viewBox를 그만큼 넓혀
    // 바깥 절반이 잘리지 않게 한다(클립으로 자르면 모양 경계에서 끊겨 보인다)
    const pad = OUTLINE_STROKE;
    return (
      <View style={wrapStyle}>
        <Svg
          width={inner}
          height={inner}
          viewBox={`${-pad} ${-pad} ${STAMP_VIEWBOX + pad * 2} ${STAMP_VIEWBOX + pad * 2}`}>
          <Path
            d={d}
            // 안도 옅게 채운다 — 선만 있으면 배경과 구분이 약하다
            fill={colors['fill/faint']}
            stroke={colors['border/normal']}
            strokeWidth={OUTLINE_STROKE}
            // 각진 끝 — round면 양끝에 반원이 붙어 선이 strokeWidth만큼 길어진다
            strokeDasharray="1.8 1.8"
            strokeLinecap="butt"
          />
        </Svg>
      </View>
    );
  }

  const preview = children ?? (recipe ? <StampPreview recipe={recipe} fontSize={previewFontSize} /> : null);

  if (!imageUri) {
    // 사진이 없으면 내용 미리보기를 모양대로 오려 넣는다.
    // 일반 View는 SVG clipPath로 못 자르므로, 내용을 깔고 그 위에 모양의
    // '바깥쪽'을 배경색으로 덮어 같은 결과를 만든다(네이티브·웹 공통).
    if (preview) {
      return (
        <View style={wrapStyle}>
          <View style={[{width: inner, height: inner}, styles.clipBox]}>
            {/* 글만 있는 스탬프 — 바탕은 밝게 둬야 글이 읽힌다(사진 자리와 같은 톤) */}
            <View style={[StyleSheet.absoluteFill, {backgroundColor: colors['surface/bright']}]} />
            <View style={StyleSheet.absoluteFill} pointerEvents="none">{preview}</View>
            <Svg
              style={StyleSheet.absoluteFill}
              width={inner}
              height={inner}
              viewBox={`0 0 ${STAMP_VIEWBOX} ${STAMP_VIEWBOX}`}
              pointerEvents="none">
              {/* 바깥 사각형 − 모양 = 모양 밖만 칠해진다(evenodd).
                  배경과 같은 색이라야 파낸 것처럼 보인다 — 칸 배경색을 받는다. */}
              <Path
                d={`M0 0H${STAMP_VIEWBOX}V${STAMP_VIEWBOX}H0Z ${d}`}
                fill={cutoutColor ?? colors['surface/bright']}
                fillRule="evenodd"
              />
            </Svg>
          </View>
        </View>
      );
    }
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
      {/* 로딩 중 스켈레톤 — 사진이 뜨면 그 위를 덮는다 */}
      {!loaded && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, {opacity: pulse}]}>
          <Svg width={inner} height={inner} viewBox={`0 0 ${STAMP_VIEWBOX} ${STAMP_VIEWBOX}`}>
            <Path d={d} fill={colors['fill/faint']} />
          </Svg>
        </Animated.View>
      )}
      <Svg width={inner} height={inner} viewBox={`0 0 ${STAMP_VIEWBOX} ${STAMP_VIEWBOX}`}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={d} />
          </ClipPath>
        </Defs>
        {/* 사진이 비칠 바탕 — 투명 PNG도 모양이 유지된다. 로딩 중엔 스켈레톤이
            비치도록 칠하지 않는다 */}
        {loaded && (
          <Rect
            width={STAMP_VIEWBOX}
            height={STAMP_VIEWBOX}
            fill={colors['surface/bright']}
            clipPath={`url(#${clipId})`}
          />
        )}
        {/* 확대한 만큼 위·왼쪽으로 당겨 가운데를 유지한다 —
            그냥 키우면 우하단으로 쏠려 피사체가 화면 밖으로 밀린다 */}
        <SvgImage
          href={{uri: imageUri}}
          x={(STAMP_VIEWBOX - STAMP_VIEWBOX * imageScale) / 2}
          y={(STAMP_VIEWBOX - STAMP_VIEWBOX * imageScale) / 2}
          width={STAMP_VIEWBOX * imageScale}
          height={STAMP_VIEWBOX * imageScale}
          // 가장자리가 잘리므로 피사체가 가운데 크게 들어오도록 채운다
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          onLoad={() => setLoaded(true)}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {alignItems: 'center', justifyContent: 'center'},
  clipBox: {overflow: 'hidden'},
});

export default Stamp;
