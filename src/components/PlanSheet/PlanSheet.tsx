import React from 'react';
import {Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {BlurView} from 'expo-blur';
import {BottomSheet} from '@components/BottomSheet';
import {Button} from '@components/Button';
import {IconButton} from '@components/IconButton';
import {IconClose} from '@components/Icon/IconIndex';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Radius} from '@constants/tokens';
import {Typography} from '@constants/typography';

export interface PlanSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Pro 구독 여부 */
  isPro?: boolean;
  /** 구독하기 버튼 클릭 — 게스트면 로그인 유도, 로그인이면 구매 흐름 */
  onSubscribePress?: () => void;
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
  colors: ReturnType<typeof useColorsV2>;
  isPro: boolean;
  onSubscribePress: () => void;
}) {
  return (
    <View style={styles.planSheetContent}>
      <View style={styles.planHeader}>
        <Text style={styles.planHeadline}>
          {'레시피에만\n집중할 수 있게'}
        </Text>
      </View>

      <BlurView intensity={12} style={styles.planCardBlur}>
        <View style={styles.planCardInner}>
          <View style={styles.planCardInfoRow}>
            <Text style={styles.planCardTitle}>프로</Text>
            <View style={styles.planPriceRow}>
              <Text style={styles.planPrice}>USD 18</Text>
              <Text style={styles.planPriceSuffixText}>/ 년 단위</Text>
            </View>
          </View>
          {isPro ? (
            <Button label="현재 플랜" variant="soft" disabled />
          ) : (
            <Button label="구독하기" onPress={onSubscribePress} />
          )}
          <View style={styles.planFeatureList}>
            <PlanFeature text="내 레시피 클라우드 동기화" styles={styles} dotColor={colors['custom/light-blue']} />
            <PlanFeature text="모든 둘러보기 레시피 무제한 열람" styles={styles} dotColor={colors['custom/light-blue']} />
            <PlanFeature text="광고 없는 쾌적한 사용" styles={styles} dotColor={colors['custom/light-blue']} />
          </View>
        </View>
      </BlurView>

      <BlurView intensity={12} style={styles.planCardBlur}>
        <View style={styles.planCardInner}>
          <View style={styles.planCardInfoRow}>
            <Text style={styles.planCardTitle}>무료</Text>
            <Text style={styles.planPrice}>Free</Text>
          </View>
          {isPro ? (
            <Button label="무료로 다운그레이드" variant="soft" />
          ) : (
            <Button label="현재 플랜" variant="soft" disabled />
          )}
          <View style={styles.planFeatureList}>
            <PlanFeature text="내 레시피 로컬 저장" styles={styles} />
            <PlanFeature text="둘러보기 레시피 미리보기" styles={styles} />
            <PlanFeature text="레시피 내보내기 / 가져오기" styles={styles} />
          </View>
        </View>
      </BlurView>
    </View>
  );
}

export function PlanSheet({visible, onClose, isPro = false, onSubscribePress}: PlanSheetProps) {
  const noopSubscribe = React.useCallback(() => {}, []);
  const subscribeHandler = onSubscribePress ?? noopSubscribe;
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();

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

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  planSheetContent: {
    paddingVertical: 24,
    gap: Spacing.md,
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
