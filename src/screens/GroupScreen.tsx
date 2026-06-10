import React, {useEffect, useMemo, useState} from 'react';
import {Dimensions, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppBar} from '@components/Navigation';
import {ContentContainer, GlassContainer} from '@components/Container';
import {SectionHeader} from '@components/SectionHeader';
import {RecipeCard} from '@components/Recipe/RecipeCard';
import {PackBoard, MethodExpandOverlay, type PackBoardItem, type PackOriginRect} from '@components/PackBoard';
import {Menu, type MenuItemData} from '@components/Menu';
import {Dialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {ReviewLogSheet} from '@components/BottomSheet';
import {getColorVarKey} from '@components/ColorPicker';
import {PullIndicator, RefreshGap, usePullProgress} from '@components/PullIndicator';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import {useAddSheet} from '@contexts/AddSheetContext';
import {DEFAULT_COOKBOOK_COLOR} from '@contexts/RecipeContext';
import type {AvatarColor} from '@components/Avatar/Avatar';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import type {Recipe} from '../types/recipe';
import {IconTrash, IconTrashTwotone, IconEdit, IconBookFilled, IconExprolerBookFilled, IconChartNoAxesGantt, IconChevronRight, IconSparkle, IconLayoutGridFilled} from '@components/Icon/IconIndex';
import {parseSession} from '@utils/session';
import {buildPaperPreview} from '@utils/recipePaperPreview';
import {pickCovers} from '@utils/coverThumbnails';
import type {ExploreCookbook} from '@hooks/useExploreRecipes';

export interface GroupScreenProps {
  recipes: Recipe[];
  cookbookColors: Record<string, AvatarColor>;
  onComingSoon: () => void;
  onDeleteCookbook?: (name: string) => void;
  onCookbookPress?: (cookbookName: string) => void;
  /** 둘러보기 레시피 (어드민 전용) */
  exploreRecipes?: Recipe[];
  /** 둘러보기 레시피 북 목록 (Firestore explore_cookbooks) */
  exploreCookbooks?: ExploreCookbook[];
  /** 어드민 여부 */
  isAdmin?: boolean;
  /** 둘러보기 레시피 북 탭 시 콜백 */
  onExploreCookbookPress?: (cookbookName: string) => void;
  /** 둘러보기 레시피 북 삭제 콜백 (어드민 전용) */
  onDeleteExploreCookbook?: (name: string) => void;
  /** Pull-to-refresh 시 호출 */
  onRefresh?: () => Promise<void> | void;
  /** 레시피 상세 이동 */
  onRecipePress?: (recipeId: string) => void;
}

// 그룹 필터 메뉴 (색상은 컴포넌트 내부에서 적용)

const GROUP_FILTER_LABELS: Record<string, string> = {
  '__all__': '모든 그룹',
  'cookbook': '레시피 북',
  'retrospective': '회고록',
};

const COOKBOOK_MENU_ITEMS = [
  {id: 'rename', label: '편집', icon: IconEdit},
  {id: 'delete', label: '삭제', icon: IconTrash, destructive: true},
];

const VIEW_MODE_STORAGE_KEY = '@bakecycle_group_view_mode';
type ViewMode = 'list' | 'pack';

export function GroupScreen({recipes, cookbookColors, onComingSoon, onDeleteCookbook, onCookbookPress, exploreRecipes, exploreCookbooks, isAdmin, onExploreCookbookPress, onDeleteExploreCookbook, onRefresh, onRecipePress}: GroupScreenProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const {setShowCookbookDialog, setCookbookEditTarget} = useAddSheet();
  const {pullProgress, isRefreshing, refreshStripProgress, refreshOpacity, refreshGapHeight, handleScroll} = usePullProgress(onRefresh);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showGroupFilterMenu, setShowGroupFilterMenu] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('__all__');
  const [cookbookMenuTarget, setCookbookMenuTarget] = useState<string | null>(null);
  const [cookbookMenuPosition, setCookbookMenuPosition] = useState<{top: number; right: number} | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState('');
  const [deleteTargetIsExplore, setDeleteTargetIsExplore] = useState(false);
  const [exploreCookbookMenuTarget, setExploreCookbookMenuTarget] = useState<string | null>(null);
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [boardWidth, setBoardWidth] = useState(0);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [expandedOrigin, setExpandedOrigin] = useState<PackOriginRect | null>(null);

  // viewMode 저장/복원
  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_STORAGE_KEY).then(v => {
      if (v === 'pack' || v === 'list') setViewMode(v);
    });
  }, []);

  const handleViewModeSelect = (id: string) => {
    setShowLayoutMenu(false);
    if (id === 'list' || id === 'pack') {
      setViewMode(id);
      AsyncStorage.setItem(VIEW_MODE_STORAGE_KEY, id);
    }
  };

  const handleBoardLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== boardWidth) setBoardWidth(w);
  };

  // 레시피 0개인 레시피 북 목록 (정리 대상)
  const emptyCookbookNames = useMemo(() => {
    const used = new Set<string>();
    for (const r of recipes) {
      if (r.cookbook) used.add(r.cookbook);
    }
    return Object.keys(cookbookColors).filter(name => !used.has(name));
  }, [recipes, cookbookColors]);

  const moreMenuItems = useMemo(() => {
    const items: MenuItemData[] = [];
    if (emptyCookbookNames.length > 0) {
      items.push({id: 'cleanup', label: `빈 레시피 북 없애기 (${emptyCookbookNames.length})`, icon: IconSparkle});
    }
    items.push({id: 'deleteAll', label: '전체 삭제', icon: IconTrash, destructive: true});
    return items;
  }, [emptyCookbookNames]);

  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutMenuItems = useMemo(() => [
    {id: 'list', label: '리스트 뷰', icon: IconChartNoAxesGantt},
    {id: 'pack', label: '팩뷰', icon: IconLayoutGridFilled},
  ], []);

  const groupFilterMenuItems = useMemo(() => [
    {id: '__all__', label: '모든 그룹'},
    {id: 'cookbook', label: '레시피 북', icon: IconBookFilled, iconColor: colors['custom/brown-var']},
    {id: 'retrospective', label: '회고록', icon: IconChartNoAxesGantt, iconColor: colors['custom/light-blue-var']},
  ], [colors]);

  // 레시피를 카테고리별로 그룹핑 → 레시피 북 섹션
  const cookbooks = useMemo(() => {
    const map = new Map<string, Recipe[]>();
    // '레시피 북 없음'을 기본으로 항상 포함
    map.set('레시피 북 없음', []);
    // cookbookColors에 등록된 빈 레시피 북도 포함
    for (const name of Object.keys(cookbookColors)) {
      if (!map.has(name)) map.set(name, []);
    }
    for (const recipe of recipes) {
      const key = recipe.cookbook || '레시피 북 없음';
      const list = map.get(key) || [];
      list.push(recipe);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([name, items]) => ({name, items}));
  }, [recipes, cookbookColors]);

  // 팩뷰: 공법(method)별로 묶기 (어드민은 공식 레시피 합산, 회차는 최신 하나로)
  const methodGroups = useMemo(() => {
    const source = isAdmin ? [...recipes, ...(exploreRecipes ?? [])] : recipes;
    const latestByLineage = new Map<string, Recipe>();
    for (const r of source) {
      const groupKey = r.remakeGroupId ?? r.id;
      const existing = latestByLineage.get(groupKey);
      if (!existing || parseSession(r.session).current > parseSession(existing.session).current) {
        latestByLineage.set(groupKey, r);
      }
    }
    const map = new Map<string, Recipe[]>();
    for (const r of latestByLineage.values()) {
      const key = r.method?.trim() || '공법 없음';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([method, items]) => {
      // 서브타이틀: 모두 같은 레시피 북이면 그 이름, 섞여 있으면 '모든 요리책'
      const cookbookSet = new Set(items.map(r => r.cookbook || '레시피 북 없음'));
      const cookbookLabel = cookbookSet.size === 1 ? [...cookbookSet][0] : '모든 요리책';
      // 대표 카드 최대 3장: 이미지 있는 레시피 우선
      const sorted = [...items].sort((a, b) => (a.imageUri ? 0 : 1) - (b.imageUri ? 0 : 1));
      const cards = sorted.slice(0, 3).map(r => ({imageUrl: r.imageUri, title: r.title, paperPreview: buildPaperPreview(r)}));
      return {method, items, subtitle: `${cookbookLabel} · ${items.length}개`, cards};
    });
  }, [recipes, exploreRecipes, isAdmin]);

  const methodPacks = useMemo<PackBoardItem[]>(() => methodGroups.map(g => ({
    id: g.method,
    title: g.method,
    subtitle: g.subtitle,
    cards: g.cards,
    onPress: (rect: PackOriginRect) => {
      setExpandedOrigin(rect);
      setExpandedMethod(g.method);
    },
  })), [methodGroups]);

  // 회고록 기준: 회고가 작성됐거나 회차가 2개 이상인 레시피 (같은 remakeGroup은 최신 회차 하나만)
  const retrospectives = useMemo(() => {
    // 2회차 이상인 그룹 ID 수집
    const multiSessionGroups = new Set<string>();
    for (const r of recipes) {
      if (r.remakeGroupId) multiSessionGroups.add(r.remakeGroupId);
    }
    // 조건: 회고가 있거나 다회차 그룹에 속함
    const candidates = recipes.filter(r => {
      if (r.reviews && r.reviews.length > 0) return true;
      const groupKey = r.remakeGroupId ?? r.id;
      return multiSessionGroups.has(groupKey);
    });
    const seenGroups = new Set<string>();
    const result: Recipe[] = [];
    const sorted = [...candidates].sort((a, b) => parseSession(b.session).current - parseSession(a.session).current);
    for (const r of sorted) {
      const groupKey = r.remakeGroupId ?? r.id;
      if (seenGroups.has(groupKey)) continue;
      seenGroups.add(groupKey);
      result.push(r);
    }
    return result;
  }, [recipes]);

  // 팩뷰 추가 팩: '레시피 북 없음' + 회고록 (비어 있어도 항상 표시)
  // 집계 팩이라 자연 썸네일이 없어 cover-* 에셋을 랜덤(시드 고정)으로 채움
  const extraPacks = useMemo<PackBoardItem[]>(() => {
    // 콘텐츠 없는 집계 팩은 커버 2장 형태로 표시
    const toCards = (seed: string, title: string) =>
      pickCovers(seed, 2).map(src => ({imageUrl: src, title}));

    const noCookbook = recipes.filter(r => !r.cookbook?.trim());

    return [
      {
        id: '__no_cookbook__',
        title: '레시피 북 없음',
        subtitle: `${noCookbook.length}개`,
        cards: toCards('__no_cookbook__', '레시피 북 없음'),
        onPress: () => onCookbookPress?.('레시피 북 없음'),
      },
      {
        id: '__retrospective__',
        title: '회고록',
        subtitle: retrospectives.length > 0 ? `${retrospectives.length}개` : '없음',
        cards: toCards('__retrospective__', '회고록'),
        onPress: () => setShowReviewSheet(true),
      },
    ];
  }, [recipes, retrospectives, onCookbookPress]);

  // 그룹별 통계 (회고 수, 회차 수)
  const retroStats = useMemo(() => {
    const groupMap = new Map<string, Recipe[]>();
    for (const r of recipes) {
      const groupKey = r.remakeGroupId ?? r.id;
      if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
      groupMap.get(groupKey)!.push(r);
    }
    const stats = new Map<string, {totalReviews: number; totalSessions: number}>();
    for (const [key, group] of groupMap) {
      const totalReviews = group.reduce((sum, r) => sum + (r.reviews?.length ?? 0), 0);
      stats.set(key, {totalReviews, totalSessions: group.length});
    }
    return stats;
  }, [recipes]);

  const exploreCookbookColorMap = useMemo(() => {
    const map = new Map<string, string>();
    exploreCookbooks?.forEach(c => map.set(c.name, c.color));
    return map;
  }, [exploreCookbooks]);

  // 둘러보기 레시피 북 (어드민 전용): 레시피 그룹 + explore_cookbooks의 빈 레시피 북 포함
  const exploreGroups = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map<string, Recipe[]>();
    // explore_cookbooks에 등록된 빈 레시피 북도 포함
    for (const cb of exploreCookbooks ?? []) {
      if (!map.has(cb.name)) map.set(cb.name, []);
    }
    for (const recipe of exploreRecipes ?? []) {
      const key = recipe.cookbook || '공식 레시피 북 없음';
      const list = map.get(key) || [];
      list.push(recipe);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([name, items]) => ({name, items}));
  }, [isAdmin, exploreRecipes, exploreCookbooks]);

  const handleTitlePress = () => {
    setShowMoreMenu(false);
    setCookbookMenuTarget(null);
    setShowGroupFilterMenu(prev => !prev);
  };

  const handleGroupFilterSelect = (id: string) => {
    setShowGroupFilterMenu(false);
    setSelectedGroupFilter(id);
  };

  const handleMenuPress = () => {
    setShowGroupFilterMenu(false);
    setCookbookMenuTarget(null);
    setShowMoreMenu(prev => !prev);
  };

  const handleOverlayPress = () => {
    setShowGroupFilterMenu(false);
    setShowMoreMenu(false);
    setCookbookMenuTarget(null);
    setExploreCookbookMenuTarget(null);
  };

  const positionMenu = (position: {pageX: number; pageY: number; width: number; height: number}) => {
    const screenWidth = Dimensions.get('window').width;
    const menuMinWidth = 200;
    const edgeMargin = Spacing.md;
    const rawRight = screenWidth - (position.pageX + position.width);
    const clampedRight = Math.min(Math.max(rawRight, edgeMargin), screenWidth - menuMinWidth - edgeMargin);
    setCookbookMenuPosition({
      top: position.pageY + position.height + Spacing.xs,
      right: clampedRight,
    });
  };

  const handleCookbookMenuPress = (name: string, position: {pageX: number; pageY: number; width: number; height: number}) => {
    setShowGroupFilterMenu(false);
    setShowMoreMenu(false);
    setExploreCookbookMenuTarget(null);
    positionMenu(position);
    setCookbookMenuTarget(prev => (prev === name ? null : name));
  };

  const handleExploreCookbookMenuPress = (name: string, position: {pageX: number; pageY: number; width: number; height: number}) => {
    setShowGroupFilterMenu(false);
    setShowMoreMenu(false);
    setCookbookMenuTarget(null);
    positionMenu(position);
    setExploreCookbookMenuTarget(prev => (prev === name ? null : name));
  };

  const handleCookbookMenuSelect = (id: string) => {
    const target = cookbookMenuTarget;
    setCookbookMenuTarget(null);
    if (id === 'rename' && target) {
      setCookbookEditTarget({name: target, color: cookbookColors[target] || DEFAULT_COOKBOOK_COLOR});
      setShowCookbookDialog(true);
    } else if (id === 'delete' && target) {
      setDeleteTarget(target);
      setDeleteTargetIsExplore(false);
      setShowDeleteDialog(true);
    } else {
      onComingSoon();
    }
  };

  const handleExploreCookbookMenuSelect = (id: string) => {
    const target = exploreCookbookMenuTarget;
    setExploreCookbookMenuTarget(null);
    if (id === 'rename' && target) {
      const ecColor = exploreCookbookColorMap.get(target) ?? 'orange';
      setCookbookEditTarget({name: target, color: ecColor as AvatarColor, isExplore: true});
      setShowCookbookDialog(true);
    } else if (id === 'delete' && target) {
      setDeleteTarget(target);
      setDeleteTargetIsExplore(true);
      setShowDeleteDialog(true);
    }
  };

  const showCookbookSection = selectedGroupFilter === 'cookbook' || selectedGroupFilter === '__all__';
  const showRetrospectiveSection = selectedGroupFilter === 'retrospective' || selectedGroupFilter === '__all__';
  const anyMenuOpen = showGroupFilterMenu || showMoreMenu || !!cookbookMenuTarget || !!exploreCookbookMenuTarget;

  return (
    <View style={styles.container}>
      <AppBar
        title={GROUP_FILTER_LABELS[selectedGroupFilter]}
        showDropdown
        onTitlePress={handleTitlePress}
        onAddPress={() => setShowCookbookDialog(true)}
        onFilterPress={() => { setShowMoreMenu(false); setShowLayoutMenu(prev => !prev); }}
        filterMenuOpen={showLayoutMenu}
        onMenuPress={() => { setShowLayoutMenu(false); handleMenuPress(); }}
        menuOpen={showMoreMenu}
        titleMenu={
          <Menu
            items={groupFilterMenuItems}
            selectedId={selectedGroupFilter}
            visible={showGroupFilterMenu}
            onSelect={handleGroupFilterSelect}
          />
        }
        rightMenu={
          <>
            <Menu
              items={layoutMenuItems}
              selectedId={viewMode}
              visible={showLayoutMenu}
              onSelect={handleViewModeSelect}
            />
            <Menu
              items={moreMenuItems}
              visible={showMoreMenu}
              onSelect={(id) => {
                setShowMoreMenu(false);
                if (id === 'cleanup') {
                  if (emptyCookbookNames.length === 0 || !onDeleteCookbook) return;
                  emptyCookbookNames.forEach(name => onDeleteCookbook(name));
                } else if (id === 'deleteAll') {
                  onComingSoon();
                }
              }}
            />
          </>
        }
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.pullWrapper}>
          <PullIndicator progress={pullProgress} isRefreshing={isRefreshing} refreshStripProgress={refreshStripProgress} refreshOpacity={refreshOpacity} />

          <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}>
          <RefreshGap height={refreshGapHeight} />
          <ContentContainer style={styles.sections}>
            {/* 팩뷰: 공법별 흩뿌림 보드 */}
            {viewMode === 'pack' && (
              <View style={styles.packBoardWrapper} onLayout={handleBoardLayout}>
                {boardWidth > 0 && <PackBoard items={[...methodPacks, ...extraPacks]} width={boardWidth} />}
              </View>
            )}

            {/* 레시피 북 섹션 */}
            {viewMode === 'list' && showCookbookSection && (
              <View style={styles.section}>
                <SectionHeader title="레시피 북" style={styles.sectionHeader} />
                <View>
                  {(() => {
                      const totalLen = cookbooks.length + exploreGroups.length;
                      return (
                        <>
                          {cookbooks.map((cookbook, idx) => {
                            const isUngrouped = cookbook.name === '레시피 북 없음';
                            const isLast = idx === totalLen - 1;
                            return (
                              <View key={cookbook.name}>
                                <RecipeCard
                                  title={cookbook.name}
                                  cookbook={`${cookbook.items.length}개의 레시피`}
                                  reviewCount={cookbook.items.reduce((sum, r) => sum + (r.reviews?.length ?? 0), 0)}
                                  layout="list"
                                  placeholderIcon={IconBookFilled}
                                  placeholderIconColor={isUngrouped ? colors['foreground/on-surface-muted'] : colors[getColorVarKey(cookbookColors[cookbook.name] || DEFAULT_COOKBOOK_COLOR)]}
                                  onPress={() => onCookbookPress?.(cookbook.name)}
                                  onMenuPress={isUngrouped ? undefined : (pos) => handleCookbookMenuPress(cookbook.name, pos)}
                                  hideDivider={isLast}
                                />
                              </View>
                            );
                          })}
                          {/* 둘러보기 레시피 북 (어드민 전용) */}
                          {exploreGroups.map((cookbook, idx) => {
                            const ecColor = (exploreCookbookColorMap.get(cookbook.name) || 'orange') as AvatarColor;
                            const isExploreUngrouped = cookbook.name === '공식 레시피 북 없음';
                            const isLast = cookbooks.length + idx === totalLen - 1;
                            return (
                              <View key={`explore-${cookbook.name}`}>
                                <RecipeCard
                                  title={cookbook.name}
                                  cookbook={`${cookbook.items.length}개의 레시피`}
                                  reviewCount={cookbook.items.reduce((sum: number, r) => sum + (r.reviews?.length ?? 0), 0)}
                                  layout="list"
                                  placeholderIcon={IconExprolerBookFilled}
                                  placeholderIconColor={isExploreUngrouped ? colors['foreground/on-surface-muted'] : colors[getColorVarKey(ecColor)]}
                                  onPress={() => onExploreCookbookPress?.(cookbook.name)}
                                  onMenuPress={(pos) => handleExploreCookbookMenuPress(cookbook.name, pos)}
                                  hideDivider={isLast}
                                />
                              </View>
                            );
                          })}
                        </>
                      );
                    })()}
                  </View>
              </View>
            )}

            {/* 회고록 섹션 */}
            {viewMode === 'list' && showRetrospectiveSection && (
              <View style={styles.section}>
                <Pressable style={[styles.sectionHeader, styles.retroHeader]} onPress={() => setShowReviewSheet(true)}>
                  <Text style={styles.retroHeaderTitle}>회고록</Text>
                  <IconChevronRight width={14} height={14} color={colors['foreground/on-surface-muted']} />
                </Pressable>
                {retrospectives.length > 0 ? (
                  <View>
                    {retrospectives.map((recipe, idx) => {
                      const groupKey = recipe.remakeGroupId ?? recipe.id;
                      const stats = retroStats.get(groupKey) ?? {totalReviews: 0, totalSessions: 1};
                      return (
                        <RecipeCard
                          key={recipe.id}
                          title={recipe.title}
                          cookbook={recipe.cookbook}
                          method={`${stats.totalSessions}회차`}
                          imageUrl={recipe.imageUri}
                          layout="list"
                          placeholderIcon={IconChartNoAxesGantt}
                          placeholderIconColor={colors['custom/light-blue-var']}
                          onPress={() => {
                            const targetId = recipe.remakeGroupId
                              ? recipes
                                  .filter(r => r.remakeGroupId === recipe.remakeGroupId || r.id === recipe.remakeGroupId)
                                  .sort((a, b) => parseSession(b.session).current - parseSession(a.session).current)[0]?.id ?? recipe.id
                              : recipe.id;
                            onRecipePress?.(targetId);
                          }}
                          hideDivider={idx === retrospectives.length - 1}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <RecipeCard
                    title=""
                    cookbook="아직 작성된 회고록이 없습니다."
                    layout="list"
                    placeholderIcon={IconChartNoAxesGantt}
                    placeholderIconColor={colors['custom/light-blue-var']}
                    hideDivider
                  />
                )}
              </View>
            )}
          </ContentContainer>
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* 오버레이 */}
      <Pressable
        style={styles.overlay}
        onPress={handleOverlayPress}
        pointerEvents={anyMenuOpen ? 'auto' : 'none'}
      />

      {/* 레시피 북 오버플로우 메뉴 */}
      {cookbookMenuTarget ? (
        <Menu
          items={COOKBOOK_MENU_ITEMS}
          visible={!!cookbookMenuTarget}
          onSelect={handleCookbookMenuSelect}
          style={cookbookMenuPosition ? {
            position: 'absolute',
            top: cookbookMenuPosition.top,
            right: cookbookMenuPosition.right,
            zIndex: 50,
          } : undefined}
        />
      ) : null}

      {/* 둘러보기 레시피 북 오버플로우 메뉴 */}
      {exploreCookbookMenuTarget ? (
        <Menu
          items={COOKBOOK_MENU_ITEMS}
          visible={!!exploreCookbookMenuTarget}
          onSelect={handleExploreCookbookMenuSelect}
          style={cookbookMenuPosition ? {
            position: 'absolute',
            top: cookbookMenuPosition.top,
            right: cookbookMenuPosition.right,
            zIndex: 50,
          } : undefined}
        />
      ) : null}

      {/* 레시피 북 삭제 확인 다이얼로그 */}
      <Dialog
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title="삭제하기"
        description={deleteTargetIsExplore
          ? `공식 레시피 북 '${deleteTarget}'을(를) 삭제하시겠습니까?`
          : `'${deleteTarget}' 레시피 북을 삭제하시겠습니까?\n레시피는 레시피 북 없음으로 이동됩니다.`}
        actions={<>
          <Button label="취소" variant="soft" onPress={() => setShowDeleteDialog(false)} />
          <Button label="삭제" variant="soft" destructive onPress={() => {
            if (deleteTargetIsExplore) {
              onDeleteExploreCookbook?.(deleteTarget);
            } else {
              onDeleteCookbook?.(deleteTarget);
            }
            setShowDeleteDialog(false);
          }} />
        </>}
      />

      {/* 회고록 바텀시트 */}
      <ReviewLogSheet
        visible={showReviewSheet}
        onClose={() => setShowReviewSheet(false)}
        recipes={retrospectives}
        allRecipes={recipes}
        onRecipePress={onRecipePress}
      />

      {/* 팩뷰 → 공법 확대 오버레이 */}
      {expandedMethod && expandedOrigin && (
        <MethodExpandOverlay
          method={expandedMethod}
          methods={methodGroups}
          origin={expandedOrigin}
          onClose={() => { setExpandedMethod(null); setExpandedOrigin(null); }}
          onRecipePress={onRecipePress}
        />
      )}
    </View>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors['surface/normal'],
  },
  packBoardWrapper: {
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
  pullWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 120,
  },
  sections: {
    gap: Spacing.lg,
  },
  section: {},
  sectionHeader: {
    marginBottom: -Spacing.sm,
  },
  retroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 40,
    paddingHorizontal: Spacing.smd,
  },
  retroHeaderTitle: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
  },
  emptyThumbnail: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: 'rgba(94, 94, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    height: 68,
  },
  emptyText: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },

});
