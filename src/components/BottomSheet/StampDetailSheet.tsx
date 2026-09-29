import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {Stamp} from '@components/Stamp';
import {Button} from '@components/Button';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {parseSession} from '@utils/session';
import type {Recipe} from '../../types/recipe';

const STAMP_SIZE = 140;

export interface StampDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 대상 레시피. 아직 안 만든 칸이면 madeAt이 없다 */
  recipe?: Recipe;
  /** 만든 시각(ISO). 없으면 "아직 안 만든 칸" 상태로 보여준다 */
  madeAt?: string;
  /** 스탬프 모양을 정하는 순번 */
  stampIndex?: number;
  /** 같은 회차 그룹의 레시피들 — 회차별 기록을 보여준다 */
  sessions?: Recipe[];
  /** 레시피 상세로 이동 */
  onOpenRecipe: () => void;
  /** 회고 남기기(편집 화면으로) */
  onWriteReview?: () => void;
}

/**
 * 스탬프 상세 — 스탬프북에서 칸을 눌렀을 때.
 *
 * 스탬프북은 그림만 있는 화면이라(사진 자체가 콘텐츠) 이름·날짜·회고는 여기서 본다.
 * 아직 안 만든 칸도 눌린다 — 무엇을 만들어야 채워지는지 알려주는 게 목적이다.
 */
export function StampDetailSheet({
  visible,
  onClose,
  recipe,
  madeAt,
  stampIndex = 0,
  sessions,
  onOpenRecipe,
  onWriteReview,
}: StampDetailSheetProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();

  const dateLabel = useMemo(() => {
    if (!madeAt) return null;
    const d = new Date(madeAt);
    if (Number.isNaN(d.getTime())) return null;
    return t('stampDetail.madeOn', {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    });
  }, [madeAt, t]);

  // 회차별 기록 — 회고가 있는 회차만(빈 줄을 늘어놓을 이유가 없다)
  const sessionRows = useMemo(() => {
    if (!sessions || sessions.length < 2) return [];
    return sessions
      .filter(r => r.reviews?.some(rv => rv.evaluation?.trim() || rv.improvement?.trim()))
      .sort((a, b) => parseSession(a.session).current - parseSession(b.session).current)
      .map(r => ({
        id: r.id,
        label: t('id.sessionLabel', {current: parseSession(r.session).current}),
        text: r.reviews!
          .map(rv => rv.evaluation?.trim() || rv.improvement?.trim())
          .filter(Boolean)
          .join(' · '),
      }));
  }, [sessions, t]);

  const made = !!madeAt;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <View style={styles.stampWrap}>
          {/* 안 만든 칸은 흐리게 — 채우면 이렇게 된다는 미리보기 */}
          <View style={made ? undefined : styles.dimmed}>
            <Stamp
              imageUri={recipe?.imageUri}
              size={STAMP_SIZE}
              index={stampIndex}
              rotate={-4}
            />
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>{recipe?.title ?? ''}</Text>
        <Text style={styles.subtitle}>
          {dateLabel ?? t('stampDetail.notMadeYet')}
        </Text>

        {sessionRows.length > 0 && (
          <View style={styles.sessions}>
            {sessionRows.map(row => (
              <View key={row.id} style={styles.sessionRow}>
                <Text style={styles.sessionLabel}>{row.label}</Text>
                <Text style={styles.sessionText} numberOfLines={2}>{row.text}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          {made && onWriteReview && (
            <Button
              label={t('stampDetail.writeReview')}
              variant="soft"
              onPress={onWriteReview}
            />
          )}
          <Button label={t('stampDetail.openRecipe')} onPress={onOpenRecipe} />
        </View>
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  stampWrap: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  dimmed: {opacity: 0.35},
  title: {
    ...Typography.title.medium,
    color: colors['foreground/on-surface'],
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
    paddingTop: Spacing.xs,
  },
  sessions: {
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  sessionLabel: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-muted'],
    minWidth: 48,
  },
  sessionText: {
    ...Typography.body.small,
    color: colors['foreground/on-surface-var'],
    flex: 1,
  },
  actions: {
    paddingTop: Spacing.xl,
    gap: Spacing.sm,
  },
});

export default StampDetailSheet;
