import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {BlurView} from 'expo-blur';
import {SafeAreaView} from 'react-native-safe-area-context';
import {FloatingNavBar, navPillStyle} from '@components/Navigation';
import {GlassContainer, ContentContainer, Card, Container} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {SectionHeader} from '@components/SectionHeader';
import {ListItem} from '@components/ListItem';
import {Switch} from '@components/Switch';
import {Avatar} from '@components/Avatar/Avatar';
import {Tabs} from '@components/Tabs';
import {TextInput} from '@components/TextInput';
import {Button} from '@components/Button';
import {Snackbar} from '@components/Snackbar';
import {BottomSheet} from '@components/BottomSheet';
import {useExamNotificationPrefs} from '@hooks/useExamNotificationPrefs';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2, useTheme} from '@contexts/ThemeContext';
import {useSubscription} from '@contexts/SubscriptionContext';
import type {SemanticColorsV2} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {
  IconArrowLeft,
  IconImport,
  IconExport,
  IconChevronRight,
  IconPaletteFilled,
  IconLogout,
  IconBellFilled,
  IconSunDimFilled,
  IconCircleHalf,
  IconMoonFilled,
  IconGoogle,
  IconMailFilled,
  IconCloudFilled,
  IconTicketFilled,
} from '@components/Icon/IconIndex';

import Constants from 'expo-constants';
import LogoBakecycle from '../../assets/images/logo_badge_colored.svg';
import LogoText from '../../assets/images/logo_text.svg';
import type {AppearanceMode} from '@contexts/ThemeContext';

const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

export interface ProfileScreenProps {
  recipeCount: number;
  reviewCount: number;
  userEmail: string | null;
  handle: string | null;
  lastSyncedAt: Date | null;
  lastSyncedDevice: string | null;
  onBack: () => void;
  onExport: () => Promise<void>;
  onImport: (onConfirmOverwrite?: (count: number) => Promise<boolean>) => Promise<boolean>;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onLogout: () => void;
  onUpdateHandle: (newHandle: string) => Promise<void>;
  onTermsPress: () => void;
  onPrivacyPress: () => void;
  /** Labs(디버그) 화면 진입 */
  onLabsPress?: () => void;
  /** 시험 일정 알림 설정 화면 진입 */
  onExamNotifPress?: () => void;
  /** Pro 구독 여부 */
  isPro?: boolean;
  /** 어드민 여부 (디버그 도구 노출) */
  isAdmin?: boolean;
  /** 고정 아바타 시드 (useAvatarSeed에서 가져온 값) */
  avatarSeed?: number | null;
  /** 값이 변할 때마다 플랜 바텀시트를 자동 오픈하는 신호 (둘러보기 다운로드 차단 등에서 사용) */
  openPlanSheetSignal?: number;
}

// ---- PlanGradientBg ----

function PlanGradientBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Yellow-10 base wash */}
      <LinearGradient
        colors={['transparent', '#FDF5EA']}
        start={{x: 0, y: 0}}
        end={{x: 0.5, y: 1}}
        style={StyleSheet.absoluteFill}
      />
      {/* Light blue from bottom-right */}
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

// ---- PlanFeature ----

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

// ---- ProfileScreen ----

function formatSyncTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export function ProfileScreen({
  recipeCount,
  reviewCount,
  userEmail,
  handle,
  lastSyncedAt,
  lastSyncedDevice,
  onBack,
  onExport,
  onImport,
  onLogin,
  onSignUp,
  onGoogleSignIn,
  onLogout,
  onUpdateHandle,
  onTermsPress,
  onPrivacyPress,
  onLabsPress,
  onExamNotifPress,
  isPro = false,
  isAdmin = false,
  avatarSeed,
  openPlanSheetSignal = 0,
}: ProfileScreenProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const {appearanceMode, setAppearanceMode} = useTheme();
  const {prefs: examPrefs, reload: reloadExamPrefs} = useExamNotificationPrefs();

  // 알림 설정 화면에서 돌아오면 요약 표시 갱신
  useFocusEffect(
    useCallback(() => {
      reloadExamPrefs();
    }, [reloadExamPrefs]),
  );

  const syncLabel = lastSyncedAt
    ? (lastSyncedDevice
        ? `${lastSyncedDevice}, ${formatSyncTime(lastSyncedAt)}`
        : formatSyncTime(lastSyncedAt))
    : null;

  const APPEARANCE_TABS = useMemo(() => [
    {id: 'light' as AppearanceMode, label: '라이트', icon: IconSunDimFilled, activeIconColor: colors['custom/orange']},
    {id: 'auto' as AppearanceMode, label: '자동', icon: IconCircleHalf, activeIconColor: colors['foreground/on-surface-muted']},
    {id: 'dark' as AppearanceMode, label: '다크', icon: IconMoonFilled, activeIconColor: colors['custom/yellow']},
  ], [colors]);

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarAction, setSnackbarAction] = useState<{label: string; onPress: () => void} | undefined>(undefined);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showHandleSheet, setShowHandleSheet] = useState(false);
  const [handleInput, setHandleInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showPlanSheet, setShowPlanSheet] = useState(false);
  const {photoCloudBackup, setPhotoCloudBackup} = useSubscription();

  useEffect(() => {
    if (openPlanSheetSignal > 0) setShowPlanSheet(true);
  }, [openPlanSheetSignal]);

  const showMessage = useCallback((msg: string, action?: {label: string; onPress: () => void}) => {
    setSnackbarMessage(msg);
    setSnackbarAction(action);
    setShowSnackbar(true);
  }, []);

  const handleTestPush = useCallback(async () => {
    if (Platform.OS === 'web') {
      showMessage('웹에서는 푸시 테스트가 지원되지 않아요');
      return;
    }
    try {
      const Notifications = require('expo-notifications');
      const settings = await Notifications.getPermissionsAsync();
      if (settings.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') {
          showMessage('알림 권한이 필요해요');
          return;
        }
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 푸시 테스트',
          body: '3초 후 알림이에요. 플로팅 배너로 보이는지 확인하세요.',
          data: {kind: 'debug_test'},
        },
        trigger: {seconds: 3},
      });
      showMessage('3초 후 알림이 도착합니다');
    } catch (err) {
      console.error('push test failed', err);
      showMessage('푸시 테스트 실패');
    }
  }, [showMessage]);

  const handleTestRegistrationBanner = useCallback(async () => {
    if (Platform.OS === 'web') {
      showMessage('웹에서는 푸시 테스트가 지원되지 않아요');
      return;
    }
    try {
      const Notifications = require('expo-notifications');
      const settings = await Notifications.getPermissionsAsync();
      if (settings.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') {
          showMessage('알림 권한이 필요해요');
          return;
        }
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '제빵기능사 접수 15분 전 (2026년 1회)',
          body: '접수 시작이 임박했어요. 미리 큐넷에 로그인해 두세요.',
          data: {kind: 'debug_test', subkind: 'registration_15min'},
        },
        trigger: {seconds: 5},
      });
      showMessage('5초 후 “15분 전” 배너가 도착합니다');
    } catch (err) {
      console.error('reg banner test failed', err);
      showMessage('배너 테스트 실패');
    }
  }, [showMessage]);

  const handleListScheduled = useCallback(async () => {
    if (Platform.OS === 'web') {
      showMessage('웹에서는 지원되지 않아요');
      return;
    }
    try {
      const Notifications = require('expo-notifications');
      const list = await Notifications.getAllScheduledNotificationsAsync();
      console.log('[ProfileScreen] scheduled notifications:', JSON.stringify(list, null, 2));
      showMessage(`예약된 알림 ${list.length}개 (콘솔 확인)`);
    } catch (err) {
      console.error('list scheduled failed', err);
      showMessage('목록 조회 실패');
    }
  }, [showMessage]);

  const handleOpenHandleEdit = useCallback(() => {
    setHandleInput(handle?.replace(/^@/, '') ?? '');
    setShowHandleSheet(true);
  }, [handle]);

  const handleSaveHandle = useCallback(async () => {
    const cleaned = handleInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleaned) {
      showMessage('핸들을 입력해주세요');
      return;
    }
    try {
      await onUpdateHandle(cleaned);
      setShowHandleSheet(false);
      showMessage('핸들이 변경되었습니다');
    } catch {
      showMessage('핸들 변경에 실패했습니다');
    }
  }, [handleInput, onUpdateHandle, showMessage]);

  const handleAuth = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      showMessage('이메일과 비밀번호를 입력해주세요');
      return;
    }
    setAuthLoading(true);
    try {
      if (isLoginMode) {
        await onLogin(email.trim(), password);
      } else {
        await onSignUp(email.trim(), password);
      }
      setEmail('');
      setPassword('');
      setShowAuthSheet(false);
      showMessage(isLoginMode ? '로그인 성공' : '회원가입 성공');
    } catch (err: any) {
      const code = err?.code;
      console.error('[handleAuth]', isLoginMode ? 'signIn' : 'signUp', 'failed', {code, message: err?.message, err});
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        showMessage('이메일 또는 비밀번호가 올바르지 않습니다');
      } else if (code === 'auth/email-already-in-use') {
        showMessage('이미 사용 중인 이메일입니다');
      } else if (code === 'auth/weak-password') {
        showMessage('비밀번호가 너무 짧습니다 (6자 이상)');
      } else if (code === 'auth/invalid-email') {
        showMessage('올바른 이메일 형식이 아닙니다');
      } else if (err?.message?.includes('가입 한도')) {
        showMessage(err.message);
      } else {
        showMessage((isLoginMode ? '로그인에 실패했습니다: ' : '회원가입에 실패했습니다: ') + (err?.message ?? code ?? '알 수 없는 오류'));
      }
    } finally {
      setAuthLoading(false);
    }
  }, [email, password, isLoginMode, onLogin, onSignUp, showMessage]);

  const handleExport = useCallback(async () => {
    try {
      await onExport();
      showMessage('데이터를 내보냈습니다');
    } catch {
      showMessage('내보내기에 실패했습니다');
    }
  }, [onExport, showMessage]);

  const handleImport = useCallback(async () => {
    const confirmOverwrite = (count: number): Promise<boolean> => {
      const msg = `겹치는 레시피 ${count}개가 있습니다. 덮어쓸까요?`;
      if (Platform.OS === 'web') {
        return Promise.resolve(window.confirm(msg));
      }
      return new Promise(res => {
        Alert.alert('가져오기', msg, [
          {text: '건너뛰기', style: 'cancel', onPress: () => res(false)},
          {text: '덮어쓰기', style: 'destructive', onPress: () => res(true)},
        ]);
      });
    };
    const success = await onImport(confirmOverwrite);
    if (success) {
      showMessage('데이터를 가져왔습니다');
    } else {
      showMessage('가져오기에 실패했습니다');
    }
  }, [onImport, showMessage]);

  return (
    <View style={styles.container}>
      {/* 상단 네비게이션 */}
      <FloatingNavBar
        left={
          <GlassContainer contentStyle={navPillStyle}>
            <IconButton
              icon={IconArrowLeft}
              variant="ghost-secondary"
              size="medium"
              onPress={onBack}
            />
          </GlassContainer>
        }
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* 프로필 섹션 */}
          <ContentContainer style={styles.profileSection}>
            <Avatar type="random" size="xlarge" shape="circle" seed={avatarSeed ?? 0} />
            {userEmail ? (
              <>
                <Pressable onPress={handleOpenHandleEdit}>
                  <Text style={styles.profileName}>@{handle || 'handle'}</Text>
                </Pressable>
                <Text style={styles.profileSub}>레시피 {recipeCount}개 · 회고 노트 {reviewCount}개</Text>
              </>
            ) : (
              <>
                <Text style={styles.profileName}>@guest</Text>
                <Button
                  label="로그인 또는 계정 만들기"
                  size="small"
                  onPress={() => setShowAuthSheet(true)}
                  style={styles.profileLoginButton}
                />
              </>
            )}
          </ContentContainer>

          {/* 데이터 관리 섹션 */}
          <ContentContainer style={styles.section}>
            <SectionHeader title="데이터 관리" />
            <Card>
              <ListItem
                title="내보내기"
                leading={{type: 'icon', icon: IconExport}}
                trailing={{type: 'icon', icon: IconChevronRight}}
                disabled={recipeCount === 0}
                onPress={handleExport}
              />
              <ListItem
                title="가져오기"
                leading={{type: 'icon', icon: IconImport}}
                trailing={{type: 'icon', icon: IconChevronRight}}
                showDivider={!!(userEmail && lastSyncedAt)}
                onPress={handleImport}
              />
              {userEmail && lastSyncedAt && (
                <ListItem
                  title="마지막 동기화"
                  leading={{type: 'icon', icon: IconCloudFilled}}
                  trailing={{type: 'custom', element: (
                    <Text style={styles.syncTime}>{syncLabel}</Text>
                  )}}
                  showDivider={false}
                />
              )}
            </Card>
          </ContentContainer>

          {/* 플랜 섹션 (로그인 시만) */}
          {userEmail && (
            <ContentContainer style={styles.section}>
              <SectionHeader title="플랜" />
              <Card>
                <ListItem
                  title={isPro ? '프로 플랜' : '무료 플랜'}
                  leading={{type: 'icon', icon: IconTicketFilled}}
                  trailing={{type: 'icon', icon: IconChevronRight}}
                  showDivider={false}
                  onPress={() => setShowPlanSheet(true)}
                />
              </Card>
            </ContentContainer>
          )}

          {/* 환경설정 섹션 */}
          <ContentContainer style={styles.section}>
            <SectionHeader title="환경설정" />
            <Card>
              <ListItem
                title="외관"
                leading={{type: 'icon', icon: IconPaletteFilled}}
                trailing={{
                  type: 'custom',
                  element: (
                    <Tabs
                      tabs={APPEARANCE_TABS}
                      selectedId={appearanceMode}
                      onSelect={id => setAppearanceMode(id as AppearanceMode)}
                    />
                  ),
                }}
                showDivider
              />
              <ListItem
                title={photoCloudBackup ? '사진 클라우드 백업 (켜짐)' : '사진 클라우드 백업 (이 기기에만)'}
                leading={{type: 'icon', icon: IconCloudFilled}}
                trailing={{
                  type: 'custom',
                  element: (
                    <Switch
                      value={photoCloudBackup}
                      onValueChange={v => {
                        // 켜기(업로드)는 구독 필요 → 비프로면 PlanSheet, 끄기(로컬)는 자유
                        if (v && !isPro) {
                          setShowPlanSheet(true);
                          return;
                        }
                        setPhotoCloudBackup(v);
                      }}
                    />
                  ),
                }}
                showDivider={false}
              />
            </Card>
          </ContentContainer>

          {/* 시험 알림 섹션 */}
          <ContentContainer style={styles.section}>
            <SectionHeader title="알림" />
            <Card>
              <ListItem
                title="시험 일정 알림"
                leading={{type: 'icon', icon: IconBellFilled}}
                trailing={{
                  type: 'custom',
                  element: (
                    <View style={styles.examNotifTrailing}>
                      <Text style={styles.examNotifStatus}>
                        {examPrefs.enabled && examPrefs.targets.length > 0
                          ? `${examPrefs.targets.length}개 켜짐`
                          : '꺼짐'}
                      </Text>
                      <IconChevronRight
                        width={20}
                        height={20}
                        color={colors['foreground/on-surface-muted']}
                      />
                    </View>
                  ),
                }}
                showDivider={false}
                onPress={() => {
                  if (!userEmail) {
                    showMessage('계정이 있으면 알림 설정이 가능해요', {
                      label: '로그인',
                      onPress: () => {
                        setShowSnackbar(false);
                        setShowAuthSheet(true);
                      },
                    });
                    return;
                  }
                  onExamNotifPress?.();
                }}
              />
            </Card>
          </ContentContainer>

          {/* 로그아웃 (로그인 시만) */}
          {userEmail && (
            <ContentContainer style={styles.section}>
              <Card>
                <ListItem
                  title="로그아웃"
                  leading={{type: 'icon', icon: IconLogout}}
                  showDivider={false}
                  onPress={onLogout}
                />
              </Card>
            </ContentContainer>
          )}

          {/* 푸터 */}
          <View style={styles.footer}>
            <LogoText width={89} height={20} color={colors['foreground/on-surface-muted']} />
            <View style={styles.footerTextGroup}>
              <Text style={styles.footerText}>버전 {APP_VERSION}</Text>
              <View style={styles.footerLinks}>
                <Text style={styles.footerLink} onPress={onTermsPress}>이용약관</Text>
                <Text style={styles.footerDot}>·</Text>
                <Text style={styles.footerLink} onPress={onPrivacyPress}>개인정보 처리방침</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* 로그인 바텀시트 */}
      <BottomSheet
        visible={showAuthSheet}
        onClose={() => { setShowAuthSheet(false); setShowEmailForm(false); }}
        title={showEmailForm ? (isLoginMode ? '이메일로 로그인' : '이메일로 회원가입') : '로그인'}
        description={showEmailForm ? undefined : '로그인하면 레시피를 여러 기기에서 동기화하고\n안전하게 보관할 수 있어요.'}
        headerGraphic={<LogoBakecycle width={48} height={48} />}
        maxWidth={380}
      >
        {showEmailForm ? (
          <View style={styles.authForm}>
            <Container material="subtle" style={styles.authFieldGroup}>
              <View style={styles.authFieldRow}>
                <TextInput
                  style="ghost"
                  placeholder="이메일"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.authFieldDivider} />
              <View style={styles.authFieldRow}>
                <TextInput
                  style="ghost"
                  placeholder="비밀번호"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </Container>
            <View style={styles.authButtons}>
              <Button
                label={isLoginMode ? '로그인' : '회원가입'}
                onPress={handleAuth}
                disabled={authLoading}
              />
            </View>
            <Text style={styles.termsCaption}>
              {isLoginMode ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
              <Text style={styles.termsLink} onPress={() => setIsLoginMode(prev => !prev)}>
                {isLoginMode ? '회원가입' : '로그인'}
              </Text>
            </Text>
          </View>
        ) : (
          <View style={styles.authForm}>
            <View style={styles.authLoginButtons}>
              <Button
                label="Google로 계속하기"
                variant="soft"
                icon={IconGoogle}
                onPress={async () => {
                  try {
                    await onGoogleSignIn();
                    setShowAuthSheet(false);
                    showMessage('로그인 성공');
                  } catch (err: any) {
                    console.error('Google sign-in error:', err);
                    if (err?.code !== 'auth/popup-closed-by-user') {
                      showMessage('Google 로그인에 실패했습니다');
                    }
                  }
                }}
              />
              <Button
                label="이메일로 계속하기"
                variant="soft"
                icon={IconMailFilled}
                onPress={() => setShowEmailForm(true)}
              />
            </View>
            <Text style={styles.termsCaption}>
              계속하면 Bakecycle의{' '}
              <Text style={styles.termsLink} onPress={onTermsPress}>이용약관</Text>
              {' '}및{' '}
              <Text style={styles.termsLink} onPress={onPrivacyPress}>개인정보 처리방침</Text>
              에 동의하는 것으로 간주합니다.
            </Text>
          </View>
        )}
      </BottomSheet>

      {/* 핸들 수정 바텀시트 */}
      <BottomSheet
        visible={showHandleSheet}
        onClose={() => setShowHandleSheet(false)}
        title="핸들 수정"
      >
        <View style={styles.authForm}>
          <TextInput
            placeholder="handle"
            value={handleInput}
            onChangeText={setHandleInput}
            autoCapitalize="none"
          />
          <Button
            label="저장"
            onPress={handleSaveHandle}
          />
        </View>
      </BottomSheet>

      {/* 플랜 바텀시트 */}
      <BottomSheet
        visible={showPlanSheet}
        onClose={() => setShowPlanSheet(false)}
        maxWidth={380}
        backgroundElement={
          <PlanGradientBg />
        }
      >
        <View style={styles.planSheetContent}>
          <View style={styles.planHeader}>
            <Text style={styles.planHeadline}>
              {'레시피에만\n집중할 수 있게'}
            </Text>
          </View>

          {/* 프로 플랜 */}
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
                <Button label="구독하기" disabled />
              )}
              <View style={styles.planFeatureList}>
                <PlanFeature text="내 레시피 클라우드 동기화" styles={styles} dotColor={colors['custom/light-blue']} />
                <PlanFeature text="모든 둘러보기 레시피 무제한 열람" styles={styles} dotColor={colors['custom/light-blue']} />
                <PlanFeature text="광고 없는 쾌적한 사용" styles={styles} dotColor={colors['custom/light-blue']} />
              </View>
            </View>
          </BlurView>

          {/* 무료 플랜 */}
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
      </BottomSheet>

      {/* 스낵바 */}
      <View style={styles.snackbarWrapper}>
        <Snackbar
          message={snackbarMessage}
          visible={showSnackbar}
          onClose={() => setShowSnackbar(false)}
          action={snackbarAction}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors['surface/dim'],
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 120,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  profileName: {
    fontFamily: Typography.title.large.fontFamily,
    fontSize: Typography.title.large.fontSize,
    fontWeight: Typography.title.large.fontWeight as '700',
    lineHeight: Typography.title.large.lineHeight,
    color: colors['foreground/on-surface'],
    marginTop: Spacing.md,
  },
  profileSub: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '400',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
    marginTop: Spacing.xs,
  },
  profileLoginButton: {
    marginTop: Spacing.md,
  },
  section: {
    paddingTop: Spacing.md,
  },
  examNotifTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  examNotifStatus: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
  authForm: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  authLoginButtons: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  authButtons: {
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  authToggle: {
    alignItems: 'center' as const,
  },
  authFieldGroup: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  authFieldRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: 48,
  },
  authFieldDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors['border/muted'],
  },
  termsCaption: {
    fontFamily: Typography.body.small.fontFamily,
    fontSize: Typography.body.small.fontSize,
    fontWeight: Typography.body.small.fontWeight as '400',
    lineHeight: Typography.body.small.lineHeight,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center' as const,
    marginTop: Spacing.sm,
  },
  termsLink: {
    color: colors['foreground/on-surface-var'],
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  footerTextGroup: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '500',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: Typography.label.medium.letterSpacing,
    color: colors['foreground/on-surface-disabled'],
  },
  footerLinks: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.xs,
  },
  footerLink: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '500',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: Typography.label.medium.letterSpacing,
    color: colors['foreground/on-surface-disabled'],
  },
  footerDot: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    color: colors['foreground/on-surface-disabled'],
  },
  syncTime: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '400',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
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
  snackbarWrapper: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
});
