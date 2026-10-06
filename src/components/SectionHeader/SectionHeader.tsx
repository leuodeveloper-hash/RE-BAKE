import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {IconChevronRight} from '@components/Icon/IconIndex';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {SvgProps} from 'react-native-svg';

/** 진도 게이지 너비 */
const PROGRESS_WIDTH = 64;

/**
 * 타이틀 톤.
 * - 'muted'(기본): 목록 위 구분선 같은 가벼운 머리말
 * - 'strong': 그 섹션 자체가 콘텐츠일 때(스탬프북의 레시피북 등)
 */
export type SectionHeaderVariant = 'muted' | 'strong';

export interface SectionHeaderProps {
  /** 섹션 타이틀 */
  title: string;
  variant?: SectionHeaderVariant;
  /** 브레드크럼 (타이틀 > 브레드크럼) */
  breadcrumb?: string;
  /** 브레드크럼 구분 아이콘 */
  breadcrumbIcon?: React.FC<SvgProps>;
  /** 우측 액션 라벨 (예: '편집') */
  actionLabel?: string;
  /** 우측 액션 콜백 */
  onAction?: () => void;
  /** 타이틀 앞 아이콘 (예: 레시피북 아이콘) */
  leadingIcon?: React.FC<SvgProps>;
  leadingIconColor?: string;
  /**
   * 진행도 — 주면 타이틀 옆에 게이지와 "done/total"이 보인다.
   * total이 0이면(분모가 없는 묶음) 감춘다.
   */
  progress?: {done: number; total: number};
  /** 헤더 전체를 눌러 이동할 때 — 우측에 › 가 붙는다 */
  onPress?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  variant = 'muted',
  breadcrumb,
  breadcrumbIcon: BreadcrumbIcon,
  actionLabel,
  onAction,
  leadingIcon: LeadingIcon,
  leadingIconColor,
  progress,
  onPress,
  style,
}: SectionHeaderProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  const showProgress = !!progress && progress.total > 0;
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper style={[styles.container, style]} onPress={onPress}>
      <View style={styles.leadRow}>
        {LeadingIcon && (
          <LeadingIcon
            width={20}
            height={20}
            color={leadingIconColor ?? colors['foreground/on-surface-muted']}
          />
        )}
        {breadcrumb && BreadcrumbIcon ? (
          <View style={styles.breadcrumbRow}>
            <Text style={[styles.title, variant === 'strong' && styles.titleStrong]}>{title}</Text>
            <BreadcrumbIcon width={8} height={8} color={colors['foreground/on-surface-muted']} />
            <Text style={[styles.title, variant === 'strong' && styles.titleStrong]}>{breadcrumb}</Text>
          </View>
        ) : (
          <Text style={[styles.title, variant === 'strong' && styles.titleStrong]}>{title}</Text>
        )}
        {showProgress && (
          <>
            {/* 게이지 — 숫자만으로는 얼마나 남았는지 한눈에 안 온다 */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {width: `${Math.round((progress!.done / progress!.total) * 100)}%`},
                ]}
              />
            </View>
            <Text style={styles.action}>{progress!.done}/{progress!.total}</Text>
          </>
        )}
        {onPress && (
          <IconChevronRight width={16} height={16} color={colors['foreground/on-surface-muted']} />
        )}
      </View>
      {onAction && actionLabel && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </Wrapper>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    // 고정 높이가 아니라 최소 높이 — 게이지·아이콘이 들어가면 줄이 커진다
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.smd,
  },
  title: {
    fontFamily: Typography.caption.large.fontFamily,
    fontSize: Typography.caption.large.fontSize,
    fontWeight: Typography.caption.large.fontWeight as '500',
    lineHeight: Typography.caption.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
  titleStrong: {
    color: colors['foreground/on-surface'],
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  progressTrack: {
    width: PROGRESS_WIDTH,
    height: 6,
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['fill/faint'],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['foreground/on-surface-muted'],
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  action: {
    fontFamily: Typography.caption.large.fontFamily,
    fontSize: Typography.caption.large.fontSize,
    fontWeight: Typography.caption.large.fontWeight as '500',
    lineHeight: Typography.caption.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
});
