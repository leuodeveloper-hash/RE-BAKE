import React from 'react';
import {Image, ImageSourcePropType, StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {AppIcon} from '@components/Icon/AppIcon';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

export interface EmptyStateProps {
  /** 상단 이미지 (png 등) */
  image?: ImageSourcePropType;
  /** 상단 아이콘 (이미지 대신 사용) */
  icon?: React.FC<SvgProps>;
  title: string;
  subtitle?: string;
}

export function EmptyState({image, icon, title, subtitle}: EmptyStateProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      {image && <Image source={image} style={styles.image} />}
      {icon && !image && (
        <AppIcon icon={icon} size="lg" color={styles.iconColor.color} />
      )}
      <View style={styles.textGroup}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
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
