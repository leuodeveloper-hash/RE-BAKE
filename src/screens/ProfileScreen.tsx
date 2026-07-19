import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {BlurView} from 'expo-blur';
import {SafeAreaView} from 'react-native-safe-area-context';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {ContentContainer, Card} from '@components/Container';
import {SectionHeader} from '@components/SectionHeader';
import {ListItem} from '@components/ListItem';
import {Switch} from '@components/Switch';
import {Avatar} from '@components/Avatar/Avatar';
import {Tabs} from '@components/Tabs';
import {Selector} from '@components/Selector';
import {MenuItem} from '@components/Menu';
import {TextInput} from '@components/TextInput';
import {Button} from '@components/Button';
import {useSnackbar} from '@contexts/SnackbarContext';
import {BottomSheet} from '@components/BottomSheet';
import {useExamNotificationPrefs} from '@hooks/useExamNotificationPrefs';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors, useTheme} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useAuthSheet} from '@contexts/AuthSheetContext';
import {useSubscription} from '@contexts/SubscriptionContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {
  IconArrowLeft,
  IconImport,
  IconExport,
  IconChevronRight,
  IconExprolerBookFilled,
  IconPaletteFilled,
  IconLogout,
  IconBellFilled,
  IconHomeFilled,
  IconSunDimFilled,
  IconCircleHalf,
  IconMoonFilled,
  IconCloudFilled,
  IconTicketFilled,
  IconGlobeFilled,
} from '@components/Icon/IconIndex';

import Constants from 'expo-constants';
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
  onLogout: () => void;
  onUpdateHandle: (newHandle: string) => Promise<void>;
  /** 표시 이름 (없으면 handle 표시) */
  displayName?: string | null;
  onUpdateDisplayName?: (newDisplayName: string) => Promise<void>;
  onTermsPress: () => void;
  onPrivacyPress: () => void;
  /** Labs(디버그) 화면 진입 */
  onLabsPress?: () => void;
  /** 둘러보기 신청 검토 화면 진입 (어드민) */
  onSubmissionsPress?: () => void;
  /** 시험 일정 알림 설정 화면 진입 */
  onExamNotifPress?: () => void;
  /** 홈 화면 위젯 안내 화면 진입 */
  onWidgetGuidePress?: () => void;
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

function formatSyncTime(date: Date, t: (key: string, params?: Record<string, unknown>) => string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('profile.syncJustNow');
  if (diffMin < 60) return t('profile.syncMinutesAgo', {count: diffMin});
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('profile.syncHoursAgo', {count: diffHour});
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
  onLogout,
  onUpdateHandle,
  displayName,
  onUpdateDisplayName,
  onTermsPress,
  onPrivacyPress,
  onLabsPress,
  onSubmissionsPress,
  onExamNotifPress,
  onWidgetGuidePress,
  isPro = false,
  isAdmin = false,
  avatarSeed,
  openPlanSheetSignal = 0,
}: ProfileScreenProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {appearanceMode, setAppearanceMode} = useTheme();
  const {language, setLanguage, t} = useTranslation();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  // 언어 옵션 라벨은 각 언어의 네이티브 표기로 고정 (번역하지 않음)
  const LANGUAGE_OPTIONS = useMemo(() => [
    {id: 'ko', label: '한국어'},
    {id: 'en', label: 'English'},
  ], []);
  const {prefs: examPrefs, reload: reloadExamPrefs} = useExamNotificationPrefs();

  // 알림 설정 화면에서 돌아오면 요약 표시 갱신
  useFocusEffect(
    useCallback(() => {
      reloadExamPrefs();
    }, [reloadExamPrefs]),
  );

  const syncLabel = lastSyncedAt
    ? (lastSyncedDevice
        ? `${lastSyncedDevice}, ${formatSyncTime(lastSyncedAt, t)}`
        : formatSyncTime(lastSyncedAt, t))
    : null;

  const APPEARANCE_TABS = useMemo(() => [
    {id: 'light' as AppearanceMode, label: t('profile.appearanceLight'), icon: IconSunDimFilled, activeIconColor: colors['custom/orange']},
    {id: 'auto' as AppearanceMode, label: t('profile.appearanceAuto'), icon: IconCircleHalf, activeIconColor: colors['foreground/on-surface-muted']},
    {id: 'dark' as AppearanceMode, label: t('profile.appearanceDark'), icon: IconMoonFilled, activeIconColor: colors['custom/yellow']},
  ], [colors, t]);

  const {open: openAuthSheet} = useAuthSheet();
  const {showSnackbar} = useSnackbar();
  const [showHandleSheet, setShowHandleSheet] = useState(false);
  const [handleInput, setHandleInput] = useState('');
  const [showDisplayNameSheet, setShowDisplayNameSheet] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [showPlanSheet, setShowPlanSheet] = useState(false);
  const {photoCloudBackup, setPhotoCloudBackup} = useSubscription();

  useEffect(() => {
    if (openPlanSheetSignal > 0) setShowPlanSheet(true);
  }, [openPlanSheetSignal]);

  // 사진 클라우드 백업 토글 — 스위치·행 전체 클릭 공용.
  // 켜기(업로드)는 구독 필요 → 비프로면 PlanSheet, 끄기(로컬)는 자유.
  const togglePhotoCloudBackup = useCallback((v: boolean) => {
    if (v && !isPro) {
      setShowPlanSheet(true);
      return;
    }
    setPhotoCloudBackup(v);
  }, [isPro, setPhotoCloudBackup]);

  // 전역 스낵바(_layout.tsx에서 단일 렌더)를 사용. 페이지별 로컬 스낵바 중복 제거.
  const showMessage = useCallback((msg: string, action?: {label: string; onPress: () => void}) => {
    showSnackbar(msg, action ? {action} : undefined);
  }, [showSnackbar]);

  const handleTestPush = useCallback(async () => {
    if (Platform.OS === 'web') {
      showMessage(t('profile.pushTestWebUnsupported'));
      return;
    }
    try {
      const Notifications = require('expo-notifications');
      const settings = await Notifications.getPermissionsAsync();
      if (settings.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') {
          showMessage(t('profile.notificationPermissionNeeded'));
          return;
        }
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('profile.pushTestTitle'),
          body: t('profile.pushTestBody'),
          data: {kind: 'debug_test'},
        },
        trigger: {seconds: 3},
      });
      showMessage(t('profile.pushTestScheduled'));
    } catch (err) {
      console.error('push test failed', err);
      showMessage(t('profile.pushTestFailed'));
    }
  }, [showMessage, t]);

  const handleTestRegistrationBanner = useCallback(async () => {
    if (Platform.OS === 'web') {
      showMessage(t('profile.pushTestWebUnsupported'));
      return;
    }
    try {
      const Notifications = require('expo-notifications');
      const settings = await Notifications.getPermissionsAsync();
      if (settings.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') {
          showMessage(t('profile.notificationPermissionNeeded'));
          return;
        }
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('profile.regBannerTestTitle'),
          body: t('profile.regBannerTestBody'),
          data: {kind: 'debug_test', subkind: 'registration_15min'},
        },
        trigger: {seconds: 5},
      });
      showMessage(t('profile.regBannerTestScheduled'));
    } catch (err) {
      console.error('reg banner test failed', err);
      showMessage(t('profile.regBannerTestFailed'));
    }
  }, [showMessage, t]);

  const handleListScheduled = useCallback(async () => {
    if (Platform.OS === 'web') {
      showMessage(t('profile.webUnsupported'));
      return;
    }
    try {
      const Notifications = require('expo-notifications');
      const list = await Notifications.getAllScheduledNotificationsAsync();
      console.log('[ProfileScreen] scheduled notifications:', JSON.stringify(list, null, 2));
      showMessage(t('profile.scheduledCount', {count: list.length}));
    } catch (err) {
      console.error('list scheduled failed', err);
      showMessage(t('profile.listFailed'));
    }
  }, [showMessage, t]);

  const handleOpenHandleEdit = useCallback(() => {
    setHandleInput(handle?.replace(/^@/, '') ?? '');
    setShowHandleSheet(true);
  }, [handle]);

  const handleSaveHandle = useCallback(async () => {
    const cleaned = handleInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleaned) {
      showMessage(t('profile.handleRequired'));
      return;
    }
    try {
      await onUpdateHandle(cleaned);
      setShowHandleSheet(false);
      showMessage(t('profile.handleChanged'));
    } catch {
      showMessage(t('profile.handleChangeFailed'));
    }
  }, [handleInput, onUpdateHandle, showMessage, t]);

  const openDisplayNameEdit = useCallback(() => {
    setDisplayNameInput(displayName ?? '');
    setShowDisplayNameSheet(true);
  }, [displayName]);

  const handleSaveDisplayName = useCallback(async () => {
    const cleaned = displayNameInput.trim();
    try {
      await onUpdateDisplayName?.(cleaned);
      setShowDisplayNameSheet(false);
      showMessage(t('profile.displayNameChanged'));
    } catch {
      showMessage(t('profile.displayNameChangeFailed'));
    }
  }, [displayNameInput, onUpdateDisplayName, showMessage, t]);

  const handleExport = useCallback(async () => {
    try {
      await onExport();
      showMessage(t('profile.exportSuccess'));
    } catch {
      showMessage(t('profile.exportFailed'));
    }
  }, [onExport, showMessage, t]);

  const handleImport = useCallback(async () => {
    const confirmOverwrite = (count: number): Promise<boolean> => {
      const msg = t('profile.importOverwriteMessage', {count});
      if (Platform.OS === 'web') {
        return Promise.resolve(window.confirm(msg));
      }
      return new Promise(res => {
        Alert.alert(t('profile.importTitle'), msg, [
          {text: t('profile.importSkip'), style: 'cancel', onPress: () => res(false)},
          {text: t('profile.importOverwrite'), style: 'destructive', onPress: () => res(true)},
        ]);
      });
    };
    const success = await onImport(confirmOverwrite);
    if (success) {
      showMessage(t('profile.importSuccess'));
    } else {
      showMessage(t('profile.importFailed'));
    }
  }, [onImport, showMessage, t]);

  return (
    <View style={styles.container}>
      {/* 상단 네비게이션 */}
      <FloatingNavBar
        left={
          <NavPillButton icon={IconArrowLeft} onPress={onBack} />
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
                <Pressable onPress={openDisplayNameEdit}>
                  <Text style={styles.profileName}>{displayName || handle || 'handle'}</Text>
                </Pressable>
                <Pressable onPress={handleOpenHandleEdit}>
                  <Text style={styles.profileHandle}>@{handle || 'handle'}</Text>
                </Pressable>
                <Text style={styles.profileSub}>{t('profile.profileSub', {recipeCount, reviewCount})}</Text>
              </>
            ) : (
              <>
                <Text style={styles.profileName}>@guest</Text>
                <Button
                  label={t('profile.loginOrCreateAccount')}
                  size="small"
                  onPress={() => openAuthSheet()}
                  style={styles.profileLoginButton}
                />
              </>
            )}
          </ContentContainer>

          {/* 데이터 관리 섹션 */}
          <ContentContainer style={styles.section}>
            <SectionHeader title={t('profile.dataManagement')} />
            <Card>
              <ListItem
                title={t('profile.export')}
                leading={{type: 'icon', icon: IconExport}}
                trailing={{type: 'icon', icon: IconChevronRight}}
                disabled={recipeCount === 0}
                onPress={handleExport}
              />
              <ListItem
                title={t('profile.import')}
                leading={{type: 'icon', icon: IconImport}}
                trailing={{type: 'icon', icon: IconChevronRight}}
                showDivider={!!(userEmail && lastSyncedAt)}
                onPress={handleImport}
              />
              {userEmail && lastSyncedAt && (
                <ListItem
                  title={t('profile.lastSync')}
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
              <SectionHeader title={t('profile.plan')} />
              <Card>
                <ListItem
                  title={isPro ? t('profile.proPlan') : t('profile.freePlan')}
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
            <SectionHeader title={t('profile.preferences')} />
            <Card>
              <ListItem
                title={t('profile.appearance')}
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
                title={t('settings.language')}
                leading={{type: 'icon', icon: IconGlobeFilled}}
                // 액션이 '언어 메뉴 열기' 하나뿐 → 행 전체를 클릭 영역으로.
                onPress={() => setShowLanguageMenu(true)}
                trailing={{
                  type: 'custom',
                  element: (
                    <Selector
                      variant="ghost"
                      size="small"
                      muted
                      label={LANGUAGE_OPTIONS.find(o => o.id === language)?.label ?? '한국어'}
                      showDropdown
                      onPress={() => setShowLanguageMenu(true)}
                    />
                  ),
                }}
                showDivider
              />
              <ListItem
                title={photoCloudBackup ? t('profile.photoCloudBackupOn') : t('profile.photoCloudBackupLocal')}
                leading={{type: 'icon', icon: IconCloudFilled}}
                // 행 전체 클릭 = 스위치 토글. 스위치와 동일 로직 재사용.
                onPress={() => togglePhotoCloudBackup(!photoCloudBackup)}
                trailing={{
                  type: 'custom',
                  element: (
                    <Switch
                      value={photoCloudBackup}
                      onValueChange={togglePhotoCloudBackup}
                    />
                  ),
                }}
                showDivider={false}
              />
            </Card>
          </ContentContainer>

          {/* 시험 알림 섹션 */}
          <ContentContainer style={styles.section}>
            <SectionHeader title={t('profile.notifications')} />
            <Card>
              <ListItem
                title={t('profile.examScheduleNotif')}
                leading={{type: 'icon', icon: IconBellFilled}}
                trailing={{
                  type: 'custom',
                  element: (
                    <View style={styles.examNotifTrailing}>
                      <Text style={styles.examNotifStatus}>
                        {examPrefs.enabled && examPrefs.targets.length > 0
                          ? t('profile.examNotifOnCount', {count: examPrefs.targets.length})
                          : t('profile.examNotifOff')}
                      </Text>
                      <IconChevronRight
                        width={20}
                        height={20}
                        color={colors['foreground/on-surface-muted']}
                      />
                    </View>
                  ),
                }}
                showDivider
                onPress={() => onExamNotifPress?.()}
              />
              <ListItem
                title={t('profile.widgetGuide')}
                leading={{type: 'icon', icon: IconHomeFilled}}
                trailing={{type: 'icon', icon: IconChevronRight}}
                showDivider={false}
                onPress={() => onWidgetGuidePress?.()}
              />
            </Card>
          </ContentContainer>

          {/* 어드민 전용 도구 */}
          {isAdmin && (
            <ContentContainer style={styles.section}>
              <SectionHeader title={t('profile.adminTools')} />
              <Card>
                <ListItem
                  title={t('profile.reviewSubmissions')}
                  leading={{type: 'icon', icon: IconExprolerBookFilled}}
                  trailing={{type: 'icon', icon: IconChevronRight}}
                  onPress={() => onSubmissionsPress?.()}
                  showDivider
                />
                <ListItem
                  title={t('profile.labs')}
                  leading={{type: 'icon', icon: IconBellFilled}}
                  trailing={{type: 'icon', icon: IconChevronRight}}
                  onPress={() => onLabsPress?.()}
                  showDivider={false}
                />
              </Card>
            </ContentContainer>
          )}

          {/* 로그아웃 (로그인 시만) */}
          {userEmail && (
            <ContentContainer style={styles.section}>
              <Card>
                <ListItem
                  title={t('profile.logout')}
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
              <Text style={styles.footerText}>{t('profile.version', {version: APP_VERSION})}</Text>
              <View style={styles.footerLinks}>
                <Text style={styles.footerLink} onPress={onTermsPress}>{t('profile.termsOfService')}</Text>
                <Text style={styles.footerDot}>·</Text>
                <Text style={styles.footerLink} onPress={onPrivacyPress}>{t('profile.privacyPolicy')}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* 로그인 시트는 공통 AuthSheet(useAuthSheet)로 통합 — app/_layout.tsx에서 렌더 */}

      {/* 핸들 수정 바텀시트 */}
      <BottomSheet
        visible={showHandleSheet}
        onClose={() => setShowHandleSheet(false)}
        title={t('profile.editHandle')}
      >
        <View style={styles.authForm}>
          <TextInput
            placeholder="handle"
            value={handleInput}
            onChangeText={setHandleInput}
            autoCapitalize="none"
          />
          <Button
            label={t('profile.save')}
            onPress={handleSaveHandle}
          />
        </View>
      </BottomSheet>

      {/* 표시 이름 수정 바텀시트 */}
      <BottomSheet
        visible={showDisplayNameSheet}
        onClose={() => setShowDisplayNameSheet(false)}
        title={t('profile.editDisplayName')}
      >
        <View style={styles.authForm}>
          <TextInput
            placeholder={t('profile.displayNamePlaceholder')}
            value={displayNameInput}
            onChangeText={setDisplayNameInput}
          />
          <Button
            label={t('profile.save')}
            onPress={handleSaveDisplayName}
          />
        </View>
      </BottomSheet>

      {/* 언어 선택 바텀시트 (헤더 없이 옵션만) */}
      <BottomSheet
        visible={showLanguageMenu}
        onClose={() => setShowLanguageMenu(false)}
      >
        <View>
          {LANGUAGE_OPTIONS.map(option => (
            <MenuItem
              key={option.id}
              id={option.id}
              label={option.label}
              selected={option.id === language}
              onPress={() => {
                setLanguage(option.id as 'ko' | 'en');
                setShowLanguageMenu(false);
              }}
            />
          ))}
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
              {t('profile.planHeadline')}
            </Text>
          </View>

          {/* 프로 플랜 */}
          <BlurView intensity={12} style={styles.planCardBlur}>
            <View style={styles.planCardInner}>
              <View style={styles.planCardInfoRow}>
                <Text style={styles.planCardTitle}>{t('profile.planPro')}</Text>
                <View style={styles.planPriceRow}>
                  <Text style={styles.planPrice}>USD 18</Text>
                  <Text style={styles.planPriceSuffixText}>{t('profile.planPerYear')}</Text>
                </View>
              </View>
              {isPro ? (
                <Button label={t('profile.currentPlan')} variant="soft" disabled />
              ) : (
                <Button label={t('profile.subscribe')} disabled />
              )}
              <View style={styles.planFeatureList}>
                <PlanFeature text={t('profile.featureCloudSync')} styles={styles} dotColor={colors['custom/light-blue']} />
                <PlanFeature text={t('profile.featureUnlimitedExplore')} styles={styles} dotColor={colors['custom/light-blue']} />
                <PlanFeature text={t('profile.featureAdFree')} styles={styles} dotColor={colors['custom/light-blue']} />
              </View>
            </View>
          </BlurView>

          {/* 무료 플랜 */}
          <BlurView intensity={12} style={styles.planCardBlur}>
            <View style={styles.planCardInner}>
              <View style={styles.planCardInfoRow}>
                <Text style={styles.planCardTitle}>{t('profile.planFree')}</Text>
                <Text style={styles.planPrice}>Free</Text>
              </View>
              {isPro ? (
                <Button label={t('profile.downgradeToFree')} variant="soft" />
              ) : (
                <Button label={t('profile.currentPlan')} variant="soft" disabled />
              )}
              <View style={styles.planFeatureList}>
                <PlanFeature text={t('profile.featureLocalSave')} styles={styles} />
                <PlanFeature text={t('profile.featureExplorePreview')} styles={styles} />
                <PlanFeature text={t('profile.featureExportImport')} styles={styles} />
              </View>
            </View>
          </BlurView>
        </View>
      </BottomSheet>

      {/* 스낵바는 전역(_layout.tsx)에서 단일 렌더 — 페이지별 로컬 스낵바 제거됨 */}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
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
  profileHandle: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    color: colors['foreground/on-surface-muted'],
    marginTop: 2,
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
});
