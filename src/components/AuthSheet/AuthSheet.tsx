import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Image} from 'expo-image';
import {useRouter} from 'expo-router';
import {BottomSheet} from '@components/BottomSheet';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {AppBar} from '@components/Navigation';
import {IconGoogle, IconMailFilled, IconArrowLeft, IconClose} from '@components/Icon/IconIndex';
import {useAuth} from '@contexts/AuthContext';
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
  const {signIn, signUp, signInWithGoogle} = useAuth();
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
      showSnackbar(t('auth.enterEmailPassword'));
      return;
    }
    setAuthLoading(true);
    try {
      if (isLoginMode) {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
      showSnackbar(isLoginMode ? t('auth.loginSuccess') : t('auth.signupSuccess'));
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
      title={showEmailForm ? undefined : t('auth.loginTitle')}
      description={showEmailForm ? undefined : t('auth.loginDescription')}
      headerGraphic={showEmailForm ? undefined : <Image source={APP_LOGO} style={styles.appLogo} contentFit="cover" />}
      maxWidth={380}>
      {showEmailForm ? (
        <View>
          <AppBar
            centered
            title={isLoginMode ? t('auth.emailLoginTitle') : t('auth.emailSignupTitle')}
            leftIcon={IconArrowLeft}
            onLeftPress={() => setShowEmailForm(false)}
            rightIcon={IconClose}
            onRightPress={handleClose}
          />
          <View style={styles.authForm}>
          <View style={styles.authFieldGroup}>
            <View style={styles.authFieldRow}>
              <TextInput
                style="ghost"
                placeholder={t('auth.emailPlaceholder')}
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
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>
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
            <Button
              label={t('auth.continueWithGoogle')}
              variant="soft"
              icon={IconGoogle}
              onPress={async () => {
                try {
                  await signInWithGoogle();
                  showSnackbar(t('auth.loginSuccess'));
                  handleSuccess();
                } catch (err: any) {
                  if (err?.code !== 'auth/popup-closed-by-user') {
                    showSnackbar(t('auth.googleLoginFailed'));
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
    authFieldGroup: {
      backgroundColor: colors['fill/subtle'],
      borderRadius: Radius['radius-lg'],
      overflow: 'hidden',
    },
    authFieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      paddingHorizontal: Spacing.md,
    },
    authFieldDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors['border/muted'],
      marginHorizontal: Spacing.md,
    },
    authButtons: {
      gap: Spacing.sm,
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
