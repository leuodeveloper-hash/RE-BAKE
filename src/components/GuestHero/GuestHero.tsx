import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button} from '@components/Button';
import {GradientText} from '@components/GradientText';
import {IconLogoSymbol} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {PrimitiveColors, type SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useTranslation} from '@contexts/LanguageContext';

export interface GuestHeroProps {
  /** 로그인 버튼 — 로그인 시트를 연다(성공하면 플랜 선택으로 이어진다) */
  onLogin: () => void;
}

/**
 * 게스트용 랜딩 카드 — 팩 보드 한가운데에 놓여 주위로 공식 레시피 팩이 흩어진다.
 * "일상적 레시피, 베이클" 헤드라인 + 버튼.
 */
export function GuestHero({onLogin}: GuestHeroProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      {/* 맨 위 작은 로고 */}
      <IconLogoSymbol width={28} height={28} color={colors['foreground/on-surface-muted']} style={styles.logo} />
      {/* 한 문장 헤드라인 — "일상적 레시피, 베이클" */}
      {/* 카피 전체는 기본 글자색, 오른쪽 아래에서 소라색이 살짝 원형으로 번진다 */}
      <GradientText
        style={styles.headline}
        colors={[PrimitiveColors['light-blue/90'], colors['foreground/on-surface'] as string]}
        locations={[0, 1]}
        // 살짝만 — 오른쪽 아래 귀퉁이에서 작게
        radial={{center: {x: 0.9, y: 0.85}, radius: 0.4}}>
        {t('guestHero.headline')}
      </GradientText>
      {/* 서브카피 */}
      <Text style={styles.subcopy}>{t('guestHero.subcopy')}</Text>
      <Button label={t('guestHero.login')} onPress={onLogin} size="medium" style={styles.button} />
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  wrap: {
    // 서브카피 한 줄("레시피를 기록하고 다시 만들며 나아져요.")이 꺾이지 않는 폭
    width: 350,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  logo: {
    marginBottom: Spacing.sm,
  },
  headline: {
    // Bold·SemiBold는 큰 크기에서 두꺼워 보였다 — Medium
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    // 한 단계 크게(38 → 44)
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -1,
    color: colors['foreground/on-surface'],
    textAlign: 'center',
  },
  subcopy: {
    ...Typography.body.large,
    // body 스케일은 Medium(500)이라 서브카피는 레귤러로
    fontFamily: 'Pretendard-Regular',
    fontWeight: '400',
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
    // 메인카피와 서브카피 사이 — 8이면 붙어 보였다
    marginTop: Spacing.md,
  },
  button: {
    // 서브카피와 버튼 사이 — 20이면 빡빡했다
    marginTop: Spacing.xl,
    // 카드 폭에 꽉 채우지 않고 내용만큼
  },
});
