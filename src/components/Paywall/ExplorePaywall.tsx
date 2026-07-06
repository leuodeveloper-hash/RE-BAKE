import React from 'react';
import {StyleSheet, View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Button} from '@components/Button';
import {useColors} from '@contexts/ThemeContext';
import {Spacing} from '@constants/spacing';
import {IconVideoPlay} from '@components/Icon/IconIndex';
import {SUBSCRIPTION_ENABLED} from '@contexts/SubscriptionContext';
import {useTranslation} from '@contexts/LanguageContext';

interface ExplorePaywallProps {
  onWatchAd: () => void;
  adLoading?: boolean;
  /** Pro 구독 버튼 탭 시 (SUBSCRIPTION_ENABLED일 때만 사용) */
  onSubscribe?: () => void;
}

/**
 * 둘러보기 하단 페이월 오버레이.
 * 그라데이션 페이드 + "광고 보고 레시피 열기" 버튼.
 * SUBSCRIPTION_ENABLED일 때 "Pro 구독" 버튼도 표시.
 */
export function ExplorePaywall({onWatchAd, adLoading, onSubscribe}: ExplorePaywallProps) {
  const colors = useColors();
  const {t} = useTranslation();
  const bgColor = colors['surface/dim'];

  return (
    <View style={styles.container} pointerEvents="box-none">
      <LinearGradient
        colors={[`${bgColor}00`, `${bgColor}99`, bgColor]}
        locations={[0, 0.4, 0.75]}
        style={styles.gradient}
        pointerEvents="none"
      />
      <View style={styles.buttonArea}>
        {SUBSCRIPTION_ENABLED && onSubscribe && (
          <Button
            label={t('explorePaywall.subscribeToViewAll')}
            onPress={onSubscribe}
            variant="filled"
            size="medium"
          />
        )}
        <Button
          label={adLoading ? t('explorePaywall.adLoading') : t('explorePaywall.watchAdToOpen')}
          icon={IconVideoPlay}
          onPress={onWatchAd}
          disabled={adLoading}
          variant={SUBSCRIPTION_ENABLED ? 'soft' : 'filled'}
          size="medium"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  gradient: {
    height: 160,
  },
  buttonArea: {
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
