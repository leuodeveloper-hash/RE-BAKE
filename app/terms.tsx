import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {FloatingNavBar, navPillStyle} from '@components/Navigation';
import {ContentContainer, GlassContainer} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {IconArrowLeft} from '@components/Icon/IconIndex';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

export default function TermsScreen() {
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
            <Text style={styles.title}>이용약관</Text>
            <Text style={styles.updated}>최종 수정일: 2026년 2월 15일</Text>

            <Text style={styles.sectionTitle}>1. 서비스 개요</Text>
            <Text style={styles.body}>
              Bakecycle(이하 "서비스")은 베이킹 레시피를 기록, 관리, 공유할 수 있는
              모바일 및 웹 애플리케이션입니다. 본 약관은 서비스 이용에 관한 기본적인
              사항을 규정합니다.
            </Text>

            <Text style={styles.sectionTitle}>2. 계정 및 인증</Text>
            <Text style={styles.body}>
              서비스는 로그인 없이도 로컬 모드로 이용할 수 있습니다. 계정을 생성하면
              여러 기기 간 데이터 동기화가 가능합니다. 사용자는 정확한 정보를 제공해야
              하며, 계정 보안에 대한 책임은 본인에게 있습니다.
            </Text>

            <Text style={styles.sectionTitle}>3. 사용자 콘텐츠</Text>
            <Text style={styles.body}>
              사용자가 서비스에 업로드하거나 저장하는 레시피, 이미지, 텍스트 등 모든
              콘텐츠(이하 "사용자 콘텐츠")에 대한 소유권은 사용자 본인에게 있습니다.
              서비스는 사용자 콘텐츠를 서비스 제공 목적으로만 저장 및 처리합니다.
            </Text>

            <Text style={styles.sectionTitle}>4. 금지 행위</Text>
            <Text style={styles.body}>
              다음 행위는 금지됩니다:{'\n'}
              {'\n'}• 서비스를 악용하여 다른 사용자에게 피해를 주는 행위
              {'\n'}• 불법적인 콘텐츠를 업로드하거나 공유하는 행위
              {'\n'}• 서비스의 정상적인 운영을 방해하는 행위
              {'\n'}• 다른 사용자의 계정에 무단으로 접근하는 행위
            </Text>

            <Text style={styles.sectionTitle}>5. 구독 및 결제</Text>
            <Text style={styles.body}>
              서비스는 무료로 이용할 수 있으며, 추가 기능을 위한 유료 구독을
              제공합니다.{'\n'}
              {'\n'}• 구독은 Apple App Store를 통해 결제되며, 자동 갱신됩니다.
              {'\n'}• 무료체험 기간이 종료되면 자동으로 구독이 시작됩니다.
              {'\n'}• 구독 해지는 App Store 설정에서 현재 결제 주기 종료 24시간 전까지 가능합니다.
              {'\n'}• 구독 해지 후에도 결제 주기가 끝날 때까지 유료 기능을 이용할 수 있습니다.
              {'\n'}• 환불은 Apple의 환불 정책에 따릅니다.
            </Text>

            <Text style={styles.sectionTitle}>6. 데이터 및 개인정보</Text>
            <Text style={styles.body}>
              서비스는 Firebase를 통해 사용자 데이터를 안전하게 저장합니다.
              수집되는 정보는 이메일 주소, 레시피 데이터, 프로필 정보에 한정됩니다.
              사용자는 언제든지 자신의 데이터를 내보내거나 삭제할 수 있습니다.
              자세한 내용은 개인정보 처리방침을 참고해 주세요.
            </Text>

            <Text style={styles.sectionTitle}>7. 서비스 변경 및 중단</Text>
            <Text style={styles.body}>
              서비스는 사전 고지 후 기능을 변경하거나 중단할 수 있습니다.
              중요한 변경사항은 서비스 내 공지 또는 등록된 이메일을 통해
              안내됩니다.
            </Text>

            <Text style={styles.sectionTitle}>8. 면책 조항</Text>
            <Text style={styles.body}>
              서비스는 사용자 콘텐츠의 정확성을 보증하지 않으며, 레시피 사용으로
              발생하는 결과에 대해 책임을 지지 않습니다. 서비스는 "있는 그대로"
              제공되며, 데이터 손실에 대해 최선의 노력을 다하나 완전한 보장은
              어렵습니다.
            </Text>

            <Text style={styles.sectionTitle}>9. 약관 변경</Text>
            <Text style={styles.body}>
              본 약관은 필요에 따라 변경될 수 있으며, 변경 시 서비스 내에서
              공지합니다. 변경된 약관에 동의하지 않는 경우 서비스 이용을
              중단할 수 있습니다.
            </Text>

            <Text style={styles.sectionTitle}>10. 문의</Text>
            <Text style={styles.body}>
              서비스 이용에 관한 문의사항은 앱 내 프로필 설정 또는 이메일을 통해
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
