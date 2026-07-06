import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useThemedStyles} from '@hooks/useThemedStyles';

export interface ProcessStep {
  step: number;
  description: string;
}

export interface StepRowProps {
  step: ProcessStep;
  /** 마지막 아이템 여부 (하단 보더 제거용) */
  isLast?: boolean;
}

/**
 * 과정 행 컴포넌트
 * - 단계 번호와 설명 표시
 */
export function StepRow({step, isLast = false}: StepRowProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, !isLast && styles.withBorder]}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{step.step}</Text>
      </View>
      <Text style={styles.description}>{step.description}</Text>
    </View>
  );
}

export interface StepListProps {
  steps: ProcessStep[];
}

/**
 * 과정 리스트 컴포넌트
 * - 카드 형태의 과정 목록
 */
export function StepList({steps}: StepListProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.list}>
      {steps.map((step, index) => (
        <StepRow
          key={index}
          step={step}
          isLast={index === steps.length - 1}
        />
      ))}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  list: {
    backgroundColor: colors['surface/bright'],
    borderRadius: Radius['radius-lg'],
    borderWidth: 1,
    borderColor: colors['border/muted'],
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.smd,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  withBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors['border/muted'],
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['surface/container'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
  description: {
    flex: 1,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground/on-surface'],
  },
});
