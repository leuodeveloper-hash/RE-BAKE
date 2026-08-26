import '../global.css';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet, View, Easing, Pressable, Platform} from 'react-native';
import {Stack, usePathname, useRouter} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {useFonts} from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {BlurView} from 'expo-blur';
import {ThemeProvider, useTheme, useColors} from '@contexts/ThemeContext';
import {RecipeProvider} from '@contexts/RecipeContext';
import {SnackbarProvider, useSnackbar} from '@contexts/SnackbarContext';
import {AddSheetProvider, useAddSheet} from '@contexts/AddSheetContext';
import {AuthProvider, useAuth} from '@contexts/AuthContext';
import {useExamNotificationPrefs} from '@hooks/useExamNotificationPrefs';
import {SubscriptionProvider, useSubscription} from '@contexts/SubscriptionContext';
import {PlanSheetProvider, usePlanSheet} from '@contexts/PlanSheetContext';
import {AuthSheetProvider, useAuthSheet} from '@contexts/AuthSheetContext';
import {PlanSheet} from '@components/PlanSheet';
import {AuthSheet} from '@components/AuthSheet';
import {ExploreRecipeProvider, useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {migrateExploreCategoryToCookbook} from '@hooks/useExploreRecipes';
import {migrateStorageKeys} from '@utils/migrateStorageKeys';
import {LanguageProvider, useTranslation} from '@contexts/LanguageContext';
import {YouTubePlayerProvider, useYouTubePlayer} from '@contexts/YouTubePlayerContext';
import {YouTubePlayerModal} from '@components/YouTubePlayer';
import {SearchCommandBar} from '@components/SearchCommandBar/SearchCommandBar';
import {parseSession} from '@utils/session';
import {syncTodayRecipeToWidget} from '@utils/widgetSync';
import {checkForUpdate} from '@utils/appVersionCheck';
import type {Recipe} from '../src/types/recipe';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {ContentMask} from '@components/Container';
import {BottomTabBar, type TabItem, type AddMenuItem} from '@components/Navigation/BottomTabBar';
import {Snackbar} from '@components/Snackbar';
import {CookbookDialog, Dialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {
  IconHomeFilled,
  IconBookFilled,
  IconSearch,
  IconCompassFilled,
  IconExprolerBookFilled,
  IconAdd,
  IconUserFilled,
  IconNoteFilled,
} from '@components/Icon/IconIndex';
import {collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where} from 'firebase/firestore';
import {db} from '@config/firebase';
import {useRecipes} from '@contexts/RecipeContext';
import type {AvatarColor} from '@components/Avatar/Avatar';
import LogoBadge from '../assets/images/logo_badge_reddark.svg';
import LogoIcon from '../assets/images/logo_badge.svg';

SplashScreen.preventAutoHideAsync();

// 포그라운드에서도 알림 배너/사운드가 보이도록 핸들러 등록 (앱 실행 시 1회)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function ThemedStatusBar() {
  const {isDark} = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

const LOGO_W = 104;
const LOGO_H = 110;
const STRIP_COUNT = 6;
const STRIP_H = Math.ceil(LOGO_H / STRIP_COUNT);
const DIAGONAL_PX = 6; // 사선 오프셋 (px)

function AnimatedSplash({onFinish}: {onFinish: () => void}) {
  const stripAnims = useRef(
    Array.from({length: STRIP_COUNT}, () => new Animated.Value(0)),
  ).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const tiltAnim = useRef(new Animated.Value(1)).current; // 1 = 기울임, 0 = 바로
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. 크레파스 쓱싹쓱싹: 한 줄씩 순서대로 칠하기
    const brushStrokes = Animated.stagger(
      180,
      stripAnims.map(anim =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ),
    );

    brushStrokes.start(() => {
      // 2. 기울기 바로잡기 + 탄력 스케일
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 9,
          tension: 80,
          useNativeDriver: false,
        }),
        Animated.timing(tiltAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start(() => {
        // 3. 잠시 유지 후 페이드 아웃
        setTimeout(() => {
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start(onFinish);
        }, 500);
      });
    });
  }, []);

  return (
    <Animated.View
      style={[splashStyles.container, {opacity: overlayOpacity}]}
      pointerEvents="none"
    >
      <View>
        <Animated.View style={{transform: [
          {scale: scaleAnim},
          {rotate: tiltAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '-4deg'],
          })},
        ]}}>
          {/* 고스트 뱃지 (연한 실루엣) */}
          <LogoBadge width={LOGO_W} height={LOGO_H} opacity={0.1} />
          {/* 크레파스 스트립들 */}
          {stripAnims.map((anim, i) => {
            const isLTR = i % 2 === 0;
            // 사선 효과: 각 줄마다 약간씩 비스듬하게 이동
            const diagonalOffset = isLTR
              ? anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-DIAGONAL_PX, 0],
                })
              : anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [DIAGONAL_PX, 0],
                });
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  top: i * STRIP_H,
                  left: 0,
                  width: LOGO_W,
                  height: STRIP_H + 1,
                  overflow: 'hidden',
                  transform: [{translateX: diagonalOffset}],
                }}>
                <Animated.View
                  style={{
                    position: 'absolute',
                    [isLTR ? 'left' : 'right']: 0,
                    top: 0,
                    height: STRIP_H + 1,
                    width: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, LOGO_W + DIAGONAL_PX],
                    }),
                    overflow: 'hidden',
                  }}>
                  <Animated.View
                    style={{
                      position: 'absolute',
                      [isLTR ? 'left' : 'right']: 0,
                      top: -i * STRIP_H,
                      transform: [{translateX: isLTR
                        ? anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [DIAGONAL_PX, 0],
                          })
                        : anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-DIAGONAL_PX, 0],
                          }),
                      }],
                    }}>
                    <LogoBadge width={LOGO_W} height={LOGO_H} />
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            );
          })}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8F5ED', // 크림 — 네이티브 스플래시 배경(#F8F5ED)과 통일 (기존 피치 orange-10 대체)
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
});

function NavigationContent() {
  const router = useRouter();
  const pathname = usePathname();
  const {t} = useTranslation();
  // 앱 시작 시 시험 알림 동기화 (저장된 prefs → Firestore 일정 fetch → 로컬 알림 재등록)
  useExamNotificationPrefs();
  const {showAddSheet, setShowAddSheet, setShowSearchSheet, hideTabBar, hideContentMask, showCookbookDialog, setShowCookbookDialog, cookbookEditTarget, setCookbookEditTarget, cookbookInitialOfficial, setCookbookInitialOfficial, onCookbookCreatedRef} = useAddSheet();
  const {snackbar, clearSnackbar, showSnackbar} = useSnackbar();
  const {user, isAdmin, avatarSeed} = useAuth();
  const {recipes, setRecipes, lastSyncedAt, setCookbookColor, renameCookbookColor, migrationCount, confirmMigration, dismissMigration} = useRecipes();
  const {reload: exploreReload, exploreCookbooks, recipes: exploreRecipesAll} = useExploreRecipeContext();
  const [migrating, setMigrating] = useState(false);

  // 앱 재시작 시 마지막으로 본 레시피로 복귀 (한 번만).
  // NavigationContent는 Stack 하위 + router 보유라 navigate 안전(RootLayout에선 크래시).
  // 딥링크(위젯 등)로 이미 /recipe/로 열렸거나, 저장된 레시피가 없거나 무효면 홈 유지.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    // 웹은 주소창이 곧 사용자의 의도다. 복귀시키면 홈을 입력해도 상세로 튕기고,
    // 개발 중엔 핫 리로드마다 되살아난다. 앱(네이티브)에서만 마지막 화면 복귀.
    if (Platform.OS === 'web') { restoredRef.current = true; return; }
    // recipes/explore 둘 다 아직 안 채워졌으면 로딩 중일 수 있어 대기(deps로 재실행됨).
    if (recipes.length === 0 && exploreRecipesAll.length === 0) return;
    restoredRef.current = true;
    (async () => {
      try {
        // 사용자가 특정 경로로 직접 들어온 경우엔 복귀시키지 않는다.
        // (주소창에 홈을 쳐도 상세로 튕기던 문제 — pathname이 '/'가 아니면 의도된 진입)
        if (pathname && pathname !== '/') return;
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl.includes('/recipe/')) return;
        const lastId = await AsyncStorage.getItem('last_viewed_recipe_id');
        if (!lastId) return;
        const exists = recipes.some(r => r.id === lastId) || exploreRecipesAll.some(r => r.id === lastId);
        if (exists) router.push(`/recipe/${lastId}` as any);
        else AsyncStorage.removeItem('last_viewed_recipe_id');
      } catch { /* 무시 — 홈 유지 */ }
    })();
  }, [recipes, exploreRecipesAll, router]);

  // 오늘의 레시피를 iOS 위젯에 동기화(iOS 전용, 그 외 no-op).
  // exploreRecipesAll은 이미 권한 반영됨(어드민이면 hidden 포함).
  useEffect(() => {
    if (exploreRecipesAll.length === 0) return;
    syncTodayRecipeToWidget(exploreRecipesAll).catch(() => {/* 무시 */});
  }, [exploreRecipesAll]);

  // 앱/웹 접속 시 새 버전 체크 → 있으면 스낵바로 알림(버튼: 웹=새로고침, 앱=스토어).
  useEffect(() => {
    checkForUpdate().then(res => {
      if (!res) return;
      showSnackbar(t('layout.updateAvailable'), {
        label: t('layout.updateAction'),
        onPress: res.onUpdate,
      });
    });
    // 마운트 시 1회. showSnackbar/t는 안정적.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 기존 데이터 마이그레이션(어드민 1회): explore_recipes 레거시 category → cookbook 필드 정리.
  useEffect(() => {
    if (!isAdmin) return;
    migrateExploreCategoryToCookbook()
      .then(n => { if (n > 0) { showSnackbar(t('layout.officialFieldsCleaned', {count: n})); exploreReload(); } })
      .catch(e => console.warn('explore category 마이그레이션 실패:', e));
    // isAdmin 전환 시 1회. showSnackbar/exploreReload는 안정적이라 deps 최소화.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleConfirmMigration = useCallback(async () => {
    setMigrating(true);
    showSnackbar(t('layout.uploadingToCloud'));
    try {
      await confirmMigration();
      showSnackbar(t('layout.uploadedToAccount'));
    } catch {
      showSnackbar(t('layout.uploadFailed'));
    } finally {
      setMigrating(false);
    }
  }, [confirmMigration, showSnackbar, t]);
  const prevUserRef = useRef(user);
  const tabStyles = useThemedStyles(createTabBarStyles);
  const colors = useColors();
  const [activeTab, setActiveTab] = useState('home');

  // 로그인 후 첫 싱크 완료 시 스낵바 표시
  useEffect(() => {
    if (!prevUserRef.current && user && lastSyncedAt) {
      showSnackbar(t('layout.cloudSyncComplete'));
    }
    prevUserRef.current = user;
  }, [user, lastSyncedAt, showSnackbar, t]);

  useEffect(() => {
    if (pathname === '/') setActiveTab('home');
    else if (pathname === '/group') setActiveTab('group');
    else if (pathname === '/explore') setActiveTab('explore');
    else if (pathname === '/profile') setActiveTab('profile');
    // 작성자 홈(/u/[handle])은 둘러보기 소속 → 둘러보기 탭 활성으로 표시.
    // (매칭 안 되면 activeTab이 이전값 '홈'에 남아 탭이 안 바뀌던 문제)
    else if (pathname.startsWith('/u/')) setActiveTab('explore');
  }, [pathname]);

  // 레시피 상세/편집 라우트에서는 메인 탭바 숨김 (상세는 회차 눈금 슬라이더가 대신함)
  const isRecipeRoute = pathname.startsWith('/recipe/');
  const shouldShowTabBar = !isRecipeRoute && !hideTabBar;

  const tabs = useMemo<TabItem[]>(() => [
    {id: 'home', label: t('layout.tabHome'), icon: IconHomeFilled, onPress: () => router.navigate('/' as any)},
    {id: 'search', label: t('layout.tabSearch'), icon: IconSearch, onPress: () => setShowSearchSheet(true)},
    {id: 'add', label: t('layout.tabAdd'), icon: IconAdd, onPress: () => setShowAddSheet(true)},
    {id: 'explore', label: t('layout.tabExplore'), icon: IconCompassFilled, onPress: () => router.navigate('/explore' as any)},
    {id: 'profile', label: user ? t('layout.tabMe') : t('layout.tabGuest'), icon: IconUserFilled, useRandomAvatar: true, avatarSeed: avatarSeed ?? 0, onPress: () => router.navigate('/profile' as any)},
  ], [router, setShowAddSheet, setShowSearchSheet, avatarSeed, user, t]);

  const addMenuItems = useMemo<AddMenuItem[]>(() => {
    const items: AddMenuItem[] = [
      {id: 'recipe', label: t('layout.addRecipe'), icon: IconNoteFilled, iconColor: colors['custom/lime']},
    ];
    if (isAdmin) {
      items.push({id: 'official', label: t('layout.addOfficialRecipe'), icon: LogoIcon, iconColor: colors['custom/yellow-var']});
    }
    items.push({id: 'cookbook', label: t('layout.addCookbook'), icon: IconBookFilled, iconColor: colors['custom/brown-var']});
    if (isAdmin) {
      items.push({id: 'official-cookbook', label: t('layout.addOfficialCookbook'), icon: IconExprolerBookFilled, iconColor: colors['custom/orange-var']});
    }
    return items;
  }, [colors, isAdmin, t]);

  const handleAddItemPress = useCallback((item: AddMenuItem) => {
    setShowAddSheet(false);
    if (item.id === 'recipe') {
      router.push('/recipe/edit');
    } else if (item.id === 'official') {
      router.push('/recipe/edit?target=explore' as any);
    } else if (item.id === 'cookbook') {
      setCookbookEditTarget(null);
      setCookbookInitialOfficial(false);
      setShowCookbookDialog(true);
    } else if (item.id === 'official-cookbook') {
      setCookbookEditTarget(null);
      setCookbookInitialOfficial(true);
      setShowCookbookDialog(true);
    }
  }, [router, setShowAddSheet, setCookbookEditTarget, setShowCookbookDialog]);

  const handleCookbookConfirm = useCallback(async (name: string, color: AvatarColor, isOfficial?: boolean, hidden?: boolean) => {
    // 중앙 가드: 이름이 공식(explore) 레시피 북이면 어느 경로로 왔든 개인 데이터로 새지 않게 Firestore 경로로.
    const officialNames = new Set(exploreCookbooks.map(c => c.name));
    const editingOfficial = !!cookbookEditTarget && (cookbookEditTarget.isExplore || officialNames.has(cookbookEditTarget.name));
    if (editingOfficial) {
      // 둘러보기(공식) 레시피 북 편집
      try {
        const oldName = cookbookEditTarget!.name;
        if (name !== oldName) {
          // 이름 변경: 기존 문서 삭제 + 새 문서 생성
          await deleteDoc(doc(db, 'explore_cookbooks', oldName));
          await setDoc(doc(db, 'explore_cookbooks', name), {
            name,
            color,
            hidden: !!hidden,
            createdAt: new Date().toISOString(),
          });
          // 연결된 explore_recipes의 cookbook 필드 업데이트
          const recipesQuery = query(collection(db, 'explore_recipes'), where('cookbook', '==', oldName));
          const snapshot = await getDocs(recipesQuery);
          const updates = snapshot.docs.map(d => updateDoc(d.ref, {cookbook: name}));
          await Promise.all(updates);
        } else {
          // 색상/숨김만 변경 (merge로 createdAt 등 기존 필드 보존)
          await setDoc(doc(db, 'explore_cookbooks', name), {name, color, hidden: !!hidden}, {merge: true});
        }
        await exploreReload();
        showSnackbar(t('layout.officialCookbookUpdated', {name}));
      } catch (e) {
        console.error('공식 레시피 북 수정 실패:', e);
        showSnackbar(t('layout.officialCookbookUpdateFailed'));
      }
    } else if (cookbookEditTarget) {
      if (name !== cookbookEditTarget.name) {
        setRecipes(prev => prev.map(r =>
          r.cookbook === cookbookEditTarget.name ? {...r, cookbook: name} : r,
        ));
        renameCookbookColor(cookbookEditTarget.name, name);
      }
      setCookbookColor(name, color);
    } else if (isOfficial || officialNames.has(name)) {
      try {
        await setDoc(doc(db, 'explore_cookbooks', name), {
          name,
          color,
          hidden: false,
          createdAt: new Date().toISOString(),
        });
        await exploreReload();
        showSnackbar(t('layout.officialCookbookAdded', {name}));
      } catch (e) {
        console.error('공식 레시피 북 추가 실패:', e);
        showSnackbar(t('layout.officialCookbookAddFailed'));
      }
    } else {
      const exists = recipes.some(r => r.cookbook === name);
      if (exists) {
        showSnackbar(t('layout.cookbookAlreadyExists'));
      } else {
        setCookbookColor(name, color);
        showSnackbar(t('layout.cookbookAdded', {name}));
      }
    }
    onCookbookCreatedRef.current?.(name, color);
    onCookbookCreatedRef.current = null;
    setShowCookbookDialog(false);
    setCookbookEditTarget(null);
  }, [cookbookEditTarget, recipes, setRecipes, renameCookbookColor, setCookbookColor, showSnackbar, setShowCookbookDialog, setCookbookEditTarget, onCookbookCreatedRef, exploreReload, exploreCookbooks, t]);

  const handleCookbookClose = useCallback(() => {
    onCookbookCreatedRef.current = null;
    setShowCookbookDialog(false);
    setCookbookEditTarget(null);
  }, [onCookbookCreatedRef, setShowCookbookDialog, setCookbookEditTarget]);

  const handleAddSheetClose = useCallback(() => {
    setShowAddSheet(false);
  }, [setShowAddSheet]);

  return (
    <>
      <Stack screenOptions={{headerShown: false, animation: 'fade'}}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="labs" />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="u/[handle]" options={{animation: 'slide_from_right'}} />
        <Stack.Screen name="admin/submissions" options={{animation: 'slide_from_right'}} />
        {/* 편집은 페이드 — 상세와 같은 자리에서 그대로 편집되는 것처럼 보이게.
            slide_from_bottom은 화면이 위아래로 올라와 다른 화면으로 이동한 인상을 준다. */}
        <Stack.Screen
          name="recipe/edit"
          options={{animation: 'fade', presentation: 'card'}}
        />
        <Stack.Screen
          name="recipe/edit/[id]"
          options={{animation: 'fade', presentation: 'card'}}
        />
      </Stack>

      {/* 스낵바 */}
      <View style={tabStyles.snackbarWrapper} pointerEvents="box-none">
        <Snackbar
          message={snackbar?.message ?? ''}
          action={snackbar?.action}
          icon={snackbar?.icon}
          visible={!!snackbar}
          onClose={clearSnackbar}
        />
      </View>

      {/* 레시피 북 추가/편집 다이얼로그 */}
      <CookbookDialog
        visible={showCookbookDialog}
        onClose={handleCookbookClose}
        onConfirm={handleCookbookConfirm}
        editTarget={cookbookEditTarget}
        isAdmin={isAdmin}
        initialOfficial={cookbookInitialOfficial}
      />

      {/* 게스트→로그인(Pro) 시 로컬 데이터 업로드 확인 */}
      <Dialog
        visible={migrationCount > 0}
        onClose={migrating ? () => {} : dismissMigration}
        title={t('layout.migrationTitle')}
        description={t('layout.migrationDescription', {count: migrationCount})}
        actions={<>
          <Button label={t('layout.later')} variant="soft" onPress={dismissMigration} disabled={migrating} />
          <Button label={migrating ? t('layout.uploading') : t('layout.upload')} variant="filled" onPress={handleConfirmMigration} disabled={migrating} />
        </>}
      />

      {shouldShowTabBar && (
        <>
          {/* 스크림 */}
          {showAddSheet && (
            <Pressable style={tabStyles.scrim} onPress={handleAddSheetClose}>
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            </Pressable>
          )}

          {/* 하단 콘텐츠 마스크 그라디언트 */}
          {!hideContentMask && <ContentMask topHeight={0} />}

          {/* 탭바 */}
          <View style={tabStyles.tabBarWrapper}>
            <BottomTabBar
              tabs={tabs}
              activeTab={activeTab}
              expanded={showAddSheet}
              onClose={handleAddSheetClose}
              addMenuItems={addMenuItems}
              onAddItemPress={handleAddItemPress}
            />
          </View>
        </>
      )}
    </>
  );
}

function GlobalPlanSheet() {
  const {visible, open: openPlanSheet, close} = usePlanSheet();
  const {open: openAuthSheet} = useAuthSheet();
  const {user} = useAuth();
  const {isPro, purchasePackage} = useSubscription();
  const {showSnackbar} = useSnackbar();
  const {t} = useTranslation();

  const handleSubscribePress = useCallback(async (pkg?: any) => {
    if (!user) {
      // 게스트: PlanSheet 닫고 → AuthSheet 열기 → 성공 시 PlanSheet 재오픈
      close();
      setTimeout(() => {
        openAuthSheet({onSuccess: () => setTimeout(openPlanSheet, 300)});
      }, 300);
      return;
    }
    // 상품을 못 불러온 경우(결제 비활성/스토어 미등록) — 구매를 시도하지 않는다
    if (!pkg) {
      showSnackbar(t('layout.subscriptionComingSoon'));
      return;
    }
    const ok = await purchasePackage(pkg);
    if (ok) {
      close();
      showSnackbar(t('layout.subscriptionThanks'));
    }
    // 실패·취소는 스토어가 자체 UI로 알리므로 별도 안내하지 않는다
  }, [user, close, openAuthSheet, openPlanSheet, purchasePackage, showSnackbar, t]);

  return <PlanSheet visible={visible} onClose={close} isPro={isPro} onSubscribePress={handleSubscribePress} />;
}

function GlobalAuthSheet() {
  const {visible, close, fireSuccess} = useAuthSheet();
  return <AuthSheet visible={visible} onClose={close} onSuccess={fireSuccess} />;
}

// 무료 유저가 둘러보기에서 열람 가능한 레시피 수 (ExploreScreen FREE_RECIPE_COUNT와 일치)
const FREE_EXPLORE_COUNT = 3;

// 검색 탭에서 띄우는 통합 검색 모달: 내 레시피 + 둘러보기 레시피 통합 검색
function GlobalSearchSheet() {
  const router = useRouter();
  const {showSearchSheet, setShowSearchSheet} = useAddSheet();
  const {recipes} = useRecipes();
  const {recipes: exploreRecipes} = useExploreRecipeContext();
  const {isAdmin} = useAuth();
  const {isPro} = useSubscription();
  const {t} = useTranslation();
  const isFreeUser = !isAdmin && !isPro;

  const {items, lockedExploreIds} = useMemo(() => {
    // 내 레시피: remakeGroup별 최신 회차 하나만
    const byGroup = new Map<string, Recipe>();
    for (const r of recipes) {
      const key = r.remakeGroupId ?? r.id;
      const ex = byGroup.get(key);
      if (!ex || parseSession(r.session).current > parseSession(ex.session).current) byGroup.set(key, r);
    }
    const mine = [...byGroup.values()].map(r => ({
      id: r.id,
      label: r.title,
      imageUrl: r.imageUri,
      searchableTexts: [r.cookbook, r.method, r.specificGravity].filter(Boolean) as string[],
    }));

    // 둘러보기: 무료 유저는 앞 3개 외 잠금
    const lockedSet = new Set<string>();
    if (isFreeUser) exploreRecipes.slice(FREE_EXPLORE_COUNT).forEach(r => lockedSet.add(r.id));
    const explore = exploreRecipes.map(r => ({
      id: `explore:${r.id}`,
      label: r.title,
      imageUrl: r.imageUri,
      locked: lockedSet.has(r.id),
      searchableTexts: [r.cookbook, r.method, r.specificGravity].filter(Boolean) as string[],
    }));

    return {items: [...mine, ...explore], lockedExploreIds: lockedSet};
  }, [recipes, exploreRecipes, isFreeUser]);

  const handleSelect = useCallback((id: string) => {
    setShowSearchSheet(false);
    if (id.startsWith('explore:')) {
      const realId = id.slice('explore:'.length);
      const locked = lockedExploreIds.has(realId);
      router.push(`/recipe/${realId}?from=explore${locked ? '&locked=1' : ''}` as any);
    } else {
      router.push(`/recipe/${id}` as any);
    }
  }, [router, setShowSearchSheet, lockedExploreIds]);

  return (
    <SearchCommandBar
      visible={showSearchSheet}
      onClose={() => setShowSearchSheet(false)}
      items={items}
      onSelect={handleSelect}
      placeholder={t('layout.searchPlaceholder')}
      useRecipeCards
    />
  );
}

// 모든 화면(상세/편집 포함) 위에 떠 있는 단일 YouTube PiP
function GlobalYouTubePlayer() {
  const {videoId, close} = useYouTubePlayer();
  // 단일 전역 PiP — 상세/요리모드 등 모든 화면 위에 뜨는 하나의 인스턴스(이어재생).
  // useNativeModal 제거: iOS Modal은 투명·box-none이어도 화면 전체 터치를 가로채,
  // 영상이 손톱으로 줄어도 뒤 화면(상세/편집) 버튼이 안 눌렸다. 절대위치 오버레이로 띄워 뒤 터치 통과.
  // 요리모드도 hostAsView(네이티브 Modal 아닌 일반 View)라 이 루트 PiP가 그 위에 그대로 뜬다.
  return <YouTubePlayerModal visible={videoId !== null} onClose={close} videoId={videoId} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
  });
  const [showSplash, setShowSplash] = useState(true);
  // 리브랜딩 스토리지 키 마이그레이션(옛 bakecycle_* → 새 bakle_*). 다른 store가 새 키를
  // 읽기 전에 끝나야 하므로, 완료 전엔 아래에서 렌더를 막는다(게이트).
  const [keysMigrated, setKeysMigrated] = useState(false);
  useEffect(() => {
    migrateStorageKeys().finally(() => setKeysMigrated(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);


  // Android 8+ 알림 채널 등록 (없으면 알림이 묵음/미표시될 수 있음)
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    Notifications.setNotificationChannelAsync('default', {
      name: '기본 알림',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#FCEEE3',
    }).catch(() => {
      /* 무시 */
    });
  }, []);

  if (!fontsLoaded || !keysMigrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
    <LanguageProvider>
    <ThemeProvider>
      <AuthProvider>
      <SubscriptionProvider>
      <SafeAreaProvider>
        <RecipeProvider>
          <SnackbarProvider>
            <ExploreRecipeProvider>
            <AddSheetProvider>
              <PlanSheetProvider>
                <AuthSheetProvider>
                  <YouTubePlayerProvider>
                    <ThemedStatusBar />
                    <NavigationContent />
                    <GlobalYouTubePlayer />
                    <GlobalPlanSheet />
                    <GlobalAuthSheet />
                    <GlobalSearchSheet />
                    {showSplash && (
                      <AnimatedSplash onFinish={() => setShowSplash(false)} />
                    )}
                  </YouTubePlayerProvider>
                </AuthSheetProvider>
              </PlanSheetProvider>
            </AddSheetProvider>
            </ExploreRecipeProvider>
          </SnackbarProvider>
        </RecipeProvider>
      </SafeAreaProvider>
      </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
    </LanguageProvider>
    </GestureHandlerRootView>
  );
}

const createTabBarStyles = (colors: SemanticColors) => StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    zIndex: 20,
  },
  snackbarWrapper: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
    zIndex: 30,
  },
});
