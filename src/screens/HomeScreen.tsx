import {SETTINGS_ROUTE} from '@utils/navigation';
import {OFFICIAL_AUTHOR_ID, OFFICIAL_AUTHOR_HANDLE} from '../types/author';
import {cookbookColorOf} from '@contexts/RecipeContext';
import {getCookbookColorKey} from '@components/ColorPicker';
import {IconBookFilled} from '@components/Icon/IconIndex';
import {getColorVarKey} from '@components/ColorPicker';
import {IconExprolerBookFilled} from '@components/Icon/IconIndex';
import {BREADCRUMB_ITEM_OFFSET} from '@components/Navigation/Breadcrumb';
import {cookbookMenuItem} from '@utils/cookbookMenuItem';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Linking, StyleSheet, Text} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect, useRouter} from 'expo-router';
import {AppBar} from '@components/Navigation';
import {Breadcrumb} from '@components/Navigation/Breadcrumb';
import {Menu} from '@components/Menu';
import {RecipeListTemplate} from '@components/Recipe/RecipeListTemplate';
import {Dialog, PdfPreviewDialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {EmptyState} from '@components/EmptyState';
import {InlineBanner} from '@components/InlineBanner';
import {useUpcomingExam} from '@hooks/useUpcomingExam';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import type {Recipe} from '../types/recipe';
import {useTranslation} from '@contexts/LanguageContext';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useAuthSheet} from '@contexts/AuthSheetContext';
import {useColors} from '@contexts/ThemeContext';
import {useSubscription} from '@contexts/SubscriptionContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {GroupScreen} from './GroupScreen';
import {axisLabel, useAxisMenuItems, type GroupAxis} from '@components/RecipeGroups/groupAxis';
import {crumbAxisOf} from '@hooks/useCrumbAxis';
import {useAddSheet} from '@contexts/AddSheetContext';
import {IconAdd} from '@components/Icon/IconIndex';
import {Spacing} from '@constants/spacing';
import {generateRecipeListHtml, generateRecipeHtml} from '@utils/generateRecipeHtml';
import {parseSession, formatSession} from '@utils/session';
import {getRecipeMenuItems} from '@utils/recipeMenuItems';
import {useMadeCount} from '@hooks/useMadeCount';
import {useRecipeReviews} from '@hooks/useRecipeReviews';
import {useMadeStamps} from '@hooks/useMadeStamps';
import {CookbookSelectSheet, MadeConfirmSheet, InquirySheet} from '@components/BottomSheet';
import {sendAppInquiry} from '@utils/appInquiry';
import type {AvatarColor} from '@components/Avatar/Avatar';
import {DEFAULT_AXES} from '@components/RecipeGroups/groupAxis';
import {
  IconTrash,
  IconTrashTwotone,
  IconArrowDownToLine,
  IconCloudFilled,
  IconClockFilled,
  IconStamps,
  IconClose,
} from '@components/Icon/IconIndex';


const makeMoreMenuItems = (t: (key: string) => string) => [
  {id: 'stamps', label: t('stamps.title'), icon: IconStamps},
  {id: 'downloadAll', label: t('home.downloadPdf'), icon: IconArrowDownToLine},
  {id: 'deleteAll', label: t('home.deleteAll'), icon: IconTrash, destructive: true},
];

const getDefaultCardMenuItems = (recipe: Recipe, t: (key: string, params?: Record<string, unknown>) => string, isMadeOf: (r: Recipe) => boolean) =>
  getRecipeMenuItems({
    t,
    session: recipe.session,
    showPin: true,
    isPinned: !!recipe.pinnedAt,
    showMade: true,
    isMade: isMadeOf(recipe),
    showRemake: true, showEdit: true, showDelete: true, showCookbook: true,
  });

export interface HomeScreenProps {
  /** 작성자 홈 모드: 이 authorId로 필터된 둘러보기 레시피를 표시(내 레시피 대신) */
  authorId?: string;
  /** 처음 보여줄 축 — 주면 마지막으로 본 축 대신 이걸로 시작(설정의 레시피북 칸 → 레시피북) */
  initialAxis?: GroupAxis;
  /** 뒤로가기 (작성자 홈 등 하위 화면일 때) */
  onBack?: () => void;
  /** 앱바 타이틀 자리에 넣을 컴팩트 노드(작성자 아바타+닉네임 배지). 주어지면 그룹화 셀렉터 대신 표시 */
  authorBadge?: React.ReactNode;
  /** 축 셀렉터 메뉴 최상단에 한 줄로 넣을 작성자 정보 노드(작성자 홈용). */
  menuHeaderNode?: React.ReactNode;
}

export function HomeScreen({authorId, initialAxis, onBack, authorBadge, menuHeaderNode}: HomeScreenProps = {}) {
  const {t} = useTranslation();
  const styles = useThemedStyles(createStyles);
  const isAuthorMode = !!authorId;
  const colors = useColors();
  const router = useRouter();
  const {recipes: myRecipes, setRecipes, selectedCookbook, setSelectedCookbook, selectedMethod, setSelectedMethod, availableCookbooks: myAvailableCookbooks, cookbookColors, setCookbookColor, removeCookbookColor, isLoading: myLoading, reload, canAddRecipe} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {setShowCookbookDialog, setCookbookEditTarget} = useAddSheet();
  const {isPro} = useSubscription();
  const {user, isAdmin} = useAuth();
  // 홈은 개인 레시피만 표시. explore는 pull-to-refresh 동기화 용도로만 reload 사용.
  const {reload: exploreReload, exploreCookbooks, recipes: exploreRecipesAll, isLoading: exploreLoading} = useExploreRecipeContext();

  // 작성자 홈 모드: 내 레시피 대신 이 authorId로 필터된 둘러보기 레시피. 구조는 홈과 동일.
  // 내 홈: 내 레시피 + 내가 둘러보기에 공개한 레시피를 한 장씩.
  // 공개본은 원본(sourceRecipeId, 예전 것은 같은 제목)이 있으면 원본 카드에 공개 표시만 하고,
  // 원본이 없는 공개본(둘러보기에 직접 쓴 공식 레시피 등)은 그대로 목록에 넣는다.
  const myAuthorKey = isAdmin ? OFFICIAL_AUTHOR_ID : user?.uid;
  const {homeRecipes, publishedIds} = useMemo(() => {
    const ids = new Set<string>();
    if (isAuthorMode || !myAuthorKey) return {homeRecipes: myRecipes, publishedIds: ids};
    const byId = new Map(myRecipes.map(r => [r.id, r]));
    const byTitle = new Map(myRecipes.map(r => [r.title.trim(), r]));
    const orphans: Recipe[] = [];
    for (const p of exploreRecipesAll) {
      if (p.authorId !== myAuthorKey) continue;
      const own = (p.sourceRecipeId && byId.get(p.sourceRecipeId)) || byTitle.get(p.title.trim());
      if (own) ids.add(own.id);
      else { orphans.push(p); ids.add(p.id); }
    }
    // 내가 쓴 레시피는 내가 공개하는 이름(관리자=공식 베이키)으로 묶는다.
    // 관리자의 개인 레시피엔 계정 uid가 박혀 있어, 공식 북에 섞이면 "by 베이키 외 1명"으로 보였다
    const mine = user?.uid && myAuthorKey !== user.uid
      ? myRecipes.map(r => (r.authorId === user.uid ? {...r, authorId: myAuthorKey, authorHandle: OFFICIAL_AUTHOR_HANDLE} : r))
      : myRecipes;
    return {homeRecipes: [...mine, ...orphans], publishedIds: ids};
  }, [isAuthorMode, myAuthorKey, myRecipes, exploreRecipesAll, user?.uid]);
  // 전체 / 개인 / 공개
  const [visibility, setVisibility] = useState<'all' | 'personal' | 'public'>('all');

  const recipes = useMemo(
    () => isAuthorMode ? exploreRecipesAll.filter(r => r.authorId === authorId && !r.hidden) : homeRecipes,
    [isAuthorMode, exploreRecipesAll, authorId, homeRecipes],
  );
  const isLoading = isAuthorMode ? exploreLoading : myLoading;
  const availableCookbooks = isAuthorMode
    ? Array.from(new Set(recipes.map(r => r.cookbook).filter(Boolean) as string[]))
    : myAvailableCookbooks;
  const isGuest = !user;
  const {open: openAuthSheet} = useAuthSheet();

  // 앱바 작성자 칩: 작성자 홈이면 넘겨받은 배지. 내 홈에선 탭바에 이미 내 아바타가
  // 있어 중복·거슬림 → 앱바엔 내 아바타 배지를 넣지 않는다.
  const resolvedBadge = useMemo(() => {
    if (isAuthorMode) return authorBadge;
    return undefined;
  }, [isAuthorMode, authorBadge]);

  // 정리: 개인 cookbookColors에 잘못 들어간 '공식 레시피 북' 이름의 빈 껍데기 제거.
  // (과거 오배선으로 공식 북 이름이 개인 색맵에 새어 홈에 빈 레시피 북으로 뜨던 오염 청소.
  //  실제 개인 레시피가 그 이름을 쓰면 정상 개인 북이므로 보존.)
  useEffect(() => {
    if (!exploreCookbooks?.length) return;
    const officialNames = new Set(exploreCookbooks.map(c => c.name));
    const usedByPersonal = new Set(recipes.map(r => r.cookbook).filter(Boolean) as string[]);
    for (const nameKey of Object.keys(cookbookColors)) {
      if (officialNames.has(nameKey) && !usedByPersonal.has(nameKey)) {
        removeCookbookColor(nameKey);
      }
    }
  }, [exploreCookbooks, cookbookColors, recipes, removeCookbookColor]);

  // 그룹화 축: 'all'이면 평면 리스트, 그 외엔 그룹 화면(GroupScreen) 호스팅
  const [groupAxis, setGroupAxis] = useState<GroupAxis>(initialAxis ?? 'all');
  // 레시피북/공법 목록에서 항목을 눌러 들어왔는지 — 들어왔으면 탭 대신 2뎁스 셀렉터 (crumbAxisOf 참고)
  const [drillFrom, setDrillFrom] = useState<GroupAxis | null>(null);
  // 마지막 본 축 복원 (앱 재시작해도 유지). 저장 덮어쓰기 방지용 로드 플래그.
  const axisLoaded = useRef(false);
  useEffect(() => {
    // 처음 축을 정해 들어왔으면 복원하지 않는다
    if (initialAxis) { axisLoaded.current = true; return; }
    AsyncStorage.getItem('bakle_home_axis_v1').then(v => {
      // 작성자 홈엔 회고 축이 없다 — 마지막으로 본 게 회고여도 전체로
      if (v) setGroupAxis(isAuthorMode && v === 'retrospective' ? 'all' : (v as GroupAxis));
      axisLoaded.current = true;
    }).catch(() => { axisLoaded.current = true; });
  }, []);
  const handleAxisChange = useCallback((a: GroupAxis) => {
    setGroupAxis(a);
    setDrillFrom(null);
    if (axisLoaded.current) AsyncStorage.setItem('bakle_home_axis_v1', a).catch(() => {});
    if (a === 'all') { setSelectedCookbook(null); setSelectedMethod(null); }
  }, [setSelectedCookbook, setSelectedMethod]);
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false);
  // 시험이 임박하면 홈 상단에 알린다 (알림 설정에서 고른 종목 기준)
  const upcomingExam = useUpcomingExam();
  // 시험·D-day 배너 닫기 — 오늘 날짜 + 대상 이름으로 기억(다음 날·다른 시험이면 다시 뜬다)
  const examBannerKey = upcomingExam ? `${new Date().toDateString()}|${upcomingExam.label}|${upcomingExam.days}` : '';
  const [examBannerDismissed, setExamBannerDismissed] = useState<string | null>(null);
  useEffect(() => {
    AsyncStorage.getItem('@bakle_exam_banner_dismissed').then(v => setExamBannerDismissed(v)).catch(() => {});
  }, []);
  const examBannerHidden = !!examBannerKey && examBannerDismissed === examBannerKey;
  const dismissExamBanner = useCallback(() => {
    setExamBannerDismissed(examBannerKey);
    AsyncStorage.setItem('@bakle_exam_banner_dismissed', examBannerKey).catch(() => {});
  }, [examBannerKey]);

  // 화면에 다시 진입할 때마다 게스트 배너 dismissal 초기화 → 재표시
  useFocusEffect(
    useCallback(() => {
      setGuestBannerDismissed(false);
    }, []),
  );

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  // 브레드크럼 메뉴: 'axis'(1뎁스 축) | 'item'(2뎁스 항목) | null
  const [crumbMenu, setCrumbMenu] = useState<'axis' | 'item' | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [cookbookSheetRecipe, setCookbookSheetRecipe] = useState<Recipe | null>(null);
  const [madeSheetRecipe, setMadeSheetRecipe] = useState<Recipe | null>(null);
  // 문의는 메일 앱을 열지 않고 앱 안에서 받는다(주소 비노출)
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const madeCount = useMadeCount();
  const {reviewsOf} = useRecipeReviews();
  const {setMade, madeAtOf} = useMadeStamps();
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);

  // 홈 타이틀 드롭다운 = 그룹화 축 선택 (공통 모듈, 전체/레시피북/공법/회고)
  // 보기 종류 — 작성자 홈엔 회고가 없다(내 홈에서만). 아래 GroupScreen과 같은 목록을 쓴다
  const homeAxes = useMemo(() => (isAuthorMode ? DEFAULT_AXES.filter(a => a !== 'retrospective') : DEFAULT_AXES), [isAuthorMode]);
  const axisMenuItems = useAxisMenuItems(homeAxes);
  // 레시피북 색 — 작성자 홈(공식 북)은 둘러보기 북에 지정된 색, 내 홈은 내가 지정한 색.
  // 작성자 홈에 내 색 지도를 넘기면 공식 북 이름이 없어 전부 기본색으로 나왔다
  const bookColors = useMemo(() => {
    if (!isAuthorMode) return cookbookColors;
    const map: Record<string, AvatarColor> = {};
    exploreCookbooks?.forEach(c => { map[c.name] = c.color as AvatarColor; });
    return map;
  }, [isAuthorMode, cookbookColors, exploreCookbooks]);

  const handleHomeAxisSelect = (id: string) => {
    setCrumbMenu(null);
    handleAxisChange(id as GroupAxis);
  };

  // ===== 브레드크럼 (2뎁스) ===== (AXIS_LABELS는 공통 모듈)
  // 필터가 걸려 있으면 그 축으로, 아니면 현재 groupAxis
  const crumbAxis = crumbAxisOf(groupAxis, {cookbook: selectedCookbook, method: selectedMethod}, drillFrom);
  // '레시피' 축은 [축 아이콘 셀렉터] [레시피북 ⌄] — 북을 안 골랐으면 '전체'.
  // 레시피북/공법에서 들어온 2뎁스는 [돌아갈 축 아이콘] [항목 ⌄].
  const crumbItemLabel = crumbAxis === 'all'
    ? selectedCookbook ?? t('home.all')
    : selectedCookbook ?? selectedMethod ?? undefined;

  // 2뎁스 항목 메뉴 (책/공법 목록 + '전체로')
  const ALL_ID = '__all__';
  const ADD_COOKBOOK_ID = '__add_cookbook__';
  // 메뉴의 레시피북 항목 — 북 아이콘(공식 북은 공식 레시피북 아이콘) + 그 북의 var 색('전체'·추가는 제외)
  const officialBookNames = useMemo(() => new Set((exploreCookbooks ?? []).map(c => c.name)), [exploreCookbooks]);
  const bookItem = useCallback((n: string) => {
    // 공식 북은 내 콘텐츠든 아니든 공식 아이콘·공식 색
    const official = isAuthorMode || officialBookNames.has(n);
    const color = official ? (exploreCookbooks?.find(c => c.name === n)?.color as AvatarColor | undefined) ?? bookColors[n] : bookColors[n];
    return cookbookMenuItem(n, {colors, color, official});
  }, [colors, bookColors, isAuthorMode, officialBookNames, exploreCookbooks]);

  // '레시피북 없음'은 메뉴 맨 끝으로
  const noBookLast = useCallback((names: Iterable<string>) => {
    const none = t('home.noCookbook');
    const list = [...names];
    return [...list.filter(n => n !== none), ...list.filter(n => n === none)];
  }, [t]);

  const crumbItemMenuItems = useMemo(() => {
    if (crumbAxis === 'cookbook' || crumbAxis === 'all') {
      const names = new Set<string>();
      for (const r of recipes) names.add(r.cookbook || t('home.noCookbook'));
      availableCookbooks.forEach(n => names.add(n));
      const items = [{id: ALL_ID, label: t('home.all')}, ...noBookLast(names).map(bookItem)];
      // '레시피' 축에선 북을 여기서 고르므로 새 북 만들기도 여기 둔다
      return crumbAxis === 'all'
        ? [...items, {id: ADD_COOKBOOK_ID, label: t('cookbookSelect.addCookbook'), icon: IconAdd}]
        : items;
    }
    if (crumbAxis === 'method') {
      const names = new Set<string>();
      for (const r of recipes) names.add(r.method?.trim() || t('home.noMethod'));
      return [{id: ALL_ID, label: t('home.all')}, ...[...names].map(n => ({id: n, label: n}))];
    }
    return [];
  }, [crumbAxis, recipes, availableCookbooks, t, bookItem, noBookLast]);

  /**
   * 축 메뉴에 붙는 레시피북 목록.
   *
   * 예전엔 축을 '레시피북'으로 바꿔 책 표지 화면으로 넘어간 뒤에야 북을 골랐다.
   * 필터 하나 걸자고 화면이 두 번 바뀌고 돌아오는 길도 헷갈렸다.
   * 목록을 축 메뉴에 함께 두면 화면을 떠나지 않고 걸러진다.
   * (책 표지 화면은 북 자체를 고치는 자리로 남는다)
   */
  const cookbookFilterItems = useMemo(() => {
    const names = new Set<string>();
    for (const r of recipes) names.add(r.cookbook || t('home.noCookbook'));
    availableCookbooks.forEach(n => names.add(n));
    return [{id: ALL_ID, label: t('home.all')}, ...noBookLast(names).map(bookItem)];
  }, [recipes, availableCookbooks, t, bookItem, noBookLast]);

  const handleCookbookFilterSelect = useCallback((id: string) => {
    setCrumbMenu(null);
    setDrillFrom(null);
    setSelectedMethod(null);
    setSelectedCookbook(id === ALL_ID ? null : id);
    setGroupAxis('all');
  }, [setSelectedCookbook, setSelectedMethod]);

  const handleCrumbItemSelect = (id: string) => {
    setCrumbMenu(null);
    if (id === ADD_COOKBOOK_ID) {
      setCookbookEditTarget(null);
      setShowCookbookDialog(true);
      return;
    }
    // '전체'를 고르면 2뎁스에서 나와 '레시피' 축으로
    if (id === ALL_ID) setDrillFrom(null);
    if (crumbAxis === 'cookbook' || crumbAxis === 'all') {
      setSelectedCookbook(id === ALL_ID ? null : id);
    } else if (crumbAxis === 'method') {
      setSelectedMethod(id === ALL_ID ? null : id);
    }
  };

  // 리메이크 그룹에서 최신 회차만 표시 + 그룹 전체 회고 합산
  const visibleRecipes = useMemo(() => {
    const latestByGroup = new Map<string, Recipe>();
    const reviewsByGroup = new Map<string, number>();
    const standalone: Recipe[] = [];
    for (const r of recipes) {
      if (!r.remakeGroupId) {
        standalone.push(r);
        continue;
      }
      // 그룹 전체 회고 합산
      const prev = reviewsByGroup.get(r.remakeGroupId) ?? 0;
      reviewsByGroup.set(r.remakeGroupId, prev + reviewsOf(r).length);
      // 최신 회차 추적
      const existing = latestByGroup.get(r.remakeGroupId);
      if (!existing) {
        latestByGroup.set(r.remakeGroupId, r);
      } else {
        const existNum = parseInt(existing.session?.match(/(\d+)/)?.[1] ?? '0', 10);
        const rNum = parseInt(r.session?.match(/(\d+)/)?.[1] ?? '0', 10);
        if (rNum > existNum) latestByGroup.set(r.remakeGroupId, r);
      }
    }
    // 최신 회차에 그룹 전체 회고 수 반영
    const result: Recipe[] = [...standalone];
    for (const [groupId, recipe] of latestByGroup) {
      const totalReviews = reviewsByGroup.get(groupId) ?? 0;
      result.push({...recipe, reviewCount: totalReviews});
    }
    return result;
  }, [recipes, reviewsOf]);

  const filteredRecipes = useMemo(() => {
    let result = visibleRecipes;
    if (visibility === 'public') result = result.filter(r => publishedIds.has(r.id));
    else if (visibility === 'personal') result = result.filter(r => !publishedIds.has(r.id));
    if (selectedCookbook) {
      result = result.filter(r => (r.cookbook || t('home.noCookbook')) === selectedCookbook);
    }
    if (selectedMethod) {
      result = result.filter(r => (r.method?.trim() || t('home.noMethod')) === selectedMethod);
    }
    return result;
  }, [visibleRecipes, selectedCookbook, selectedMethod, t, visibility, publishedIds]);

  const handleMoreMenuSelect = (id: string) => {
    if (id === 'stamps') {
      router.push('/stamps' as any);
      return;
    }
    setShowMoreMenu(false);
    if (id === 'downloadAll') {
      const pdfData = recipes.map(r => ({
        title: r.title,
        cookbook: r.cookbook,
        method: r.method,
        reviewCount: r.reviewCount,
        time: r.time,
        servings: r.servings,
        session: r.session,
        ingredientGroups: r.ingredientGroups ?? [],
        tools: r.tools ?? [],
        steps: r.steps,
        stepGroups: r.stepGroups,
      }));
      setPdfHtml(generateRecipeListHtml(pdfData));
      setShowPdfPreview(true);
    } else if (id === 'deleteAll') {
      setShowDeleteAllDialog(true);
    }
  };

  const handleDeleteAll = useCallback(() => {
    const backup = [...recipes];
    setRecipes([]);
    setShowDeleteAllDialog(false);
    showSnackbar(t('home.deletedRecipesCount', {count: backup.length}), {
      label: t('home.undo'),
      onPress: () => setRecipes(backup),
    });
  }, [recipes, setRecipes, showSnackbar, t]);

  const handleMadeConfirm = useCallback(() => {
    const target = madeSheetRecipe;
    if (!target) return;
    // 스탬프는 계정에 보관한다 — 공식/내 레시피 경로를 하나로 둔다
    setMade(target.id, true);
    router.push(`/stamps?just=${encodeURIComponent(target.id)}` as any);
    showSnackbar(t('home.marked'), {
      tone: 'positive',
      label: t('home.undo'),
      onPress: () => setMade(target.id, false),
    });
  }, [madeSheetRecipe, setMade, router, showSnackbar, t]);

  const handleCardMenuSelect = useCallback((id: string, recipe: Recipe): void => {
    if (id === 'pin' || id === 'unpin') {
      // pinnedAt에 시각을 남긴다 — 여러 개를 고정했을 때 핀한 순서대로 위에 쌓인다
      const pinnedAt = id === 'pin' ? new Date().toISOString() : undefined;
      setRecipes(prev => prev.map(r => (r.id === recipe.id ? {...r, pinnedAt} : r)));
      showSnackbar(t(id === 'pin' ? 'home.pinned' : 'home.unpinned'), {tone: 'positive'});
      return;
    }
    if (id === 'unmade') {
      setMade(recipe.id, false);
      showSnackbar(t('home.unmarked'), {
        label: t('home.undo'),
        onPress: () => setMade(recipe.id, true),
      });
      return;
    }
    if (id === 'made') {
      // 스탬프는 계정에 쌓이는 기록이라 로그인이 필요하다 —
      // 게스트로 모아두면 기기를 바꿀 때 통째로 사라진다
      if (isGuest) {
        openAuthSheet({onSuccess: () => setMadeSheetRecipe(recipe)});
        return;
      }
      // 찍을 때만 확인 — 시트에서 밀어야 스탬프가 된다
      setMadeSheetRecipe(recipe);
      return;
    }
    if (id === 'cookbook') {
      setCookbookSheetRecipe(recipe);
      return;
    }
    if (id === 'remake') {
      if (!canAddRecipe()) {
        showSnackbar(t('home.maxRecipesLimit'), {tone: 'error'});
        return;
      }
      const {total} = parseSession(recipe.session);
      if (total >= 5) {
        showSnackbar(t('home.maxRemakeLimit'), {tone: 'error'});
        return;
      }
      const newTotal = total + 1;
      const groupId = recipe.remakeGroupId || recipe.id;
      const newId = `remake_${Date.now()}`;
      const newRecipe: Recipe = {
        ...recipe,
        id: newId,
        session: formatSession(newTotal, newTotal),
        remakeGroupId: groupId,
        reviews: [],
        reviewCount: 0,
        createdAt: new Date().toISOString(),
      };
      setRecipes(prev => [
        ...prev.map(r => {
          if (r.id === recipe.id && !r.remakeGroupId) {
            const {current} = parseSession(r.session);
            return {...r, remakeGroupId: groupId, session: formatSession(current, newTotal)};
          }
          if (r.remakeGroupId === groupId) {
            const {current} = parseSession(r.session);
            return {...r, session: formatSession(current, newTotal)};
          }
          return r;
        }),
        newRecipe,
      ]);
      showSnackbar(t('home.newSessionAdded'), {tone: 'positive'});
      router.push(`/recipe/${newId}` as any);
    } else if (id === 'edit') {
      router.push(`/recipe/edit/${recipe.id}`);
    } else if (id === 'delete') {
      setDeleteTarget(recipe);
    } else if (id === 'download') {
      setPdfHtml(generateRecipeHtml({
        title: recipe.title,
        cookbook: recipe.cookbook,
        method: recipe.method,
        reviewCount: recipe.reviewCount,
        time: recipe.time,
        servings: recipe.servings,
        session: recipe.session,
        ingredientGroups: recipe.ingredientGroups ?? [],
        tools: recipe.tools ?? [],
        steps: recipe.steps,
        stepGroups: recipe.stepGroups,
      }));
      setShowPdfPreview(true);
    }
  }, [router, setRecipes, showSnackbar, canAddRecipe, t, isGuest, openAuthSheet]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const recipe = deleteTarget;
    setDeleteTarget(null);
    const groupId = recipe.remakeGroupId;
    const deleted = groupId
      ? recipes.filter(r => r.remakeGroupId === groupId || r.id === groupId)
      : [recipe];
    setRecipes(prev => prev.filter(r => !deleted.some(d => d.id === r.id)));
    showSnackbar(t('home.recipeDeleted', {title: recipe.title}), {
      label: t('home.undo'),
      onPress: () => setRecipes(prev => [...prev, ...deleted]),
    });
  }, [deleteTarget, recipes, setRecipes, showSnackbar, t]);

  const handleCookbookSheetSelect = useCallback((cookbookName: string) => {
    if (!cookbookSheetRecipe) return;
    const newCookbook = cookbookName === '__none__' ? '' : cookbookName;
    setRecipes(prev => prev.map(r =>
      r.id === cookbookSheetRecipe.id ? {...r, cookbook: newCookbook} : r
    ));
    setCookbookSheetRecipe(null);
    showSnackbar(t('home.movedToCookbook', {title: cookbookSheetRecipe.title, cookbook: newCookbook || t('home.noCookbook')}));
  }, [cookbookSheetRecipe, setRecipes, showSnackbar, t]);

  const handleAddCookbook = useCallback((name: string, color: import('@components/Avatar/Avatar').AvatarColor) => {
    setCookbookColor(name, color);
    if (cookbookSheetRecipe) {
      setRecipes(prev => prev.map(r =>
        r.id === cookbookSheetRecipe.id ? {...r, cookbook: name} : r
      ));
      setCookbookSheetRecipe(null);
      showSnackbar(t('home.movedToCookbook', {title: cookbookSheetRecipe.title, cookbook: name}));
    }
  }, [cookbookSheetRecipe, setCookbookColor, setRecipes, showSnackbar, t]);

  const closeLocalMenus = useCallback(() => {
    setShowMoreMenu(false);
    setCrumbMenu(null);
  }, []);

  // 레시피 추가 — 레시피북 진입 중이면 해당 북으로 미리 지정
  const handleAddRecipe = useCallback(() => {
    if (!canAddRecipe()) {
      // 등급별 안내 — 게스트는 로그인, 무료는 한도 안내, Pro는 문의로 유도
      if (isGuest) {
        showSnackbar(t('home.guestRecipeLimit'), {
          tone: 'error',
          label: t('auth.signIn'),
          onPress: () => openAuthSheet(),
        });
      } else if (isPro) {
        showSnackbar(t('home.proRecipeLimit'), {
          tone: 'error',
          label: t('home.contact'),
          // 메일 앱을 열면 받는 주소가 그대로 보인다 — 앱 안에서 쓰고 서버가 전달한다
          onPress: () => setInquiryOpen(true),
        });
      } else {
        showSnackbar(t('home.maxRecipesLimit'), {tone: 'error'});
      }
      return;
    }
    const params = selectedCookbook ? `?cookbook=${encodeURIComponent(selectedCookbook)}` : '';
    router.push(`/recipe/edit${params}` as any);
  }, [canAddRecipe, isGuest, isPro, openAuthSheet, showSnackbar, selectedCookbook, router, t]);

  // ===== 그룹 모드 (axis !== 'all') 핸들러 =====
  const handleGroupComingSoon = useCallback(() => {
    showSnackbar(t('home.comingSoon'));
  }, [showSnackbar, t]);

  const handleGroupDeleteCookbook = useCallback((name: string) => {
    setRecipes(prev => prev.map(r => (r.cookbook === name ? {...r, cookbook: undefined} : r)));
    removeCookbookColor(name);
    showSnackbar(t('home.cookbookDeleted', {name}));
  }, [setRecipes, removeCookbookColor, showSnackbar, t]);

  // 그룹 탭 = 제자리 필터: 해당 그룹으로 필터하고 평면 리스트로 전환
  const handleGroupCookbookPress = useCallback((name: string) => {
    setSelectedMethod(null);
    setSelectedCookbook(name);
    setDrillFrom('cookbook');
    setGroupAxis('all');
  }, [setSelectedCookbook, setSelectedMethod]);

  const handleGroupMethodPress = useCallback((method: string) => {
    setSelectedCookbook(null);
    setSelectedMethod(method);
    setDrillFrom('method');
    setGroupAxis('all');
  }, [setSelectedCookbook, setSelectedMethod]);

  const handleGroupRecipePress = useCallback((recipeId: string) => {
    router.push(`/recipe/${recipeId}` as any);
  }, [router]);

  const handleGroupRefresh = useCallback(async () => {
    await Promise.all([reload(), exploreReload()]);
  }, [reload, exploreReload]);

  // 그룹 모드: 홈 평면 리스트 대신 그룹 화면을 호스팅
  // 만들었어요 시트 — 목록·팩뷰(회고 노트의 [만들었어요]) 어디서 열어도 같은 시트
  const madeSheet = (
    <MadeConfirmSheet
      visible={!!madeSheetRecipe}
      onClose={() => setMadeSheetRecipe(null)}
      imageUri={madeSheetRecipe?.imageUri}
      stampIndex={madeCount}
      onConfirm={handleMadeConfirm}
      // 회고는 시트에서 받지 않는다 — 스탬프북으로 가서 스탬프가 "탁" 붙은 뒤 회고 시트가 뜬다
    />
  );

  if (groupAxis !== 'all') {
    // 홈 = 내 개인 레시피 북만. 공식(explore) 데이터는 GroupScreen에 주입하지 않는다 (둘러보기 전용)
    return (
      <>
      <GroupScreen
        // 공식 북 판정·색 — 내 홈에 섞인 공식 북도 공식 아이콘으로
        exploreCookbooks={exploreCookbooks}
        recipes={recipes}
        // 둘러보기 레시피에 쓴 회고도 내 기록 — 회고 노트 목록에 보여준다(작성자 홈은 제외)
        retrospectiveExtraRecipes={isAuthorMode ? undefined : exploreRecipesAll}
        cookbookColors={bookColors}
        authorBadge={resolvedBadge}
        menuHeaderNode={menuHeaderNode}
        onBack={onBack}
        axis={groupAxis}
        // 회고는 내 홈에서만 — 작성자 홈(남의·공식 레시피)엔 회고 축을 두지 않는다
        availableAxes={homeAxes}
        onAxisChange={handleAxisChange}
        onComingSoon={handleGroupComingSoon}
        onDeleteCookbook={handleGroupDeleteCookbook}
        onCookbookPress={handleGroupCookbookPress}
        onMethodPress={handleGroupMethodPress}
        onMethodGuidePress={() => router.push('/method-guide' as any)}
        isAdmin={isAdmin}
        onRefresh={handleGroupRefresh}
        onRecipePress={handleGroupRecipePress}
        onAddRecipeToCookbook={(cookbook) => {
          if (!canAddRecipe()) { showSnackbar(t('home.maxRecipesLimit'), {tone: 'error'}); return; }
          router.push(`/recipe/edit?cookbook=${encodeURIComponent(cookbook)}` as any);
        }}
        bookCarousel
      />
      {madeSheet}
      </>
    );
  }

  return (
    <RecipeListTemplate
      data={isLoading ? [] : filteredRecipes}
      loading={isLoading}
      publishedIds={publishedIds}
      // 전체/개인/공개 — 뷰 메뉴 안 필터 섹션(공개한 레시피가 있을 때만)
      filterSection={publishedIds.size > 0 ? {
        title: t('home.visibilityTitle'),
        items: [
          {id: 'vis:all', label: t('home.visibilityAll')},
          {id: 'vis:personal', label: t('home.visibilityPersonal')},
          {id: 'vis:public', label: t('home.visibilityPublic')},
        ],
        selectedId: `vis:${visibility}`,
        onSelect: id => setVisibility(id.slice(4) as typeof visibility),
      } : undefined}
      onRecipePress={(item) => router.push(`/recipe/${item.id}`)}
      cardMenuItems={(recipe) => getDefaultCardMenuItems(recipe, t, r => !!madeAtOf(r))}
      onCardMenuSelect={handleCardMenuSelect}
      onOverlayPress={closeLocalMenus}
      extraOverlayVisible={showMoreMenu || crumbMenu !== null}
      onRefresh={reload}
      // 배너가 없으면 undefined — 빈 조각을 넘기면 상단 줄 자리(여백)가 남는다
      listHeaderExtra={
        // 시험이 임박하면 그 배너를 먼저 — 기한이 있어 더 시급하다
        upcomingExam && !examBannerHidden ? (
          <InlineBanner
            icon={IconClockFilled}
            label={upcomingExam.days === 0
              ? t('home.examToday', {label: upcomingExam.label})
              : t('home.examDday', {label: upcomingExam.label, days: upcomingExam.days})}
            color="warning"
            size="medium"
            action={{
              label: t('home.examSchedule'),
              onPress: () => router.navigate('/exam-schedule' as any),
            }}
            // 닫으면 오늘은 이 배너를 다시 안 띄운다(내일 남은 일수가 바뀌면 다시)
            onClose={dismissExamBanner}
          />
        ) : !isAuthorMode && isGuest && !guestBannerDismissed ? (
        <InlineBanner
          icon={IconCloudFilled}
          label={t('home.guestBanner')}
          color="accent"
          size="medium"
          action={{
            label: t('home.sync'),
            // 동기화 = 계정 연결 — 설정을 거치지 않고 바로 로그인
            onPress: () => openAuthSheet(),
          }}
          onClose={() => setGuestBannerDismissed(true)}
        />
      ) : undefined
      }
      listEmptyComponent={
        !isLoading ? (
          selectedCookbook ? (
            <EmptyState
              category="no-recipe"
              title={t('home.emptyCookbookTitle')}
              subtitle={t('home.emptyCookbookSubtitle')}
              actionLabel={t('home.addRecipe')}
              onAction={() => {
                if (!canAddRecipe()) {
                  showSnackbar(t('home.maxRecipesLimit'), {tone: 'error'});
                  return;
                }
                router.push(`/recipe/edit?cookbook=${encodeURIComponent(selectedCookbook)}` as any);
              }}
            />
          ) : (
            <EmptyState
              category="no-recipe"
              title={t('home.emptyRecipesTitle')}
              subtitle={t('home.emptyRecipesSubtitle')}
              actionLabel={t('home.exploreRecipes')}
              onAction={() => router.push('/(tabs)/explore' as any)}
            />
          )
        ) : undefined
      }
      renderAppBar={({handleFilterPress, showLayoutMenu, closeMenus, layoutMenu, filterIcon}) => (
        <AppBar
          filterIcon={filterIcon}
          // 2뎁스(레시피북·공법)에 들어가면 Breadcrumb이 자체 뒤로가기(‹)를 그린다.
          // 그때 X까지 두면 앱바 왼쪽에 버튼이 둘 붙는다 → 뒤로가기 하나만 남긴다.
          leftIcon={onBack && crumbAxis === 'all' ? IconClose : undefined}
          onLeftPress={onBack && crumbAxis === 'all' ? onBack : undefined}
          titleNode={
            <Breadcrumb
              leadingNode={resolvedBadge}
              axisLabel={axisLabel(t, crumbAxis)}
              axisIcon={axisMenuItems.find(i => i.id === crumbAxis)?.icon}
              axisIconColor={axisMenuItems.find(i => i.id === crumbAxis)?.iconColor}
              itemLabel={crumbItemLabel}
              onAxisPress={() => {
                closeMenus();
                setShowMoreMenu(false);
                setCrumbMenu(prev => (prev === 'axis' ? null : 'axis'));
              }}
              // 들어간 상태(레시피북·공법에서 고른 항목)일 때만 뒤로가기
              onBack={crumbAxis === 'all' ? undefined : () => {
                closeMenus();
                setShowMoreMenu(false);
                setCrumbMenu(null);
                // 상위 목록(레시피북/공법 GroupScreen)으로 복귀
                setGroupAxis(crumbAxis);
                setDrillFrom(null);
                setSelectedCookbook(null);
                setSelectedMethod(null);
              }}
              onItemPress={() => {
                closeMenus();
                setShowMoreMenu(false);
                setCrumbMenu(prev => (prev === 'item' ? null : 'item'));
              }}
            />
          }
          onAddPress={handleAddRecipe}
          // 홈 = 내 화면 — 설정은 탭이 아니라 여기 톱니에서
          onSettingsPress={isAuthorMode ? undefined : () => router.push(SETTINGS_ROUTE as any)}
          onFilterPress={() => {
            closeLocalMenus();
            handleFilterPress();
          }}
          onMenuPress={() => {
            closeMenus();
            setCrumbMenu(null);
            setShowMoreMenu(prev => !prev);
          }}
          filterMenuOpen={showLayoutMenu}
          menuOpen={showMoreMenu}
          titleMenu={
            <>
              {/* '레시피별'을 누르면 메뉴가 레시피북 목록으로 덮인다(아이폰 설정 방식).
                  북을 고르려고 책 표지 화면으로 넘어갔다 돌아오지 않아도 된다.
                  (책 표지 화면은 북 자체를 고치는 자리로 남는다) */}
              <Menu
                items={axisMenuItems}
                selectedId={crumbAxis}
                onSelect={id => {
                  if (axisMenuItems.some(a => a.id === id)) handleHomeAxisSelect(id);
                  else handleCookbookFilterSelect(id);
                }}
                visible={crumbMenu === 'axis'}
                headerNode={menuHeaderNode}
              />
              {crumbItemLabel != null && (
                <Menu
                  // 항목 셀렉터 기준 좌정렬(앞의 축 버튼만큼 민다)
                  style={{marginLeft: BREADCRUMB_ITEM_OFFSET}}
                  items={crumbItemMenuItems}
                  selectedId={crumbAxis === 'all' ? selectedCookbook ?? ALL_ID : crumbItemLabel}
                  onSelect={handleCrumbItemSelect}
                  visible={crumbMenu === 'item'}
                />
              )}
            </>
          }
          rightMenu={
            <>
              {layoutMenu}
              <Menu
                items={makeMoreMenuItems(t).map(item =>
                  item.id === 'deleteAll' ? {...item, disabled: recipes.length === 0} : item
                )}
                onSelect={handleMoreMenuSelect}
                visible={showMoreMenu}
              />
            </>
          }
        />
      )}
    >
      {/* 전체 삭제 확인 다이얼로그 */}
      <Dialog
        visible={showDeleteAllDialog}
        onClose={() => setShowDeleteAllDialog(false)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title={t('home.deleteAllTitle')}
        description={<>{t('home.deleteAllPrefix')} <Text style={styles.deleteAllCount}>{t('home.recipesCount', {count: recipes.length})}</Text>{t('home.deleteAllSuffix')}{'\n'}{t('home.deleteAllIrreversible')}</>}
        actions={<>
          <Button label={t('home.cancel')} variant="soft" onPress={() => setShowDeleteAllDialog(false)} />
          <Button label={t('home.delete')} variant="soft" destructive onPress={handleDeleteAll} />
        </>}
      />

      {/* 레시피 삭제 확인 다이얼로그 */}
      <Dialog
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title={t('home.deleteRecipeTitle')}
        description={t('home.deleteRecipeDescription')}
        actions={<>
          <Button label={t('home.cancel')} variant="soft" onPress={() => setDeleteTarget(null)} />
          <Button label={t('home.delete')} variant="soft" destructive onPress={handleConfirmDelete} />
        </>}
      />

      {/* PDF 미리보기 다이얼로그 */}
      <PdfPreviewDialog
        visible={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        html={pdfHtml}
        filename={t('home.allCookbooksFilename')}
      />

      {/* 만들었어요 확인 바텀시트 — 요리모드와 같은 시트를 쓴다 */}
      <InquirySheet
        visible={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        initialKind="recipeLimit"
        onSubmit={(kind, message, replyTo) => {
          sendAppInquiry({kind, message, replyTo: replyTo || undefined, uid: user?.uid})
            .then(() => showSnackbar(t('inquiry.sent'), {tone: 'positive'}))
            .catch(() => showSnackbar(t('inquiry.failed'), {tone: 'error'}));
        }}
      />

      {madeSheet}

      {/* 레시피 북 선택 바텀시트 */}
      <CookbookSelectSheet
        visible={!!cookbookSheetRecipe}
        onClose={() => setCookbookSheetRecipe(null)}
        cookbooks={availableCookbooks}
        cookbookColors={bookColors}
        selectedCookbook={cookbookSheetRecipe?.cookbook}
        onSelect={handleCookbookSheetSelect}
        onAddCookbook={handleAddCookbook}
      />
    </RecipeListTemplate>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  deleteAllCount: {
    color: colors['foreground/on-surface-var'],
  },
});
