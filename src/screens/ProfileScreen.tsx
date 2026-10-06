import {syncTimeLabel} from '@utils/dateLabel';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {loadCustomDdays} from '@utils/customDdays';
import {LinearGradient} from 'expo-linear-gradient';
import {BlurView} from 'expo-blur';
import {SafeAreaView} from 'react-native-safe-area-context';
import {FloatingNavBar, NavPillButton, APPBAR_CONTENT_BOTTOM} from '@components/Navigation';
import {ContentContainer, Card} from '@components/Container';
import {SectionHeader} from '@components/SectionHeader';
import {ListItem} from '@components/ListItem';
import {Switch} from '@components/Switch';
import {Avatar} from '@components/Avatar/Avatar';
import {Tabs} from '@components/Tabs';
import {Selector} from '@components/Selector';
import {MenuItem} from '@components/Menu';
import {SummaryCard} from '@components/SummaryCard';
import {TextInput} from '@components/TextInput';
import {Button} from '@components/Button';
import {Dialog} from '@components/Dialog';
import {PlanSheet} from '@components/PlanSheet';
import {getInstalledWidgetCount} from '@utils/examWidgetSync';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useAuth} from '@contexts/AuthContext';
import {BottomSheet, InquirySheet} from '@components/BottomSheet';
import {sendAppInquiry} from '@utils/appInquiry';
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
  IconClose,
  IconImport,
  IconExport,
  IconChevronRight,
  IconStamps,
  IconExprolerBookFilled,
  IconPaletteFilled,
  IconLogout,
  IconSettingsFilled,
  IconArrowLeft,
  IconPhoto,
  IconBookFilled,
  IconTrash,
  IconBellFilled,
  IconSunDimFilled,
  IconCircleHalf,
  IconMoonFilled,
  IconCloudFilled,
  IconTicketFilled,
  IconGlobeFilled,
  IconClockFilled,
  IconCameraFilled, IconWidgetFilled, IconMailFilled, IconCursorFilled} from '@components/Icon/IconIndex';

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
  /** 계정 설정 화면으로 */
  onAccountPress?: () => void;
  /** 데이터 관리 화면으로 */
  onDataPress?: () => void;
  /** 레시피북 칸 — 내 레시피북 목록으로 */
  onCookbooksPress?: () => void;
  /** 레시피북 칸 숫자 — 내가 공식으로 올린 레시피북 수 · 레시피 수 */
  cookbookCount?: number;
  officialRecipeCount?: number;
  /** 내 프로필(작성자 홈) 보기 */
  onProfilePress?: () => void;
  onUpdateHandle: (newHandle: string) => Promise<void>;
  /** 표시 이름 (없으면 handle 표시) */
  displayName?: string | null;
  onUpdateDisplayName?: (newDisplayName: string) => Promise<void>;
  onTermsPress: () => void;
  onPrivacyPress: () => void;
  /** 우표첩(내 기록) 진입 */
  onStampsPress?: () => void;
  /** 어드민 — 이미지 인식 기록 */
  onOcrLogsPress?: () => void;
  /** 모은 스탬프 개수 — 목록에서 바로 보이게 */
  stampCount?: number;
  /** Labs(디버그) 화면 진입 */
  onLabsPress?: () => void;
  onWidgetPreviewPress?: () => void;
  /** 둘러보기 신청 검토 화면 진입 (어드민) */
  onSubmissionsPress?: () => void;
  /** 시험 일정 알림 설정 화면 진입 */
  onExamNotifPress?: () => void;
  /** 홈 화면 위젯 안내 화면 진입 */
  onWidgetGuidePress?: () => void;
  /** 내 D-day 화면 */
  onDdaysPress?: () => void;
  /** Pro 구독 여부 */
  isPro?: boolean;
  /** 구독하기 — 없으면 시트만 닫힌다 */
  onSubscribePress?: (pkg?: any) => void;
  /** 어드민 여부 (디버그 도구 노출) */
  isAdmin?: boolean;
  /** 고정 아바타 시드 (useAvatarSeed에서 가져온 값) */
  // 로그인하면 uid(문자열), 게스트는 숫자 — Avatar도 둘 다 받는다
  avatarSeed?: string | number | null;
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
  onAccountPress,
  onDataPress,
  onCookbooksPress,
  cookbookCount = 0,
  officialRecipeCount = 0,
  onProfilePress,
  onUpdateHandle,
  displayName,
  onUpdateDisplayName,
  onTermsPress,
  onPrivacyPress,
  onLabsPress,
  onStampsPress,
  onOcrLogsPress,
  stampCount = 0,
  onWidgetPreviewPress,
  onSubmissionsPress,
  onExamNotifPress,
  onWidgetGuidePress,
  onDdaysPress,
  isPro = false,
  onSubscribePress,
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
  // 위젯 개수. null = 알 수 없음(조회 실패·구버전) — 0과 구분해 아무것도 표시하지 않는다.
  const [widgetCount, setWidgetCount] = useState<number | null>(null);
  // 내 D-day 개수 — 세팅 줄 오른쪽 값. 화면에 다시 들어올 때마다 읽는다
  const [ddayCount, setDdayCount] = useState(0);
  useFocusEffect(useCallback(() => { loadCustomDdays().then(l => setDdayCount(l.length)); }, []));

  useFocusEffect(
    useCallback(() => {
      reloadExamPrefs();
      // 위젯 추가는 앱 밖(홈 화면)에서 하므로, 돌아올 때마다 다시 확인해야 한다.
      let alive = true;
      getInstalledWidgetCount().then(n => { if (alive) setWidgetCount(n); });
      return () => { alive = false; };
    }, [reloadExamPrefs]),
  );

  const syncLabel = lastSyncedAt
    ? (lastSyncedDevice
        ? `${lastSyncedDevice}, ${syncTimeLabel(lastSyncedAt, t)}`
        : syncTimeLabel(lastSyncedAt, t))
    : null;

  const APPEARANCE_TABS = useMemo(() => [
    {id: 'light' as AppearanceMode, label: t('profile.appearanceLight'), icon: IconSunDimFilled, activeIconColor: colors['custom/orange']},
    {id: 'auto' as AppearanceMode, label: t('profile.appearanceAuto'), icon: IconCircleHalf, activeIconColor: colors['foreground/on-surface-muted']},
    {id: 'dark' as AppearanceMode, label: t('profile.appearanceDark'), icon: IconMoonFilled, activeIconColor: colors['custom/yellow']},
  ], [colors, t]);

  const {open: openAuthSheet} = useAuthSheet();
  const {showSnackbar} = useSnackbar();
  const {user} = useAuth();
  // 문의는 메일 앱을 열지 않고 앱 안에서 받는다(주소 비노출)
  const [inquiryOpen, setInquiryOpen] = useState(false);
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
        trigger: {type: 'timeInterval', seconds: 3, repeats: false},
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
        trigger: {type: 'timeInterval', seconds: 5, repeats: false},
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
      {/* 상단 — 뒤로 · 설정 */}
      <FloatingNavBar
        left={<NavPillButton icon={IconArrowLeft} onPress={onBack} />}
        title={t('profile.settingsTitle')}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* 맨 위 두 칸 — [프로필] [레시피북] */}
          <ContentContainer style={styles.section}>
            <View style={styles.summaryRow}>
              <SummaryCard
                leading={<Avatar type="random" size="xsmall" shape="circle" seed={avatarSeed ?? 0} />}
                title={userEmail ? (displayName || handle || 'handle') : '@guest'}
                subtitle={userEmail ? t('profile.viewProfile') : t('profile.loginOrCreateAccount')}
                onPress={() => (userEmail ? onProfilePress?.() : openAuthSheet())}
              />
              {/* 공식(둘러보기) 레시피북 — 아이콘·이름도 공식 레시피북으로 */}
              <SummaryCard
                icon={IconExprolerBookFilled}
                title={t('profile.officialRecipeBooks')}
                subtitle={[t('profile.bookCount', {count: cookbookCount}), t('profile.recipeCountShort', {count: officialRecipeCount})]}
                onPress={() => (userEmail ? onCookbooksPress?.() : openAuthSheet())}
              />
            </View>
          </ContentContainer>

          {/* 일반 */}
          <ContentContainer style={styles.section}>
            <SectionHeader title={t('profile.sectionGeneral')} />
            <Card>
              <ListItem
                title={t('profile.accountSettings')}
                leading={{type: 'icon', icon: IconSettingsFilled}}
                trailing={{type: 'icon', icon: IconChevronRight}}
                showDivider
                onPress={() => (userEmail ? onAccountPress?.() : openAuthSheet())}
              />
              <ListItem
                title={t('profile.examScheduleNotif')}
                leading={{type: 'icon', icon: IconBellFilled}}
                trailingValue={examPrefs.enabled && examPrefs.targets.length > 0
                  ? t('profile.examNotifOnCount', {count: examPrefs.targets.length})
                  : t('profile.examNotifOff')}
                trailing={{type: 'icon', icon: IconChevronRight}}
                showDivider
                onPress={() => onExamNotifPress?.()}
              />
              {onStampsPress ? (
                <ListItem
                  title={t('stamps.title')}
                  leading={{type: 'icon', icon: IconStamps}}
                  trailingValue={stampCount > 0 ? t('stamps.countValue', {count: stampCount}) : undefined}
                  trailing={{type: 'icon', icon: IconChevronRight}}
                  showDivider
                  onPress={onStampsPress}
                />
              ) : null}
              <ListItem
                title={t('profile.widgetGuide')}
                leading={{type: 'icon', icon: IconWidgetFilled}}
                // 알 수 없을 때(null)·로그인 전엔 비워 둔다 — "추가 안 함"으로 잘못 보이는 편이 더 나쁘다
                trailingValue={widgetCount === null || !userEmail ? undefined : widgetCount > 0
                  ? t('profile.widgetAddedCount', {count: widgetCount})
                  : t('profile.widgetNotAdded')}
                trailing={{type: 'icon', icon: IconChevronRight}}
                showDivider
                onPress={() => onWidgetGuidePress?.()}
              />
              {/* D-day — 위젯 다음(위젯에 띄울 날을 여기서 정한다) */}
              <ListItem
                title={t('dday.screenTitle')}
                leading={{type: 'icon', icon: IconCursorFilled}}
                trailingValue={ddayCount > 0 ? t('dday.countShort', {count: ddayCount}) : undefined}
                trailing={{type: 'icon', icon: IconChevronRight}}
                showDivider
                onPress={() => onDdaysPress?.()}
              />
              {/* 데이터 관리 — 내보내기·가져오기·사진 백업을 한곳에. 오른쪽은 마지막 동기화(기기, 시각) */}
              <ListItem
                title={t('profile.dataManagement')}
                leading={{type: 'icon', icon: IconCloudFilled}}
                trailingValue={userEmail && syncLabel ? syncLabel : undefined}
                trailing={{type: 'icon', icon: IconChevronRight}}
                showDivider={false}
                onPress={() => onDataPress?.()}
              />
            </Card>
          </ContentContainer>

          {/* 업그레이드 — 로그인했을 때만(구독은 계정에 붙는다) */}
          {userEmail && (
          <ContentContainer style={styles.section}>
            <SectionHeader title={t('profile.sectionUpgrade')} />
            <Card>
              <ListItem
                title={isPro ? t('profile.proPlan') : t('profile.upgradeToPro')}
                leading={{type: 'icon', icon: IconTicketFilled}}
                trailingValue={isPro ? 'Pro' : 'Free'}
                trailing={{type: 'icon', icon: IconChevronRight}}
                showDivider={false}
                onPress={() => setShowPlanSheet(true)}
              />
            </Card>
          </ContentContainer>
          )}

          {/* 기타 */}
          <ContentContainer style={styles.section}>
            <SectionHeader title={t('profile.sectionOther')} />
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
                trailingValue={LANGUAGE_OPTIONS.find(o => o.id === language)?.label ?? '한국어'}
                trailing={{type: 'icon', icon: IconChevronRight}}
                onPress={() => setShowLanguageMenu(true)}
                showDivider
              />
              {/* Support — 메일 앱을 열지 않고 앱 안에서 문의 */}
              <ListItem
                title={t('profile.inquiry')}
                leading={{type: 'icon', icon: IconMailFilled}}
                trailing={{type: 'icon', icon: IconChevronRight}}
                showDivider={false}
                onPress={() => setInquiryOpen(true)}
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
                  showDivider
                />
                <ListItem
                  title={t('widgetPreview.title')}
                  leading={{type: 'icon', icon: IconClockFilled}}
                  trailing={{type: 'icon', icon: IconChevronRight}}
                  onPress={() => onWidgetPreviewPress?.()}
                  showDivider
                />
                <ListItem
                  title={t('profile.ocrLogs')}
                  leading={{type: 'icon', icon: IconCameraFilled}}
                  trailing={{type: 'icon', icon: IconChevronRight}}
                  onPress={() => onOcrLogsPress?.()}
                  showDivider={false}
                />
              </Card>
            </ContentContainer>
          )}

          {/* 로그아웃 — 맨 아래 따로 떨어진 카드(로그인 시만) */}
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
                <Text style={styles.footerLink} onPress={onPrivacyPress}>{t('profile.privacyPolicy')}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <InquirySheet
        visible={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        onSubmit={(kind, message, replyTo) => {
          sendAppInquiry({kind, message, replyTo: replyTo || undefined, uid: user?.uid, handle})
            .then(() => showSnackbar(t('inquiry.sent'), {tone: 'positive'}))
            .catch(() => showSnackbar(t('inquiry.failed'), {tone: 'error'}));
        }}
      />

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

      {/* 플랜 바텀시트 — 공통 PlanSheet 사용.
          예전엔 여기에 같은 UI를 복사해 뒀는데, PlanSheet를 고쳐도 반영되지 않아
          가격(USD 18 하드코딩)이 옛 값으로 남는 문제가 있었다. */}
      <PlanSheet
        visible={showPlanSheet}
        onClose={() => setShowPlanSheet(false)}
        isPro={isPro}
        onSubscribePress={pkg => { setShowPlanSheet(false); onSubscribePress?.(pkg); }}
      />

      {/* 스낵바는 전역(_layout.tsx)에서 단일 렌더 — 페이지별 로컬 스낵바 제거됨 */}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  // 맨 위 두 칸 — 같은 폭으로 나란히
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
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
    // 앱바(뒤로·제목) 아래 기본 여백 8 — 48이면 맨 위 카드가 앱바에 붙어 보였다
    paddingTop: APPBAR_CONTENT_BOTTOM + Spacing.sm,
    paddingBottom: 120,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
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
    fontFamily: Typography.caption.medium.fontFamily,
    fontSize: Typography.caption.medium.fontSize,
    fontWeight: Typography.caption.medium.fontWeight as '500',
    lineHeight: Typography.caption.medium.lineHeight,
    letterSpacing: Typography.caption.medium.letterSpacing,
    color: colors['foreground/on-surface-disabled'],
  },
  footerLinks: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    // 점 없이 간격만으로 나눈다
    gap: Spacing.md,
  },
  footerLink: {
    fontFamily: Typography.caption.medium.fontFamily,
    fontSize: Typography.caption.medium.fontSize,
    fontWeight: Typography.caption.medium.fontWeight as '500',
    lineHeight: Typography.caption.medium.lineHeight,
    letterSpacing: Typography.caption.medium.letterSpacing,
    color: colors['foreground/on-surface-disabled'],
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
