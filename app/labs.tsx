import React, {useCallback, useState} from 'react';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {FloatingNavBar, navPillStyle} from '@components/Navigation';
import {ContentContainer, GlassContainer, Card} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {ListItem} from '@components/ListItem';
import {SectionHeader} from '@components/SectionHeader';
import {Snackbar} from '@components/Snackbar';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useAuth} from '@contexts/AuthContext';
import type {SemanticColorsV2} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {IconArrowLeft, IconBellFilled} from '@components/Icon/IconIndex';

export default function LabsRoute() {
  const styles = useThemedStylesV2(createStyles);
  const router = useRouter();
  const {isAdmin} = useAuth();

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  const showMessage = useCallback((msg: string) => {
    setSnackbarMessage(msg);
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
      console.log('[LabsScreen] scheduled notifications:', JSON.stringify(list, null, 2));
      showMessage(`예약된 알림 ${list.length}개 (콘솔 확인)`);
    } catch (err) {
      console.error('list scheduled failed', err);
      showMessage('목록 조회 실패');
    }
  }, [showMessage]);

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ContentContainer style={{paddingTop: 120}}>
            <SectionHeader title="접근 권한이 없습니다" />
          </ContentContainer>
        </SafeAreaView>
        <FloatingNavBar
          left={
            <GlassContainer contentStyle={navPillStyle}>
              <IconButton icon={IconArrowLeft} onPress={() => router.back()} variant="ghost-secondary" size="medium" />
            </GlassContainer>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={{height: 80}} />

          <ContentContainer>
            <SectionHeader title="푸시 알림" />
            <Card>
              <ListItem
                title="푸시 테스트 (3초 후)"
                leading={{type: 'icon', icon: IconBellFilled}}
                showDivider={true}
                onPress={handleTestPush}
              />
              <ListItem
                title="접수 15분 전 배너 테스트 (5초 후)"
                leading={{type: 'icon', icon: IconBellFilled}}
                showDivider={true}
                onPress={handleTestRegistrationBanner}
              />
              <ListItem
                title="예약된 알림 목록 출력"
                leading={{type: 'icon', icon: IconBellFilled}}
                showDivider={false}
                onPress={handleListScheduled}
              />
            </Card>
          </ContentContainer>
        </ScrollView>
      </SafeAreaView>

      <FloatingNavBar
        left={
          <GlassContainer contentStyle={navPillStyle}>
            <IconButton icon={IconArrowLeft} onPress={() => router.back()} variant="ghost-secondary" size="medium" />
          </GlassContainer>
        }
      />

      <View style={styles.snackbarWrapper} pointerEvents="box-none">
        <Snackbar
          message={snackbarMessage}
          visible={showSnackbar}
          onClose={() => setShowSnackbar(false)}
        />
      </View>
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
      paddingBottom: 80,
    },
    snackbarWrapper: {
      position: 'absolute',
      bottom: 40,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
  });
