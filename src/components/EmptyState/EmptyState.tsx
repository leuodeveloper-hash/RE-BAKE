import React from 'react';
import {Image, ImageSourcePropType, StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {AppIcon} from '@components/Icon/AppIcon';
import {Button} from '@components/Button';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import type {SemanticColorsV2} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
const emptyRecipeImage = require('../../../assets/images/empty_recipe.png');
const emptyNoResultsImage = require('../../../assets/images/empty_no_results.png');
const emptyNetworkImage = require('../../../assets/images/empty_network.png');

export type EmptyStateCategory = 'no-results' | 'no-recipe' | 'network-error' | 'error';
export type EmptyStateVariant = 'fullscreen' | 'simple';

export interface EmptyStateProps {
  /** 카테고리별 기본 일러스트레이션 */
  category?: EmptyStateCategory;
  /** 커스텀 이미지 (category 미지정시) */
  image?: ImageSourcePropType;
  /** 커스텀 아이콘 (category/image 미지정시) */
  icon?: React.FC<SvgProps>;
  title: string;
  subtitle?: string;
  /** 액션 링크 */
  actionLabel?: string;
  onAction?: () => void;
  /** fullscreen(기본): 페이지 전체 빈 상태. inline: 카드/섹션 안의 빈 상태 (텍스트만). */
  variant?: EmptyStateVariant;
}

function categoryImage(category: EmptyStateCategory): ImageSourcePropType | null {
  switch (category) {
    case 'no-results': return emptyNoResultsImage;
    case 'no-recipe': return emptyRecipeImage;
    case 'network-error': return emptyNetworkImage;
    case 'error': return null;
  }
}

export function EmptyState({category, image, icon, title, subtitle, actionLabel, onAction, variant = 'fullscreen'}: EmptyStateProps) {
  const styles = useThemedStylesV2(createStyles);

  if (variant === 'simple') {
    // 심플: 작은 일러스트(카테고리/이미지 있을 때만) + 텍스트. 이미지는 경우에 따라 있거나 없음.
    const simpleImg = category ? categoryImage(category) : image;
    return (
      // 일러스트 있을 때만 하단 여백 바이어스 → 부모 중앙 정렬 시 시각적 상하 중앙처럼 보임.
      // 텍스트만일 땐 순수 중앙(바이어스 없음).
      <View style={[styles.simpleContainer, !!simpleImg && styles.simpleContainerWithImage]}>
        {simpleImg && <Image source={simpleImg} style={styles.smallImage} />}
        <Text style={styles.simpleText}>{title}</Text>
        {subtitle && <Text style={styles.simpleSubtitle}>{subtitle}</Text>}
      </View>
    );
  }

  const fullImg = category ? categoryImage(category) : image;
  return (
    <View style={styles.container}>
      {fullImg && <Image source={fullImg} style={styles.image} />}
      {!category && !image && icon && (
        <AppIcon icon={icon} size="lg" color={styles.iconColor.color} />
      )}
      <View style={styles.textGroup}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {actionLabel && onAction && (
        <Button label={actionLabel} variant="ghost" accent size="small" onPress={onAction} />
      )}
    </View>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 120,
    gap: Spacing.md,
  },
  image: {
    width: 120,
    height: 120,
  },
  smallImage: {
    width: 60,
    height: 60,
  },
  iconColor: {
    color: colors['foreground/on-surface-muted'],
  },
  textGroup: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    color: colors['foreground/on-surface-var'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
  subtitle: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '500',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
  // ---- simple variant (카드/섹션 내부 — 작은 일러스트 + 작은 텍스트) ----
  simpleContainer: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  // 일러스트 있을 때만 하단 여백을 더 줘 시각 중앙 보정
  simpleContainerWithImage: {
    paddingBottom: 40,
  },
  simpleText: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '500',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
  simpleSubtitle: {
    fontFamily: Typography.label.small.fontFamily,
    fontSize: Typography.label.small.fontSize,
    fontWeight: Typography.label.small.fontWeight as '500',
    lineHeight: Typography.label.small.lineHeight,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
});
