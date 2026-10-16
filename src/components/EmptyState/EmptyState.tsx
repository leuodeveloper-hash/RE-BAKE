import React from 'react';
import {Image, ImageSourcePropType, StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {AppIcon} from '@components/Icon/AppIcon';
import {Button} from '@components/Button';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {useTheme} from '@contexts/ThemeContext';
import {emptyImage, EMPTY_IMAGE_RATIO as IMAGE_RATIO} from '@constants/emptyImages';

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
  /** 버튼 모양 — 기본은 글자 버튼(ghost), 화면의 주된 할 일이면 토널(soft) */
  actionVariant?: 'ghost' | 'soft';
  /** fullscreen(기본): 페이지 전체 빈 상태. inline: 카드/섹션 안의 빈 상태 (텍스트만). */
  variant?: EmptyStateVariant;
}

function categoryImage(category: EmptyStateCategory, isDark: boolean): ImageSourcePropType | null {
  switch (category) {
    case 'no-results': return emptyImage('default', isDark);
    case 'no-recipe': return emptyImage('default', isDark);
    case 'network-error': return emptyImage('network', isDark);
    case 'error': return null;
  }
}

export function EmptyState({category, image, icon, title, subtitle, actionLabel, onAction, actionVariant = 'ghost', variant = 'fullscreen'}: EmptyStateProps) {
  const styles = useThemedStyles(createStyles);
  const {isDark} = useTheme();

  if (variant === 'simple') {
    // 심플: 작은 일러스트(카테고리/이미지 있을 때만) + 텍스트. 이미지는 경우에 따라 있거나 없음.
    const simpleImg = category ? categoryImage(category, isDark) : image;
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

  const fullImg = category ? categoryImage(category, isDark) : image;
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
        <Button label={actionLabel} variant={actionVariant} accent={actionVariant === 'ghost'} size="small" onPress={onAction} />
      )}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  // 빈 상태 가이드 — 늘 받은 칸의 상하·좌우 중앙. 탭바·앱바 자리는 감싸는 쪽이 빼서 넘긴다
  // (여기서 아래 여백을 따로 두면 목록 쪽 탭바 여백과 겹쳐 위로 치우쳤다)
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  // 높이까지 숫자로 — 안드로이드는 width+aspectRatio만 주면 원본 크기(두 배)로 그렸다
  image: {
    width: 120,
    height: Math.round(120 / IMAGE_RATIO),
  },
  smallImage: {
    width: 60,
    height: Math.round(60 / IMAGE_RATIO),
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
    fontFamily: Typography.caption.medium.fontFamily,
    fontSize: Typography.caption.medium.fontSize,
    fontWeight: Typography.caption.medium.fontWeight as '500',
    lineHeight: Typography.caption.medium.lineHeight,
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
    fontFamily: Typography.caption.medium.fontFamily,
    fontSize: Typography.caption.medium.fontSize,
    fontWeight: Typography.caption.medium.fontWeight as '500',
    lineHeight: Typography.caption.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
  simpleSubtitle: {
    fontFamily: Typography.caption.small.fontFamily,
    fontSize: Typography.caption.small.fontSize,
    fontWeight: Typography.caption.small.fontWeight as '500',
    lineHeight: Typography.caption.small.lineHeight,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
});
