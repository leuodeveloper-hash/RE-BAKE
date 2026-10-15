import {EdgeFade} from '@components/Container/ContentMask';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Dimensions, Easing, FlatList, Pressable, StyleSheet, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PackHeaderFloat} from '@components/PackBoard/PackHeaderFloat';
import {ContentContainer, contentAreaPadding, APPBAR_HEIGHT, TABBAR_BOTTOM_SPACE} from '@components/Container';
import {useTabBarSpace} from '@hooks/useTabBarSpace';
import {RecipeCard, RecipeCardLayout} from '@components/Recipe/RecipeCard';
import {Menu, MenuItemData} from '@components/Menu';
import {Tabs, type TabItem} from '@components/Tabs';
import {PullIndicator, RefreshGap, usePullProgress} from '@components/PullIndicator';
import {RecipePackView} from '@components/RecipeGroups/RecipePackView';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useRecipeReviews} from '@hooks/useRecipeReviews';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import type {Recipe} from '../../../types/recipe';
import {recipePreviewParts} from '@utils/recipePreview';
import {parseSession, sessionCount} from '@utils/session';
import {recipeToPdfData} from '@utils/generateRecipeHtml';
import {
  IconLayoutGrid,
  IconLayoutPanelTop,
  IconList,
  IconCards,
} from '@components/Icon/IconIndex';

type TFn = (key: string, options?: Record<string, unknown>) => string;

const makeLayoutMenuItems = (t: TFn): MenuItemData[] => [
  {id: 'grid', label: t('recipeList.layoutGrid'), icon: IconLayoutGrid},
  {id: 'photoList', label: t('recipeList.layoutPhotoList'), icon: IconLayoutPanelTop},
  {id: 'list', label: t('recipeList.layoutList'), icon: IconList},
  {id: 'pack', label: t('recipeList.layoutPack'), icon: IconCards},
];

// 레이아웃 선택: 메뉴 박스 안 아이콘 탭(세그먼트)으로 표시 — 레이블 없이 아이콘만
const makeLayoutTabs = (items: MenuItemData[]): TabItem[] => items.map(i => ({id: i.id, label: '', icon: i.icon}));

const makeSortMenuItems = (t: TFn): MenuItemData[] => [
  {id: 'default', label: t('recipeList.sortLatest')},
  {id: 'title-asc', label: t('recipeList.sortName')},
];

const PAGE_SIZE = 10;
const LOAD_MORE_DELAY = 400;
const SKELETON_COUNT = 6;
const STAGGER_DELAY = 70;

// 스켈레톤 placeholder 데이터
const SKELETON_DATA: Recipe[] = Array.from({length: SKELETON_COUNT}, (_, i) => ({
  id: `__skeleton_${i}__`,
  title: '',
  cookbook: '',
  method: '',
  reviewCount: 0,
}));

// ---- Skeleton Card ----

function SkeletonCard({layout}: {layout: RecipeCardLayout}) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  if (layout === 'list') {
    return (
      <Animated.View style={[skStyles.listRow, {opacity}]}>
        <View style={[skStyles.listThumb, {backgroundColor: colors['surface/container']}]} />
        <View style={skStyles.listTexts}>
          <View style={[skStyles.textLine, skStyles.textLong, {backgroundColor: colors['surface/container']}]} />
          <View style={[skStyles.textLine, skStyles.textShort, {backgroundColor: colors['surface/container']}]} />
        </View>
      </Animated.View>
    );
  }

  if (layout === 'grid') {
    return (
      <Animated.View style={[skStyles.gridCardWrapper, {opacity}]}>
        <View style={[skStyles.gridThumb, {backgroundColor: colors['surface/container']}]} />
        <View style={skStyles.gridTexts}>
          <View style={[skStyles.textLine, skStyles.textLong, {backgroundColor: colors['surface/container']}]} />
          <View style={[skStyles.textLine, skStyles.textShort, {backgroundColor: colors['surface/container']}]} />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        skStyles.gridCard,
        skStyles.photoListCard,
        {backgroundColor: colors['surface/container'], opacity},
      ]}
    />
  );
}

const skStyles = StyleSheet.create({
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.md,
  },
  listThumb: {
    width: 68,
    height: 68,
    borderRadius: Radius['radius-md'],
  },
  listTexts: {
    flex: 1,
    gap: Spacing.sm,
  },
  textLine: {
    height: 14,
    borderRadius: 7,
  },
  textLong: {
    width: '70%',
  },
  textShort: {
    width: '45%',
  },
  gridCard: {
    width: '100%',
    aspectRatio: 292 / 194,
    borderRadius: 20,
  },
  gridCardWrapper: {
    width: '100%',
  },
  gridThumb: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: 20,
  },
  gridTexts: {
    minHeight: 64,
    paddingHorizontal: 4,
    paddingVertical: 12,
    gap: 6,
    justifyContent: 'center',
  },
  photoListCard: {
    aspectRatio: 292 / 117,
  },
});

// ---- Card Entrance Animation ----

const CardEntrance = React.memo(function CardEntrance({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{opacity}}>
      {children}
    </Animated.View>
  );
});

// ---- Footer Skeleton (load more) ----

function SkeletonFooter({layout}: {layout: RecipeCardLayout}) {
  const count = layout === 'grid' ? 4 : 3;

  if (layout === 'grid') {
    const rows = Math.ceil(count / 2);
    return (
      <View style={footerStyles.gridWrap}>
        {Array.from({length: rows}).map((_, i) => (
          <View key={i} style={footerStyles.gridRow}>
            <View style={footerStyles.gridCell}>
              <SkeletonCard layout="grid" />
            </View>
            {i * 2 + 1 < count && (
              <View style={footerStyles.gridCell}>
                <SkeletonCard layout="grid" />
              </View>
            )}
          </View>
        ))}
      </View>
    );
  }

  return (
    <>
      {Array.from({length: count}).map((_, i) => (
        <View key={i} style={layout === 'photoList' ? footerStyles.photoListItem : undefined}>
          <SkeletonCard layout={layout} />
        </View>
      ))}
    </>
  );
}


const footerStyles = StyleSheet.create({
  gridWrap: {
    gap: Spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  gridCell: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  photoListItem: {
    marginBottom: Spacing.md,
  },
});

// ---- Main Component ----

export interface RecipeListHelpers {
  layout: RecipeCardLayout;
  showLayoutMenu: boolean;
  handleFilterPress: () => void;
  closeMenus: () => void;
  /** 레이아웃 메뉴 (AppBar rightMenu로 전달) */
  layoutMenu: React.ReactNode;
  /** 현재 레이아웃 아이콘 (AppBar 필터 버튼에 노출) */
  filterIcon: MenuItemData['icon'];
}

export interface RecipeListTemplateProps {
  /** 팩 보기 한가운데에 놓을 화면(게스트 랜딩 카드) */
  packHero?: React.ReactNode;
  data: Recipe[];
  loading?: boolean;
  onRecipePress: (recipe: Recipe) => void;
  cardMenuItems?: MenuItemData[] | ((recipe: Recipe) => MenuItemData[]);
  onCardMenuSelect?: (id: string, recipe: Recipe) => void | false;
  renderAppBar: (helpers: RecipeListHelpers) => React.ReactNode;
  onOverlayPress?: () => void | false;
  extraOverlayVisible?: boolean;
  contentExtra?: React.ReactNode;
  listEmptyComponent?: React.ReactElement;
  /** 외부에서 레이아웃 강제 (검색 결과 등) */
  forceLayout?: RecipeCardLayout;
  /** 카드 메뉴 선택 하이라이트 */
  cardMenuSelectedId?: string | ((recipe: Recipe) => string | undefined);
  /** Pull-to-refresh 시 호출 */
  onRefresh?: () => void;
  /** 스크롤 비활성화 (paywall 등) */
  scrollEnabled?: boolean;
  /** 잠금 표시할 레시피 ID 목록 (paywall용) */
  lockedRecipeIds?: Set<string>;
  /**
   * 레시피 바깥에 보관되는 고정 정보({id: 고정시각}). 둘러보기처럼 공용 데이터라
   * recipe.pinnedAt을 쓸 수 없는 목록에서 쓴다. 주면 이쪽이 우선.
   */
  pinnedMap?: Record<string, string>;
  /** 뷰 메뉴(레이아웃·정렬)에 덧붙는 필터 섹션 — 예: 홈의 전체/개인/공개 */
  filterSection?: {title: string; items: MenuItemData[]; selectedId: string; onSelect: (id: string) => void};
  /** 공개된 레시피 id — 카드에 공개(지구) 표시 */
  publishedIds?: Set<string>;
  /**
   * 레시피 바깥에 보관되는 "만들었어요" 정보({id: 표시시각}). 핀과 같은 이유로
   * 둘러보기처럼 recipe.madeAt을 쓸 수 없는 목록에서 쓴다. 주면 이쪽이 우선.
   */
  madeMap?: Record<string, string>;
  /** FlatList 헤더 영역에 추가 콘텐츠 (인라인 배너 등) */
  listHeaderExtra?: React.ReactNode;
  /** 카드 메타 줄 맨 앞에 표시할 작성자 핸들. 둘러보기는 공식이라 'bakey' 고정.
   *  미지정(홈 등)이면 표시 안 함. */
  authorHandle?: string;
  /** 카드 핸들(@handle) 탭 시 — 작성자 홈으로 이동 등. handle을 인자로 받음. */
  onAuthorPress?: (handle: string) => void;
  /** 카드 레시피북 탭 시 — 해당 북 그룹으로. cookbook 이름을 인자로. */
  onCookbookPress?: (cookbook: string) => void;
  /** 카드 공법 탭 시 — 해당 공법 그룹으로. method를 인자로. */
  onMethodPress?: (method: string) => void;
  children?: React.ReactNode;
}

export function RecipeListTemplate({
  packHero,
  data,
  loading = false,
  onRecipePress,
  cardMenuItems,
  onCardMenuSelect,
  renderAppBar,
  onOverlayPress,
  extraOverlayVisible = false,
  contentExtra,
  listEmptyComponent,
  forceLayout,
  cardMenuSelectedId,
  onRefresh,
  scrollEnabled,
  lockedRecipeIds,
  pinnedMap,
  publishedIds,
  filterSection,
  madeMap,
  listHeaderExtra,
  authorHandle,
  onAuthorPress,
  onCookbookPress,
  onMethodPress,
  children,
}: RecipeListTemplateProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  // 회고는 계정에 저장된다 — 레시피의 reviews만 세면 새 회고가 빠진다
  const {reviewsOf} = useRecipeReviews();
  const layoutMenuItems = useMemo(() => makeLayoutMenuItems(t), [t]);
  const layoutTabs = useMemo(() => makeLayoutTabs(layoutMenuItems), [layoutMenuItems]);
  const sortMenuItems = useMemo(() => makeSortMenuItems(t), [t]);
  const [layout, setLayoutState] = useState<RecipeCardLayout>('grid');
  const [sortId, setSortIdState] = useState('default');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const tabBarSpace = useTabBarSpace();
  const [listHeaderHeight, setListHeaderHeight] = useState(0);
  // 팩 보기 머리말 높이 — 팩이 그 자리를 피해 배열된다
  const [headerExtraHeight, setHeaderExtraHeight] = useState(0);
  const colors = useColors();

  // AsyncStorage에서 마지막 레이아웃/정렬 복원.
  //
  // 읽기가 비동기라 첫 프레임은 기본값(grid)으로 그려진다. 저장값이 list인
  // 사용자는 앱을 켤 때마다 그리드가 잠깐 보였다 바뀌는 깜빡임을 겪었다.
  // 불러오기 전까지는 스켈레톤을 보여주고(layoutLoaded), 값이 정해진 뒤
  // 목록을 그린다.
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('recipe_list_layout'),
      AsyncStorage.getItem('recipe_list_sort'),
    ]).then(([savedLayout, savedSort]) => {
      if (savedLayout && (savedLayout === 'grid' || savedLayout === 'photoList' || savedLayout === 'list' || savedLayout === 'pack')) {
        setLayoutState(savedLayout);
      }
      if (savedSort) setSortIdState(savedSort);
    })
      // 읽기에 실패해도 기본값으로 계속 진행한다 — 목록이 영영 안 뜨면 안 된다
      .catch(() => {})
      .finally(() => setLayoutLoaded(true));
  }, []);

  const setLayout = useCallback((l: RecipeCardLayout) => {
    setLayoutState(l);
    AsyncStorage.setItem('recipe_list_layout', l);
  }, []);

  const setSortId = useCallback((id: string) => {
    setSortIdState(id);
    AsyncStorage.setItem('recipe_list_sort', id);
  }, []);

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  // Entrance animation tracking
  const animatedIdsRef = useRef(new Set<string>());

  // Pull-to-refresh
  const {pullProgress, isRefreshing, refreshStripProgress, refreshOpacity, refreshGapHeight, handleScroll} = usePullProgress(onRefresh);
  const [cardMenuTarget, setCardMenuTarget] = useState<Recipe | null>(null);
  const [cardMenuPosition, setCardMenuPosition] = useState<{top: number; right: number} | null>(null);

  const activeLayout = forceLayout ?? layout;
  const numColumns = activeLayout === 'grid' ? 2 : 1;

  // 레이아웃 변경 시 페이지네이션 + 애니메이션 리셋
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setLoadingMore(false);
    animatedIdsRef.current.clear();
  }, [activeLayout]);

  // 로딩 시작 시 애니메이션 트래킹 리셋
  useEffect(() => {
    if (loading) animatedIdsRef.current.clear();
  }, [loading]);

  const closeMenus = useCallback(() => {
    setShowLayoutMenu(false);
    setCardMenuTarget(null);
  }, []);

  const handleFilterPress = useCallback(() => {
    setCardMenuTarget(null);
    setShowLayoutMenu(prev => !prev);
  }, []);

  const handleMenuSelect = useCallback((id: string) => {
    const layoutIds = ['grid', 'photoList', 'list', 'pack'];
    if (layoutIds.includes(id)) {
      setLayout(id as RecipeCardLayout);
    } else {
      setSortId(id);
    }
    setShowLayoutMenu(false);
  }, []);

  const handleCardMenuPress = useCallback((recipe: Recipe, position: {pageX: number; pageY: number; width: number; height: number}) => {
    setShowLayoutMenu(false);
    const screenWidth = Dimensions.get('window').width;
    const menuMinWidth = 200;
    const edgeMargin = Spacing.md;
    const rawRight = screenWidth - (position.pageX + position.width);
    const clampedRight = Math.min(Math.max(rawRight, edgeMargin), screenWidth - menuMinWidth - edgeMargin);
    setCardMenuPosition({
      top: position.pageY + position.height + Spacing.xs,
      right: clampedRight,
    });
    setCardMenuTarget(prev => (prev?.id === recipe.id ? null : recipe));
  }, []);

  const handleCardMenuSelectInternal = useCallback((id: string) => {
    const target = cardMenuTarget;
    if (!target) return;
    const shouldClose = onCardMenuSelect?.(id, target);
    if (shouldClose !== false) {
      setCardMenuTarget(null);
    }
  }, [cardMenuTarget, onCardMenuSelect]);

  const handleOverlayPress = useCallback(() => {
    const shouldClose = onOverlayPress?.();
    if (shouldClose !== false) {
      closeMenus();
    }
  }, [closeMenus, onOverlayPress]);

  // 정렬된 데이터 — 고정(핀)을 1차 키, 잠금 여부를 2차 키(잠금 해제된 것 먼저),
  // 3차 정렬은 사용자 선택. 고정끼리는 "먼저 고정한 것이 위"(pinnedAt 오름차순).
  const sortedData = useMemo(() => {
    const sorted = [...data];
    const lockRank = (r: Recipe) => (lockedRecipeIds?.has(r.id) ? 1 : 0);
    const pinnedAtOf = (r: Recipe) => pinnedMap?.[r.id] ?? r.pinnedAt;
    const comparePin = (a: Recipe, b: Recipe) => {
      const pa = pinnedAtOf(a), pb = pinnedAtOf(b);
      if (pa && pb) return pa.localeCompare(pb);
      if (pa) return -1;
      if (pb) return 1;
      return 0;
    };
    if (sortId === 'default') {
      sorted.sort((a, b) => {
        const pinDiff = comparePin(a, b);
        if (pinDiff !== 0) return pinDiff;
        const lockDiff = lockRank(a) - lockRank(b);
        if (lockDiff !== 0) return lockDiff;
        return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
      });
      return sorted;
    }
    sorted.sort((a, b) => {
      const pinDiff = comparePin(a, b);
      if (pinDiff !== 0) return pinDiff;
      const lockDiff = lockRank(a) - lockRank(b);
      if (lockDiff !== 0) return lockDiff;
      return (a.title ?? '').localeCompare(b.title ?? '', 'ko');
    });
    return sorted;
  }, [data, sortId, lockedRecipeIds, pinnedMap]);

  // Paginated display data (리프레시 중에는 스켈레톤 표시하지 않음)
  const displayData = useMemo(() => {
    // 저장된 보기 방식을 읽기 전에 그리면 기본값(grid)으로 한 번 깜빡인다
    if ((loading || !layoutLoaded) && !isRefreshing) {
      return SKELETON_DATA;
    }
    const sliced = sortedData.slice(0, visibleCount);
    if (activeLayout === 'grid' && sliced.length % 2 === 1) {
      return [...sliced, {id: '__placeholder__'} as Recipe];
    }
    return sliced;
  }, [loading, layoutLoaded, isRefreshing, sortedData, visibleCount, activeLayout]);

  const hasMore = !loading && visibleCount < sortedData.length;

  const handleEndReached = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, sortedData.length));
      setLoadingMore(false);
    }, LOAD_MORE_DELAY);
  }, [hasMore, loadingMore, sortedData.length]);

  const overlayActive = showLayoutMenu || !!cardMenuTarget || extraOverlayVisible;

  const layoutMenuNode = (
    <Menu
      sections={[
        {
          title: t('recipeList.sectionLayout'),
          content: (
            <View style={styles.layoutTabsWrap}>
              <Tabs
                variant="icon"
                size="large"
                fullWidth
                tabs={layoutTabs}
                selectedId={layout}
                onSelect={handleMenuSelect}
              />
            </View>
          ),
        },
        {title: t('recipeList.sectionSort'), items: sortMenuItems, selectedId: sortId},
        // 필터 — 설정 외관(라이트/다크)과 같은 탭
        ...(filterSection ? [{
          title: filterSection.title,
          content: (
            <View style={styles.layoutTabsWrap}>
              <Tabs
                fullWidth
                tabs={filterSection.items.map(i => ({id: i.id, label: i.label}))}
                selectedId={filterSection.selectedId}
                onSelect={filterSection.onSelect}
              />
            </View>
          ),
        }] : []),
      ]}
      onSelect={handleMenuSelect}
      visible={showLayoutMenu}
    />
  );

  const helpers: RecipeListHelpers = {
    layout,
    showLayoutMenu,
    handleFilterPress,
    closeMenus,
    layoutMenu: layoutMenuNode,
    // 현재 레이아웃의 아이콘 → AppBar 필터 버튼에 노출 (뷰 바꾸면 아이콘도 바뀜)
    filterIcon: layoutMenuItems.find(i => i.id === activeLayout)?.icon ?? IconLayoutGrid,
  };

  const renderItem = useCallback(({item, index}: {item: Recipe; index: number}) => {
    // 스켈레톤
    if (item.id.startsWith('__skeleton_')) {
      return (
        <View style={activeLayout === 'grid' ? styles.gridCardContainer : activeLayout === 'photoList' ? styles.photoListCardContainer : activeLayout === 'list' ? styles.listCardFlush : styles.listCardContainer}>
          <SkeletonCard layout={activeLayout} />
        </View>
      );
    }
    // 그리드 빈 placeholder
    if (item.id === '__placeholder__') {
      return <View style={styles.gridCardContainer} />;
    }
    // 실제 카드 (첫 등장 시 stagger 애니메이션)
    const isNew = !animatedIdsRef.current.has(item.id);
    if (isNew) animatedIdsRef.current.add(item.id);

    const isLocked = lockedRecipeIds?.has(item.id) ?? false;

    const paperPreview = (activeLayout === 'grid' || activeLayout === 'list')
      ? recipePreviewParts(item)
      : undefined;

    const card = (
      <RecipeCard
        id={item.id}
        title={item.title}
        authorHandle={authorHandle}
        onAuthorPress={authorHandle && onAuthorPress ? () => onAuthorPress(authorHandle) : undefined}
        onCookbookPress={item.cookbook && onCookbookPress ? () => onCookbookPress(item.cookbook) : undefined}
        onMethodPress={item.method && onMethodPress ? () => onMethodPress(item.method!) : undefined}
        cookbook={item.cookbook}
        isTip={item.kind === 'tip'}
        method={item.method}
        specificGravity={item.specificGravity}
        // reviewCount는 리메이크 그룹 합계(호출부가 계산) — 없으면 이 레시피 것
        reviewCount={Math.max(item.reviewCount ?? 0, reviewsOf(item).length)}
        // 회차 수 = 지난 회차 기록 + 지금(레시피 하나 안)
        sessionCount={sessionCount(item)}
        imageUrl={item.imageUri}
        layout={activeLayout}
        locked={isLocked}
        pinned={!!(pinnedMap?.[item.id] ?? item.pinnedAt)}
        made={!!(madeMap?.[item.id] ?? item.madeAt)}
        menuOpen={cardMenuTarget?.id === item.id}
        hidden={item.hidden}
        published={publishedIds?.has(item.id)}
        hasReference={!!item.referenceUrl}
        paperPreview={paperPreview}
        paperTitle={(activeLayout === 'grid' || activeLayout === 'list') ? item.title : undefined}
        recipePdfData={activeLayout === 'grid' ? recipeToPdfData(item) : undefined}
        onPress={() => onRecipePress(item)}
        onMenuPress={cardMenuItems ? (pos) => handleCardMenuPress(item, pos) : undefined}
      />
    );

    return (
      <View style={activeLayout === 'grid' ? styles.gridCardContainer : activeLayout === 'photoList' ? styles.photoListCardContainer : activeLayout === 'list' ? styles.listCardFlush : styles.listCardContainer}>
        {isNew ? (
          <CardEntrance delay={(index % PAGE_SIZE) * STAGGER_DELAY}>
            {card}
          </CardEntrance>
        ) : card}
      </View>
    );
  }, [activeLayout, styles, onRecipePress, cardMenuItems, handleCardMenuPress, lockedRecipeIds, pinnedMap, cardMenuTarget, authorHandle, onAuthorPress, onCookbookPress, onMethodPress, madeMap, reviewsOf, publishedIds]);

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* 레시피북 탭 등은 레이아웃과 무관하다 — 분기 안에 두면 레이아웃을
            바꿀 때마다 자리가 달라져 탭이 튄다. 바깥에 한 번만 그린다. */}
        {activeLayout === 'pack' ? (
          // 팩뷰: 콘텐츠 너비(maxWidth 800)·패딩 제약 밖에서 전체 너비로 로밍
          <View style={styles.packFull}>
            {/* 머리말(프로필 등) — 팩 보드 칸 안에 띄운다(공통 PackHeaderFloat) */}
            {listHeaderExtra ? <PackHeaderFloat onHeight={setHeaderExtraHeight}>{listHeaderExtra}</PackHeaderFloat> : null}
            <PullIndicator progress={pullProgress} isRefreshing={isRefreshing} refreshStripProgress={refreshStripProgress} refreshOpacity={refreshOpacity} />
            {!loading && layoutLoaded && sortedData.length === 0 && listEmptyComponent ? (
              // 팩뷰에서도 레시피가 없으면 빈 상태 표시 (FlatList 경로와 동일)
              <View style={styles.packEmpty}>{listEmptyComponent}</View>
            ) : (
              <RecipePackView
                // 떠 있는 머리말 자리는 비워 두고 그 아래부터 팩을 배열한다(막지는 않는다 — 끌면 그 밑으로 지나간다)
                insetTop={listHeaderExtra && headerExtraHeight ? headerExtraHeight : APPBAR_HEIGHT}
                insetBottom={tabBarSpace}
                recipes={loading || !layoutLoaded ? [] : sortedData}
                lockedRecipeIds={lockedRecipeIds}
                hero={packHero}
                onRecipePress={(id) => {
                  const r = sortedData.find(x => x.id === id) ?? ({id} as Recipe);
                  onRecipePress(r);
                }}
              />
            )}
          </View>
        ) : (
          <ContentContainer style={styles.contentWrapper} horizontalPadding={false}>
            <PullIndicator progress={pullProgress} isRefreshing={isRefreshing} refreshStripProgress={refreshStripProgress} refreshOpacity={refreshOpacity} />

            <FlatList
              style={{flex: 1, zIndex: 2}}
              onLayout={e => setListHeight(e.nativeEvent.layout.height)}
              showsVerticalScrollIndicator={false}
              scrollEnabled={scrollEnabled !== false}
              key={activeLayout}
              data={displayData}
              numColumns={numColumns}
              keyExtractor={item => item.id}
              contentContainerStyle={[
                styles.listContent,
                // 리스트뷰는 페이지 좌우 여백 없이 — 줄(8+8)·머리말(16)이 각자 여백을 가져 왼쪽 시작점이 16으로 맞는다
                activeLayout === 'list' && styles.listContentFlush,
                !loading && data.length === 0 && styles.listContentEmpty,
              ]}
              columnWrapperStyle={activeLayout === 'grid' ? styles.row : undefined}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              ListHeaderComponent={
                <>
                  <RefreshGap height={refreshGapHeight} />
                  {listHeaderExtra ? <View style={[styles.listHeaderInList, activeLayout === 'list' && styles.listHeaderFlush]} onLayout={e => setListHeaderHeight(e.nativeEvent.layout.height)}>{listHeaderExtra}</View> : null}
                </>
              }
              // 빈 상태는 남은 높이의 상하 중앙 — 감싸지 않으면 목록 칸이 내용 높이만큼만 잡혀 머리말 바로 아래에 붙었다
              ListEmptyComponent={(loading || !layoutLoaded) && !isRefreshing ? undefined : listEmptyComponent ? (
                // 빈 상태 = 남은 칸(목록 높이 − 앱바 자리 − 탭바 자리 − 머리말)의 상하 중앙.
                // flexGrow만으론 웹 목록 칸이 늘지 않아 머리말 밑에 붙었다 — 실제 높이로 잡는다
                <View style={[styles.emptyFill, {minHeight: Math.max(0, listHeight - APPBAR_HEIGHT - tabBarSpace - (listHeaderExtra ? listHeaderHeight : 0))}]}>{listEmptyComponent}</View>
              ) : undefined}
              ListFooterComponent={loadingMore ? <SkeletonFooter layout={activeLayout} /> : undefined}
              renderItem={renderItem}
            />
          </ContentContainer>
        )}
        {/* 머리말(프로필·배너)은 자리를 차지하지 않는다.
            팩 보기: 앱바 아래에 떠 있다(팩 캔버스는 화면 전체). 목록 보기: 목록 맨 위에 붙어 같이 스크롤.
            둘 다 앱바 아래 같은 위치에서 시작해 보기를 바꿔도 튀지 않는다. */}
      </SafeAreaView>

      {renderAppBar(helpers)}

      <Pressable
        style={styles.overlay}
        onPress={handleOverlayPress}
        pointerEvents={overlayActive ? 'auto' : 'none'}
      />

      {contentExtra}

      {cardMenuItems && cardMenuTarget ? (
        <Menu
          items={typeof cardMenuItems === 'function' ? cardMenuItems(cardMenuTarget) : cardMenuItems}
          selectedId={typeof cardMenuSelectedId === 'function' ? cardMenuSelectedId(cardMenuTarget) : cardMenuSelectedId}
          visible={!!cardMenuTarget}
          onSelect={handleCardMenuSelectInternal}
          style={cardMenuPosition ? {
            position: 'absolute',
            top: cardMenuPosition.top,
            right: cardMenuPosition.right,
            zIndex: 50,
          } : undefined}
        />
      ) : null}

      {children}
    </>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors['surface/dim'],
  },
  contentWrapper: {
    flex: 1,
  },
  packFull: {
    flex: 1,
    width: '100%',
  },
  // 팩은 전체 너비로 로밍하지만 헤더(레시피북 탭 등)는 앱바 아래 콘텐츠 폭에 맞춘다.
  // APPBAR_HEIGHT(72)는 앱바가 실제로 끝나는 지점(54)보다 커서 위가 휑했다.
  // 레이아웃과 무관한 상단 줄(레시피북 탭 등) — 앱바 아래 한 자리에 고정.
  // 리스트 콘텐츠와 같은 APPBAR_HEIGHT를 써야 레이아웃을 바꿔도 자리가 같다.
  // 팩 보기 머리말 — 앱바 아래에 떠 있다(자리 차지 안 함)
  // 팩보다 위 — 팩(그림자·회전)보다 나중에 그리고 zIndex·elevation도 올린다
  headerExtraFloat: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // 앱바(10)보다는 아래 — 앱바 메뉴가 머리말 위로 펼쳐져야 한다
    zIndex: 5,
    elevation: 5,
  },
  // 목록 보기 머리말 — 목록 콘텐츠 첫 줄(좌우 여백은 목록 쪽이 이미 준다), 아래 16
  listHeaderInList: {
    paddingBottom: Spacing.md,
  },
  listHeaderExtra: {
    paddingTop: APPBAR_HEIGHT,
    paddingHorizontal: Spacing.md,
    // 상단 줄(배너 등)과 목록 사이 16 — 이 템플릿을 쓰는 모든 목록 화면 공통(화면마다 여백 주지 않는다)
    paddingBottom: Spacing.md,
    zIndex: 3,
  },
  packEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutTabsWrap: {
    // 메뉴 항목과 좌우 정렬 (GlassContainer 패딩만 적용되도록 가로 패딩 제거)
    paddingHorizontal: 0,
    paddingBottom: 4,
  },
  listContent: {
    ...contentAreaPadding,
  },
  // 상단 줄(탭)이 이미 앱바 아래 여백을 잡았으면 리스트는 붙어서 시작한다
  listContentFlush: {
    paddingHorizontal: 0,
  },
  // 리스트뷰 머리말(프로필 등) — 페이지 여백이 없으니 직접 16
  listHeaderFlush: {
    paddingHorizontal: Spacing.md,
  },
  // 리스트뷰 줄 — 줄 안쪽 8 + 여기 8 = 16(머리말과 같은 시작점)
  listCardFlush: {
    paddingHorizontal: Spacing.sm,
  },
  listContentUnderHeader: {
    paddingTop: 0,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyFill: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  row: {
    gap: Spacing.md,
  },
  gridCardContainer: {
    flex: 1,
    maxWidth: '50%',
    marginBottom: Spacing.md,
  },
  photoListCardContainer: {
    marginBottom: Spacing.md,
  },
  listCardContainer: {
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
