import React from 'react';
import {Image, ImageSourcePropType, StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {AppIcon} from '@components/Icon/AppIcon';
import {Button} from '@components/Button';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
const emptyRecipeImage = require('../../../assets/images/empty_recipe.png');
const emptyNoResultsImage = require('../../../assets/images/empty_no_results.png');
const emptyNetworkImage = require('../../../assets/images/empty_network.png');

export type EmptyStateCategory = 'no-results' | 'no-recipe' | 'network-error' | 'error';

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
}

function CategoryIllustration({category, styles}: {category: EmptyStateCategory; styles: any}) {
  switch (category) {
    case 'no-results':
      return <Image source={emptyNoResultsImage} style={styles.image} />;
    case 'no-recipe':
      return <Image source={emptyRecipeImage} style={styles.image} />;
    case 'network-error':
      return <Image source={emptyNetworkImage} style={styles.image} />;
    case 'error':
      return null;
  }
}

export function EmptyState({category, image, icon, title, subtitle, actionLabel, onAction}: EmptyStateProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      {category && <CategoryIllustration category={category} styles={styles} />}
      {!category && image && <Image source={image} style={styles.image} />}
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

const createStyles = (colors: SemanticColors) => StyleSheet.create({
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
  iconColor: {
    color: colors['foreground-onsurfacemuted'],
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
    color: colors['foreground-onsurfacevar'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
  subtitle: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '500',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground-onsurfacemuted'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
});
