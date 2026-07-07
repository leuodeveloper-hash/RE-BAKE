import React, {useCallback, useState} from 'react';
import {Alert, Linking, Platform, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {ContentContainer, Card} from '@components/Container';
import {ListItem} from '@components/ListItem';
import {SectionHeader} from '@components/SectionHeader';
import {Switch} from '@components/Switch';
import {Snackbar} from '@components/Snackbar';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useAuth} from '@contexts/AuthContext';
import {useAuthSheet} from '@contexts/AuthSheetContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useExamNotificationPrefs, getExamTypes, type ExamType} from '@hooks/useExamNotificationPrefs';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {IconArrowLeft, IconBellFilled, IconCircleInfo} from '@components/Icon/IconIndex';

export default function ExamNotificationsRoute() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const {prefs, setTargetEnabled} = useExamNotificationPrefs();
  const {user} = useAuth();
  const {open: openAuthSheet} = useAuthSheet();
  const {t} = useTranslation();
  const isLoggedIn = !!user && !user.isAnonymous;

  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const showMessage = useCallback((msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarVisible(true);
  }, []);

  // 알림이 OS 레벨에서 꺼져 있으면 설정으로 보내는 안내
  const promptOpenSettings = useCallback(() => {
    Alert.alert(
      t('examnotifications.notifOffTitle'),
      t('examnotifications.notifOffMessage'),
      [
        {text: t('examnotifications.later'), style: 'cancel'},
        {text: t('examnotifications.openSettings'), onPress: () => { Linking.openSettings().catch(() => {}); }},
      ],
    );
  }, [t]);

  // 권한 보장: 미요청이면 요청, 영구 거부(canAskAgain=false)면 설정 안내. true면 진행 가능.
  const ensurePermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    const Notifications = require('expo-notifications');
    const settings = await Notifications.getPermissionsAsync();
    if (settings.status === 'granted') return true;
    if (settings.canAskAgain) {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status === 'granted') return true;
    }
    promptOpenSettings();
    return false;
  }, [promptOpenSettings]);

  // 실제 토글 적용 (권한 확인 포함)
  const applyToggle = useCallback(async (type: ExamType, on: boolean) => {
    if (on) {
      const ok = await ensurePermission().catch(() => false);
      if (!ok) return;
    }
    setTargetEnabled(type, on);
  }, [ensurePermission, setTargetEnabled]);

  // 스위치 토글: 로그인 안 했으면 로그인 시트 → 성공 시 토글 진행 (시험일정 열람은 로그인 불필요)
  const handleToggle = useCallback((type: ExamType, on: boolean) => {
    if (!isLoggedIn) {
      openAuthSheet({onSuccess: () => { applyToggle(type, on); }});
      return;
    }
    applyToggle(type, on);
  }, [isLoggedIn, openAuthSheet, applyToggle]);

  // 테스트 알림: 권한 확인 → 3초 뒤 로컬 알림 발송 → 현재 등록된 시험 알림 개수도 함께 표시
  const handleSendTest = useCallback(async () => {
    if (Platform.OS === 'web') {
      showMessage(t('examnotifications.webNotSupported'));
      return;
    }
    try {
      const Notifications = require('expo-notifications');
      if (!(await ensurePermission())) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('examnotifications.testNotifTitle'),
          body: t('examnotifications.testNotifBody'),
          data: {kind: 'debug_test'},
        },
        // SDK54: trigger에 type이 없으면 거부됨 → {type:'date', date}로 전달
        trigger: {type: 'date', date: new Date(Date.now() + 3000)},
      });
      // 등록된 시험 알림 개수 = 스케줄 정상 등록 여부 진단
      const all = await Notifications.getAllScheduledNotificationsAsync();
      const examCount = all.filter((n: any) => n.content?.data?.kind === 'exam_schedule').length;
      showMessage(t('examnotifications.testScheduled', {count: examCount}));
    } catch (e) {
      console.warn('[examNotifications] 테스트 알림 실패:', e);
      showMessage(t('examnotifications.testFailed'));
    }
  }, [showMessage, ensurePermission, t]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={{height: 80}} />

          <ContentContainer>
            <SectionHeader title={t('examnotifications.examScheduleAlerts')} />
            <Card>
              {getExamTypes(t).map((e, i) => (
                <ListItem
                  key={e.id}
                  title={e.label}
                  showDivider={i < getExamTypes(t).length - 1}
                  trailing={{
                    type: 'custom',
                    element: (
                      <Switch
                        value={prefs.targets.includes(e.id)}
                        onValueChange={(v) => handleToggle(e.id, v)}
                      />
                    ),
                  }}
                />
              ))}
            </Card>
            <Text style={styles.helper}>
              {t('examnotifications.scheduleHelper')}
            </Text>

            <View style={styles.testSection}>
              <SectionHeader title={t('examnotifications.notifTest')} />
              <Card>
                <ListItem
                  title={t('examnotifications.receiveTestNotif')}
                  leading={{type: 'icon', icon: IconBellFilled}}
                  showDivider={false}
                  onPress={handleSendTest}
                />
              </Card>
              <Text style={styles.helper}>
                {t('examnotifications.testHelper')}
              </Text>
            </View>
          </ContentContainer>
        </ScrollView>
      </SafeAreaView>

      <FloatingNavBar
        left={
          <NavPillButton icon={IconArrowLeft} onPress={() => router.back()} />
        }
        right={
          <NavPillButton icon={IconCircleInfo} onPress={() => router.push('/exam-schedule' as any)} />
        }
      />

      <View style={styles.snackbarWrapper} pointerEvents="box-none">
        <Snackbar
          message={snackbarMsg}
          visible={snackbarVisible}
          onClose={() => setSnackbarVisible(false)}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // 카드(surface/bright=흰색)와 대비되도록 배경을 한 톤 낮춤 (설정 메인과 동일: surface/dim)
      backgroundColor: colors['surface/dim'],
    },
    safeArea: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 80,
    },
    helper: {
      ...Typography.body.small,
      color: colors['foreground/on-surface-muted'],
      paddingHorizontal: Spacing.smd,
      marginTop: Spacing.smd,
    },
    testSection: {
      marginTop: Spacing.xl,
    },
    snackbarWrapper: {
      position: 'absolute',
      bottom: 100, // 하단 탭바 위로 (탭바 bottom:20 + 높이/세이프에어리어를 넘김)
      left: 0,
      right: 0,
      alignItems: 'center',
    },
  });
