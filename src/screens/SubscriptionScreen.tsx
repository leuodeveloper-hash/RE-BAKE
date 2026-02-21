import React, {useCallback, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button} from '@components/Button';
import {Card} from '@components/Container';
import {useColors} from '@contexts/ThemeContext';
import {useSubscription} from '@contexts/SubscriptionContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {IconSparkleFilled, IconClose} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
// PurchasesPackage 타입은 네이티브 모듈이 없을 수 있으므로 any로 처리
type PurchasesPackage = any;

interface SubscriptionScreenProps {
  onClose: () => void;
}

export function SubscriptionScreen({onClose}: SubscriptionScreenProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {offerings, purchasePackage, restorePurchases} = useSubscription();
  const {showSnackbar} = useSnackbar();
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<'weekly' | 'annual'>('annual');

  const currentOffering = offerings?.current;
  const weeklyPkg = currentOffering?.weekly;
  const annualPkg = currentOffering?.annual;

  const handlePurchase = useCallback(async () => {
    const pkg: PurchasesPackage | undefined | null =
      selectedPkg === 'weekly' ? weeklyPkg : annualPkg;
    if (!pkg) {
      showSnackbar('구독 상품을 불러오지 못했어요');
      return;
    }
    setPurchasing(true);
    const success = await purchasePackage(pkg);
    setPurchasing(false);
    if (success) {
      showSnackbar('Pro 구독이 시작됐어요!');
      onClose();
    }
  }, [selectedPkg, weeklyPkg, annualPkg, purchasePackage, showSnackbar, onClose]);

  const handleRestore = useCallback(async () => {
    setPurchasing(true);
    const success = await restorePurchases();
    setPurchasing(false);
    if (success) {
      showSnackbar('구매가 복원됐어요!');
      onClose();
    } else {
      showSnackbar('복원할 구매가 없어요');
    }
  }, [restorePurchases, showSnackbar, onClose]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton
          icon={IconClose}
          onPress={onClose}
          variant="ghost-secondary"
          size="medium"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 타이틀 */}
        <View style={styles.titleSection}>
          <IconSparkleFilled width={32} height={32} color={colors['foreground-accent']} />
          <Text style={styles.title}>Bakecycle Pro</Text>
          <Text style={styles.subtitle}>
            모든 공식 레시피를 무제한으로 열어보세요
          </Text>
        </View>

        {/* 혜택 */}
        <View style={styles.benefitSection}>
          <Text style={styles.benefitItem}>모든 둘러보기 레시피 무제한 열람</Text>
          <Text style={styles.benefitItem}>레시피 PDF 다운로드</Text>
          <Text style={styles.benefitItem}>광고 없는 쾌적한 사용</Text>
        </View>

        {/* 플랜 선택 */}
        <View style={styles.planSection}>
          <PlanCard
            label="연간"
            price={annualPkg?.product.priceString ?? '₩20,000'}
            description="1년 · 가장 합리적"
            selected={selectedPkg === 'annual'}
            onPress={() => setSelectedPkg('annual')}
            styles={styles}
            colors={colors}
            recommended
          />
          <PlanCard
            label="주간"
            price={weeklyPkg?.product.priceString ?? '₩4,000'}
            description="1주"
            selected={selectedPkg === 'weekly'}
            onPress={() => setSelectedPkg('weekly')}
            styles={styles}
            colors={colors}
          />
        </View>

        {/* 구매 버튼 */}
        <View style={styles.actionSection}>
          <Button
            label={purchasing ? '처리 중...' : '구독 시작하기'}
            onPress={handlePurchase}
            disabled={purchasing}
            variant="filled"
            size="medium"
          />
          <Button
            label="구매 복원"
            onPress={handleRestore}
            disabled={purchasing}
            variant="ghost"
            size="small"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  label,
  price,
  description,
  selected,
  onPress,
  recommended,
  styles,
  colors,
}: {
  label: string;
  price: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  recommended?: boolean;
  styles: ReturnType<typeof createStyles>;
  colors: SemanticColors;
}) {
  return (
    <Card
      style={[
        styles.planCard,
        selected && {borderColor: colors['foreground-accent'], borderWidth: 2},
      ]}
      onPress={onPress}
    >
      <View style={styles.planRow}>
        <View>
          <View style={styles.planLabelRow}>
            <Text style={styles.planLabel}>{label}</Text>
            {recommended && (
              <View style={[styles.badge, {backgroundColor: colors['foreground-accent']}]}>
                <Text style={styles.badgeText}>추천</Text>
              </View>
            )}
          </View>
          <Text style={styles.planDescription}>{description}</Text>
        </View>
        <Text style={styles.planPrice}>{price}</Text>
      </View>
    </Card>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors['surface-surfacedim'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  titleSection: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
  },
  title: {
    fontFamily: Typography.headline.large.fontFamily,
    fontSize: Typography.headline.large.fontSize,
    fontWeight: Typography.headline.large.fontWeight as '700',
    lineHeight: Typography.headline.large.lineHeight,
    color: colors['foreground-onsurface'],
  },
  subtitle: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground-onsurfacemuted'],
    textAlign: 'center',
  },
  benefitSection: {
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  benefitItem: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground-onsurface'],
    paddingLeft: Spacing.md,
  },
  planSection: {
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  planCard: {
    borderWidth: 1,
    borderColor: colors['border-borderlight'],
    borderRadius: Radius['radius-lg'],
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  planLabel: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    color: colors['foreground-onsurface'],
  },
  planDescription: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground-onsurfacemuted'],
    marginTop: 2,
  },
  planPrice: {
    fontFamily: Typography.title.large.fontFamily,
    fontSize: Typography.title.large.fontSize,
    fontWeight: Typography.title.large.fontWeight as '700',
    lineHeight: Typography.title.large.lineHeight,
    color: colors['foreground-onsurface'],
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius['radius-full'],
  },
  badgeText: {
    fontFamily: Typography.label.small.fontFamily,
    fontSize: Typography.label.small.fontSize,
    fontWeight: Typography.label.small.fontWeight as '600',
    color: '#FFFFFF',
  },
  actionSection: {
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
    alignItems: 'center',
  },
});
