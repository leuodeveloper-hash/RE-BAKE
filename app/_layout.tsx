import '../global.css';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet, View, Easing, Pressable} from 'react-native';
import {Stack, usePathname, useRouter} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useFonts} from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import {BlurView} from 'expo-blur';
import {ThemeProvider, useTheme, useColorsV2} from '@contexts/ThemeContext';
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
import {ExploreRecipeProvider} from '@contexts/ExploreRecipeContext';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {BaseColors} from '@constants/tokens';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {ContentMask} from '@components/Container';
import {BottomTabBar, type TabItem, type AddMenuItem} from '@components/Navigation/BottomTabBar';
import {Snackbar} from '@components/Snackbar';
import {CookbookDialog} from '@components/Dialog';
import {
  IconHomeFilled,
  IconBookFilled,
  IconGroupFilled,
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
    backgroundColor: BaseColors['color-base-orange-10'],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
});

function NavigationContent() {
  const router = useRouter();
  const pathname = usePathname();
  // 앱 시작 시 시험 알림 동기화 (저장된 prefs → Firestore 일정 fetch → 로컬 알림 재등록)
  useExamNotificationPrefs();
  const {showAddSheet, setShowAddSheet, hideTabBar, hideContentMask, showCookbookDialog, setShowCookbookDialog, cookbookEditTarget, setCookbookEditTarget, onCookbookCreatedRef} = useAddSheet();
  const {snackbar, clearSnackbar, showSnackbar} = useSnackbar();
  const {user, isAdmin, avatarSeed} = useAuth();
  const {recipes, setRecipes, lastSyncedAt, setCookbookColor, renameCookbookColor} = useRecipes();
  const prevUserRef = useRef(user);
  const tabStyles = useThemedStylesV2(createTabBarStyles);
  const colors = useColorsV2();
  const [activeTab, setActiveTab] = useState('home');
  const [cookbookInitialOfficial, setCookbookInitialOfficial] = useState(false);

  // 로그인 후 첫 싱크 완료 시 스낵바 표시
  useEffect(() => {
    if (!prevUserRef.current && user && lastSyncedAt) {
      showSnackbar('클라우드 동기화 완료');
    }
    prevUserRef.current = user;
  }, [user, lastSyncedAt, showSnackbar]);

  useEffect(() => {
    if (pathname === '/') setActiveTab('home');
    else if (pathname === '/group') setActiveTab('group');
    else if (pathname === '/explore') setActiveTab('explore');
    else if (pathname === '/profile') setActiveTab('profile');
  }, [pathname]);

  // 레시피 상세/편집 라우트에서는 메인 탭바 숨김 (상세는 회차 눈금 슬라이더가 대신함)
  const isRecipeRoute = pathname.startsWith('/recipe/');
  const shouldShowTabBar = !isRecipeRoute && !hideTabBar;

  const tabs = useMemo<TabItem[]>(() => [
    {id: 'home', label: '홈', icon: IconHomeFilled, onPress: () => router.navigate('/' as any)},
    {id: 'group', label: '그룹', icon: IconGroupFilled, onPress: () => router.navigate('/group' as any)},
    {id: 'add', label: '추가', icon: IconAdd, onPress: () => setShowAddSheet(true)},
    {id: 'explore', label: '둘러보기', icon: IconCompassFilled, onPress: () => router.navigate('/explore' as any)},
    {id: 'profile', label: user ? '나' : '게스트', icon: IconUserFilled, useRandomAvatar: true, avatarSeed: avatarSeed ?? 0, onPress: () => router.navigate('/profile' as any)},
  ], [router, setShowAddSheet, avatarSeed, user]);

  const addMenuItems = useMemo<AddMenuItem[]>(() => {
    const items: AddMenuItem[] = [
      {id: 'recipe', label: '레시피', icon: IconNoteFilled, iconColor: colors['custom/lime']},
    ];
    if (isAdmin) {
      items.push({id: 'official', label: '공식 레시피', icon: LogoIcon, iconColor: colors['custom/yellow-var']});
    }
    items.push({id: 'cookbook', label: '레시피 북', icon: IconBookFilled, iconColor: colors['custom/brown-var']});
    if (isAdmin) {
      items.push({id: 'official-cookbook', label: '공식 레시피 북', icon: IconExprolerBookFilled, iconColor: colors['custom/orange-var']});
    }
    return items;
  }, [colors, isAdmin]);

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

  const handleCookbookConfirm = useCallback(async (name: string, color: AvatarColor, isOfficial?: boolean) => {
    if (cookbookEditTarget?.isExplore) {
      // 둘러보기(공식) 레시피 북 편집
      try {
        const oldName = cookbookEditTarget.name;
        if (name !== oldName) {
          // 이름 변경: 기존 문서 삭제 + 새 문서 생성
          await deleteDoc(doc(db, 'explore_cookbooks', oldName));
          await setDoc(doc(db, 'explore_cookbooks', name), {
            name,
            color,
            createdAt: new Date().toISOString(),
          });
          // 연결된 explore_recipes의 cookbook 필드 업데이트
          const recipesQuery = query(collection(db, 'explore_recipes'), where('cookbook', '==', oldName));
          const snapshot = await getDocs(recipesQuery);
          const updates = snapshot.docs.map(d => updateDoc(d.ref, {cookbook: name}));
          await Promise.all(updates);
        } else {
          // 색상만 변경
          await setDoc(doc(db, 'explore_cookbooks', name), {name, color, createdAt: new Date().toISOString()});
        }
        showSnackbar(`공식 레시피 북 '${name}'이(가) 수정되었습니다`);
      } catch (e) {
        console.error('공식 레시피 북 수정 실패:', e);
        showSnackbar('공식 레시피 북 수정에 실패했습니다');
      }
    } else if (cookbookEditTarget) {
      if (name !== cookbookEditTarget.name) {
        setRecipes(prev => prev.map(r =>
          r.cookbook === cookbookEditTarget.name ? {...r, cookbook: name} : r,
        ));
        renameCookbookColor(cookbookEditTarget.name, name);
      }
      setCookbookColor(name, color);
    } else if (isOfficial) {
      try {
        await setDoc(doc(db, 'explore_cookbooks', name), {
          name,
          color,
          createdAt: new Date().toISOString(),
        });
        showSnackbar(`공식 레시피 북 '${name}'이(가) 추가되었습니다`);
      } catch (e) {
        console.error('공식 레시피 북 추가 실패:', e);
        showSnackbar('공식 레시피 북 추가에 실패했습니다');
      }
    } else {
      const exists = recipes.some(r => r.cookbook === name);
      if (exists) {
        showSnackbar('이미 존재하는 레시피 북입니다');
      } else {
        setCookbookColor(name, color);
        showSnackbar(`'${name}' 레시피 북이 추가되었습니다`);
      }
    }
    onCookbookCreatedRef.current?.(name, color);
    onCookbookCreatedRef.current = null;
    setShowCookbookDialog(false);
    setCookbookEditTarget(null);
  }, [cookbookEditTarget, recipes, setRecipes, renameCookbookColor, setCookbookColor, showSnackbar, setShowCookbookDialog, setCookbookEditTarget, onCookbookCreatedRef]);

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
        <Stack.Screen
          name="recipe/edit"
          options={{animation: 'slide_from_bottom', presentation: 'fullScreenModal'}}
        />
        <Stack.Screen
          name="recipe/edit/[id]"
          options={{animation: 'slide_from_bottom', presentation: 'fullScreenModal'}}
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
  const {isPro} = useSubscription();
  const {showSnackbar} = useSnackbar();

  const handleSubscribePress = useCallback(() => {
    if (!user) {
      // 게스트: PlanSheet 닫고 → AuthSheet 열기 → 성공 시 PlanSheet 재오픈
      close();
      setTimeout(() => {
        openAuthSheet({onSuccess: () => setTimeout(openPlanSheet, 300)});
      }, 300);
    } else {
      // 로그인 상태: 실제 구독은 모바일 결제 SDK 필요 (미구현)
      showSnackbar('구독 결제는 모바일 앱에서 곧 제공됩니다');
    }
  }, [user, close, openAuthSheet, openPlanSheet, showSnackbar]);

  return <PlanSheet visible={visible} onClose={close} isPro={isPro} onSubscribePress={handleSubscribePress} />;
}

function GlobalAuthSheet() {
  const {visible, close, fireSuccess} = useAuthSheet();
  return <AuthSheet visible={visible} onClose={close} onSuccess={fireSuccess} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (__DEV__) return;
    (async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.log('OTA update check failed:', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
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
                  <ThemedStatusBar />
                  <NavigationContent />
                  <GlobalPlanSheet />
                  <GlobalAuthSheet />
                  {showSplash && (
                    <AnimatedSplash onFinish={() => setShowSplash(false)} />
                  )}
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
  );
}

const createTabBarStyles = (colors: SemanticColorsV2) => StyleSheet.create({
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
