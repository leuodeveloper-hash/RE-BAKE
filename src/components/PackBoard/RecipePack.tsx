import React, {useRef} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import {StackedThumbnail} from '@components/Recipe/RecipeCard';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export const PACK_WIDTH = 184;
const STACK_HEIGHT = 158; // 보이는 카드에 맞춰 타이트하게 (라벨 갭 축소)
const THUMB_SIZE = 180; // 그리드 뷰 카드 크기(상한 180)와 동일

// 더미 카드 팬 효과 (뒤 → 앞). 장수별로 좌우 대칭이 되도록 구성.
type Fan = {x: number; y: number; rotate: number};
function fanFor(count: number): Fan[] {
  if (count <= 1) return [{x: 0, y: 0, rotate: 0}];
  if (count === 2) {
    // 좌우 완전 대칭 (한쪽 쏠림 방지)
    return [
      {x: -14, y: 0, rotate: -8},
      {x: 14, y: 0, rotate: 8},
    ];
  }
  // 3장: 뒤 좌/우 대칭 + 정면 중앙(맨 위)
  return [
    {x: -18, y: 5, rotate: -8},
    {x: 18, y: 5, rotate: 8},
    {x: 0, y: 0, rotate: 0},
  ];
}

export interface PackOriginRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PackCardData {
  /** 원격 uri 문자열 또는 require() 로컬 에셋 모듈 */
  imageUrl?: string | number;
  /** 종이에 표시할 레시피 제목 */
  title: string;
  /** 종이를 채울 레시피 미리보기 텍스트 (재료/도구/스텝) */
  paperPreview?: string[];
}

export interface RecipePackProps {
  /** 공법명 */
  title: string;
  /** 서브타이틀 (예: "제과기능사 · 3개") */
  subtitle: string;
  /** 대표 레시피 카드 (최대 3장: 이미지+레시피 종이) */
  cards: PackCardData[];
  /** 탭 시 호출 (확대 애니메이션 원점으로 카드 화면 좌표 전달) */
  onPress?: (rect: PackOriginRect) => void;
  /** 카드 스택 기울기 (deg). 텍스트는 기울지 않고 스택에만 적용 */
  rotate?: number;
}

export function RecipePack({title, subtitle, cards, onPress, rotate = 0}: RecipePackProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const ref = useRef<View>(null);

  // 최소 1장, 최대 3장 (뒤 카드부터 그려 마지막이 위로)
  const shown = (cards.length > 0 ? cards : [{title}]).slice(0, 3);
  // 종이: 레시피 1개이거나 썸네일 없을 때만 표시 (여러 개 + 썸네일 있으면 숨김)
  const multi = shown.length > 1;

  const handlePress = () => {
    if (!onPress) return;
    const node = ref.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => onPress({x, y, width, height}));
    } else {
      onPress({x: 0, y: 0, width: 0, height: 0});
    }
  };

  return (
    <Pressable
      ref={ref}
      onPress={handlePress}
      style={({pressed}) => [styles.container, pressed && {opacity: 0.85, transform: [{scale: 0.97}]}]}>
      <View style={[styles.stack, {transform: [{rotate: `${rotate}deg`}]}]}>
        {(() => { const fanArr = fanFor(shown.length); return shown.map((card, i) => {
          const fan = fanArr[i] ?? fanArr[fanArr.length - 1];
          return (
            <View
              key={i}
              style={[
                styles.thumbWrap,
                {transform: [{translateX: fan.x}, {translateY: fan.y}, {rotate: `${fan.rotate}deg`}]},
              ]}>
              <StackedThumbnail
                size={THUMB_SIZE}
                imageUrl={card.imageUrl}
                colors={colors}
                paperTitle={card.title}
                paperPreview={card.paperPreview}
                showPaper={!multi || !card.imageUrl}
              />
            </View>
          );
        }); })()}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
    </Pressable>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  container: {
    width: PACK_WIDTH,
    alignItems: 'center',
  },
  stack: {
    width: PACK_WIDTH,
    height: STACK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbWrap: {
    position: 'absolute',
  },
  title: {
    ...Typography.label['large - semibold'],
    color: colors['foreground/on-surface'],
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.label.small,
    color: colors['foreground/on-surface-muted'],
    marginTop: 2,
    textAlign: 'center',
  },
});
