import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {BottomSheet} from '@components/BottomSheet';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {IconGoogle, IconMailFilled} from '@components/Icon/IconIndex';
import {useAuth} from '@contexts/AuthContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import LogoBakecycle from '../../../assets/images/logo_badge_colored.svg';

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
    } catch {
      showSnackbar(isLoginMode ? t('auth.loginFailed') : t('auth.signupFailed'));
    } finally {
      setAuthLoading(false);
    }
  }, [email, password, isLoginMode, signIn, signUp, showSnackbar, handleSuccess, t]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={showEmailForm ? (isLoginMode ? t('auth.emailLoginTitle') : t('auth.emailSignupTitle')) : t('auth.loginTitle')}
      description={showEmailForm ? undefined : t('auth.loginDescription')}
      headerGraphic={<LogoBakecycle width={48} height={48} />}
      maxWidth={380}>
      {showEmailForm ? (
        <View style={styles.authForm}>
          <TextInput
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <View style={styles.authButtons}>
            <Button
              label={isLoginMode ? t('auth.loginButton') : t('auth.signupButton')}
              onPress={handleAuth}
              disabled={authLoading}
            />
          </View>
          <View style={styles.authToggle}>
            <Button
              label={isLoginMode ? t('auth.toggleToSignup') : t('auth.toggleToLogin')}
              variant="ghost"
              size="small"
              onPress={() => setIsLoginMode(prev => !prev)}
            />
          </View>
        </View>
      ) : (
        <View style={styles.authForm}>
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
    authForm: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
      gap: Spacing.md,
    },
    authButtons: {
      gap: Spacing.sm,
    },
    authToggle: {
      alignItems: 'center',
    },
    authLoginButtons: {
      gap: Spacing.sm,
    },
    termsCaption: {
      ...Typography.body.small,
      color: colors['foreground/on-surface-muted'],
      textAlign: 'center',
      paddingHorizontal: Spacing.md,
    },
    termsLink: {
      color: colors['foreground/on-surface'],
      textDecorationLine: 'underline',
    },
  });
