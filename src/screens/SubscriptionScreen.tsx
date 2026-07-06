import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button} from '@components/Button';
import {BottomSheet} from '@components/BottomSheet';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';

import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import type {SemanticColors} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {IconSparkleFilled} from '@components/Icon/IconIndex';
import type {SvgProps} from 'react-native-svg';

const SparkleIcon = IconSparkleFilled as unknown as React.ComponentType<SvgProps>;

interface SubscriptionScreenProps {
  visible: boolean;
  onClose: () => void;
}

export function SubscriptionScreen({visible, onClose}: SubscriptionScreenProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {t} = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* 타이틀 */}
      <View style={styles.titleSection}>
        <SparkleIcon width={32} height={32} color={colors['foreground/accent']} />
        <Text style={styles.title}>{t('subscription.proTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('subscription.proSubtitle')}
        </Text>
      </View>

      {/* 혜택 */}
      <View style={styles.benefitSection}>
        <BenefitRow text={t('subscription.benefitUnlimitedExplore')} styles={styles} />
        <BenefitRow text={t('subscription.benefitCloudSync')} styles={styles} />
        <BenefitRow text={t('subscription.benefitNoAds')} styles={styles} />
      </View>

      {/* 예정 안내 */}
      <View style={styles.comingSoonSection}>
        <Text style={styles.comingSoonText}>{t('subscription.comingSoon')}</Text>
      </View>

      {/* 버튼 */}
      <View style={styles.actionSection}>
        <Button
          label={t('subscription.okButton')}
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

const createStyles = (colors: SemanticColors) => StyleSheet.create({
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
