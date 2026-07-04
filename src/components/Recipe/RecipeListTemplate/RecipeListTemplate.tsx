import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Dimensions, Easing, FlatList, Pressable, StyleSheet, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ContentContainer, contentAreaPadding} from '@components/Container';
import {RecipeCard, RecipeCardLayout} from '@components/Recipe/RecipeCard';
import {Menu, MenuItemData} from '@components/Menu';
import {Tabs, type TabItem} from '@components/Tabs';
import {PullIndicator, RefreshGap, usePullProgress} from '@components/PullIndicator';
import {RecipePackView} from '@components/RecipeGroups/RecipePackView';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import type {SemanticColorsV2} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import type {Recipe} from '../../../types/recipe';
import {parseSession} from '@utils/session';
import {recipeToPdfData} from '@utils/generateRecipeHtml';
import {
  IconLayoutGrid,
  IconLayoutPanelTop,
  IconList,
  IconCards,
} from '@components/Icon/IconIndex';

const LAYOUT_MENU_ITEMS: MenuItemData[] = [
  {id: 'grid', label: '그리드', icon: IconLayoutGrid},
  {id: 'photoList', label: '사진 목록', icon: IconLayoutPanelTop},
  {id: 'list', label: '목록', icon: IconList},
  {id: 'pack', label: '팩뷰', icon: IconCards},
];

// 레이아웃 선택: 메뉴 박스 안 아이콘 탭(세그먼트)으로 표시 — 레이블 없이 아이콘만
const LAYOUT_TABS: TabItem[] = LAYOUT_MENU_ITEMS.map(i => ({id: i.id, label: '', icon: i.icon}));

const SORT_MENU_ITEMS: MenuItemData[] = [
  {id: 'default', label: '최신순'},
  {id: 'title-asc', label: '이름순'},
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
  const colors = useColorsV2();
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
  /** FlatList 헤더 영역에 추가 콘텐츠 (인라인 배너 등) */
  listHeaderExtra?: React.ReactNode;
  children?: React.ReactNode;
}

export function RecipeListTemplate({
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
  listHeaderExtra,
  children,
}: RecipeListTemplateProps) {
  const styles = useThemedStylesV2(createStyles);
  const [layout, setLayoutState] = useState<RecipeCardLayout>('grid');
  const [sortId, setSortIdState] = useState('default');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // AsyncStorage에서 마지막 레이아웃/정렬 복원
  const layoutLoadedRef = useRef(false);
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('recipe_list_layout'),
      AsyncStorage.getItem('recipe_list_sort'),
    ]).then(([savedLayout, savedSort]) => {
      if (savedLayout && (savedLayout === 'grid' || savedLayout === 'photoList' || savedLayout === 'list' || savedLayout === 'pack')) {
        setLayoutState(savedLayout);
      }
      if (savedSort) setSortIdState(savedSort);
      layoutLoadedRef.current = true;
    });
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

  // 정렬된 데이터 — 잠금 여부를 1차 키로 (잠금 해제된 것 먼저), 2차 정렬은 사용자 선택
  const sortedData = useMemo(() => {
    const sorted = [...data];
    const lockRank = (r: Recipe) => (lockedRecipeIds?.has(r.id) ? 1 : 0);
    if (sortId === 'default') {
      sorted.sort((a, b) => {
        const lockDiff = lockRank(a) - lockRank(b);
        if (lockDiff !== 0) return lockDiff;
        return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
      });
      return sorted;
    }
    sorted.sort((a, b) => {
      const lockDiff = lockRank(a) - lockRank(b);
      if (lockDiff !== 0) return lockDiff;
      return (a.title ?? '').localeCompare(b.title ?? '', 'ko');
    });
    return sorted;
  }, [data, sortId, lockedRecipeIds]);

  // Paginated display data (리프레시 중에는 스켈레톤 표시하지 않음)
  const displayData = useMemo(() => {
    if (loading && !isRefreshing) {
      return SKELETON_DATA;
    }
    const sliced = sortedData.slice(0, visibleCount);
    if (activeLayout === 'grid' && sliced.length % 2 === 1) {
      return [...sliced, {id: '__placeholder__'} as Recipe];
    }
    return sliced;
  }, [loading, isRefreshing, sortedData, visibleCount, activeLayout]);

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
          title: '레이아웃',
          content: (
            <View style={styles.layoutTabsWrap}>
              <Tabs
                variant="icon"
                size="large"
                fullWidth
                tabs={LAYOUT_TABS}
                selectedId={layout}
                onSelect={handleMenuSelect}
              />
            </View>
          ),
        },
        {title: '정렬', items: SORT_MENU_ITEMS, selectedId: sortId},
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
    filterIcon: LAYOUT_MENU_ITEMS.find(i => i.id === activeLayout)?.icon ?? IconLayoutGrid,
  };

  const renderItem = useCallback(({item, index}: {item: Recipe; index: number}) => {
    // 스켈레톤
    if (item.id.startsWith('__skeleton_')) {
      return (
        <View style={activeLayout === 'grid' ? styles.gridCardContainer : activeLayout === 'photoList' ? styles.photoListCardContainer : styles.listCardContainer}>
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
      ? (() => {
          const parts: string[] = [];
          item.ingredientGroups?.forEach(g => {
            g.ingredients.forEach(i => {
              parts.push(i.amount ? `${i.name} ${i.amount}` : i.name);
            });
          });
          item.toolGroups?.forEach(g => g.tools.forEach(t => parts.push(t.name)));
          item.tools?.forEach(t => parts.push(t.name));
          const pushStep = (s: {description?: string; tip?: string; caution?: string}) => {
            if (s.description) parts.push(s.description);
            if (s.tip) parts.push(s.tip);
            if (s.caution) parts.push(s.caution);
          };
          item.stepGroups?.forEach(g => g.steps.forEach(pushStep));
          item.steps?.forEach(pushStep);
          if (item.advice) parts.push(item.advice);
          return parts;
        })()
      : undefined;

    const card = (
      <RecipeCard
        id={item.id}
        title={item.title}
        cookbook={item.cookbook}
        method={item.method}
        specificGravity={item.specificGravity}
        reviewCount={item.reviewCount || item.reviews?.length || 0}
        sessionCount={parseSession(item.session).total}
        imageUrl={item.imageUri}
        layout={activeLayout}
        locked={isLocked}
        paperPreview={paperPreview}
        paperTitle={(activeLayout === 'grid' || activeLayout === 'list') ? item.title : undefined}
        recipePdfData={activeLayout === 'grid' ? recipeToPdfData(item) : undefined}
        onPress={() => onRecipePress(item)}
        onMenuPress={cardMenuItems ? (pos) => handleCardMenuPress(item, pos) : undefined}
      />
    );

    return (
      <View style={activeLayout === 'grid' ? styles.gridCardContainer : activeLayout === 'photoList' ? styles.photoListCardContainer : styles.listCardContainer}>
        {isNew ? (
          <CardEntrance delay={(index % PAGE_SIZE) * STAGGER_DELAY}>
            {card}
          </CardEntrance>
        ) : card}
      </View>
    );
  }, [activeLayout, styles, onRecipePress, cardMenuItems, handleCardMenuPress, lockedRecipeIds]);

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {activeLayout === 'pack' ? (
          // 팩뷰: 콘텐츠 너비(maxWidth 800)·패딩 제약 밖에서 전체 너비로 로밍
          <View style={styles.packFull}>
            <PullIndicator progress={pullProgress} isRefreshing={isRefreshing} refreshStripProgress={refreshStripProgress} refreshOpacity={refreshOpacity} />
            {!loading && sortedData.length === 0 && listEmptyComponent ? (
              // 팩뷰에서도 레시피가 없으면 빈 상태 표시 (FlatList 경로와 동일)
              <View style={styles.packEmpty}>{listEmptyComponent}</View>
            ) : (
              <RecipePackView
                recipes={loading ? [] : sortedData}
                lockedRecipeIds={lockedRecipeIds}
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
              showsVerticalScrollIndicator={false}
              scrollEnabled={scrollEnabled !== false}
              key={activeLayout}
              data={displayData}
              numColumns={numColumns}
              keyExtractor={item => item.id}
              contentContainerStyle={[
                styles.listContent,
                !loading && data.length === 0 && styles.listContentEmpty,
              ]}
              columnWrapperStyle={activeLayout === 'grid' ? styles.row : undefined}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              ListHeaderComponent={<>{<RefreshGap height={refreshGapHeight} />}{listHeaderExtra}</>}
              ListEmptyComponent={loading && !isRefreshing ? undefined : listEmptyComponent}
              ListFooterComponent={loadingMore ? <SkeletonFooter layout={activeLayout} /> : undefined}
              renderItem={renderItem}
            />
          </ContentContainer>
        )}
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

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
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
  listContentEmpty: {
    flexGrow: 1,
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
