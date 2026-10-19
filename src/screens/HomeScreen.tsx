import {SETTINGS_ROUTE} from '@utils/navigation';
import {sessionKey, recordNewSession, currentSessionNumber} from '@utils/session';
import {OFFICIAL_AUTHOR_ID, OFFICIAL_AUTHOR_HANDLE, OFFICIAL_AUTHOR_DISPLAY_NAME} from '../types/author';
import {cookbookColorOf} from '@contexts/RecipeContext';
import {getCookbookColorKey} from '@components/ColorPicker';
import {IconBookFilled} from '@components/Icon/IconIndex';
import {getColorVarKey} from '@components/ColorPicker';
import {IconExprolerBookFilled} from '@components/Icon/IconIndex';
import {useBreadcrumbItemOffset} from '@components/Navigation/Breadcrumb';
import {cookbookMenuItem} from '@utils/cookbookMenuItem';
import {ProfileHeader} from '@components/ProfileHeader';
import {shareProfile} from '@utils/shareCookbook';
import {IconSettings} from '@components/Icon/IconIndex';
import {useLandingMenu, methodMenuItem, allMenuItem} from '@components/RecipeGroups/groupAxis';
import {IconShare} from '@components/Icon/IconIndex';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useRouter} from 'expo-router';
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
import {useExplorePins} from '@hooks/useExplorePins';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {GroupScreen} from './GroupScreen';
import {axisLabel, useAxisMenuItems, type GroupAxis} from '@components/RecipeGroups/groupAxis';
import {crumbAxisOf} from '@hooks/useCrumbAxis';
import {useAddSheet} from '@contexts/AddSheetContext';
import {IconAdd} from '@components/Icon/IconIndex';
import {Spacing} from '@constants/spacing';
import {generateRecipeListHtml, type RecipePdfData} from '@utils/generateRecipeHtml';
import {parseSession, formatSession} from '@utils/session';
import {getRecipeMenuItems} from '@utils/recipeMenuItems';
import {useMadeCount} from '@hooks/useMadeCount';
import {useRecipeReviews} from '@hooks/useRecipeReviews';
import {useMadeStamps} from '@hooks/useMadeStamps';
import {CookbookSelectSheet, MadeConfirmSheet, InquirySheet} from '@components/BottomSheet';
import {sendAppInquiry} from '@utils/appInquiry';
import type {AvatarColor} from '@components/Avatar/Avatar';
import {DEFAULT_AXES} from '@components/RecipeGroups/groupAxis';
import {ShareRecipeSheet} from '@components/BottomSheet/ShareRecipeSheet';
import {computeLockedIds, insertLockItems, isLockMenuId, useSetExploreLock} from '@hooks/useExploreLock';
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
    session: `${currentSessionNumber(recipe)}회차`,
    showPin: true,
    isPinned: !!recipe.pinnedAt,
    // 상세 오버플로우와 같은 항목 — 팁은 만드는 게 아니라 읽는 정보라 만들었어요·새 회차가 빠진다
    showMade: recipe.kind !== 'tip',
    isMade: isMadeOf(recipe),
    showRemake: recipe.kind !== 'tip', showEdit: true, showDelete: true, showCookbook: true,
    showShare: true,
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
  /** 작성자 홈 머리말 — 내 홈과 같은 프로필 머리말로 보여준다 */
  authorProfile?: {name: string; handle?: string; avatarSeed: string | number};
  /** 축 셀렉터 메뉴 최상단에 한 줄로 넣을 작성자 정보 노드(작성자 홈용). */
  menuHeaderNode?: React.ReactNode;
}

export function HomeScreen({authorId, initialAxis, onBack, authorBadge, authorProfile, menuHeaderNode}: HomeScreenProps = {}) {
  const breadcrumbItemOffset = useBreadcrumbItemOffset();
  const {t} = useTranslation();
  const styles = useThemedStyles(createStyles);
  const isAuthorMode = !!authorId;
  // 작성자 홈은 고른 북·공법을 따로 둔다 — 내 홈과 같은 저장소를 쓰면 남의 홈에서 고른 게
  // 내 홈 필터를 덮어써서 "기억이 안 되는" 것처럼 보였다
  const [authorCookbook, setAuthorCookbook] = useState<string | null>(null);
  const [authorMethod, setAuthorMethod] = useState<string | null>(null);
  const colors = useColors();
  const router = useRouter();
  const {recipes: myRecipes, setRecipes, selectedCookbook: mySelectedCookbook, setSelectedCookbook: setMySelectedCookbook, selectedMethod: mySelectedMethod, setSelectedMethod: setMySelectedMethod, availableCookbooks: myAvailableCookbooks, cookbookColors, setCookbookColor, removeCookbookColor, isLoading: myLoading, reload, canAddRecipe} = useRecipes();
  const selectedCookbook = isAuthorMode ? authorCookbook : mySelectedCookbook;
  const setSelectedCookbook = isAuthorMode ? setAuthorCookbook : setMySelectedCookbook;
  const selectedMethod = isAuthorMode ? authorMethod : mySelectedMethod;
  const setSelectedMethod = isAuthorMode ? setAuthorMethod : setMySelectedMethod;
  const {showSnackbar} = useSnackbar();
  const {setShowCookbookDialog, setCookbookEditTarget} = useAddSheet();
  const {isPro} = useSubscription();
  const {user, isAdmin, displayName, handle, avatarSeed} = useAuth();
  // 홈은 개인 레시피만 표시. explore는 pull-to-refresh 동기화 용도로만 reload 사용.
  const {reload: exploreReload, exploreCookbooks, recipes: exploreRecipesAll, isLoading: exploreLoading} = useExploreRecipeContext();

  // 작성자 홈 모드: 내 레시피 대신 이 authorId로 필터된 둘러보기 레시피. 구조는 홈과 동일.
  // 내 홈: 내 레시피 + 내가 둘러보기에 공개한 레시피를 한 장씩.
  // 공개본은 원본(sourceRecipeId, 예전 것은 같은 제목)이 있으면 원본 카드에 공개 표시만 하고,
  // 원본이 없는 공개본(둘러보기에 직접 쓴 공식 레시피 등)은 그대로 목록에 넣는다.
  const myAuthorKey = isAdmin ? OFFICIAL_AUTHOR_ID : user?.uid;
  // publishedIds = 공식(둘러보기에 올라간) 레시피 — 공개·비공개 상관없이. 카드 공식 아이콘·'공식' 필터
  // 핀 — 내가 쓴 공식 레시피는 둘러보기 핀(계정)과 같은 것으로 본다. 어느 쪽에서 고정해도 내 홈에서도 고정
  const {pins: explorePins, togglePin: setExplorePin} = useExplorePins();
  const {homeRecipes, publishedIds, exploreIdOf} = useMemo(() => {
    const ids = new Set<string>();
    // 홈 카드 id → 둘러보기 공개본 id
    const pubOf = new Map<string, string>();
    if (isAuthorMode || !myAuthorKey) return {homeRecipes: myRecipes, publishedIds: ids, exploreIdOf: pubOf};
    const byId = new Map(myRecipes.map(r => [r.id, r]));
    // 같은 제목이 여럿(일반 북 복사본 + 공식 북 원본)일 수 있다 — 공개본과 같은 북에 있는 쪽을 원본으로 본다.
    // 제목 하나에 한 장만 두면 마지막(복사본)이 이겨, 공식 북 쪽 카드에서 공식 표시가 빠졌다
    const byTitleAll = new Map<string, Recipe[]>();
    for (const r of myRecipes) {
      const k = r.title.trim();
      byTitleAll.set(k, [...(byTitleAll.get(k) ?? []), r]);
    }
    const titleMatch = (p: Recipe) => {
      const list = byTitleAll.get(p.title.trim());
      return list?.find(r => r.cookbook === p.cookbook) ?? list?.[0];
    };
    const orphans: Recipe[] = [];
    for (const p of exploreRecipesAll) {
      if (p.authorId !== myAuthorKey) continue;
      const own = (p.sourceRecipeId && byId.get(p.sourceRecipeId)) || titleMatch(p);
      const id = own ? own.id : p.id;
      if (!own) orphans.push(p);
      ids.add(id);
      pubOf.set(id, p.id);
    }
    // 내가 쓴 레시피는 내가 공개하는 이름(관리자=공식 베이키)으로 묶는다.
    // 관리자의 개인 레시피엔 계정 uid가 박혀 있어, 공식 북에 섞이면 "by 베이키 외 1명"으로 보였다
    const mine = user?.uid && myAuthorKey !== user.uid
      ? myRecipes.map(r => (r.authorId === user.uid ? {...r, authorId: myAuthorKey, authorHandle: OFFICIAL_AUTHOR_HANDLE} : r))
      : myRecipes;
    // 공개본이 둘러보기에서 고정돼 있으면 홈 카드도 고정(먼저 고정한 시각 기준)
    const withPins = [...mine, ...orphans].map(r => {
      const pubPin = pubOf.has(r.id) ? explorePins[pubOf.get(r.id)!] : undefined;
      if (!pubPin) return r;
      const at = r.pinnedAt && r.pinnedAt < pubPin ? r.pinnedAt : pubPin;
      return {...r, pinnedAt: at};
    });
    return {homeRecipes: withPins, publishedIds: ids, exploreIdOf: pubOf};
  }, [isAuthorMode, myAuthorKey, myRecipes, exploreRecipesAll, user?.uid, explorePins]);
  // 전체 / 개인 / 공개
  const [visibility, setVisibility] = useState<'all' | 'personal' | 'public'>('all');
  // 전체/개인/공식도 마지막 선택을 기억한다
  const visLoaded = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem('@bakle_home_visibility').then(v => {
      if (v === 'all' || v === 'personal' || v === 'public') setVisibility(v);
    }).catch(() => {}).finally(() => { visLoaded.current = true; });
  }, []);
  useEffect(() => {
    if (visLoaded.current && !isAuthorMode) AsyncStorage.setItem('@bakle_home_visibility', visibility).catch(() => {});
  }, [visibility, isAuthorMode]);

  const recipes = useMemo(
    () => isAuthorMode ? exploreRecipesAll.filter(r => r.authorId === authorId && !r.hidden) : homeRecipes,
    [isAuthorMode, exploreRecipesAll, authorId, homeRecipes],
  );
  // 둘러보기 잠금 — 작성자 홈(둘러보기 레시피)과 어드민 내 홈(공식 레시피)도 둘러보기와 같은 규칙으로 자물쇠.
  // 어드민은 표시만(열기는 그대로), 무료 사용자는 작성자 홈에서 열면 잠금 화면.
  const isFreeUser = !isAdmin && !isPro;
  const lockedRecipeIds = useMemo(() => {
    if (isAuthorMode) return isAdmin || isFreeUser ? computeLockedIds(recipes) : undefined;
    if (!isAdmin || exploreIdOf.size === 0) return undefined;
    const lockedExplore = computeLockedIds(exploreRecipesAll.filter(r => r.authorId === OFFICIAL_AUTHOR_ID && !r.hidden));
    const ids = new Set<string>();
    exploreIdOf.forEach((pub, homeId) => { if (lockedExplore.has(pub)) ids.add(homeId); });
    return ids;
  }, [isAuthorMode, isAdmin, isFreeUser, recipes, exploreIdOf, exploreRecipesAll]);
  /** 이 카드의 둘러보기 문서 — 작성자 홈은 그대로, 내 홈은 공개본 */
  const exploreRecipeOf = useCallback((r: Recipe) => {
    const id = isAuthorMode ? r.id : exploreIdOf.get(r.id);
    return id ? exploreRecipesAll.find(x => x.id === id) : undefined;
  }, [isAuthorMode, exploreIdOf, exploreRecipesAll]);
  const setExploreLock = useSetExploreLock();
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
  // 이미 열린 홈으로 축을 지정해 다시 들어오면(설정 → 공식 레시피북) 그 축으로 바꾼다
  useEffect(() => { if (initialAxis) setGroupAxis(initialAxis); }, [initialAxis]);
  // 레시피북/공법 목록에서 항목을 눌러 들어왔는지 — 들어왔으면 탭 대신 2뎁스 셀렉터 (crumbAxisOf 참고)
  const [drillFrom, setDrillFrom] = useState<GroupAxis | null>(null);
  // 레시피북·공법에서 들어온 상태(뒤로가기로 돌아갈 곳)도 기억 — 축·북·공법은 이미 저장된다
  const drillLoaded = useRef(false);
  useEffect(() => {
    if (isAuthorMode) { drillLoaded.current = true; return; }
    AsyncStorage.getItem('@bakle_home_drill').then(v => {
      if (v === 'cookbook' || v === 'method') setDrillFrom(v);
    }).catch(() => {}).finally(() => { drillLoaded.current = true; });
  }, [isAuthorMode]);
  useEffect(() => {
    if (drillLoaded.current && !isAuthorMode) AsyncStorage.setItem('@bakle_home_drill', drillFrom ?? '').catch(() => {});
  }, [drillFrom, isAuthorMode]);
  // 마지막 본 축 복원 (앱 재시작해도 유지). 저장 덮어쓰기 방지용 로드 플래그.
  const axisLoaded = useRef(false);
  useEffect(() => {
    // 처음 축을 정해 들어왔으면 복원하지 않는다
    if (initialAxis || isAuthorMode) { axisLoaded.current = true; return; }
    AsyncStorage.getItem('bakle_home_axis_v1').then(v => {
      // 작성자 홈엔 회고 축이 없다 — 마지막으로 본 게 회고여도 전체로
      if (v) setGroupAxis(isAuthorMode && v === 'retrospective' ? 'all' : (v as GroupAxis));
      axisLoaded.current = true;
    }).catch(() => { axisLoaded.current = true; });
  }, []);
  // 축이 어떤 경로로 바뀌든 저장(내 홈만) — 예전엔 축 메뉴로 바꿀 때만 저장돼, 북 메뉴로 바뀐 축은 잊었다
  useEffect(() => {
    if (axisLoaded.current && !isAuthorMode) AsyncStorage.setItem('bakle_home_axis_v1', groupAxis).catch(() => {});
  }, [groupAxis, isAuthorMode]);
  const handleAxisChange = useCallback((a: GroupAxis) => {
    setGroupAxis(a);
    setDrillFrom(null);
    if (a === 'all') { setSelectedCookbook(null); setSelectedMethod(null); }
  }, [setSelectedCookbook, setSelectedMethod]);
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


  const [showMoreMenu, setShowMoreMenu] = useState(false);
  // 브레드크럼 메뉴: 'axis'(1뎁스 축) | 'item'(2뎁스 항목) | null
  const [crumbMenu, setCrumbMenu] = useState<'axis' | 'item' | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  // 전체 PDF(여러 레시피) — 데이터로 넘겨 레이아웃을 고른다
  const [pdfList, setPdfList] = useState<RecipePdfData[] | null>(null);
  // 레시피 하나 PDF — 데이터(레이아웃 고르기 가능). 전체 PDF는 pdfHtml
  const [pdfData, setPdfData] = useState<RecipePdfData | null>(null);
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
  // 공법이 하나도 없으면 '공법' 보기 자체를 메뉴에서 뺀다(고를 게 없는 빈 화면만 나왔다)
  const hasMethods = useMemo(() => recipes.some(r => !!r.method?.trim()), [recipes]);
  const homeAxes = useMemo(
    () => (isAuthorMode ? DEFAULT_AXES.filter(a => a !== 'retrospective') : DEFAULT_AXES).filter(a => a !== 'method' || hasMethods),
    [isAuthorMode, hasMethods],
  );
  // 공법 보기에 있었는데 공법이 사라졌으면 레시피 보기로
  useEffect(() => { if (groupAxis === 'method' && !hasMethods && !isLoading) setGroupAxis('all'); }, [groupAxis, hasMethods, isLoading]);
  const axisMenuItems = useAxisMenuItems(homeAxes);
  // 보기 메뉴 맨 아래 '홈'(소개 화면) — 로그인 전에만
  const landingMenu = useLandingMenu(axisMenuItems);
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
  const ADD_RECIPE_ID = '__add_recipe__';
  // 메뉴의 레시피북 항목 — 북 아이콘(공식 북은 공식 레시피북 아이콘) + 그 북의 var 색('전체'·추가는 제외)
  const officialBookNames = useMemo(() => new Set((exploreCookbooks ?? []).map(c => c.name)), [exploreCookbooks]);
  const bookItem = useCallback((n: string) => {
    // 공식 북은 내 콘텐츠든 아니든 공식 아이콘·공식 색
    const official = isAuthorMode || officialBookNames.has(n);
    const color = official ? (exploreCookbooks?.find(c => c.name === n)?.color as AvatarColor | undefined) ?? bookColors[n] : bookColors[n];
    return cookbookMenuItem(n, {colors, color, official, hidden: official && !!exploreCookbooks?.find(c => c.name === n)?.hidden});
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
      const items = [allMenuItem(ALL_ID, t('home.all'), 'cookbook', colors), ...noBookLast(names).map(bookItem)];
      // '레시피' 축에선 북을 여기서 고르므로 새 북 만들기도 여기 둔다
      // 단계에 맞는 추가를 맨 아래에 — 레시피 단계는 '레시피 추가', 레시피북에서 들어온 단계는 '레시피 북 추가'
      if (isAuthorMode) return items;
      return crumbAxis === 'all'
        ? [...items, {id: ADD_RECIPE_ID, label: t('home.addRecipeShort'), icon: IconAdd}]
        : [...items, {id: ADD_COOKBOOK_ID, label: t('cookbookSelect.addCookbook'), icon: IconAdd}];
    }
    if (crumbAxis === 'method') {
      const names = new Set<string>();
      for (const r of recipes) names.add(r.method?.trim() || t('home.noMethod'));
      return [allMenuItem(ALL_ID, t('home.all'), 'method', colors), ...[...names].map(n => methodMenuItem(n, colors))];
    }
    return [];
  }, [crumbAxis, recipes, availableCookbooks, t, bookItem, noBookLast, isAuthorMode, colors]);

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
    return [allMenuItem(ALL_ID, t('home.all'), 'cookbook', colors), ...noBookLast(names).map(bookItem)];
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
    if (id === ADD_RECIPE_ID) { handleAddRecipe(); return; }
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

  // 레시피는 하나(회차는 그 안 기록) — 회고 수는 모든 회차 합계
  const {allReviewsOf} = useRecipeReviews();
  const visibleRecipes = useMemo(
    () => recipes.map(r => (r.sessions?.length ? {...r, reviewCount: allReviewsOf(r).length} : r)),
    [recipes, allReviewsOf],
  );

  const filteredRecipes = useMemo(() => {
    let result = visibleRecipes;
    // 공식 = 둘러보기에 올라간 레시피(공개·비공개 상관없이), 개인 = 그 밖의 내 레시피
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
        specificGravity: r.specificGravity,
        description: r.description,
        advice: r.advice,
        doughTemp: r.doughTemp,
        divideWeight: r.divideWeight,
        session: r.session,
        ingredientGroups: r.ingredientGroups ?? [],
        tools: r.tools ?? [],
        steps: r.steps,
        stepGroups: r.stepGroups,
      }));
      setPdfData(null);
      setPdfList(pdfData);
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
    setMade(sessionKey(target), true);
    router.push(`/stamps?just=${encodeURIComponent(target.id)}` as any);
    showSnackbar(t('home.marked'), {
      tone: 'positive',
      label: t('home.undo'),
      onPress: () => setMade(sessionKey(target), false),
    });
  }, [madeSheetRecipe, setMade, router, showSnackbar, t]);

  // 공유 카드 — 상세와 같은 시트. 내 레시피는 링크 없이 카드 이미지로
  const [shareRecipe, setShareRecipe] = useState<Recipe | null>(null);
  const handleCardMenuSelect = useCallback((id: string, recipe: Recipe): void => {
    if (isLockMenuId(id)) {
      const pub = exploreRecipeOf(recipe);
      if (pub) setExploreLock(id, pub.id);
      return;
    }
    if (id === 'pin' || id === 'unpin') {
      // pinnedAt에 시각을 남긴다 — 여러 개를 고정했을 때 핀한 순서대로 위에 쌓인다
      const pinnedAt = id === 'pin' ? new Date().toISOString() : undefined;
      setRecipes(prev => prev.map(r => (r.id === recipe.id ? {...r, pinnedAt} : r)));
      // 공식(둘러보기에 올라간) 레시피면 둘러보기 핀도 같이 — 해제할 때도 양쪽 다
      const pubId = exploreIdOf.get(recipe.id);
      if (pubId) setExplorePin(pubId, id === 'pin');
      showSnackbar(t(id === 'pin' ? 'home.pinned' : 'home.unpinned'), {tone: 'positive'});
      return;
    }
    if (id === 'unmade') {
      setMade(sessionKey(recipe), false);
      showSnackbar(t('home.unmarked'), {
        label: t('home.undo'),
        onPress: () => setMade(sessionKey(recipe), true),
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
      // 새 회차 만들기 — 레시피는 하나. 지금 내용을 지난 회차 기록으로 넘기고 다음 번호로(최근 5개만 남는다)
      setRecipes(prev => prev.map(r => (r.id === recipe.id ? recordNewSession(r) : r)));
      showSnackbar(t('home.newSessionAdded'), {tone: 'positive'});
      router.push(`/recipe/${recipe.id}` as any);
    } else if (id === 'share') {
      setShareRecipe(recipe);
    } else if (id === 'edit') {
      router.push(`/recipe/edit/${recipe.id}`);
    } else if (id === 'delete') {
      setDeleteTarget(recipe);
    } else if (id === 'download') {
      // 레시피 하나 — 데이터로 넘겨 미리보기에서 기본/한번에 보기 레이아웃을 고를 수 있게(상세와 같다)
      setPdfList(null);
      setPdfData({
        title: recipe.title,
        cookbook: recipe.cookbook,
        method: recipe.method,
        reviewCount: recipe.reviewCount,
        time: recipe.time,
        servings: recipe.servings,
        specificGravity: recipe.specificGravity,
        description: recipe.description,
        advice: recipe.advice,
        doughTemp: recipe.doughTemp,
        divideWeight: recipe.divideWeight,
        session: recipe.session,
        ingredientGroups: recipe.ingredientGroups ?? [],
        tools: recipe.tools ?? [],
        steps: recipe.steps,
        stepGroups: recipe.stepGroups,
      });
      setShowPdfPreview(true);
    }
  }, [router, setRecipes, showSnackbar, canAddRecipe, t, isGuest, openAuthSheet, exploreIdOf, setExplorePin, exploreRecipeOf, setExploreLock]);

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
    // 처리 안 된 메뉴 — '예정' 안내는 띄우지 않는다(심사에서 미완성으로 본다)
  }, []);

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

  const homeBanner = (
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
                // 실기면 실기로 걸러진 일정으로(필기가 기본이라 실기 배너에서 들어가면 엉뚱한 목록이 떴다)
                onPress: () => router.navigate((upcomingExam.kind ? `/exam-schedule?kind=${upcomingExam.kind}` : '/exam-schedule') as any),
              }}
              // 닫으면 오늘은 이 배너를 다시 안 띄운다(내일 남은 일수가 바뀌면 다시)
              onClose={dismissExamBanner}
            />
          ) : !isAuthorMode && isGuest ? (
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
            // 닫기 없음 — 기기에만 저장된다는 건 모르면 데이터를 잃을 수 있어 로그인 전엔 늘 보인다
          />
        ) : undefined
  );

  // 프로필 머리말(+배너) — '레시피' 보기와 레시피북·공법 보기가 같은 머리말을 쓴다
  const profileHeader = (
        // 내 홈 맨 위 프로필 머리말 + 그 아래 배너(있을 때)
        !isAuthorMode ? (
          <View style={styles.homeHeader}>
            {/* 배너(시험 일정·게스트 안내)는 프로필 위 — 지금 할 일이라 먼저 보이게 */}
            {homeBanner}
            <ProfileHeader
              // 관리자는 공식 작성자(베이키)로 — 내 홈의 공식 레시피도 베이키 이름으로 묶인다
              name={isAdmin ? OFFICIAL_AUTHOR_DISPLAY_NAME : user ? (displayName || handle || 'handle') : t('home.guestName')}
              // 로그인 전엔 @guest — 책 표지 'by @guest'와 같은 이름
              handle={isAdmin ? OFFICIAL_AUTHOR_HANDLE : user ? handle ?? undefined : 'guest'}
              avatarSeed={isAdmin ? OFFICIAL_AUTHOR_ID : avatarSeed ?? 0}
              stats={[
                // 홈에 보이는 레시피 수 — 개인 레시피만 세면 공식 레시피(관리자) 등이 빠져 1개처럼 보였다
                {value: visibleRecipes.length, label: t('home.statRecipes')},
                {value: publishedIds.size, label: t('home.statPublic')},
              ]}
              onPress={() => (user ? router.push('/account' as any) : openAuthSheet())}
              // 오른쪽 아이콘 버튼: 프로필 공유(로그인 후) · 설정
              iconActions={[
                ...(user ? [{
                  icon: IconShare,
                  onPress: () => shareProfile({
                    handle: isAdmin ? OFFICIAL_AUTHOR_HANDLE : handle || '',
                    name: isAdmin ? OFFICIAL_AUTHOR_DISPLAY_NAME : displayName || handle || '',
                    onCopied: () => showSnackbar(t('groupExpandOverlay.linkCopied')),
                    onError: (m: string) => showSnackbar(m, {tone: 'error'}),
                  }),
                }] : []),
                {icon: IconSettings, onPress: () => router.push(SETTINGS_ROUTE as any)},
              ]}
            />
          </View>
        ) : authorProfile ? (
          // 작성자 홈도 같은 머리말 — 버튼 없이(남의 프로필은 고칠 수 없다)
          <ProfileHeader
            name={authorProfile.name}
            handle={authorProfile.handle}
            avatarSeed={authorProfile.avatarSeed}
            stats={[
              {value: visibleRecipes.length, label: t('home.statRecipes')},
              {value: availableCookbooks.length, label: t('home.statBooks')},
            ]}
            // 남의 프로필 — 공유만(아이콘)
            iconActions={authorProfile.handle ? [{
              icon: IconShare,
              onPress: () => shareProfile({
                handle: authorProfile.handle!,
                name: authorProfile.name,
                onCopied: () => showSnackbar(t('groupExpandOverlay.linkCopied')),
                onError: m => showSnackbar(m, {tone: 'error'}),
              }),
            }] : undefined}
          />
        ) : homeBanner
  );

  if (groupAxis !== 'all') {
    // 홈 = 내 개인 레시피 북만. 공식(explore) 데이터는 GroupScreen에 주입하지 않는다 (둘러보기 전용)
    return (
      <>
      <GroupScreen
        headerExtra={profileHeader}
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
      onRecipePress={(item) => router.push((isAuthorMode && isFreeUser && lockedRecipeIds?.has(item.id) ? `/recipe/${item.id}?from=explore&locked=1` : `/recipe/${item.id}`) as any)}
      cardMenuItems={(recipe) => {
        const items = getDefaultCardMenuItems(recipe, t, r => !!madeAtOf(r));
        const pub = isAdmin ? exploreRecipeOf(recipe) : undefined;
        return pub ? insertLockItems(items, pub.lockMode, !!lockedRecipeIds?.has(recipe.id), t) : items;
      }}
      lockedRecipeIds={lockedRecipeIds}
      onCardMenuSelect={handleCardMenuSelect}
      onOverlayPress={closeLocalMenus}
      extraOverlayVisible={showMoreMenu || crumbMenu !== null}
      onRefresh={reload}
      // 배너가 없으면 undefined — 빈 조각을 넘기면 상단 줄 자리(여백)가 남는다
      listHeaderExtra={profileHeader}
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
                items={landingMenu.items}
                selectedId={crumbAxis}
                onSelect={id => {
                  if (landingMenu.handle(id)) { setCrumbMenu(null); return; }
                  if (axisMenuItems.some(a => a.id === id)) handleHomeAxisSelect(id);
                  else handleCookbookFilterSelect(id);
                }}
                visible={crumbMenu === 'axis'}
                headerNode={menuHeaderNode}
              />
              {crumbItemLabel != null && (
                <Menu
                  // 항목 셀렉터 기준 좌정렬(앞의 축 버튼만큼 민다)
                  style={{marginLeft: breadcrumbItemOffset}}
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
      {shareRecipe ? (
        <ShareRecipeSheet
          visible
          onClose={() => setShareRecipe(null)}
          recipe={{id: shareRecipe.id, title: shareRecipe.title, imageUri: shareRecipe.imageUri, authorHandle: shareRecipe.authorHandle ?? handle ?? undefined, authorAvatarSeed: shareRecipe.authorAvatarSeed ?? avatarSeed ?? undefined}}
          linkable={false}
        />
      ) : null}
      <PdfPreviewDialog
        visible={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        data={pdfData ?? undefined}
        dataList={pdfData ? undefined : pdfList ?? undefined}
        filename={pdfData ? pdfData.title : t('home.allCookbooksFilename')}
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
  // 프로필 머리말과 배너 사이 16
  homeHeader: {gap: Spacing.md},
  deleteAllCount: {
    color: colors['foreground/on-surface-var'],
  },
});
