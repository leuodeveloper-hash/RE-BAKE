import {MetaLine} from '@components/MetaLine';
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Avatar} from '@components/Avatar';
import {IconCircleCheckFilled, IconCircleDot, IconDotFilled} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export type TimelineVariant = 'past' | 'current' | 'upcoming';

export interface TimelineItemProps {
  /** 레일 위·아래 선을 끊는다(첫·마지막 줄) */
  isFirst: boolean;
  isLast: boolean;
  /** 지난(흐리게·체크) / 지금(강조 배경·동그라미) / 다가옴(점) */
  variant: TimelineVariant;
  /** D-day 칸 글자 (D-3, D-DAY, D+2 …) */
  monogram: string;
  gradientIndex: number;
  title: string;
  /** 제목 아래 줄 — 날짜 등. 여러 항목이면 배열(점·8 간격으로 나눈다, MetaLine) */
  subtitle?: string | (string | null | undefined | false)[];
  /** 내용 아래 덧붙임 */
  footer?: React.ReactNode;
  /** 줄 오른쪽 끝 — 아이콘 버튼 등(내 시험일 고르기) */
  trailing?: React.ReactNode;
  onPress?: () => void;
}

/**
 * 타임라인 한 줄 — [레일(선·노드)] [D-day 칸] [제목 / 부제목].
 * 시험 일정과 내 D-day가 같이 쓴다(같은 모양·간격).
 */
export function TimelineItem({isFirst, isLast, variant, monogram, gradientIndex, title, subtitle, footer, trailing, onPress}: TimelineItemProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const isPast = variant === 'past';
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper style={[styles.item, variant === 'current' && styles.itemCurrent]} onPress={onPress}>
      {/* 레일: 위/아래 라인 + 노드 아이콘 */}
      <View style={styles.rail}>
        <View style={[styles.railSeg, !isFirst && styles.railSegLine]} />
        <View style={[styles.railNode, isPast && styles.railNodePast]}>
          {variant === 'current' ? (
            <IconCircleDot width={16} height={16} color={colors['foreground/on-surface']} />
          ) : isPast ? (
            <IconCircleCheckFilled width={16} height={16} color={colors['foreground/on-surface-muted']} />
          ) : (
            <IconDotFilled width={12} height={12} color={colors['foreground/on-surface']} />
          )}
        </View>
        <View style={[styles.railSeg, !isLast && styles.railSegLine]} />
      </View>

      <Avatar size="large" shape="rounded" type="gradient" gradientIndex={gradientIndex} monogram={monogram}
        style={isPast ? styles.avatarPast : undefined} />

      <View style={styles.content}>
        <Text style={[styles.title, isPast && styles.titlePast]} numberOfLines={1}>{title}</Text>
        {subtitle ? <MetaLine items={Array.isArray(subtitle) ? subtitle : [subtitle]} textStyle={[styles.subtitle, isPast && styles.subtitlePast]} style={styles.subtitleRow} /> : null}
        {footer}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Wrapper>
  );
}

const RAIL_WIDTH = 20;

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingHorizontal: Spacing.md,
    // 줄 상하 8 — 아바타가 줄 위아래에 붙지 않게(시험 일정·D-day 공통)
    paddingVertical: Spacing.sm,
  },
  itemCurrent: {
    backgroundColor: colors['fill/subtle'],
  },
  rail: {
    width: RAIL_WIDTH,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.smd,
  },
  railSeg: {
    flex: 1,
    width: 1,
  },
  railSegLine: {
    backgroundColor: colors['border/normal'],
  },
  railNode: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railNodePast: {
    opacity: 0.4,
  },
  avatarPast: {
    opacity: 0.55,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.smd,
  },
  trailing: {
    marginLeft: Spacing.sm,
  },
  title: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
  },
  titlePast: {
    color: colors['foreground/on-surface-muted'],
  },
  subtitleRow: {
    marginTop: 4,
  },
  subtitle: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-muted'],
  },
  subtitlePast: {
    color: colors['foreground/on-surface-disabled'],
  },
});
