import React, {useCallback, useState} from 'react';
import {Alert, Linking, Platform, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {FloatingNavBar, navPillStyle} from '@components/Navigation';
import {ContentContainer, GlassContainer, Card} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {ListItem} from '@components/ListItem';
import {SectionHeader} from '@components/SectionHeader';
import {Switch} from '@components/Switch';
import {Snackbar} from '@components/Snackbar';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useAuth} from '@contexts/AuthContext';
import {useAuthSheet} from '@contexts/AuthSheetContext';
import {useExamNotificationPrefs, EXAM_TYPES, type ExamType} from '@hooks/useExamNotificationPrefs';
import type {SemanticColorsV2} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {IconArrowLeft, IconBellFilled, IconCircleInfoFilled} from '@components/Icon/IconIndex';

export default function ExamNotificationsRoute() {
  const styles = useThemedStylesV2(createStyles);
  const router = useRouter();
  const {prefs, setTargetEnabled} = useExamNotificationPrefs();
  const {user} = useAuth();
  const {open: openAuthSheet} = useAuthSheet();
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
      '알림이 꺼져 있어요',
      '시험 알림을 받으려면 기기 설정에서 이 앱의 알림을 켜주세요.',
      [
        {text: '나중에', style: 'cancel'},
        {text: '설정 열기', onPress: () => { Linking.openSettings().catch(() => {}); }},
      ],
    );
  }, []);

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
      showMessage('웹에서는 알림 테스트가 지원되지 않아요');
      return;
    }
    try {
      const Notifications = require('expo-notifications');
      if (!(await ensurePermission())) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 시험 알림 테스트',
          body: '이 알림이 보이면 정상이에요.',
          data: {kind: 'debug_test'},
        },
        // SDK54: trigger에 type이 없으면 거부됨 → {type:'date', date}로 전달
        trigger: {type: 'date', date: new Date(Date.now() + 3000)},
      });
      // 등록된 시험 알림 개수 = 스케줄 정상 등록 여부 진단
      const all = await Notifications.getAllScheduledNotificationsAsync();
      const examCount = all.filter((n: any) => n.content?.data?.kind === 'exam_schedule').length;
      showMessage(`3초 후 테스트 알림이 도착해요 · 등록된 시험 알림 ${examCount}개`);
    } catch (e) {
      console.warn('[examNotifications] 테스트 알림 실패:', e);
      showMessage('알림 테스트에 실패했어요');
    }
  }, [showMessage, ensurePermission]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={{height: 80}} />

          <ContentContainer>
            <SectionHeader title="시험 일정 알림" />
            <Card>
              {EXAM_TYPES.map((t, i) => (
                <ListItem
                  key={t.id}
                  title={t.label}
                  showDivider={i < EXAM_TYPES.length - 1}
                  trailing={{
                    type: 'custom',
                    element: (
                      <Switch
                        value={prefs.targets.includes(t.id)}
                        onValueChange={(v) => handleToggle(t.id, v)}
                      />
                    ),
                  }}
                />
              ))}
            </Card>
            <Text style={styles.helper}>
              접수 15분 전·접수일·시험 D-7·D-1·발표일에 알림을 보내드려요. 우측 상단 ⓘ 에서 다가오는 시험 일정을 확인할 수 있어요.
            </Text>

            <View style={styles.testSection}>
              <SectionHeader title="알림 테스트" />
              <Card>
                <ListItem
                  title="테스트 알림 받기 (3초 후)"
                  leading={{type: 'icon', icon: IconBellFilled}}
                  showDivider={false}
                  onPress={handleSendTest}
                />
              </Card>
              <Text style={styles.helper}>
                알림이 오는지, 그리고 현재 등록된 시험 알림 개수를 확인할 수 있어요.
              </Text>
            </View>
          </ContentContainer>
        </ScrollView>
      </SafeAreaView>

      <FloatingNavBar
        left={
          <GlassContainer contentStyle={navPillStyle}>
            <IconButton icon={IconArrowLeft} onPress={() => router.back()} variant="ghost-secondary" size="medium" />
          </GlassContainer>
        }
        right={
          <GlassContainer contentStyle={navPillStyle}>
            <IconButton icon={IconCircleInfoFilled} onPress={() => router.push('/exam-schedule' as any)} variant="ghost-secondary" size="medium" />
          </GlassContainer>
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

const createStyles = (colors: SemanticColorsV2) =>
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
