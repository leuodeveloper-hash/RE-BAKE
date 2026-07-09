import React, {useCallback} from 'react';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {ContentContainer, Card} from '@components/Container';
import {ListItem} from '@components/ListItem';
import {SectionHeader} from '@components/SectionHeader';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useAuth} from '@contexts/AuthContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {IconArrowLeft, IconBellFilled} from '@components/Icon/IconIndex';

export default function LabsRoute() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const {isAdmin} = useAuth();
  const {t} = useTranslation();
  const {showSnackbar} = useSnackbar();

  // 전역 스낵바(_layout.tsx 단일 렌더) 사용 — 로컬 스낵바 중복 제거
  const showMessage = useCallback((msg: string) => {
    showSnackbar(msg);
  }, [showSnackbar]);

  const handleTestPush = useCallback(async () => {
    if (Platform.OS === 'web') {
      showMessage(t('labs.pushNotSupportedWeb'));
      return;
    }
    try {
      const Notifications = require('expo-notifications');
      const settings = await Notifications.getPermissionsAsync();
      if (settings.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') {
          showMessage(t('labs.notificationPermissionNeeded'));
          return;
        }
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('labs.pushTestTitle'),
          body: t('labs.pushTestBody'),
          data: {kind: 'debug_test'},
        },
        trigger: {seconds: 3},
      });
      showMessage(t('labs.pushTestScheduled'));
    } catch (err) {
      console.error('push test failed', err);
      showMessage(t('labs.pushTestFailed'));
    }
  }, [showMessage, t]);

  const handleTestRegistrationBanner = useCallback(async () => {
    if (Platform.OS === 'web') {
      showMessage(t('labs.pushNotSupportedWeb'));
      return;
    }
    try {
      const Notifications = require('expo-notifications');
      const settings = await Notifications.getPermissionsAsync();
      if (settings.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') {
          showMessage(t('labs.notificationPermissionNeeded'));
          return;
        }
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('labs.registrationBannerTitle'),
          body: t('labs.registrationBannerBody'),
          data: {kind: 'debug_test', subkind: 'registration_15min'},
        },
        trigger: {seconds: 5},
      });
      showMessage(t('labs.registrationBannerScheduled'));
    } catch (err) {
      console.error('reg banner test failed', err);
      showMessage(t('labs.bannerTestFailed'));
    }
  }, [showMessage, t]);

  const handleListScheduled = useCallback(async () => {
    if (Platform.OS === 'web') {
      showMessage(t('labs.notSupportedWeb'));
      return;
    }
    try {
      const Notifications = require('expo-notifications');
      const list = await Notifications.getAllScheduledNotificationsAsync();
      console.log('[LabsScreen] scheduled notifications:', JSON.stringify(list, null, 2));
      showMessage(t('labs.scheduledCount', {count: list.length}));
    } catch (err) {
      console.error('list scheduled failed', err);
      showMessage(t('labs.listFailed'));
    }
  }, [showMessage, t]);

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ContentContainer style={{paddingTop: 120}}>
            <SectionHeader title={t('labs.accessDenied')} />
          </ContentContainer>
        </SafeAreaView>
        <FloatingNavBar
          left={<NavPillButton icon={IconArrowLeft} onPress={() => router.back()} />}
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
            <SectionHeader title={t('labs.pushNotifications')} />
            <Card>
              <ListItem
                title={t('labs.pushTestItem')}
                leading={{type: 'icon', icon: IconBellFilled}}
                showDivider={true}
                onPress={handleTestPush}
              />
              <ListItem
                title={t('labs.registrationBannerItem')}
                leading={{type: 'icon', icon: IconBellFilled}}
                showDivider={true}
                onPress={handleTestRegistrationBanner}
              />
              <ListItem
                title={t('labs.listScheduledItem')}
                leading={{type: 'icon', icon: IconBellFilled}}
                showDivider={false}
                onPress={handleListScheduled}
              />
            </Card>
          </ContentContainer>
        </ScrollView>
      </SafeAreaView>

      <FloatingNavBar
        left={<NavPillButton icon={IconArrowLeft} onPress={() => router.back()} />}
      />

      {/* 스낵바는 전역(_layout.tsx)에서 단일 렌더 */}
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
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
  });
