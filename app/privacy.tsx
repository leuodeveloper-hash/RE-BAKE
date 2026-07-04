import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {FloatingNavBar, navPillStyle} from '@components/Navigation';
import {ContentContainer, GlassContainer} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {IconArrowLeft} from '@components/Icon/IconIndex';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import type {SemanticColorsV2} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

export default function PrivacyScreen() {
  const styles = useThemedStylesV2(createStyles);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={{height: 80}} />

          <ContentContainer>
            <Text style={styles.title}>개인정보 처리방침</Text>
            <Text style={styles.updated}>최종 수정일: 2026년 2월 26일</Text>

            <Text style={styles.sectionTitle}>1. 수집하는 개인정보</Text>
            <Text style={styles.body}>
              Bakecycle(이하 "서비스")은 다음과 같은 개인정보를 수집합니다.{'\n'}
              {'\n'}• 이메일 주소 (회원가입 및 로그인 시)
              {'\n'}• Google 계정 정보 (Google 로그인 시, 이름 및 이메일)
              {'\n'}• 사용자가 작성한 레시피 데이터 (텍스트, 이미지)
              {'\n'}• 프로필 정보 (핸들, 아바타)
              {'\n'}• 구독 및 결제 상태 정보
            </Text>

            <Text style={styles.sectionTitle}>2. 개인정보의 수집 및 이용 목적</Text>
            <Text style={styles.body}>
              수집된 개인정보는 다음의 목적으로 이용됩니다.{'\n'}
              {'\n'}• 회원 식별 및 서비스 이용 인증
              {'\n'}• 여러 기기 간 레시피 데이터 동기화
              {'\n'}• 구독 상태 확인 및 유료 기능 제공
              {'\n'}• 서비스 개선 및 오류 대응
            </Text>

            <Text style={styles.sectionTitle}>3. 개인정보의 보관 및 파기</Text>
            <Text style={styles.body}>
              사용자의 개인정보는 서비스 이용 기간 동안 보관되며, 계정 삭제 요청 시
              지체 없이 파기합니다. 로컬에만 저장된 데이터는 서버에 수집되지 않습니다.
            </Text>

            <Text style={styles.sectionTitle}>4. 개인정보의 제3자 제공</Text>
            <Text style={styles.body}>
              서비스는 사용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
              단, 다음의 서비스 제공자를 통해 데이터가 처리됩니다.{'\n'}
              {'\n'}• Firebase (Google) — 인증, 데이터 저장, 이미지 호스팅
              {'\n'}• RevenueCat — 구독 결제 관리
              {'\n'}• Google AdMob — 광고 표시 (무료 사용자)
            </Text>

            <Text style={styles.sectionTitle}>5. 사용자의 권리</Text>
            <Text style={styles.body}>
              사용자는 언제든지 다음의 권리를 행사할 수 있습니다.{'\n'}
              {'\n'}• 자신의 레시피 데이터 내보내기 (JSON 형식)
              {'\n'}• 계정 및 데이터 삭제 요청
              {'\n'}• 개인정보 수정 (핸들, 프로필)
            </Text>

            <Text style={styles.sectionTitle}>6. 데이터 보안</Text>
            <Text style={styles.body}>
              서비스는 Firebase의 보안 규칙과 HTTPS 암호화 통신을 통해 사용자
              데이터를 보호합니다. 그러나 인터넷 환경의 특성상 완전한 보안을
              보장하기는 어렵습니다.
            </Text>

            <Text style={styles.sectionTitle}>7. 쿠키 및 추적</Text>
            <Text style={styles.body}>
              서비스는 별도의 쿠키를 사용하지 않습니다. 광고 서비스(AdMob)에서
              자체적인 추적 기술을 사용할 수 있으며, 이는 해당 서비스의
              개인정보 처리방침을 따릅니다.
            </Text>

            <Text style={styles.sectionTitle}>8. 방침 변경</Text>
            <Text style={styles.body}>
              본 방침은 필요에 따라 변경될 수 있으며, 변경 시 서비스 내에서
              공지합니다.
            </Text>

            <Text style={styles.sectionTitle}>9. 문의</Text>
            <Text style={styles.body}>
              개인정보 처리에 관한 문의사항은 앱 내 프로필 설정 또는 이메일을 통해
              연락해 주세요.
            </Text>
          </ContentContainer>

          <View style={{height: 80}} />
        </ScrollView>
      </SafeAreaView>

      <FloatingNavBar
        left={
          <GlassContainer contentStyle={navPillStyle}>
            <IconButton
              icon={IconArrowLeft}
              onPress={() => router.back()}
              variant="ghost-secondary"
              size="medium"
            />
          </GlassContainer>
        }
      />
    </View>
  );
}

const createStyles = (colors: SemanticColorsV2) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors['surface/normal'],
    },
    safeArea: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    title: {
      fontFamily: Typography.headline.small.fontFamily,
      fontSize: Typography.headline.small.fontSize,
      fontWeight: Typography.headline.small.fontWeight as '600',
      lineHeight: Typography.headline.small.lineHeight,
      color: colors['foreground/on-surface'],
      marginTop: FONT_BASELINE_OFFSET,
      marginBottom: Spacing.sm,
    },
    updated: {
      fontFamily: Typography.body.small.fontFamily,
      fontSize: Typography.body.small.fontSize,
      fontWeight: Typography.body.small.fontWeight as '400',
      lineHeight: Typography.body.small.lineHeight,
      color: colors['foreground/on-surface-muted'],
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      fontFamily: Typography.title.medium.fontFamily,
      fontSize: Typography.title.medium.fontSize,
      fontWeight: Typography.title.medium.fontWeight as '700',
      lineHeight: Typography.title.medium.lineHeight,
      color: colors['foreground/on-surface'],
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
      marginStart: FONT_BASELINE_OFFSET,
    },
    body: {
      fontFamily: Typography.body.medium.fontFamily,
      fontSize: Typography.body.medium.fontSize,
      fontWeight: Typography.body.medium.fontWeight as '400',
      lineHeight: Typography.body.medium.lineHeight,
      color: colors['foreground/on-surface-var'],
    },
  });
