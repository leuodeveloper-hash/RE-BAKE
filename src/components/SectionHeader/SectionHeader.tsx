import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import type {SemanticColorsV2} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import {SvgProps} from 'react-native-svg';

export interface SectionHeaderProps {
  /** 섹션 타이틀 */
  title: string;
  /** 브레드크럼 (타이틀 > 브레드크럼) */
  breadcrumb?: string;
  /** 브레드크럼 구분 아이콘 */
  breadcrumbIcon?: React.FC<SvgProps>;
  /** 우측 액션 라벨 (예: '편집') */
  actionLabel?: string;
  /** 우측 액션 콜백 */
  onAction?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  breadcrumb,
  breadcrumbIcon: BreadcrumbIcon,
  actionLabel,
  onAction,
  style,
}: SectionHeaderProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();

  return (
    <View style={[styles.container, style]}>
      {breadcrumb && BreadcrumbIcon ? (
        <View style={styles.breadcrumbRow}>
          <Text style={styles.title}>{title}</Text>
          <BreadcrumbIcon width={8} height={8} color={colors['foreground/on-surface-muted']} />
          <Text style={styles.title}>{breadcrumb}</Text>
        </View>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
      {onAction && actionLabel && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  container: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.smd,
  },
  title: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  action: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
});
