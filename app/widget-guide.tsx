import React, {useEffect, useState} from 'react';
import {Image, Platform, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {AppBar, APPBAR_CONTENT_BOTTOM} from '@components/Navigation';
import {Button} from '@components/Button';
import {BottomActionBar} from '@components/BottomActionBar';
import {useColors} from '@contexts/ThemeContext';
import {useAddSheet} from '@contexts/AddSheetContext';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {IconClose} from '@components/Icon/IconIndex';
import {goBackOr} from '@utils/navigation';

/** 단계별 그림 — 휴대폰 홈 화면 그림(@3x, 314×667pt) */
const STEP_IMAGES = [
  require('../assets/images/widget-guide/iphone_widget_tutorial_1.png'),
  require('../assets/images/widget-guide/iphone_widget_tutorial_2.png'),
  require('../assets/images/widget-guide/iphone_widget_tutorial_3.png'),
  require('../assets/images/widget-guide/iphone_widget_tutorial_4.png'),
];
/** 그림 표시 크기 — 원본 비율(314:667) 유지 */
const IMAGE_WIDTH = 210;
const IMAGE_HEIGHT = Math.round((IMAGE_WIDTH * 667) / 314);

/**
 * "홈 화면 위젯" 안내 — 4단계를 한 장씩 넘긴다(다음 … → 확인). 4단계는 위젯 편집에서 D-day 고르기.
 * 위젯은 iOS 홈 화면에서 직접 추가하므로 아이폰 그림으로 순서를 보여준다.
 * 안드로이드는 위젯을 지원하지 않아 안내 문구만 보여준다.
 */
export default function WidgetGuideRoute() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const colors = useColors();
  const {t} = useTranslation();
  const [step, setStep] = useState(0);
  const last = step === STEP_IMAGES.length - 1;
  const close = () => goBackOr(router);

  // 하단 버튼(BottomActionBar)이 있는 화면 — 탭바가 그 위를 가리므로 이 화면에선 숨긴다
  const {setHideTabBar, setHideContentMask} = useAddSheet();
  useEffect(() => {
    setHideTabBar(true);
    setHideContentMask(true);
    return () => { setHideTabBar(false); setHideContentMask(false); };
  }, [setHideTabBar, setHideContentMask]);

  return (
    <View style={styles.container}>
      <View style={[styles.body, {paddingTop: APPBAR_CONTENT_BOTTOM + Spacing.xl}]}>
        {Platform.OS === 'android' ? (
          <Text style={styles.headline}>{t('widgetGuide.androidHelper')}</Text>
        ) : (
          <>
            <Text style={styles.headline}>{t(`widgetGuide.headline${step + 1}`)}</Text>
            <Image source={STEP_IMAGES[step]} style={styles.image} resizeMode="contain" />
          </>
        )}
      </View>

      {/* 하단 버튼 — 공통 BottomActionBar + filled medium(높이 48) */}
      <BottomActionBar background={colors['surface/dim'] as string}>
        <Button
          variant="filled"
          size="medium"
          // 마지막(4단계)은 D-day 설정 화면(/ddays)으로 바로 — 이 안내는 닫히고 그 화면이 대신 열린다
          label={Platform.OS === 'android' ? t('widgetGuide.done') : last ? t('widgetGuide.setupDday') : t('widgetGuide.next')}
          onPress={Platform.OS === 'android' ? close : last ? () => router.replace('/ddays' as any) : () => setStep(s => s + 1)}
          style={styles.button}
        />
      </BottomActionBar>

      <AppBar centered title={t('profile.widgetGuide')} leftIcon={IconClose} onLeftPress={close} />
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors['surface/dim'],
    },
    body: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
    },
    // 헤드라인 — headline small bold, 가운데
    headline: {
      ...Typography.headline.small,
      color: colors['foreground/on-surface'],
      textAlign: 'center',
      // 줄이 너무 길어지지 않게 최대 320
      maxWidth: 320,
    },
    image: {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      marginTop: Spacing.xl,
    },
    // 버튼도 카피와 같은 최대 320 — 넓은 화면에서 가운데
    button: {
      flex: 1,
      maxWidth: 320,
    },
  });
