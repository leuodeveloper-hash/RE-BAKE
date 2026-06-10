import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {BottomSheet} from '@components/BottomSheet';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {IconGoogle, IconMailFilled} from '@components/Icon/IconIndex';
import {useAuth} from '@contexts/AuthContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import type {SemanticColorsV2} from '@constants/tokensV2';
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
  const styles = useThemedStylesV2(createStyles);
  const router = useRouter();
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
      showSnackbar('이메일과 비밀번호를 입력해주세요');
      return;
    }
    setAuthLoading(true);
    try {
      if (isLoginMode) {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
      showSnackbar(isLoginMode ? '로그인 성공' : '회원가입 성공');
      handleSuccess();
    } catch {
      showSnackbar(isLoginMode ? '로그인에 실패했습니다' : '회원가입에 실패했습니다');
    } finally {
      setAuthLoading(false);
    }
  }, [email, password, isLoginMode, signIn, signUp, showSnackbar, handleSuccess]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={showEmailForm ? (isLoginMode ? '이메일로 로그인' : '이메일로 회원가입') : '로그인'}
      description={showEmailForm ? undefined : '로그인하면 레시피를 여러 기기에서 동기화하고\n안전하게 보관할 수 있어요.'}
      headerGraphic={<LogoBakecycle width={48} height={48} />}
      maxWidth={380}>
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
          <View style={styles.authLoginButtons}>
            <Button
              label="Google로 계속하기"
              variant="soft"
              icon={IconGoogle}
              onPress={async () => {
                try {
                  await signInWithGoogle();
                  showSnackbar('로그인 성공');
                  handleSuccess();
                } catch (err: any) {
                  if (err?.code !== 'auth/popup-closed-by-user') {
                    showSnackbar('Google 로그인에 실패했습니다');
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
            <Text style={styles.termsLink} onPress={() => router.push('/terms')}>이용약관</Text>
            {' '}및{' '}
            <Text style={styles.termsLink} onPress={() => router.push('/privacy')}>개인정보 처리방침</Text>
            에 동의하는 것으로 간주합니다.
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColorsV2) =>
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
