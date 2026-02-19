import React, {useMemo, useState} from 'react';
import {Dimensions, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppBar} from '@components/Navigation';
import {ContentContainer} from '@components/Container';
import {SectionHeader} from '@components/SectionHeader';
import {RecipeCard} from '@components/Recipe/RecipeCard';
import {Menu} from '@components/Menu';
import {Dialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {getColorVarKey} from '@components/ColorPicker';
import {PullIndicator, RefreshGap, usePullProgress} from '@components/PullIndicator';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useAddSheet} from '@contexts/AddSheetContext';
import {DEFAULT_COOKBOOK_COLOR} from '@contexts/RecipeContext';
import type {AvatarColor} from '@components/Avatar/Avatar';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {MockRecipe} from '@data/mockRecipes';
import {IconTrash, IconTrashTwotone, IconEdit, IconBookFilled, IconExprolerBookFilled, IconChartNoAxesGantt, IconColliections} from '@components/Icon/IconIndex';
import type {ExploreCookbook} from '@hooks/useExploreRecipes';

export interface GroupScreenProps {
  recipes: MockRecipe[];
  cookbookColors: Record<string, AvatarColor>;
  onComingSoon: () => void;
  onDeleteCookbook?: (name: string) => void;
  onCookbookPress?: (cookbookName: string) => void;
  /** 둘러보기 레시피 (어드민 전용) */
  exploreRecipes?: MockRecipe[];
  /** 둘러보기 요리책 목록 (Firestore explore_cookbooks) */
  exploreCookbooks?: ExploreCookbook[];
  /** 어드민 여부 */
  isAdmin?: boolean;
  /** 둘러보기 요리책 탭 시 콜백 */
  onExploreCookbookPress?: (cookbookName: string) => void;
  /** 둘러보기 요리책 삭제 콜백 (어드민 전용) */
  onDeleteExploreCookbook?: (name: string) => void;
  /** Pull-to-refresh 시 호출 */
  onRefresh?: () => Promise<void> | void;
}

// 그룹 필터 메뉴 (색상은 컴포넌트 내부에서 적용)

const GROUP_FILTER_LABELS: Record<string, string> = {
  '__all__': '모든 그룹',
  'cookbook': '요리책',
  'retrospective': '회고록',
};

const MORE_MENU_ITEMS = [
  {id: 'deleteAll', label: '전체 삭제', icon: IconTrash, destructive: true},
];

const COOKBOOK_MENU_ITEMS = [
  {id: 'rename', label: '편집', icon: IconEdit},
  {id: 'delete', label: '삭제', icon: IconTrash, destructive: true},
];

export function GroupScreen({recipes, cookbookColors, onComingSoon, onDeleteCookbook, onCookbookPress, exploreRecipes, exploreCookbooks, isAdmin, onExploreCookbookPress, onDeleteExploreCookbook, onRefresh}: GroupScreenProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
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

  const groupFilterMenuItems = useMemo(() => [
    {id: '__all__', label: '모든 그룹', icon: IconColliections},
    {id: 'cookbook', label: '요리책', icon: IconBookFilled, iconColor: colors['custom-brownvar']},
    {id: 'retrospective', label: '회고록', icon: IconChartNoAxesGantt, iconColor: colors['custom-lightbluevar']},
  ], [colors]);

  // 레시피를 카테고리별로 그룹핑 → 요리책 섹션
  const cookbooks = useMemo(() => {
    const map = new Map<string, MockRecipe[]>();
    // '그룹없음'을 기본으로 항상 포함
    map.set('그룹없음', []);
    // cookbookColors에 등록된 빈 요리책도 포함
    for (const name of Object.keys(cookbookColors)) {
      if (!map.has(name)) map.set(name, []);
    }
    for (const recipe of recipes) {
      const key = recipe.cookbook || '그룹없음';
      const list = map.get(key) || [];
      list.push(recipe);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([name, items]) => ({name, items}));
  }, [recipes, cookbookColors]);

  // 회고가 있는 레시피 → 회고록 섹션
  const retrospectives = useMemo(
    () => recipes.filter(r => r.reviewCount > 0),
    [recipes],
  );

  const exploreCookbookColorMap = useMemo(() => {
    const map = new Map<string, string>();
    exploreCookbooks?.forEach(c => map.set(c.name, c.color));
    return map;
  }, [exploreCookbooks]);

  // 둘러보기 요리책 (어드민 전용): 레시피 그룹 + explore_cookbooks의 빈 요리책 포함
  const exploreGroups = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map<string, MockRecipe[]>();
    // explore_cookbooks에 등록된 빈 요리책도 포함
    for (const cb of exploreCookbooks ?? []) {
      if (!map.has(cb.name)) map.set(cb.name, []);
    }
    for (const recipe of exploreRecipes ?? []) {
      const key = recipe.cookbook || '미분류';
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

  const showCookbookSection = selectedGroupFilter === '__all__' || selectedGroupFilter === 'cookbook';
  const showRetrospectiveSection = selectedGroupFilter === '__all__' || selectedGroupFilter === 'retrospective';
  const anyMenuOpen = showGroupFilterMenu || showMoreMenu || !!cookbookMenuTarget || !!exploreCookbookMenuTarget;

  return (
    <View style={styles.container}>
      <AppBar
        title={GROUP_FILTER_LABELS[selectedGroupFilter]}
        showDropdown
        onTitlePress={handleTitlePress}
        onAddPress={() => setShowCookbookDialog(true)}
        onFilterPress={onComingSoon}
        onMenuPress={handleMenuPress}
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
          <Menu
            items={MORE_MENU_ITEMS}
            visible={showMoreMenu}
            onSelect={() => {
              setShowMoreMenu(false);
              onComingSoon();
            }}
          />
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
            {/* 요리책 섹션 */}
            {showCookbookSection && (
              <View style={styles.section}>
                <SectionHeader title="요리책" style={styles.sectionHeader} />
                <View>
                  {cookbooks.map(cookbook => {
                    const isUngrouped = cookbook.name === '그룹없음';
                    return (
                      <View key={cookbook.name}>
                        <RecipeCard
                          title={cookbook.name}
                          cookbook={`${cookbook.items.length}개의 레시피`}
                          reviewCount={cookbook.items.reduce((sum, r) => sum + r.reviewCount, 0)}
                          layout="list"
                          placeholderIcon={IconBookFilled}
                          placeholderIconColor={colors[getColorVarKey(cookbookColors[cookbook.name] || DEFAULT_COOKBOOK_COLOR)]}
                          onPress={() => onCookbookPress?.(cookbook.name)}
                          onMenuPress={isUngrouped ? undefined : (pos) => handleCookbookMenuPress(cookbook.name, pos)}
                        />
                      </View>
                    );
                  })}
                  {/* 둘러보기 요리책 (어드민 전용) */}
                  {exploreGroups.map(cookbook => {
                    const ecColor = (exploreCookbookColorMap.get(cookbook.name) || 'orange') as AvatarColor;
                    return (
                      <View key={`explore-${cookbook.name}`}>
                        <RecipeCard
                          title={cookbook.name}
                          cookbook={`${cookbook.items.length}개의 레시피`}
                          reviewCount={cookbook.items.reduce((sum: number, r) => sum + r.reviewCount, 0)}
                          layout="list"
                          placeholderIcon={IconExprolerBookFilled}
                          placeholderIconColor={colors[getColorVarKey(ecColor)]}
                          onPress={() => onExploreCookbookPress?.(cookbook.name)}
                          onMenuPress={(pos) => handleExploreCookbookMenuPress(cookbook.name, pos)}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 회고록 섹션 */}
            {showRetrospectiveSection && (
              <View style={styles.section}>
                <SectionHeader title="회고록" style={styles.sectionHeader} />
                {retrospectives.length > 0 ? (
                  <View>
                    {retrospectives.map(recipe => (
                      <RecipeCard
                        key={recipe.id}
                        title={recipe.title}
                        cookbook={recipe.cookbook}
                        method={recipe.method}
                        reviewCount={recipe.reviewCount}
                        imageSource={recipe.imageSource}
                        layout="list"
                        placeholderIcon={IconChartNoAxesGantt}
                        placeholderIconColor={colors['custom-lightbluevar']}
                        onPress={onComingSoon}
                        onMenuPress={onComingSoon}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <View style={styles.emptyThumbnail}>
                      <IconChartNoAxesGantt
                        width={24}
                        height={24}
                        color={colors['custom-lightbluevar']}
                      />
                    </View>
                    <View style={styles.emptyContent}>
                      <Text style={styles.emptyText}>아직 작성된 회고록이 없습니다.</Text>
                    </View>
                  </View>
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

      {/* 요리책 오버플로우 메뉴 */}
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

      {/* 둘러보기 요리책 오버플로우 메뉴 */}
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

      {/* 요리책 삭제 확인 다이얼로그 */}
      <Dialog
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title="삭제하기"
        description={deleteTargetIsExplore
          ? `공식 요리책 '${deleteTarget}'을(를) 삭제하시겠습니까?`
          : `'${deleteTarget}' 요리책을 삭제하시겠습니까?\n레시피는 그룹없음으로 이동됩니다.`}
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
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors['surface-surfacedim'],
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
    color: colors['foreground-onsurfacemuted'],
  },
});
