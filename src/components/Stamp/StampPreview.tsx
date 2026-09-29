import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import {recipePreviewParts} from '@utils/recipePreview';
import type {Recipe} from '../../types/recipe';

/**
 * 사진 없는 스탬프를 채우는 내용 미리보기.
 *
 * 글이 그림 역할이라 칸을 꽉 채워야 '내용이 있다'로 보인다.
 * 토막을 한 줄로 이어 위에서부터 흘리고 넘치는 만큼은 잘라 낸다
 * (가운데 정렬하면 위아래가 비어 덩그러니 남는다).
 */
/**
 * 기본 글자 크기 — 6px로 두니 iOS에서 거의 안 보였다(웹은 보였다).
 * 작은 글씨는 기기마다 렌더링이 갈리므로 읽히는 하한을 지킨다.
 */
const DEFAULT_FONT_SIZE = 9;

export function StampPreview({recipe, fontSize = DEFAULT_FONT_SIZE}: {recipe?: Partial<Recipe>; fontSize?: number}) {
  const styles = useThemedStyles(createStyles);
  if (!recipe) return null;
  const text = recipePreviewParts(recipe)
    .map(p => p.trim())
    .filter(Boolean)
    .join('  ');
  if (!text) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={[styles.text, {fontSize, lineHeight: Math.round(fontSize * 1.35)}]}>{text}</Text>
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    wrap: {
      ...StyleSheet.absoluteFillObject,
      // 모양 경계에 글자가 반쯤 물리는 건 오려 낸 질감이라 그대로 둔다
      padding: Spacing.xs,
      overflow: 'hidden',
    },
    text: {
      ...Typography.label.small,
      // 질감 삼아 옅게 두면 작은 글씨가 iOS에서 사라진다 — 본문 색을 그대로 쓴다
      color: colors['foreground/on-surface-muted'],
      textAlign: 'justify',
    },
  });

export default StampPreview;
