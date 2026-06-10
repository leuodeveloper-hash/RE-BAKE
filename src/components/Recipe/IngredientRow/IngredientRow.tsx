import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useThemedStylesV2} from '@hooks/useThemedStyles';

export interface Ingredient {
  percentage: string;
  name: string;
  amount: string;
}

export interface IngredientRowProps {
  ingredient: Ingredient;
  /** 마지막 아이템 여부 (하단 보더 제거용) */
  isLast?: boolean;
}

/**
 * 재료 행 컴포넌트
 * - 베이커스 퍼센트, 재료명, 수량 표시
 */
export function IngredientRow({ingredient, isLast = false}: IngredientRowProps) {
  const styles = useThemedStylesV2(createStyles);

  return (
    <View style={[styles.container, !isLast && styles.withBorder]}>
      <Text style={styles.percentage}>{ingredient.percentage}</Text>
      <Text style={styles.name}>
        {ingredient.name} {ingredient.amount}
      </Text>
    </View>
  );
}

export interface IngredientListProps {
  ingredients: Ingredient[];
}

/**
 * 재료 리스트 컴포넌트
 * - 카드 형태의 재료 목록
 */
export function IngredientList({ingredients}: IngredientListProps) {
  const styles = useThemedStylesV2(createStyles);

  return (
    <View style={styles.list}>
      {ingredients.map((ingredient, index) => (
        <IngredientRow
          key={index}
          ingredient={ingredient}
          isLast={index === ingredients.length - 1}
        />
      ))}
    </View>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  list: {
    backgroundColor: colors['surface/bright'],
    borderRadius: Radius['radius-lg'],
    borderWidth: 1,
    borderColor: colors['border/muted'],
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.smd,
    paddingHorizontal: Spacing.md,
  },
  withBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors['border/muted'],
  },
  percentage: {
    width: 60,
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
  name: {
    flex: 1,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground/on-surface'],
  },
});
