import React, {useCallback, useEffect, useState} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import {Image} from 'expo-image';
import {useRouter} from 'expo-router';
import {BottomSheet} from '@components/BottomSheet';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {InputGroup} from '@components/InputGroup';
import {IconGoogle, IconMailFilled} from '@components/Icon/IconIndex';
import {useAuth} from '@contexts/AuthContext';
import {useTheme} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
const APP_LOGO = require('../../../assets/images/avatars/bakey-avatar.png');

export interface AuthSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 로그인 성공 시 호출 */
  onSuccess?: () => void;
}

export function AuthSheet({visible, onClose, onSuccess}: AuthSheetProps) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const {t} = useTranslation();
  const {signIn, signUp, signInWithGoogle, signInWithApple} = useAuth();
  const {isDark} = useTheme();
  // Apple로 로그인 — 이 기기에서 쓸 수 있을 때만(iOS). 웹·안드로이드는 숨긴다
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);
  const {showSnackbar} = useSnackbar();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const reset = useCallback(() => {
    setShowEmailForm(false);
    setIsLoginMode(true);
    setEmail('');
    setPassword('');
    setAuthLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSuccess = useCallback(() => {
    reset();
    onClose();
    onSuccess?.();
  }, [reset, onClose, onSuccess]);

  const handleAuth = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      showSnackbar(t('auth.enterEmailPassword'), {tone: 'error'});
      return;
    }
    setAuthLoading(true);
    try {
      if (isLoginMode) {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
      showSnackbar(isLoginMode ? t('auth.loginSuccess') : t('auth.signupSuccess'), {tone: 'positive'});
      handleSuccess();
    } catch (err: any) {
      const code = err?.code;
      console.error('[AuthSheet] auth failed', {mode: isLoginMode ? 'signIn' : 'signUp', code, message: err?.message, err});
      const base = isLoginMode ? t('auth.loginFailed') : t('auth.signupFailed');
      // 원인 파악을 위해 코드/메시지를 함께 노출 (임시 진단)
      showSnackbar(`${base}${code ? ` (${code})` : err?.message ? ` (${err.message})` : ''}`);
    } finally {
      setAuthLoading(false);
    }
  }, [email, password, isLoginMode, signIn, signUp, showSnackbar, handleSuccess, t]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      // 이메일 폼 — 공통 시트 헤더(라벨 가운데, 좌 뒤로가기). 앱바는 떠 있는 오버레이라 필드를 덮었다
      title={showEmailForm ? (isLoginMode ? t('auth.emailLoginTitle') : t('auth.emailSignupTitle')) : t('auth.loginTitle')}
      headerType={showEmailForm ? 'center' : 'default'}
      onBack={showEmailForm ? () => setShowEmailForm(false) : undefined}
      description={showEmailForm ? undefined : t('auth.loginDescription')}
      headerGraphic={showEmailForm ? undefined : <Image source={APP_LOGO} style={styles.appLogo} contentFit="cover" />}
      maxWidth={380}>
      {showEmailForm ? (
        <View>
          <View style={styles.authForm}>
          <InputGroup>
            <TextInput
              style="ghost"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style="ghost"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </InputGroup>
          <View style={styles.authButtons}>
            <Button
              label={isLoginMode ? t('auth.loginButton') : t('auth.signupButton')}
              onPress={handleAuth}
              disabled={authLoading}
            />
          </View>
          <Text style={styles.termsCaption} onPress={() => setIsLoginMode(prev => !prev)}>
            {isLoginMode ? t('auth.toggleToSignupPrefix') : t('auth.toggleToLoginPrefix')}
            <Text style={styles.termsLink}>{isLoginMode ? t('auth.signupButton') : t('auth.loginButton')}</Text>
          </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.authForm, styles.authFormNoTopPad]}>
          <View style={styles.authLoginButtons}>
            {appleAvailable && (
              // Apple 로그인은 Apple 공식 버튼으로(심사 가이드) — 다른 버튼과 같은 높이·알약 모양
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={isDark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={24}
                style={styles.appleButton}
                onPress={async () => {
                  try {
                    await signInWithApple();
                    showSnackbar(t('auth.loginSuccess'), {tone: 'positive'});
                    handleSuccess();
                  } catch (err: any) {
                    if (err?.code !== 'ERR_REQUEST_CANCELED') {
                      showSnackbar(t('auth.appleLoginFailed'), {tone: 'error'});
                    }
                  }
                }}
              />
            )}
            <Button
              label={t('auth.continueWithGoogle')}
              variant="soft"
              icon={IconGoogle}
              onPress={async () => {
                try {
                  await signInWithGoogle();
                  showSnackbar(t('auth.loginSuccess'), {tone: 'positive'});
                  handleSuccess();
                } catch (err: any) {
                  if (err?.code !== 'auth/popup-closed-by-user') {
                    showSnackbar(t('auth.googleLoginFailed'), {tone: 'error'});
                  }
                }
              }}
            />
            <Button
              label={t('auth.continueWithEmail')}
              variant="soft"
              icon={IconMailFilled}
              onPress={() => setShowEmailForm(true)}
            />
          </View>
          <Text style={styles.termsCaption}>
            {t('auth.termsPrefix')}
            <Text style={styles.termsLink} onPress={() => router.push('/terms')}>{t('auth.termsOfService')}</Text>
            {t('auth.termsConjunction')}
            <Text style={styles.termsLink} onPress={() => router.push('/privacy')}>{t('auth.privacyPolicy')}</Text>
            {t('auth.termsSuffix')}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    appLogo: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    authForm: {
      paddingTop: Spacing.md,
      // BottomSheet content가 paddingHorizontal xs(4)를 이미 주므로 여기선 16 → 합쳐서 20
      // (SheetHeader 제목의 좌우 패딩 lg=20과 정확히 일치)
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.lg,
      gap: Spacing.md,
    },
    authButtons: {
      gap: Spacing.sm,
    },
    appleButton: {
      width: '100%',
      height: 48,
    },
    authLoginButtons: {
      gap: Spacing.sm,
    },
    // 초기 로그인 화면: 설명과 버튼 사이 여백을 4로 축소(기본 md는 넓음). 이메일 폼은 유지.
    authFormNoTopPad: {
      paddingTop: Spacing.xs,
    },
    termsCaption: {
      ...Typography.body.small,
      fontSize: 12,
      lineHeight: 17,
      color: colors['foreground/on-surface-muted'],
      textAlign: 'center',
    },
    termsLink: {
      color: colors['foreground/on-surface'],
    },
  });
