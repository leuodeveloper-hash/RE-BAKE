import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Linking,
} from 'react-native';
import {LockedBottomBar} from '@components/LockedBottomBar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {FloatingNavBar, navPillStyle, NavPillButton, RulerSlider} from '@components/Navigation';
import {GlassContainer, ContentContainer, Card, ContentMask} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {SectionHeader} from '@components/SectionHeader';
import {Selector} from '@components/Selector';
import {ListItem} from '@components/ListItem';
import {Menu} from '@components/Menu';
import {Tabs} from '@components/Tabs';
import {EditableChip} from '@components/EditableChip';
import {OptionTile} from '@components/OptionTile';
import {Dialog, PdfPreviewDialog, TimeDialog, ServingsDialog, UnlockDialog} from '@components/Dialog';
import {Button} from '@components/Button';
import type {ReviewData} from '@components/Dialog';
import {CookingMode} from '@components/CookingMode';
import {ReviewLogSheet} from '@components/BottomSheet';
import {Thumbnail} from '@components/Thumbnail';
import {StepPhotos} from '@components/StepPhotos';
import {normalizeStepPhotos} from '@utils/stepPhotos';
import type {StepPhoto} from '../types/recipe';
import {EmptyState} from '@components/EmptyState';
import {SearchCommandBar} from '@components/SearchCommandBar';
import {useYouTubePlayer} from '@contexts/YouTubePlayerContext';
import {useTranslation} from '@contexts/LanguageContext';
import {parseYouTubeVideoId} from '@utils/youtube';
import {parseSession} from '@utils/session';
import {buildSessionDiff, type SessionBaseline} from '@utils/sessionDiff';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {Radius, BaseColors} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {getRecipeMenuItems, getCookbookSubmenuItems} from '@utils/recipeMenuItems';
import {
  IconClose,
  IconPlayFilled,
  IconEllipsisVertical,
  IconClockFilled,
  IconUsersRoundFilled,
  IconArrowDownToLine,
  IconChevronLeft,
  IconChevronRight,
  IconCornerDownRight,
  IconTrashTwotone,
  IconLogoSymbol,
  IconChartNoAxesGantt,
  IconEditFilled,
  IconNoteFilled,
  IconArrowTopRight,
  IconImport,
  IconToolCaseFilled,
  IconSearch,
  IconSparkle,
  IconEyeClosed,
} from '@components/Icon/IconIndex';

// 메타 정보 타입
interface MetaInfo {
  icon: React.FC<any>;
  label: string;
  onPress?: () => void;
}

// 재료 타입 (props 입력용 - percentage 없음)
interface IngredientInput {
  name: string;
  amount: string;
}

interface IngredientGroupInput {
  title: string;
  ingredients: IngredientInput[];
}

// 도구 타입
interface Tool {
  name: string;
}

interface ToolGroupInput {
  title: string;
  tools: Tool[];
}

// 과정 타입
interface ProcessStep {
  step: number;
  description: string;
  tip?: string;
  caution?: string;
  photos?: (string | StepPhoto)[];
  ingredients?: {name: string; amount: string}[];
}

interface ProcessStepGroup {
  title: string;
  steps: ProcessStep[];
}

export interface RecipeDetailScreenProps {
  /** 레시피 ID (shared element transition tag 용) */
  id?: string;
  title?: string;
  cookbook?: string;
  method?: string;
  reviewCount?: number;
  ratio?: string;
  reviews?: ReviewData[];
  advice?: string;
  advicePhotos?: string[];
  imageUri?: string;
  time?: string;
  servings?: string;
  session?: string;
  ingredientGroups?: IngredientGroupInput[];
  tools?: Tool[];
  toolGroups?: ToolGroupInput[];
  steps?: ProcessStep[];
  stepGroups?: ProcessStepGroup[];
  activeFieldIds?: string[];
  onBack?: () => void;
  onAddPress?: () => void;
  onMenuPress?: () => void;
  onComingSoon?: () => void;
  onEdit?: (section?: string) => void;
  onDelete?: () => void;
  onRemake?: () => void;
  /** 둘러보기에서 진입 시: 내 레시피로 복사 */
  onImport?: () => void;
  /** 인라인 편집 시: 변경 데이터 전달 */
  onUpdate?: (data: Record<string, any>) => void;
  /** 쿠킹모드 표시 상태 변경 콜백 */
  onCookingModeChange?: (visible: boolean) => void;
  /** 회차 목록 (2개 이상일 때 Selector 표시) */
  sessionItems?: {id: string; label: string}[];
  /** 회차 선택 시 이동 */
  onSessionSelect?: (recipeId: string) => void;
  /** 회차별 회고 데이터 (바텀시트용) */
  sessionReviews?: {id: string; label: string; reviews: ReviewData[]}[];
  /** 1회차 원본 데이터 (2회차+ 일 때만 전달). 있으면 "1회차와 비교" 토글 노출 */
  compareBaseline?: SessionBaseline | null;
  /** 레시피 북 변경 콜백 (있을 때만 레시피 북 메뉴 표시) */
  onCookbookChange?: (cookbook: string) => void;
  /** 레시피 북 목록 (레시피 북 서브메뉴용) */
  availableCookbooks?: string[];
  /** 레시피 북 색상 매핑 (레시피 북 서브메뉴용) */
  cookbookColors?: Record<string, import('@components/Avatar/Avatar').AvatarColor>;
  /** 잠금 상태 (paywall): 스크롤 비활성 + 하단 잠금해제 버튼 */
  locked?: boolean;
  /** 비공개(숨김) — 제목 뒤 자물쇠 (어드민 전용 공식 콘텐츠) */
  hidden?: boolean;
  /** 잠금 해제 요청 (광고 시청) */
  onUnlock?: () => void;
  /** 광고 로딩 중 여부 */
  adLoading?: boolean;
  /** 구독 화면 열기 */
  onSubscribe?: () => void;
  /** 쿠킹모드 레시피 전환용 */
  recipeItems?: {id: string; label: string; iconColor?: string; imageUrl?: string; searchableTexts?: string[]}[];
  currentRecipeId?: string;
  onRecipeSelect?: (id: string) => void;
  /** 내 레시피를 둘러보기에 복사 (어드민 전용) */
  onCopyToExplore?: () => void;
  /** 유저: 둘러보기에 공개 신청 (어드민 승인 필요) */
  onSubmitToExplore?: () => void;
  /** 삭제 전 확인 다이얼로그 표시 (둘러보기 레시피) */
  showDeleteConfirm?: boolean;
  /** 참고 링크 URL */
  referenceUrl?: string;
  /** 원본 출처 URL — 외부 사이트(만개의레시피 등)에서 가져온 경우 */
  sourceUrl?: string;
  /** 둘러보기에서 복사한 경우 원본 작성자 핸들 (from @핸들 표시) */
  sourceHandle?: string;
  /** 원본 작성자 홈으로 이동 */
  onSourcePress?: () => void;
  /** 공유 버튼 (잠금 해제된 콘텐츠에서만 표시) */
  onShare?: () => void;
  /** 작성자 닉네임 스냅샷 (공유/둘러보기 레시피에 표시) */
  authorHandle?: string;
  /** 작성자 아바타 시드 스냅샷 */
  authorAvatarSeed?: string;
  /** 작성자 id — 공식(bakey)이면 심볼 로고 아바타 */
  authorId?: string;
  /** 작성자 칩 탭 → 작성자 홈으로 */
  onAuthorPress?: () => void;
}

// 베이커스 퍼센티지 자동계산
function parseAmountGrams(amount: string): number {
  const match = amount.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function formatPercentage(value: number): string {
  if (value === 0) return '-';
  const rounded = Math.round(value * 10) / 10;
  return rounded === Math.floor(rounded) ? `${rounded}%` : `${rounded}%`;
}

const FLOUR_KEYWORDS = ['강력분', '중력분', '박력분', '밀가루', '통밀', '쌀가루'];
function hasFlour(groups: IngredientGroupInput[]): boolean {
  return groups.some(g => g.ingredients.some(i => FLOUR_KEYWORDS.some(k => i.name.includes(k))));
}

function computeBakersPercentages(
  groups: IngredientGroupInput[],
): {title: string; ingredients: {percentage: string; name: string; amount: string}[]}[] {
  const baseAmount = parseAmountGrams(groups[0]?.ingredients[0]?.amount ?? '0');

  return groups.map(group => ({
    title: group.title,
    ingredients: group.ingredients.map(ing => {
      const amount = parseAmountGrams(ing.amount);
      const pct = baseAmount > 0 ? (amount / baseAmount) * 100 : 0;
      return {
        percentage: formatPercentage(pct),
        name: ing.name,
        amount: ing.amount,
      };
    }),
  }));
}

const DEFAULT_INGREDIENT_GROUPS: IngredientGroupInput[] = [
  {title: '가루류', ingredients: [
    {name: '박력분', amount: '500g'},
    {name: '베이킹소다', amount: '2g'},
    {name: '베이킹파우더', amount: '8g'},
    {name: '코코아파우더', amount: '60g'},
    {name: '탈지분유', amount: '30g'},
  ]},
  {title: '반죽재료', ingredients: [
    {name: '설탕', amount: '30g'},
    {name: '버터', amount: '300g'},
    {name: '달걀', amount: '300g'},
    {name: '소금', amount: '5g'},
    {name: '물', amount: '175g'},
  ]},
  {title: '토핑', ingredients: [
    {name: '초코칩', amount: '180g'},
  ]},
];

const DEFAULT_TOOLS: Tool[] = [
  {name: '계량기'},
  {name: '계량스푼'},
  {name: '믹싱볼'},
  {name: '가스레인지'},
  {name: '거품기'},
  {name: '채망'},
  {name: '짤주머니'},
  {name: '고무주걱'},
  {name: '나무주걱'},
  {name: '나무꼬치'},
  {name: '머핀 팬'},
  {name: '머핀 유산지'},
  {name: '오븐'},
];

const DEFAULT_STEPS: ProcessStep[] = [
  {step: 1, description: '가루 재료를 섞어서 체 쳐요.', tip: '박력분·베이킹소다·베이킹파우더·코코아파우더·탈지분유'},
  {step: 2, description: '버터를 중탕으로 10% 정도 녹여요.', tip: '버터를 중탕한 물에 재료인 물을 따뜻해지게 담아놔요.'},
  {step: 3, description: '버터를 믹싱볼에 넣고 부드럽게 풀어주고 설탕과 소금을 넣고 섞어요.', tip: '설탕이 60% 정도 용해되고 아이보리색 될 때까지, 스크래핑해주며 충분히 믹싱해요!'},
  {step: 4, description: '달걀 3회 나눠서 넣어요.', tip: '1,2회는 노른자 위주, 3회에 흰자를 넣어요. 저속~중속~고속으로 섞어서 부드러워질 때까지!'},
  {step: 5, description: '체 친 가루를 넣고 11자로 섞어요.', tip: '밑면, 옆면을 긁고 주걱으로 11자를 그리며 날가루 안 보일 때까지 섞어요.'},
  {step: 6, description: '중탕했던 물을 넣고 섞어요.', tip: '물이 없어질 때까지 섞어요. 섞을 때는 나무주걱, 옆면을 긁을 때는 고무주걱이 편해요!'},
  {step: 7, description: '3분의 1정도 남기고 초코칩을 넣어서 섞어요.', tip: '다 넣어도 괜찮지만 3분의 1정도는 반죽 위에 토핑처럼 올려줘도 좋아요!'},
  {step: 8, description: '짤주머니에 반죽을 넣고 깍지 안 끼고 짜요.', tip: '천 짤주머니 추천! 1cm 띄고 직각으로 가운데서 쭉 눌러서 50~60%로 24개 채운 후 나머지 반죽을 모자란 부분에 더 채워요.'},
  {step: 9, description: '남겨둔 초코칩을 위에 토핑으로 올려요.', tip: '반죽이 골고루 되도록 오븐에 넣기 전 팬을 한번 탕하고 쳐요.'},
  {step: 10, description: '180/160도에서 15분 굽고 부풀어 오르면 170/150도로 15분 정도 더 구워요.'},
  {step: 11, description: '다 구워진 후 팬에서 빼서 평철판 위에서 냉각시켜요.', tip: '나무꼬치로 꽂아서 반죽이 안 묻어 나오면 다 익은 것!'},
];

const makeSectionTabs = (t: (key: string) => string) => [
  {id: 'ingredients', label: t('recipeDetail.tabIngredients')},
  {id: 'steps', label: t('recipeDetail.tabSteps')},
  {id: 'review', label: t('recipeDetail.tabReview')},
];

/** 히어로 이미지 최대폭 — 이보다 화면이 넓으면 이미지 좌우에 빈 배경이 생겨 페이드 노출 */
const HERO_MAX_WIDTH = 1000;

export function RecipeDetailScreen({
  id,
  title: titleProp,
  cookbook,
  method,
  reviewCount = 0,
  ratio,
  reviews,
  advice,
  advicePhotos,
  imageUri,
  time,
  servings,
  session,
  ingredientGroups = DEFAULT_INGREDIENT_GROUPS,
  tools = DEFAULT_TOOLS,
  toolGroups,
  steps = DEFAULT_STEPS,
  stepGroups,
  activeFieldIds,
  onBack,
  onAddPress,
  onComingSoon,
  onEdit,
  onDelete,
  onRemake,
  onImport,
  onUpdate,
  onCookingModeChange,
  sessionItems,
  sessionReviews,
  compareBaseline,
  onSessionSelect,
  onCookbookChange,
  availableCookbooks,
  cookbookColors,
  locked = false,
  hidden = false,
  onUnlock,
  adLoading = false,
  onSubscribe,
  recipeItems,
  currentRecipeId,
  onRecipeSelect,
  onCopyToExplore,
  onSubmitToExplore,
  showDeleteConfirm = false,
  referenceUrl,
  sourceUrl,
  sourceHandle,
  onSourcePress,
  onShare,
  authorHandle,
  onAuthorPress,
}: RecipeDetailScreenProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const {width: windowWidth} = useWindowDimensions();
  const colors = useColors();
  const canEdit = !!onUpdate;
  const SECTION_TABS = useMemo(() => makeSectionTabs(t), [t]);
  const title = titleProp ?? t('recipeDetail.defaultTitle');

  // 1회차와 비교 토글 + diff — 기본 켜짐 (compareBaseline 있는 2회차+에서만 실제 표시)
  const [showDiff, setShowDiff] = useState(true);
  const diff = useMemo(
    () =>
      compareBaseline
        ? buildSessionDiff(
            {ingredientGroups, steps, stepGroups, method, specificGravity: ratio},
            compareBaseline,
          )
        : null,
    [compareBaseline, ingredientGroups, steps, stepGroups, method, ratio],
  );
  const diffOn = showDiff && !!diff;

  // 필드 활성 여부 헬퍼
  const isFieldActive = (id: string) => !activeFieldIds || activeFieldIds.includes(id);

  // toolGroups 우선, 없으면 tools를 단일 그룹으로 래핑
  const resolvedToolGroups: ToolGroupInput[] = useMemo(() => {
    if (toolGroups && toolGroups.length > 0) return toolGroups;
    return [{title: t('recipeDetail.tools'), tools: tools ?? []}];
  }, [toolGroups, tools, t]);
  const toolsHasContent = useMemo(
    () => resolvedToolGroups.some(g => g.tools.length > 0),
    [resolvedToolGroups],
  );

  const totalReviewCount = sessionReviews
    ? sessionReviews.reduce((sum, s) => sum + s.reviews.length, 0)
    : (reviews?.length ?? 0);
  const totalSessions = sessionItems?.length ?? 0;
  const reviewLabel = totalSessions > 1 ? `${totalReviewCount}/${totalSessions}` : `${totalReviewCount}`;
  const insets = useSafeAreaInsets();
  const [showMenu, setShowMenu] = useState(false);
  const [showCookbookSubmenu, setShowCookbookSubmenu] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [showServingsDialog, setShowServingsDialog] = useState(false);
  const [showCookingMode, setShowCookingMode] = useState(false);
  const [cookingModeInitialIndex, setCookingModeInitialIndex] = useState(0);
  const [cookingModeShowIngredients, setCookingModeShowIngredients] = useState(false);
  const hasMultipleSessions = sessionItems && sessionItems.length > 1;
  // 회차(시리즈)에서 생긴 레시피면 현재 회차 번호(1-based)를 타이틀 옆에 #N으로 표시
  const sessionNumber = hasMultipleSessions
    ? sessionItems!.findIndex(i => i.id === currentRecipeId) + 1
    : 0;
  // 상단 nav 탭은 항상 가로 Tabs로 고정 (너비에 따른 형태 전환 비활성화)
  const useCompactTabs = false;
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // PiP는 앱 루트에서 단일 인스턴스로 관리 (편집 등 화면 전환 시에도 유지)
  const {open: openYouTube, videoId: ytVideoId} = useYouTubePlayer();

  const referenceYouTubeId = useMemo(() => parseYouTubeVideoId(referenceUrl), [referenceUrl]);

  const handleOpenReference = useCallback(() => {
    if (!referenceUrl) return;
    if (referenceYouTubeId) {
      openYouTube(referenceYouTubeId);
    } else {
      Linking.openURL(referenceUrl);
    }
  }, [referenceUrl, referenceYouTubeId, openYouTube]);
  const [searchFilter, setSearchFilter] = useState<'cookbook' | 'method' | null>(null);
  const [showReviewSheet, setShowReviewSheet] = useState(false);

  const searchFilteredItems = useMemo(() => {
    if (!searchFilter || !recipeItems) return [];
    const filterValue = searchFilter === 'cookbook' ? cookbook : method;
    if (!filterValue) return [];
    return recipeItems.filter(item =>
      item.searchableTexts?.some(t => t === filterValue),
    );
  }, [searchFilter, recipeItems, cookbook, method]);

  const handleOpenReviewSheet = useCallback(() => {
    setShowReviewSheet(true);
  }, []);

  // ---- 상단 이미지 좌우 스와이프 → 이웃 레시피로 이동 ----
  // recipeItems(현재 목록) 순서에서 현재 위치 기준 이전/다음 id를 계산.
  const {prevRecipeId, nextRecipeId} = useMemo(() => {
    if (!recipeItems || recipeItems.length < 2 || !currentRecipeId) {
      return {prevRecipeId: undefined, nextRecipeId: undefined};
    }
    const idx = recipeItems.findIndex(r => r.id === currentRecipeId);
    if (idx === -1) return {prevRecipeId: undefined, nextRecipeId: undefined};
    return {
      prevRecipeId: idx > 0 ? recipeItems[idx - 1].id : undefined,
      nextRecipeId: idx < recipeItems.length - 1 ? recipeItems[idx + 1].id : undefined,
    };
  }, [recipeItems, currentRecipeId]);

  // 최신 값 참조용 ref(PanResponder는 한 번만 생성되므로 클로저 고정 방지)
  const swipeRef = useRef({prevRecipeId, nextRecipeId, onRecipeSelect, locked});
  swipeRef.current = {prevRecipeId, nextRecipeId, onRecipeSelect, locked};

  const heroPanResponder = useRef(
    PanResponder.create({
      // 가로 이동이 세로보다 뚜렷할 때만 제스처를 가로챈다(세로 스크롤과 충돌 방지).
      onMoveShouldSetPanResponder: (_evt, g) =>
        Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_evt, g) => {
        const {prevRecipeId: p, nextRecipeId: n, onRecipeSelect: sel, locked: lk} = swipeRef.current;
        if (lk || !sel) return;
        if (g.dx <= -50 && n) sel(n);      // 왼쪽으로 밀면 다음
        else if (g.dx >= 50 && p) sel(p);  // 오른쪽으로 밀면 이전
      },
    }),
  ).current;

  // ---- 스크롤 기반 탭 추적 ----
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({ingredients: 0, steps: 0, review: 0});
  const [activeTab, setActiveTab] = useState('ingredients');
  const activeTabRef = useRef('ingredients');

  const isTabScrolling = useRef(false);
  const tabScrollTarget = useRef(0);

  const handleScrollBeginDrag = useCallback(() => {
    isTabScrolling.current = false;
  }, []);

  const handleDetailScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;

    // 프로그래매틱 스크롤이 목표에 도달하면 해제
    if (isTabScrolling.current) {
      if (Math.abs(y - tabScrollTarget.current) < 2) {
        isTabScrolling.current = false;
      }
      return;
    }

    const positions = sectionPositions.current;
    const navOffset = 100;
    let newTab = 'ingredients';
    if (positions.review > 0 && y + navOffset >= positions.review) newTab = 'review';
    else if (positions.steps > 0 && y + navOffset >= positions.steps) newTab = 'steps';
    if (newTab !== activeTabRef.current) {
      activeTabRef.current = newTab;
      setActiveTab(newTab);
    }
  }, []);

  const handleTabPress = useCallback((tabId: string) => {
    activeTabRef.current = tabId;
    setActiveTab(tabId);
    const y = sectionPositions.current[tabId];
    if (y !== undefined && scrollViewRef.current) {
      const target = Math.max(0, y - 80);
      tabScrollTarget.current = target;
      isTabScrolling.current = true;
      (scrollViewRef.current as any).scrollTo({y: target, animated: true});
    }
  }, []);

  useEffect(() => {
    onCookingModeChange?.(showCookingMode);
  }, [showCookingMode, onCookingModeChange]);

  // ---- 기존 로직 ----
  const hasFlourBase = useMemo(() => hasFlour(ingredientGroups), [ingredientGroups]);
  const computedGroups = useMemo(() => computeBakersPercentages(ingredientGroups), [ingredientGroups]);
  const ingredientsHasContent = useMemo(
    () => computedGroups.some(g => g.ingredients.length > 0),
    [computedGroups],
  );
  const stepsHasContent = useMemo(
    () => stepGroups
      ? stepGroups.some(g => g.steps.length > 0)
      : (steps?.length ?? 0) > 0,
    [stepGroups, steps],
  );

  const menuItems = useMemo(() => {
    const items = getRecipeMenuItems({
      t,
      session,
      showImport: !!onImport,
      showRemake: !!onRemake,
      showEdit: !!onEdit,
      showDelete: !!onDelete,
      showCookbook: !!onCookbookChange,
      showCopyToExplore: !!onCopyToExplore,
      showSubmitToExplore: !!onSubmitToExplore,
      showShare: !!onShare,
    });
    if (compareBaseline) {
      items.unshift({
        id: 'compareDiff',
        label: showDiff ? t('recipeDetail.compareOff') : t('recipeDetail.compareWithFirst'),
        icon: IconSparkle,
      });
    }
    return items;
  },
  [onImport, onRemake, onEdit, onDelete, onCookbookChange, onCopyToExplore, onSubmitToExplore, onShare, session, compareBaseline, showDiff, t]);

  const cookbookSubmenu = useMemo(() => {
    if (!onCookbookChange || !availableCookbooks) return null;
    return getCookbookSubmenuItems({
      t,
      availableCookbooks,
      cookbookColors: cookbookColors ?? {},
      currentCookbook: cookbook ?? '',
      colors,
    });
  }, [onCookbookChange, availableCookbooks, cookbookColors, cookbook, colors, t]);

  const handleMenuPress = () => {
    setShowMenu(prev => !prev);
    setShowCookbookSubmenu(false);
  };

  const handleMenuSelect = (id: string) => {
    if (id === 'cookbook') {
      setShowCookbookSubmenu(true);
      return;
    }
    if (id.startsWith('cookbook:')) {
      const cookbookName = id.slice('cookbook:'.length);
      onCookbookChange?.(cookbookName === '__none__' ? '' : cookbookName);
      setShowMenu(false);
      setShowCookbookSubmenu(false);
      return;
    }
    setShowMenu(false);
    setShowCookbookSubmenu(false);
    if (id === 'compareDiff') {
      setShowDiff(prev => !prev);
    } else if (id === 'save') {
      // 잠긴(페이월) 레시피는 복사 불가 → 언락 다이얼로그 (게스트/무료)
      if (locked) {
        setShowUnlockDialog(true);
      } else {
        onImport?.();
      }
    } else if (id === 'remake') {
      onRemake?.();
    } else if (id === 'edit') {
      onEdit?.();
    } else if (id === 'delete') {
      if (showDeleteConfirm) {
        setShowDeleteDialog(true);
      } else {
        onDelete?.();
      }
    } else if (id === 'copyToExplore') {
      onCopyToExplore?.();
    } else if (id === 'submitToExplore') {
      onSubmitToExplore?.();
    } else if (id === 'share') {
      onShare?.();
    } else if (id === 'download') {
      if (locked) {
        setShowUnlockDialog(true);
      } else {
        setShowPdfPreview(true);
      }
    } else {
      onComingSoon?.();
    }
  };

  const handleOverlayPress = () => {
    if (showCookbookSubmenu) {
      setShowCookbookSubmenu(false);
      return;
    }
    setShowMenu(false);
    setShowTabMenu(false);
  };

  // 페이지 페이드인
  const pageOpacity = useRef(new Animated.Value(0)).current;

  // 스태거드 콘텐츠 애니메이션 (섹션별: 재료/과정/회고)
  const SECTION_COUNT = 3;
  const sectionAnims = useRef(
    Array.from({length: SECTION_COUNT}, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    Animated.timing(pageOpacity, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.stagger(80, sectionAnims.map(anim =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    )).start();
  }, []);

  // 메타 정보
  const metaInfo: MetaInfo[] = [
    ...(time ? [{icon: IconClockFilled, label: time, onPress: canEdit ? () => setShowTimeDialog(true) : undefined}] : []),
    ...(servings ? [{icon: IconUsersRoundFilled, label: servings, onPress: canEdit ? () => setShowServingsDialog(true) : undefined}] : []),
  ];

  // ---- 섹션 헤더 렌더 (sticky용: ScrollView 직속 자식) ----
  const renderSectionHeader = (
    key: string,
    label: string,
    sectionId: string,
    breadcrumb?: string,
  ) => (
    <View key={key} style={styles.stickyHeader}>
      <ContentContainer>
        <SectionHeader
          title={label}
          breadcrumb={breadcrumb}
          breadcrumbIcon={breadcrumb ? IconChevronRight : undefined}
          actionLabel={onEdit ? t('recipeDetail.edit') : undefined}
          onAction={onEdit ? () => onEdit(sectionId) : undefined}
        />
      </ContentContainer>
    </View>
  );

  return (
    <Animated.View style={[styles.container, {opacity: pageOpacity}]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleDetailScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        scrollEventThrottle={16}
        scrollEnabled={!locked}
      >
        {/* Hero Section — 상단 이미지 좌우 스와이프 시 이웃 레시피로 이동 */}
        <View style={styles.heroSection} {...heroPanResponder.panHandlers}>
          {imageUri ? (
            <>
              <Image
                source={{uri: imageUri}}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.heroTextOverlay} />
              {/* 좌우 페이드는 화면이 이미지 최대폭(1000)보다 넓어 이미지 양옆에 빈 배경이
                  실제로 생길 때만 — 좁은(모바일) 화면에선 이미지가 꽉 차 페이드가 이미지 양옆을
                  갉아먹어 어색하므로 숨긴다. */}
              {windowWidth > HERO_MAX_WIDTH && (
                <>
                  {/* 좌측 페이드 — 하단 heroGradient와 동일(surface/dim 그라디언트), 방향만 가로 */}
                  <LinearGradient
                    start={{x: 0, y: 0.5}} end={{x: 1, y: 0.5}}
                    colors={[colors['surface/dim'], colors['surface/dim'] + '00']}
                    locations={[0, 0.35]}
                    style={styles.heroSideGradient}
                    pointerEvents="none"
                  />
                  {/* 우측 페이드 */}
                  <LinearGradient
                    start={{x: 0, y: 0.5}} end={{x: 1, y: 0.5}}
                    colors={[colors['surface/dim'] + '00', colors['surface/dim']]}
                    locations={[0.65, 1]}
                    style={styles.heroSideGradient}
                    pointerEvents="none"
                  />
                </>
              )}
              <LinearGradient
                colors={[colors['surface/dim'] + '00', colors['surface/dim']]}
                locations={[0.5, 0.85]}
                style={styles.heroGradient}
              />
            </>
          ) : null}
          <View style={styles.heroContentWrapper}>
            <ContentContainer style={styles.heroContent}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.heroTitle}>
                  {title}
                  {sessionNumber > 0 && (
                    <Text style={styles.heroTitleSession}> #{sessionNumber}</Text>
                  )}
                </Text>
                {hidden && (
                  <IconEyeClosed width={18} height={18} color={colors['foreground/on-surface-inverse']} />
                )}
              </View>
              <View style={styles.heroDescriptionRow}>
                {authorHandle && (
                  <>
                    <Pressable onPress={onAuthorPress} disabled={!onAuthorPress}>
                      <Text style={styles.heroDescription} numberOfLines={1}>{authorHandle}</Text>
                    </Pressable>
                    <Text style={styles.heroDescription}> · </Text>
                  </>
                )}
                {recipeItems ? (
                  <Pressable style={styles.heroDescriptionTappable} onPress={() => setSearchFilter('cookbook')}>
                    <Text style={[styles.heroDescription, {flexShrink: 1}]} numberOfLines={1}>{cookbook}</Text>
                    <IconSearch width={12} height={12} color={colors['foreground/on-surface-inverse']} />
                  </Pressable>
                ) : (
                  <Text style={styles.heroDescription}>{cookbook}</Text>
                )}
                {method && isFieldActive('method') && (
                  <>
                    <Text style={styles.heroDescription}> · </Text>
                    {recipeItems ? (
                      <Pressable style={styles.heroDescriptionTappable} onPress={() => setSearchFilter('method')}>
                        <Text style={[styles.heroDescription, diffOn && diff!.methodChanged && styles.hlChanged, {flexShrink: 1}]} numberOfLines={1}>{method}</Text>
                        <IconSearch width={12} height={12} color={colors['foreground/on-surface-inverse']} />
                      </Pressable>
                    ) : (
                      <Text style={[styles.heroDescription, diffOn && diff!.methodChanged && styles.hlChanged]}>{method}</Text>
                    )}
                  </>
                )}
                {ratio && isFieldActive('ratio') && (
                  <Text numberOfLines={1} style={[styles.heroDescription, diffOn && diff!.specificGravityChanged && styles.hlChanged]}> · {t('recipeDetail.specificGravity', {ratio})}</Text>
                )}
                {totalReviewCount > 0 && (
                  <>
                    <Text style={styles.heroDescription}> · </Text>
                    <Pressable style={styles.reviewBadge} onPress={sessionReviews ? handleOpenReviewSheet : undefined}>
                      <IconChartNoAxesGantt width={12} height={12} color={colors['foreground/on-surface-inverse']} />
                      <Text style={styles.heroDescription}>{reviewLabel}</Text>
                    </Pressable>
                  </>
                )}
                {referenceUrl && (() => {
                  // 이미 같은 영상이 재생 중이면 참고 링크 비활성 (중복 열기 방지)
                  const referenceOpen = !!referenceYouTubeId && ytVideoId === referenceYouTubeId;
                  return (
                  <>
                    <Text style={styles.heroDescription}> · </Text>
                    <Pressable
                      style={[styles.reviewBadge, referenceOpen && {opacity: 0.4}]}
                      onPress={referenceOpen ? undefined : handleOpenReference}
                      disabled={referenceOpen}>
                      <Text style={styles.heroDescription}>{t('recipeDetail.referenceLink')}</Text>
                      <IconArrowTopRight width={12} height={12} color={colors['foreground/on-surface-inverse']} />
                    </Pressable>
                  </>
                  );
                })()}
              </View>
            </ContentContainer>
          </View>
        </View>

        {/* Meta Info Cards */}
        <Animated.View style={{opacity: sectionAnims[0]}}>
          <ContentContainer style={styles.metaSection}>
            {metaInfo.map((info, index) => (
              <OptionTile key={index} icon={info.icon} label={info.label} onPress={info.onPress} />
            ))}
          </ContentContainer>
        </Animated.View>

        {/* 원본 출처 — 한 줄. URL 있으면 URL, 없고 작성자만 있으면 from @작성자. 참고 링크(referenceUrl)와는 별개 필드 */}
        {(sourceHandle || sourceUrl) && (
          <Animated.View style={{opacity: sectionAnims[0]}}>
            <ContentContainer style={styles.sectionCard}>
              <Card>
                <ListItem
                  title={sourceUrl ? sourceUrl : t('recipeDetail.fromAuthor', {name: `@${sourceHandle}`})}
                  titleNumberOfLines={1}
                  leading={{type: 'icon', icon: IconImport}}
                  showDivider={false}
                  onPress={sourceUrl ? () => Linking.openURL(sourceUrl) : onSourcePress}
                />
              </Card>
            </ContentContainer>
          </Animated.View>
        )}

        {/* Ingredients Section */}
        {isFieldActive('ingredients') && <View onLayout={(e) => { sectionPositions.current.ingredients = e.nativeEvent.layout.y; }} />}
        {isFieldActive('ingredients') && (
          ingredientsHasContent
            ? computedGroups.flatMap((group, groupIndex) => [
                renderSectionHeader(
                  `ing-header-${groupIndex}`,
                  t('recipeDetail.tabIngredients'),
                  'ingredients',
                  computedGroups.length > 1 ? group.title : undefined,
                ),
                <Animated.View key={`ing-content-${groupIndex}`} style={{opacity: sectionAnims[0]}}>
                  <ContentContainer>
                    <Card>
                      {group.ingredients.map((ingredient, index) => {
                        const d = diffOn ? diff!.ingredientStatus.get(ingredient.name.trim()) : undefined;
                        return (
                        <View
                          key={index}
                          style={[
                            styles.ingredientRow,
                            index === group.ingredients.length - 1 && styles.ingredientRowLast,
                          ]}>
                          {hasFlourBase && (
                            <Text style={styles.ingredientPercentage}>
                              {ingredient.percentage}
                            </Text>
                          )}
                          <Text style={styles.ingredientName}>
                            <Text
                              style={[
                                d?.status === 'added' && styles.hlAdded,
                                d?.status === 'changed' && styles.hlChanged,
                              ]}>
                              {ingredient.name}{/\d/.test(ingredient.amount) ? ` ${ingredient.amount}` : ''}
                            </Text>
                            {d?.status === 'changed' && d.prevAmount ? (
                              <Text style={styles.prevAmount}> {d.prevAmount}</Text>
                            ) : null}
                          </Text>
                        </View>
                        );
                      })}
                    </Card>
                  </ContentContainer>
                </Animated.View>,
              ])
            : [
                renderSectionHeader('ing-header-empty', t('recipeDetail.tabIngredients'), 'ingredients'),
                <Animated.View key="ing-content-empty" style={{opacity: sectionAnims[0]}}>
                  <ContentContainer>
                    <Card>
                      <EmptyState variant="simple" title={t('recipeDetail.emptyIngredients')} />
                    </Card>
                  </ContentContainer>
                </Animated.View>,
              ]
        )}

        {/* 1회차에서 빠진 재료 (비교 토글 ON) */}
        {diffOn && diff!.removed.length > 0 && (
          <Animated.View style={{opacity: sectionAnims[0]}}>
            <ContentContainer>
              <Text style={styles.diffCaption}>{t('recipeDetail.removedIngredients')}</Text>
              <Card>
                {diff!.removed.map((ing, i) => (
                  <View
                    key={i}
                    style={[
                      styles.ingredientRow,
                      i === diff!.removed.length - 1 && styles.ingredientRowLast,
                    ]}>
                    <Text style={[styles.ingredientName, styles.removedText]}>
                      {ing.name}{/\d/.test(ing.amount) ? ` ${ing.amount}` : ''}
                    </Text>
                  </View>
                ))}
              </Card>
            </ContentContainer>
          </Animated.View>
        )}

        {/* Tools Section */}
        {renderSectionHeader('tools-header', t('recipeDetail.tools'), 'tools')}
        <Animated.View style={{opacity: sectionAnims[0]}}>
          <ContentContainer>
            <Card>
              {!toolsHasContent ? (
                <EmptyState variant="simple" title={t('recipeDetail.emptyTools')} />
              ) : resolvedToolGroups.length > 1 ? (
                resolvedToolGroups.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    {group.title ? (
                      <ListItem
                        title={group.title}
                        leading={{type: 'icon', icon: IconToolCaseFilled}}
                        showDivider={false}
                      />
                    ) : null}
                    <View style={styles.toolsContainer}>
                      <Text style={styles.toolsText}>
                        {group.tools.map(t => t.name).join(', ')}
                      </Text>
                    </View>
                  </React.Fragment>
                ))
              ) : (
                <View style={styles.toolsContainer}>
                  <Text style={styles.toolsText}>
                    {resolvedToolGroups[0]?.tools.map(t => t.name).join(', ')}
                  </Text>
                </View>
              )}
            </Card>
          </ContentContainer>
        </Animated.View>

        {/* Process Section */}
        {isFieldActive('steps') && <View onLayout={(e) => { sectionPositions.current.steps = e.nativeEvent.layout.y; }} />}
        {isFieldActive('steps') && (!stepsHasContent ? [
          renderSectionHeader('step-header-empty', t('recipeDetail.tabSteps'), 'steps'),
          <Animated.View key="step-content-empty" style={{opacity: sectionAnims[1]}}>
            <ContentContainer>
              <Card>
                <EmptyState variant="simple" title={t('recipeDetail.emptySteps')} />
              </Card>
            </ContentContainer>
          </Animated.View>,
        ] : (stepGroups ? (
          stepGroups.flatMap((group, groupIndex) => {
            const groupOffset = stepGroups.slice(0, groupIndex).reduce((sum, g) => sum + g.steps.length, 0);
            return [
              renderSectionHeader(`step-header-${groupIndex}`, t('recipeDetail.tabSteps'), 'steps', group.title),
              <Animated.View key={`step-content-${groupIndex}`} style={{opacity: sectionAnims[1]}}>
                <ContentContainer>
                  <Card>
                    {group.steps.map((step, index) => {
                      const sd = diffOn ? diff!.stepStatus.get(groupOffset + index) : undefined;
                      return (
                      <ListItem
                        key={index}
                        leading={{type: 'number', value: step.step}}
                        showDivider={index < group.steps.length - 1}
                        titleNumberOfLines={0}
                        onPress={() => {
                          setCookingModeInitialIndex(groupOffset + index);
                          setShowCookingMode(true);
                        }}
                      >
                        <Text style={styles.stepDescription}>
                          <Text
                            style={[
                              sd === 'added' && styles.hlAdded,
                              sd === 'changed' && styles.hlChanged,
                            ]}>{step.description}</Text>
                        </Text>
                        {step.tip && (
                          <View style={styles.tipChipInline}>
                            <EditableChip label={step.tip} variant="tip" />
                          </View>
                        )}
                        {step.caution && (
                          <View style={styles.tipChipInline}>
                            <EditableChip label={step.caution} variant="yellow" />
                          </View>
                        )}
                        {step.photos && step.photos.length > 0 && (
                          <StepPhotos photos={normalizeStepPhotos(step.photos)} mode="view" />
                        )}
                      </ListItem>
                      );
                    })}
                  </Card>
                </ContentContainer>
              </Animated.View>,
            ];
          })
        ) : [
          renderSectionHeader('step-header', t('recipeDetail.tabSteps'), 'steps'),
          <Animated.View key="step-content" style={{opacity: sectionAnims[1]}}>
            <ContentContainer>
              <Card>
                {steps.map((step, index) => {
                  const sd = diffOn ? diff!.stepStatus.get(index) : undefined;
                  return (
                  <ListItem
                    key={index}
                    leading={{type: 'number', value: step.step}}
                    showDivider={index < steps.length - 1}
                    titleNumberOfLines={0}
                    onPress={() => {
                      setCookingModeInitialIndex(index);
                      setShowCookingMode(true);
                    }}
                  >
                    <Text style={styles.stepDescription}>
                      <Text
                        style={[
                          sd === 'added' && styles.hlAdded,
                          sd === 'changed' && styles.hlChanged,
                        ]}>{step.description}</Text>
                    </Text>
                    {step.tip && (
                      <View style={styles.tipChipInline}>
                        <EditableChip label={step.tip} variant="tip" />
                      </View>
                    )}
                    {step.caution && (
                      <View style={styles.tipChipInline}>
                        <EditableChip label={step.caution} variant="yellow" />
                      </View>
                    )}
                    {step.photos && step.photos.length > 0 && (
                      <StepPhotos photos={normalizeStepPhotos(step.photos)} mode="view" />
                    )}
                  </ListItem>
                  );
                })}
              </Card>
            </ContentContainer>
          </Animated.View>,
        ]))}

        {/* Advice Section */}
        {isFieldActive('advice') && advice ? (
          <Animated.View
            onLayout={(e) => { sectionPositions.current.advice = e.nativeEvent.layout.y; }}
            style={{opacity: sectionAnims[2]}}
          >
            <ContentContainer style={styles.sectionCard}>
              <Card variant="yellow">
                <ListItem
                  title={t('recipeDetail.bakeyAdvice')}
                  leading={{type: 'icon', icon: IconLogoSymbol}}
                  trailing={onEdit ? {type: 'iconButton', icon: IconEditFilled, onPress: () => onEdit('advice'), variant: 'ghost-yellow'} : undefined}
                />
                <ListItem
                  titleNumberOfLines={0}
                  showDivider={false}
                  onPress={() => {
                    const totalSteps = stepGroups
                      ? stepGroups.reduce((sum, g) => sum + g.steps.length, 0)
                      : (steps?.length ?? 0);
                    setCookingModeInitialIndex(totalSteps);
                    setShowCookingMode(true);
                  }}
                >
                  <Text style={styles.adviceText}>{advice}</Text>
                </ListItem>
              </Card>
            </ContentContainer>
          </Animated.View>
        ) : null}

        {/* Review Section */}
        <Animated.View
          onLayout={(e) => { sectionPositions.current.review = e.nativeEvent.layout.y; }}
          style={{opacity: sectionAnims[2]}}
        >
          <ContentContainer style={styles.sectionCard}>
            {reviews && reviews.some(rv => rv.evaluation || rv.improvement) ? (
              <Card>
                <ListItem
                  title={t('recipeDetail.tabReview')}
                  leading={{type: 'icon', icon: IconChartNoAxesGantt}}
                  trailing={onEdit || sessionReviews ? {type: 'custom', element: (
                    <View style={styles.reviewTrailingRow}>
                      {sessionReviews ? (
                        <IconButton icon={IconChartNoAxesGantt} size="small" variant="ghost-secondary" onPress={handleOpenReviewSheet} />
                      ) : null}
                      {onEdit ? (
                        <IconButton icon={IconEditFilled} size="small" variant="ghost-secondary" onPress={() => onEdit('review')} />
                      ) : null}
                    </View>
                  )} : undefined}
                />
                {reviews[reviews.length - 1].evaluation ? (
                  <ListItem
                    titleNumberOfLines={0}
                    showDivider={!!reviews[reviews.length - 1].improvement}
                  >
                    <Text style={styles.stepDescription}>{reviews[reviews.length - 1].evaluation}</Text>
                  </ListItem>
                ) : null}
                {reviews[reviews.length - 1].improvement ? (
                  <ListItem
                    leading={{type: 'icon', icon: IconCornerDownRight}}
                    titleNumberOfLines={0}
                    showDivider={false}
                  >
                    <Text style={styles.stepDescription}>{reviews[reviews.length - 1].improvement}</Text>
                  </ListItem>
                ) : null}
              </Card>
            ) : (
              <Card>
                <ListItem
                  title={t('recipeDetail.tabReview')}
                  leading={{type: 'icon', icon: IconChartNoAxesGantt}}
                  trailing={onEdit || sessionReviews ? {type: 'custom', element: (
                    <View style={styles.reviewTrailingRow}>
                      {sessionReviews ? (
                        <IconButton icon={IconChartNoAxesGantt} size="small" variant="ghost-secondary" onPress={handleOpenReviewSheet} />
                      ) : null}
                      {onEdit ? (
                        <IconButton icon={IconEditFilled} size="small" variant="ghost-secondary" onPress={() => onEdit('review')} />
                      ) : null}
                    </View>
                  )} : undefined}
                />
                <EmptyState variant="simple" title={t('recipeDetail.emptyReview')} />
              </Card>
            )}
          </ContentContainer>
        </Animated.View>

        {/* Prev / Next Recipe Navigation */}
        {recipeItems && recipeItems.length > 1 && currentRecipeId && onRecipeSelect && (() => {
          const idx = recipeItems.findIndex(r => r.id === currentRecipeId);
          if (idx < 0) return null;
          // 순환(circular): 끝에서 처음으로 감싸 이전/다음이 항상 존재하게
          const n = recipeItems.length;
          const prev = recipeItems[(idx - 1 + n) % n];
          const next = recipeItems[(idx + 1) % n];
          const isWide = windowWidth >= 480;
          return (
            <ContentContainer style={styles.recipeNav}>
              <View style={[styles.recipeNavRow, !isWide && styles.recipeNavColumn]}>
                {prev ? (
                  <Pressable
                    style={({pressed}) => [styles.recipeNavCard, pressed && styles.recipeNavCardPressed]}
                    onPress={() => onRecipeSelect(prev.id)}>
                    <Thumbnail size={40}>
                      {prev.imageUrl && <Image source={{uri: prev.imageUrl}} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                    </Thumbnail>
                    <View style={styles.recipeNavContent}>
                      <Text style={styles.recipeNavTitle} numberOfLines={1}>{prev.label}</Text>
                      <View style={styles.recipeNavMeta}>
                        <View style={{width: 8}}><IconChevronLeft width={12} height={12} color={colors['foreground/on-surface-muted']} /></View>
                        <Text style={styles.recipeNavSub}>{t('recipeDetail.prev')}</Text>
                      </View>
                    </View>
                  </Pressable>
                ) : isWide ? <View style={{flex: 1}} /> : null}
                {next ? (
                  <Pressable
                    style={({pressed}) => [styles.recipeNavCard, styles.recipeNavCardRight, pressed && styles.recipeNavCardPressed]}
                    onPress={() => onRecipeSelect(next.id)}>
                    <View style={[styles.recipeNavContent, {alignItems: 'flex-end'}]}>
                      <Text style={styles.recipeNavTitle} numberOfLines={1}>{next.label}</Text>
                      <View style={styles.recipeNavMeta}>
                        <Text style={styles.recipeNavSub}>{t('recipeDetail.next')}</Text>
                        <View style={{width: 8}}><IconChevronRight width={12} height={12} color={colors['foreground/on-surface-muted']} /></View>
                      </View>
                    </View>
                    <Thumbnail size={40}>
                      {next.imageUrl && <Image source={{uri: next.imageUrl}} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                    </Thumbnail>
                  </Pressable>
                ) : isWide ? <View style={{flex: 1}} /> : null}
              </View>
            </ContentContainer>
          );
        })()}

        {/* Bottom Padding for Tab Bar */}
        <View style={{height: 120 + insets.bottom}} />
      </Animated.ScrollView>

      {/* Overlay for Menu */}
      <Pressable
        style={styles.overlay}
        onPress={handleOverlayPress}
        pointerEvents={showMenu || showTabMenu ? 'auto' : 'none'}
      />

      {/* Fixed Top Navigation Bar — 요리모드가 뜨면 자체 앱바가 있으므로 숨긴다.
          (FloatingNavBar는 zIndex 20이라 안 숨기면 요리모드 위로 뚫고 올라와 이중 앱바) */}
      {!showCookingMode && (
      <FloatingNavBar
        tintColor={imageUri ? (colors['fill/faint'] as string) : undefined}
        left={
          <View style={styles.navLeftRow}>
            <NavPillButton icon={IconClose} onPress={onBack} />
            {useCompactTabs ? (
              <View>
                <GlassContainer contentStyle={navPillStyle}>
                  <Selector
                    label={SECTION_TABS.find(tab => tab.id === activeTab)?.label ?? t('recipeDetail.tabIngredients')}
                    showDropdown
                    onPress={locked ? undefined : () => setShowTabMenu(prev => !prev)}
                  />
                </GlassContainer>
                <Menu
                  items={SECTION_TABS}
                  selectedId={activeTab}
                  onSelect={id => { setShowTabMenu(false); handleTabPress(id); }}
                  visible={showTabMenu}
                />
              </View>
            ) : (
              <GlassContainer contentStyle={styles.tabPillContent}>
                <Tabs
                  tabs={SECTION_TABS}
                  selectedId={activeTab}
                  onSelect={handleTabPress}
                  variant="text"
                  disabled={locked}
                />
              </GlassContainer>
            )}
          </View>
        }
        right={
          <GlassContainer contentStyle={navPillStyle}>
            <IconButton
              icon={IconPlayFilled}
              onPress={locked ? () => setShowUnlockDialog(true) : () => { setCookingModeShowIngredients(true); setShowCookingMode(true); }}
              variant="ghost-primary"
              size="medium"
            />
            <IconButton
              icon={IconEllipsisVertical}
              onPress={handleMenuPress}
              variant="ghost-primary"
              size="medium"
              forcePressed={showMenu}
            />
          </GlassContainer>
        }
        rightMenu={
          showCookbookSubmenu && cookbookSubmenu ? (
            <Menu
              title={t('recipeDetail.cookbook')}
              items={cookbookSubmenu.items}
              selectedId={cookbookSubmenu.selectedId}
              onSelect={handleMenuSelect}
              visible={showMenu}
            />
          ) : (
            <Menu
              items={menuItems}
              onSelect={handleMenuSelect}
              visible={showMenu}
            />
          )
        }
      />
      )}

      {/* PDF 미리보기 다이얼로그 */}
      <PdfPreviewDialog
        visible={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        data={{
          title: title,
          cookbook,
          method,
          reviewCount,
          time,
          servings,
          session,
          ingredientGroups,
          tools: resolvedToolGroups.flatMap(g => g.tools),
          steps,
          stepGroups,
        }}
      />

      {/* 시간 다이얼로그 */}
      <TimeDialog
        visible={showTimeDialog}
        onClose={() => setShowTimeDialog(false)}
        value={time}
        onConfirm={v => onUpdate?.({time: v})}
      />

      {/* 분량 다이얼로그 */}
      <ServingsDialog
        visible={showServingsDialog}
        onClose={() => setShowServingsDialog(false)}
        value={servings}
        onConfirm={v => onUpdate?.({servings: v})}
      />

      <CookingMode
        visible={showCookingMode}
        onClose={() => { setShowCookingMode(false); setCookingModeShowIngredients(false); }}
        title={title ?? ''}
        steps={steps}
        stepGroups={stepGroups}
        ingredientGroups={ingredientGroups}
        canEdit={canEdit}
        onUpdate={onUpdate}
        initialIndex={cookingModeInitialIndex}
        initialShowIngredients={cookingModeShowIngredients}
        recipeItems={recipeItems}
        currentRecipeId={currentRecipeId}
        onRecipeSelect={onRecipeSelect}
        advice={advice}
        advicePhotos={advicePhotos}
        referenceUrl={referenceUrl}
      />

      {/* 회차 슬라이더: 하단 탭바 자리에서 좌우 슬라이드/스냅으로 회차 전환 */}
      {hasMultipleSessions && !locked && (
        <ContentMask topHeight={0} />
      )}
      {hasMultipleSessions && !locked && (
        <View
          style={[styles.sessionSliderWrap, {bottom: (insets.bottom || Spacing.sm) + Spacing.xs}]}
          pointerEvents="box-none">
          <RulerSlider
            items={sessionItems!}
            selectedId={currentRecipeId}
            onSelect={id => onSessionSelect?.(id)}
          />
        </View>
      )}

      {/* 잠금 해제 하단 바: 블러 배경 + 버튼 세트 */}
      {locked && (
        <LockedBottomBar onUnlock={() => setShowUnlockDialog(true)} />
      )}

      {/* 잠금 해제 다이얼로그 */}
      <UnlockDialog
        visible={showUnlockDialog}
        onClose={() => setShowUnlockDialog(false)}
        onWatchAd={() => {
          setShowUnlockDialog(false);
          onUnlock?.();
        }}
        adLoading={adLoading}
        onSubscribe={onSubscribe ? () => {
          // 항상 UnlockDialog 닫고 PlanSheet 표시 (모든 플랫폼)
          setShowUnlockDialog(false);
          onSubscribe();
        } : undefined}
      />

      <Dialog
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title={parseSession(session).total > 1 ? t('recipeDetail.deleteSessionTitle', {session: parseSession(session).current}) : t('recipeDetail.deleteRecipeTitle')}
        description={parseSession(session).total > 1
          ? t('recipeDetail.deleteSessionDesc', {title: title ?? '', session: parseSession(session).current})
          : t('recipeDetail.deleteRecipeDesc', {title: title ?? ''})}
        actions={
          <>
            <Button label={t('recipeDetail.cancel')} variant="soft" onPress={() => setShowDeleteDialog(false)} />
            <Button
              label={t('recipeDetail.delete')}
              variant="soft"
              destructive
              onPress={() => {
                setShowDeleteDialog(false);
                onDelete?.();
              }}
            />
          </>
        }
      />

      <SearchCommandBar
        visible={searchFilter !== null}
        onClose={() => setSearchFilter(null)}
        items={searchFilteredItems}
        selectedId={currentRecipeId}
        initialQuery={searchFilter === 'cookbook' ? cookbook : method}
        icon={IconNoteFilled}
        useRecipeCards
        onSelect={(selectedId) => {
          setSearchFilter(null);
          onRecipeSelect?.(selectedId);
        }}
      />

      <ReviewLogSheet
        visible={showReviewSheet}
        onClose={() => setShowReviewSheet(false)}
        selectedRecipe={{id: id ?? '', title: title ?? '', imageUri}}
        sessionReviews={sessionReviews}
      />
    </Animated.View>
  );
}

const HERO_HEIGHT = 280;

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors['surface/dim'],
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero Section
  heroSection: {
    height: HERO_HEIGHT,
    position: 'relative',
    width: '100%',
    marginBottom: 0,
  },
  navLeftRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  },
  sessionSliderWrap: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    zIndex: 10,
  },
  placeholderBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: HERO_HEIGHT + 56,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    // 넓은 화면(아이패드 등): 이미지 최대폭 1000으로 제한하고 가로 중앙정렬.
    // left:0+right:0는 박스를 전체폭으로 고정해 maxWidth/margin auto 중앙정렬이
    // 안 먹으므로, left:50% + translateX(-50%)로 확실히 가운데에 둔다.
    left: '50%',
    transform: [{translateX: '-50%'}],
    width: '100%',
    height: HERO_HEIGHT + 56,
    maxWidth: HERO_MAX_WIDTH,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -56,
    height: '100%',
    // 이미지와 동일 폭(1000)·중앙정렬 → 이미지 밖 좌우 영역까지 덮지 않게
    maxWidth: HERO_MAX_WIDTH,
    marginHorizontal: 'auto',
  },
  // 좌우 페이드 — 이미지와 동일 폭(1000)·중앙정렬, 전체 높이 덮음
  heroSideGradient: {
    position: 'absolute',
    top: 0,
    bottom: -56,
    // heroImage와 동일하게 중앙정렬(아이패드 등 넓은 화면에서 페이드가 이미지와 정렬).
    // left:0+right:0+margin auto는 절대위치에서 중앙정렬이 안 먹어 왼쪽으로 쏠린다.
    left: '50%',
    transform: [{translateX: '-50%'}],
    width: '100%',
    maxWidth: HERO_MAX_WIDTH,
  },
  heroTextOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -56,
    backgroundColor: colors['overlay/subtle'],
    // 이미지와 동일 폭(1000)·중앙정렬 → 이미지 밖 좌우가 어둡게 덮이지 않게
    maxWidth: HERO_MAX_WIDTH,
    marginHorizontal: 'auto',
  },
  heroContentWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 60,
    alignItems: 'center',
  },
  heroContent: {
    paddingHorizontal: 28,
    gap: Spacing.xs,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroTitle: {
    fontFamily: Typography.headline.small.fontFamily,
    fontSize: Typography.headline.small.fontSize,
    fontWeight: Typography.headline.small.fontWeight as '600',
    lineHeight: Typography.headline.small.lineHeight,
    letterSpacing: Typography.headline.small.letterSpacing,
    color: colors['foreground/on-surface-inverse'],
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  heroTitleSession: {
    fontFamily: Typography.headline.small.fontFamily,
    fontSize: Typography.headline.small.fontSize,
    fontWeight: Typography.headline.small.fontWeight as '600',
    color: colors['foreground/on-surface-inverse'],
  },
  heroDescription: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: Typography.body.medium.letterSpacing,
    color: colors['foreground/on-surface-inverse'],
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  heroDescriptionTappable: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    // 칸이 모자라면 쿡북·공법 텍스트가 양보(줄임표) → 뒤의 참고 링크 칩은 안 눌리게
    flexShrink: 1,
    minWidth: 0,
  },
  heroDescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 2,
    gap: Spacing.xs,
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    // 리뷰/참고 링크 칩은 절대 줄어들지 않게 (텍스트 잘림 방지)
    flexShrink: 0,
  },

  // Meta Section
  metaSection: {
    flexDirection: 'row',
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: -40,
    minHeight: 56,
    gap: Spacing.sm,
  },

  // Section
  section: {
    paddingTop: Spacing.sm,
  },
  sectionCard: {
    paddingTop: Spacing.sm,
    marginTop: 8,
  },
  sectionGap: {
    paddingTop: Spacing.sm,
  },
  stickyHeader: {
    backgroundColor: 'transparent',
    paddingTop: Spacing.sm,
  },

  // Ingredients
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.smd,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors['border/muted'],
  },
  ingredientRowLast: {
    borderBottomWidth: 0,
  },
  ingredientPercentage: {
    width: 60,
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
  ingredientName: {
    flex: 1,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground/on-surface'],
  },

  // 회차 비교 하이라이트
  diffCaption: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-muted'],
    marginBottom: Spacing.sm,
  },
  hlAdded: {
    backgroundColor: BaseColors['color-base-lime-20'],
    color: BaseColors['color-base-lime-99'],
    borderRadius: 4,
  },
  hlChanged: {
    backgroundColor: BaseColors['color-base-orange-20'],
    color: BaseColors['color-base-orange-95'],
    borderRadius: 4,
  },
  prevAmount: {
    color: colors['foreground/on-surface-muted'],
    textDecorationLine: 'line-through',
  },
  removedText: {
    color: colors['foreground/on-surface-muted'],
    textDecorationLine: 'line-through',
  },

  // Tools
  toolsContainer: {
    paddingVertical: Spacing.smd,
    paddingHorizontal: Spacing.md,
  },
  toolsText: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground/on-surface'],
  },

  // Steps
  stepDescription: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface'],
    marginTop: FONT_BASELINE_OFFSET + 1,
  },
  tipChipInline: {
    paddingTop: Spacing.sm,
  },

  // Group title
  groupTitleRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.smd,
    paddingBottom: Spacing.xs,
  },
  groupTitleRowSpaced: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors['border/muted'],
    marginTop: Spacing.xs,
    paddingTop: Spacing.md,
  },
  groupTitle: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },

  // Tab pill
  tabPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
  },

  // Advice
  adviceText: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['custom/yellow-var'],
    paddingVertical: Spacing.sm,
  },

  // Review trailing row
  reviewTrailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },


  // Recipe Nav
  recipeNav: {
    paddingTop: Spacing.sm,
    marginTop: 8,
  },
  recipeNavRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  recipeNavColumn: {
    flexDirection: 'column',
  },
  recipeNavCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
    padding: Spacing.smd,
    borderWidth: 1,
    borderColor: colors['border/muted'],
    borderRadius: Radius['radius-lg'],
  },
  recipeNavCardRight: {
    justifyContent: 'flex-end',
  },
  recipeNavCardPressed: {
    backgroundColor: colors['fill/glass-normal'],
  },
  recipeNavContent: {
    flex: 1,
    gap: 2,
  },
  recipeNavTitle: {
    fontFamily: Typography.title.small.fontFamily,
    fontSize: Typography.title.small.fontSize,
    fontWeight: Typography.title.small.fontWeight as '700',
    lineHeight: Typography.title.small.lineHeight,
    color: colors['foreground/on-surface'],
  },
  recipeNavMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  recipeNavSub: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },

  // Overlay & Menu
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },

  // Review BottomSheet
  reviewSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 40,
  },
  reviewSheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reviewSheetTitle: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    color: colors['foreground/on-surface'],
  },
  reviewSheetSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reviewSheetCancelText: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
  reviewSessionTabs: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  reviewSessionPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['surface/container'],
  },
  reviewSessionPillActive: {
    backgroundColor: colors['surface/inverse'],
  },
  reviewSessionPillText: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '500',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
  reviewSessionPillTextActive: {
    color: colors['foreground/on-surface-inverse'],
  },
  reviewSheetContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  reviewSheetItem: {
    gap: Spacing.xs,
  },
  reviewSheetText: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground/on-surface-var'],
  },
  reviewSheetImprovement: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: 2,
  },
  reviewSheetEmpty: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  reviewSheetEmptyText: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '500',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
  },
});
