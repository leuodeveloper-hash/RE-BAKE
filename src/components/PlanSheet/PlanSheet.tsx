import React, {useEffect, useMemo, useState} from 'react';
import {Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {BlurView} from 'expo-blur';
import {BottomSheet} from '@components/BottomSheet';
import {Button} from '@components/Button';
import {Tabs} from '@components/Tabs';
import {IconButton} from '@components/IconButton';
import {IconClose} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useSubscription} from '@contexts/SubscriptionContext';
import {toPlanPackages, savingsPercent} from '@utils/subscriptionPackages';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Radius} from '@constants/tokens';
import {Typography} from '@constants/typography';

export interface PlanSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Pro 구독 여부 */
  isPro?: boolean;
  /** 구독하기 버튼 클릭 — 게스트면 로그인 유도, 로그인이면 구매 흐름 */
  onSubscribePress?: (pkg?: any) => void;
}

function PlanGradientBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['transparent', '#FDF5EA']}
        start={{x: 0, y: 0}}
        end={{x: 0.5, y: 1}}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', 'transparent', '#C6CEF9']}
        locations={[0, 0.3, 1]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function PlanFeature({text, styles, dotColor}: {
  text: string;
  styles: ReturnType<typeof createStyles>;
  dotColor?: string;
}) {
  return (
    <View style={styles.planFeatureRow}>
      <View style={[styles.planFeatureDot, dotColor ? {backgroundColor: dotColor} : undefined]} />
      <Text style={styles.planFeatureText}>{text}</Text>
    </View>
  );
}

function PlanContent({styles, colors, isPro, onSubscribePress}: {
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useColors>;
  isPro: boolean;
  onSubscribePress: (pkg?: any) => void;
}) {
  const {t} = useTranslation();
  const {offerings, purchaseStore, canManageSubscription} = useSubscription();
  const plans = useMemo(() => toPlanPackages(offerings), [offerings]);
  // 기본 선택은 첫 상품(가장 긴 기간 = 가장 저렴) — 절약을 먼저 보여준다
  const [selectedType, setSelectedType] = useState<string>('');
  const selected = plans.find(p => p.type === selectedType) ?? plans[0];
  useEffect(() => {
    if (plans.length > 0 && !plans.some(p => p.type === selectedType)) {
      setSelectedType(plans[0].type);
    }
  }, [plans, selectedType]);
  const savedPercent = selected ? savingsPercent(selected, plans) : null;
  return (
    <View style={styles.planSheetContent}>
      <View style={styles.planHeader}>
        <Text style={styles.planHeadline}>
          {t('plan.headline')}
        </Text>
      </View>

      {/* Pro는 카드 하나 — 기간은 탭으로 고른다.
          상품마다 카드를 만들면 시트가 길어지고 가격 비교도 어렵다.
          가격/통화는 스토어(offerings)에서 오므로 앱에 하드코딩하지 않는다. */}
      <BlurView intensity={12} style={styles.planCardBlur}>
        <View style={styles.planCardInner}>
          <View style={styles.planCardInfoRow}>
            <Text style={styles.planCardTitle}>{t('plan.proTitle')}</Text>
            {/* 상품을 못 불러왔을 때도 자리를 유지한다 — 값만 em dash로.
                (숨기면 로딩/계약 대기 중에 카드가 들썩인다) */}
            <View style={styles.planPriceRow}>
              <Text style={styles.planPrice}>{selected?.priceString ?? '—'}</Text>
              <Text style={styles.planPriceSuffixText}>
                {selected ? t(selected.periodKey) : '/—'}
              </Text>
            </View>
          </View>

          {/* 기간 선택 — 상품이 2개 이상일 때만 */}
          {plans.length > 1 && (
            <Tabs
              tabs={plans.map(p => ({
                id: p.type,
                label: t(p.periodKey).replace('/', ''),
              }))}
              selectedId={selectedType}
              onSelect={setSelectedType}
              fullWidth
            />
          )}

          {savedPercent != null && (
            <Text style={styles.planSavingsText}>{t('plan.savings', {percent: savedPercent})}</Text>
          )}

          {isPro ? (
            <>
              <Button label={t('plan.currentPlan')} variant="soft" disabled />
              {/* 어디서 결제했는지 — 다른 플랫폼 구독은 이 앱에서 변경할 수 없다 */}
              {purchaseStore && (
                <Text style={styles.planStoreNote}>
                  {purchaseStore === 'APP_STORE' ? t('profile.managedOnIos') : t('profile.managedOnAndroid')}
                </Text>
              )}
            </>
          ) : (
            // 웹은 스토어 인앱결제를 쓸 수 없다 — 버튼을 비활성하고 앱에서 하도록 안내
            Platform.OS === 'web' ? (
              <Button label={t('plan.subscribeOnApp')} variant="soft" disabled />
            ) : (
              <Button label={t('plan.subscribe')} onPress={() => onSubscribePress(selected?.raw)} />
            )
          )}

          <View style={styles.planFeatureList}>
            <PlanFeature text={t('plan.featureCloudSync')} styles={styles} dotColor={colors['custom/light-blue']} />
            <PlanFeature text={t('plan.featureUnlimitedExplore')} styles={styles} dotColor={colors['custom/light-blue']} />
            <PlanFeature text={t('plan.featureAdFree')} styles={styles} dotColor={colors['custom/light-blue']} />
          </View>
        </View>
      </BlurView>

      <BlurView intensity={12} style={styles.planCardBlur}>
        <View style={styles.planCardInner}>
          <View style={styles.planCardInfoRow}>
            <Text style={styles.planCardTitle}>{t('plan.freeTitle')}</Text>
            <Text style={styles.planPrice}>Free</Text>
          </View>
          {isPro ? (
            // 다른 플랫폼에서 결제했으면 여기서 해지할 수 없다(안내는 Pro 카드에 있다)
            <Button label={t('plan.downgradeFree')} variant="soft" disabled={!canManageSubscription} />
          ) : (
            <Button label={t('plan.currentPlan')} variant="soft" disabled />
          )}
          <View style={styles.planFeatureList}>
            <PlanFeature text={t('plan.featureLocalSave')} styles={styles} />
            <PlanFeature text={t('plan.featureExplorePreview')} styles={styles} />
            <PlanFeature text={t('plan.featureImportExport')} styles={styles} />
          </View>
        </View>
      </BlurView>
    </View>
  );
}

export function PlanSheet({visible, onClose, isPro = false, onSubscribePress}: PlanSheetProps) {
  const noopSubscribe = React.useCallback(() => {}, []);
  const subscribeHandler = onSubscribePress ?? noopSubscribe;
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      maxWidth={380}
      backgroundElement={<PlanGradientBg />}>
      <PlanContent styles={styles} colors={colors} isPro={isPro} onSubscribePress={subscribeHandler} />
    </BottomSheet>
  );
}

const overlayStyles = StyleSheet.create({
  container: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderTopLeftRadius: Radius['radius-xl'],
    borderTopRightRadius: Radius['radius-xl'],
    overflow: 'hidden',
    paddingBottom: Spacing.lg,
  },
  closeBtn: {
    position: 'absolute' as any,
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
  },
});

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  planSheetContent: {
    paddingVertical: 24,
    gap: Spacing.md,
  },
  planStoreNote: {
    ...Typography.label.small,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
  },
  planSavingsText: {
    ...Typography.label.small,
    fontWeight: Typography.label.small.fontWeight as '500',
    color: colors['foreground/accent'],
  },
  planHeader: {
    paddingVertical: Spacing.sm,
    alignItems: 'center' as const,
  },
  planHeadline: {
    fontFamily: Typography.title.large.fontFamily,
    fontSize: Typography.title.large.fontSize,
    fontWeight: Typography.title.large.fontWeight as '700',
    lineHeight: Typography.title.large.lineHeight,
    letterSpacing: Typography.title.large.letterSpacing,
    color: colors['foreground/on-surface'],
    textAlign: 'center' as const,
  },
  planCardBlur: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    marginHorizontal: Spacing.smd,
  },
  planCardInner: {
    backgroundColor: 'rgba(28, 28, 28, 0.08)',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  planCardInfoRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: Spacing.sm,
  },
  planCardTitle: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '600',
    lineHeight: Typography.title.medium.lineHeight,
    letterSpacing: Typography.title.medium.letterSpacing,
    color: colors['foreground/on-surface'],
  },
  planPriceRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: 10,
  },
  planPrice: {
    fontFamily: 'Pretendard-Medium',
    fontSize: 26,
    fontWeight: '500' as const,
    lineHeight: 32,
    letterSpacing: -1.2,
    color: colors['foreground/on-surface'],
  },
  planPriceSuffixText: {
    fontFamily: Typography.body.small.fontFamily,
    fontSize: Typography.body.small.fontSize,
    fontWeight: Typography.body.small.fontWeight as '400',
    lineHeight: Typography.body.small.lineHeight,
    letterSpacing: Typography.body.small.letterSpacing,
    color: colors['foreground/on-surface-muted'],
  },
  planFeatureList: {
    gap: 2,
  },
  planFeatureRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
    height: 20,
  },
  planFeatureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors['foreground/on-surface-muted'],
  },
  planFeatureText: {
    flex: 1,
    fontFamily: Typography.body.small.fontFamily,
    fontSize: Typography.body.small.fontSize,
    fontWeight: Typography.body.small.fontWeight as '400',
    lineHeight: Typography.body.small.lineHeight,
    letterSpacing: Typography.body.small.letterSpacing,
    color: colors['foreground/on-surface'],
  },
});
