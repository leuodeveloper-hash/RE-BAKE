import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {NOTE_BLOCK, TIP_LINE_COLOR} from '@constants/noteBlock';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

/**
 * 회고 한 줄 — 리스트 뷰 회고 노트 줄과 같은 글 모양.
 * 평가는 본문, 다음 개선 점은 과정 팁처럼 왼쪽 세로 라인 + 회색.
 */
export function ReviewLine({evaluation, improvement, align = 'left'}: {evaluation?: string; improvement?: string; align?: 'left' | 'center'}) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  if (!evaluation && !improvement) return null;
  const center = align === 'center';
  return (
    <View style={[styles.wrap, center && styles.center]}>
      {!!evaluation && <Text style={[styles.title, center && styles.textCenter]}>{evaluation}</Text>}
      {!!improvement && (
        // 과정 팁과 같은 왼쪽 세로 라인
        <View style={[NOTE_BLOCK, {borderLeftColor: colors[TIP_LINE_COLOR]}]}>
          <Text style={styles.sub}>{improvement}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  wrap: {gap: Spacing.xs},
  center: {alignItems: 'center'},
  textCenter: {textAlign: 'center'},
  // 진해 보이지 않게 본문 크기 · var 색
  title: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface-var'],
  },
  // 과정 팁 글과 같게
  sub: {
    ...Typography.body.small,
    color: colors['foreground/on-surface-muted'],
  },
});
