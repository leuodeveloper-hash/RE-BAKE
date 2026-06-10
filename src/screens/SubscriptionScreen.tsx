import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button} from '@components/Button';
import {BottomSheet} from '@components/BottomSheet';
import {useColorsV2} from '@contexts/ThemeContext';

import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {IconSparkleFilled} from '@components/Icon/IconIndex';
import type {SvgProps} from 'react-native-svg';

const SparkleIcon = IconSparkleFilled as unknown as React.ComponentType<SvgProps>;

interface SubscriptionScreenProps {
  visible: boolean;
  onClose: () => void;
}

export function SubscriptionScreen({visible, onClose}: SubscriptionScreenProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* 타이틀 */}
      <View style={styles.titleSection}>
        <SparkleIcon width={32} height={32} color={colors['foreground/accent']} />
        <Text style={styles.title}>Bakecycle Pro</Text>
        <Text style={styles.subtitle}>
          모든 공식 레시피를 무제한으로 열어보세요
        </Text>
      </View>

      {/* 혜택 */}
      <View style={styles.benefitSection}>
        <BenefitRow text="모든 둘러보기 레시피 무제한 열람" styles={styles} />
        <BenefitRow text="내 레시피 클라우드 동기화 (최대 30개)" styles={styles} />
        <BenefitRow text="광고 없는 쾌적한 사용" styles={styles} />
      </View>

      {/* 예정 안내 */}
      <View style={styles.comingSoonSection}>
        <Text style={styles.comingSoonText}>구독 기능 준비 중이에요</Text>
      </View>

      {/* 버튼 */}
      <View style={styles.actionSection}>
        <Button
          label="알겠어요"
          onPress={onClose}
          variant="soft"
          size="medium"
        />
      </View>
    </BottomSheet>
  );
}

function BenefitRow({text, styles}: {text: string; styles: ReturnType<typeof createStyles>}) {
  return (
    <View style={styles.benefitRow}>
      <Text style={styles.benefitCheck}>✓</Text>
      <Text style={styles.benefitItem}>{text}</Text>
    </View>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  titleSection: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontFamily: Typography.headline.large.fontFamily,
    fontSize: Typography.headline.large.fontSize,
    fontWeight: Typography.headline.large.fontWeight as '700',
    lineHeight: Typography.headline.large.lineHeight,
    color: colors['foreground/on-surface'],
  },
  subtitle: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
  },
  benefitSection: {
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benefitCheck: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    color: colors['foreground/accent'],
  },
  benefitItem: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground/on-surface'],
  },
  comingSoonSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  comingSoonText: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
  actionSection: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    alignItems: 'center',
  },
});
