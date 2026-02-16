import React, {useCallback, useMemo, useState} from 'react';
import {Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  GlassContainer,
  IconButton,
  ContentContainer,
  Card,
  FloatingNavBar,
  navPillStyle,
} from '@components/Layout';
import {ListItem} from '@components/ListItem';
import {Avatar} from '@components/Avatar/Avatar';
import {Tabs} from '@components/Tabs';
import {TextInput} from '@components/TextInput';
import {Button} from '@components/Button';
import {Snackbar} from '@components/Snackbar';
import {BottomSheet} from '@components/BottomSheet';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors, useTheme} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {
  IconArrowLeft,
  IconImport,
  IconExport,
  IconChevronRight,
  IconPaletteFilled,
  IconLogout,
  IconSunDimFilled,
  IconCircleHalf,
  IconMoonFilled,
  IconGoogle,
  IconMailFilled,
} from '@components/Icon/IconIndex';

import LogoBakecycle from '../../assets/images/logo_bakecycle.svg';
import LogoText from '../../assets/images/logo_text.svg';
import type {AppearanceMode} from '@contexts/ThemeContext';

export interface ProfileScreenProps {
  recipeCount: number;
  userEmail: string | null;
  userDisplayName: string | null;
  handle: string | null;
  onBack: () => void;
  onExport: () => Promise<void>;
  onImport: (onConfirmOverwrite?: (count: number) => Promise<boolean>) => Promise<boolean>;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onLogout: () => void;
  onUpdateHandle: (newHandle: string) => Promise<void>;
  onTermsPress: () => void;
}

// ---- ProfileScreen ----

export function ProfileScreen({
  recipeCount,
  userEmail,
  handle,
  onBack,
  onExport,
  onImport,
  onLogin,
  onSignUp,
  onGoogleSignIn,
  onLogout,
  onUpdateHandle,
  onTermsPress,
}: ProfileScreenProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {appearanceMode, setAppearanceMode} = useTheme();

  const APPEARANCE_TABS = useMemo(() => [
    {id: 'light' as AppearanceMode, label: '라이트', icon: IconSunDimFilled, activeIconColor: colors['custom-orange']},
    {id: 'auto' as AppearanceMode, label: '자동', icon: IconCircleHalf, activeIconColor: colors['foreground-onsurfacemuted']},
    {id: 'dark' as AppearanceMode, label: '다크', icon: IconMoonFilled, activeIconColor: colors['custom-yellow']},
  ], [colors]);

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showHandleSheet, setShowHandleSheet] = useState(false);
  const [handleInput, setHandleInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const showMessage = useCallback((msg: string) => {
    setSnackbarMessage(msg);
    setShowSnackbar(true);
  }, []);

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
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        showMessage('이메일 또는 비밀번호가 올바르지 않습니다');
      } else if (code === 'auth/email-already-in-use') {
        showMessage('이미 사용 중인 이메일입니다');
      } else if (code === 'auth/weak-password') {
        showMessage('비밀번호가 너무 짧습니다 (6자 이상)');
      } else if (code === 'auth/invalid-email') {
        showMessage('올바른 이메일 형식이 아닙니다');
      } else {
        showMessage(isLoginMode ? '로그인에 실패했습니다' : '회원가입에 실패했습니다');
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
            <Avatar type="random" size="xlarge" shape="circle" seed={42} />
            {userEmail ? (
              <>
                <Pressable onPress={handleOpenHandleEdit}>
                  <Text style={styles.profileName}>@{handle || 'handle'}</Text>
                </Pressable>
                <Text style={styles.profileSub}>레시피 {recipeCount}개</Text>
              </>
            ) : (
              <>
                <Text style={styles.profileName}>@hungry_baker</Text>
                <Button
                  label="로그인하고 동기화 하기"
                  size="small"
                  onPress={() => setShowAuthSheet(true)}
                  style={styles.profileLoginButton}
                />
              </>
            )}
          </ContentContainer>

          {/* 데이터 관리 섹션 */}
          <ContentContainer style={styles.section}>
            <Text style={styles.sectionTitle}>데이터 관리</Text>
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
                showDivider={false}
                onPress={handleImport}
              />
            </Card>
          </ContentContainer>

          {/* 환경설정 섹션 */}
          <ContentContainer style={styles.section}>
            <Text style={styles.sectionTitle}>환경설정</Text>
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
                showDivider={false}
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
            <LogoText width={89} height={20} color={colors['foreground-onsurfacemuted']} />
            <View style={styles.footerTextGroup}>
              <Text style={styles.footerText}>버전 1.0.0</Text>
              <Text style={styles.footerLink} onPress={onTermsPress}>이용약관 및 개인정보 처리방침</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* 로그인 바텀시트 */}
      <BottomSheet
        visible={showAuthSheet}
        onClose={() => { setShowAuthSheet(false); setShowEmailForm(false); }}
        title={showEmailForm ? (isLoginMode ? '이메일로 로그인' : '이메일로 회원가입') : '로그인'}
        headerGraphic={<LogoBakecycle width={48} height={48} />}
      >
        {showEmailForm ? (
          <View style={styles.authForm}>
            <TextInput
              placeholder="이메일"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              placeholder="비밀번호"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <View style={styles.authButtons}>
              <Button
                label={isLoginMode ? '로그인' : '회원가입'}
                onPress={handleAuth}
                disabled={authLoading}
              />
            </View>
            <View style={styles.authToggle}>
              <Button
                label={isLoginMode ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                variant="ghost"
                size="small"
                onPress={() => setIsLoginMode(prev => !prev)}
              />
            </View>
          </View>
        ) : (
          <View style={styles.authForm}>
            <Text style={styles.authDescription}>
              로그인하면 레시피를 여러 기기에서 동기화하고{'\n'}안전하게 보관할 수 있어요.
            </Text>
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
              label="이메일로 하기"
              variant="soft"
              icon={IconMailFilled}
              onPress={() => setShowEmailForm(true)}
            />
            <Text style={styles.termsCaption}>
              계속하면 Bakecycle의{' '}
              <Text
                style={styles.termsLink}
                onPress={onTermsPress}>
                이용약관
              </Text>
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

      {/* 스낵바 */}
      <View style={styles.snackbarWrapper}>
        <Snackbar
          message={snackbarMessage}
          visible={showSnackbar}
          onClose={() => setShowSnackbar(false)}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors['surface-surfacedim'],
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
    color: colors['foreground-onsurface'],
    marginTop: Spacing.md,
  },
  profileHandle: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '400',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground-onsurfacemuted'],
    marginTop: Spacing.xs,
  },
  profileSub: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '400',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground-onsurfacemuted'],
    marginTop: Spacing.xs,
  },
  profileLoginButton: {
    marginTop: Spacing.md,
  },
  section: {
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground-onsurfacemuted'],
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginTop: FONT_BASELINE_OFFSET,
  },
  authForm: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  authButtons: {
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  authToggle: {
    alignItems: 'center' as const,
  },
  authDescription: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '400',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground-onsurfacemuted'],
    marginBottom: Spacing.xs,
  },
  termsCaption: {
    fontFamily: Typography.body.small.fontFamily,
    fontSize: Typography.body.small.fontSize,
    fontWeight: Typography.body.small.fontWeight as '400',
    lineHeight: Typography.body.small.lineHeight,
    color: colors['foreground-onsurfacemuted'],
    textAlign: 'center' as const,
    marginTop: Spacing.sm,
  },
  termsLink: {
    color: colors['foreground-onsurfacevar'],
    textDecorationLine: 'underline' as const,
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
    color: colors['foreground-onsurfacedisabled'],
  },
  footerLink: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '500',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: Typography.label.medium.letterSpacing,
    color: colors['foreground-onsurfacedisabled'],
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
