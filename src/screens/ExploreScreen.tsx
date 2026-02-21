import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, TextInput as RNTextInput, View} from 'react-native';
import {AppBar, FloatingNavBar, navPillStyle} from '@components/Navigation';
import {GlassContainer} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {EmptyState} from '@components/EmptyState';
import {Menu} from '@components/Menu';
import {PdfPreviewDialog} from '@components/Dialog';
import {RecipeListTemplate} from '@components/Recipe/RecipeListTemplate';
import {useColors} from '@contexts/ThemeContext';
import {useRecipes} from '@contexts/RecipeContext';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import type {Recipe} from '../types/recipe';
import {getRecipeMenuItems} from '@utils/recipeMenuItems';
import {
  IconExprolerBookFilled,
  IconSearch,
  IconClose,
  IconCloseCircleFilled,
} from '@components/Icon/IconIndex';
import {getColorVarKey} from '@components/ColorPicker/ColorPicker';
import type {ExploreCookbook} from '@hooks/useExploreRecipes';

const FREE_RECIPE_COUNT = 3;

const emptyCookbookImage = require('../../assets/images/empty_no_cookbook_recipe.png');
const BASE_CARD_MENU_ITEMS = getRecipeMenuItems({showImport: true});
const ADMIN_CARD_MENU_ITEMS = getRecipeMenuItems({showImport: true, showEdit: true, showDelete: true});

export interface ExploreScreenProps {
  data: Recipe[];
  loading?: boolean;
  isAdmin?: boolean;
  isOnline?: boolean;
  myRecipeIds: string[];
  onImportRecipe: (recipe: Recipe) => void;
  onRecipePress: (recipe: Recipe, locked?: boolean) => void;
  onEditRecipe?: (recipe: Recipe) => void;
  onDeleteRecipe?: (recipe: Recipe) => void;
  onAddRecipe?: (cookbook?: string) => void;
  onComingSoon: () => void;
  onRefresh?: () => void;
  /** 둘러보기 요리책 목록 (이름+컬러) */
  exploreCookbooks?: ExploreCookbook[];
  /** 무료 유저 여부 (true면 3개 제한 + paywall) */
  isFreeUser?: boolean;
}

export function ExploreScreen({
  data,
  loading = false,
  isAdmin = false,
  isOnline = true,
  onImportRecipe,
  onRecipePress,
  onEditRecipe,
  onDeleteRecipe,
  onAddRecipe,
  onComingSoon,
  onRefresh,
  exploreCookbooks,
  isFreeUser = false,
}: ExploreScreenProps) {
  const colors = useColors();
  const {selectedExploreCookbook, setSelectedExploreCookbook} = useRecipes();
  const [selectedCategory, setSelectedCategory] = useState(selectedExploreCookbook ?? '제과기능사');

  // 외부에서 요리책 필터가 설정되면 반영 후 초기화
  React.useEffect(() => {
    if (selectedExploreCookbook) {
      setSelectedCategory(selectedExploreCookbook);
      setSelectedExploreCookbook(null);
    }
  }, [selectedExploreCookbook, setSelectedExploreCookbook]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfRecipe, setPdfRecipe] = useState<Recipe | null>(null);

  const cardMenuItems = useMemo(
    () => isAdmin ? ADMIN_CARD_MENU_ITEMS : BASE_CARD_MENU_ITEMS,
    [isAdmin],
  );

  const exploreCookbookMap = useMemo(() => {
    const map = new Map<string, string>();
    exploreCookbooks?.forEach(c => map.set(c.name, c.color));
    return map;
  }, [exploreCookbooks]);

  const categoryMenuItems = useMemo(() => {
    // 레시피가 있는 요리책 카운트
    const recipeCounts = new Map<string, number>();
    for (const r of data) {
      const key = r.cookbook || '그룹없음';
      recipeCounts.set(key, (recipeCounts.get(key) ?? 0) + 1);
    }
    // exploreCookbooks의 빈 요리책도 포함
    const allNames = new Set([
      ...recipeCounts.keys(),
      ...(exploreCookbooks ?? []).map(c => c.name),
    ]);
    const items: {id: string; label: string; icon?: React.FC<any>; iconColor?: string; disabled?: boolean}[] = [
      {id: '__all__', label: '모든 요리책'},
    ];
    for (const name of allNames) {
      if (name === '그룹없음') continue;
      const ecColor = exploreCookbookMap.get(name);
      const count = recipeCounts.get(name) ?? 0;
      items.push({
        id: name,
        label: name,
        icon: IconExprolerBookFilled,
        iconColor: colors[getColorVarKey((ecColor ?? 'orange') as any)],
        disabled: count === 0,
      });
    }
    if (recipeCounts.has('그룹없음')) {
      items.push({id: '그룹없음', label: '그룹없음'});
    }
    return items;
  }, [data, exploreCookbookMap, exploreCookbooks, colors]);

  const filteredData = useMemo(() => {
    let result = data;
    if (selectedCategory === '그룹없음') {
      result = result.filter(r => !r.cookbook);
    } else if (selectedCategory && selectedCategory !== '__all__') {
      result = result.filter(r => r.cookbook === selectedCategory);
    }
    if (!searchQuery.trim()) return result;
    const q = searchQuery.trim().toLowerCase();
    return result.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.method?.toLowerCase().includes(q) ||
      r.cookbook?.toLowerCase().includes(q),
    );
  }, [data, selectedCategory, searchQuery]);

  // 무료 유저: 전체 표시하되 잠금 처리
  const paywallData = filteredData;

  const lockedRecipeIds = useMemo(() => {
    if (!isFreeUser) return undefined;
    const ids = new Set<string>();
    filteredData.slice(FREE_RECIPE_COUNT).forEach(r => ids.add(r.id));
    return ids;
  }, [filteredData, isFreeUser]);

  const handleRecipePress = useCallback((recipe: Recipe) => {
    onRecipePress(recipe, lockedRecipeIds?.has(recipe.id));
  }, [lockedRecipeIds, onRecipePress]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
  }, []);

  const handleCardMenuSelect = useCallback((id: string, recipe: Recipe) => {
    if (id === 'save') {
      onImportRecipe(recipe);
    } else if (id === 'download') {
      setPdfRecipe(recipe);
    } else if (id === 'edit' && onEditRecipe) {
      onEditRecipe(recipe);
    } else if (id === 'delete' && onDeleteRecipe) {
      onDeleteRecipe(recipe);
    } else {
      onComingSoon();
    }
  }, [onImportRecipe, onEditRecipe, onDeleteRecipe, onComingSoon]);

  return (
    <>
    <RecipeListTemplate
      data={paywallData}
      loading={loading}
      onRecipePress={handleRecipePress}
      cardMenuItems={cardMenuItems}
      onCardMenuSelect={handleCardMenuSelect}
      onRefresh={onRefresh}
      onOverlayPress={() => setShowCategoryMenu(false)}
      extraOverlayVisible={showCategoryMenu}
      forceLayout={showSearch && searchQuery.trim() ? 'list' : undefined}
      scrollEnabled
      lockedRecipeIds={lockedRecipeIds}
      listEmptyComponent={
        !isOnline && data.length === 0 ? (
          <EmptyState
            category="network-error"
            title="네트워크에 연결할 수 없어요."
            subtitle="인터넷 연결을 확인하고 다시 시도해 주세요."
          />
        ) : showSearch && searchQuery.trim() ? (
          <EmptyState
            category="no-results"
            title="검색된 결과가 없네요."
            subtitle={`'${searchQuery.trim()}'에 해당하는 레시피를 찾지 못했어요.`}
          />
        ) : selectedCategory && selectedCategory !== '__all__' ? (
          <EmptyState
            image={emptyCookbookImage}
            title="요리책이 비어 있어요."
            subtitle="첫 레시피를 추가해보세요."
            actionLabel={onAddRecipe ? '레시피 추가하기' : undefined}
            onAction={onAddRecipe ? () => onAddRecipe(selectedCategory) : undefined}
          />
        ) : data.length === 0 ? (
          <EmptyState
            category="no-recipe"
            title="둘러보기 레시피가 아직 없네요."
            subtitle="잠시 후 다시 확인해 보세요."
          />
        ) : undefined
      }
      renderAppBar={({handleFilterPress, showLayoutMenu, closeMenus, layoutMenu}) =>
        showSearch ? (
          <FloatingNavBar
            leftFull
            left={
              <View style={styles.searchBar}>
                <GlassContainer contentStyle={navPillStyle}>
                  <IconButton
                    icon={IconClose}
                    onPress={closeSearch}
                    variant="ghost-secondary"
                    size="medium"
                  />
                </GlassContainer>
                <GlassContainer style={styles.searchPillOuter} contentStyle={styles.searchPill}>
                  <IconButton
                    icon={IconSearch}
                    variant="ghost-secondary"
                    size="medium"
                  />
                  <RNTextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="검색어를 입력하세요."
                    placeholderTextColor={colors['foreground-onsurfacemuted']}
                    autoFocus
                    style={[styles.searchInput, {color: colors['foreground-onsurface']}]}
                  />
                  {searchQuery.length > 0 && (
                    <IconButton
                      icon={IconCloseCircleFilled}
                      onPress={() => setSearchQuery('')}
                      variant="ghost-secondary"
                      size="medium"
                    />
                  )}
                </GlassContainer>
              </View>
            }
          />
        ) : (
          <AppBar
            title={categoryMenuItems.find(c => c.id === selectedCategory)?.label ?? selectedCategory}
            showDropdown
            showAddButton={!!onAddRecipe}
            showSearchButton
            showMenuButton={false}
            onTitlePress={() => {
              closeMenus();
              setShowCategoryMenu(prev => !prev);
            }}
            onAddPress={() => {
              closeMenus();
              setShowCategoryMenu(false);
              onAddRecipe?.();
            }}
            onSearchPress={() => {
              closeMenus();
              setShowCategoryMenu(false);
              setShowSearch(true);
            }}
            onFilterPress={() => {
              setShowCategoryMenu(false);
              handleFilterPress();
            }}
            filterMenuOpen={showLayoutMenu}
            titleMenu={
              <Menu
                items={categoryMenuItems}
                selectedId={selectedCategory}
                onSelect={(id) => {
                  setSelectedCategory(id);
                  setShowCategoryMenu(false);
                }}
                visible={showCategoryMenu}
              />
            }
            rightMenu={layoutMenu}
          />
        )
      }
    />

    <PdfPreviewDialog
      visible={!!pdfRecipe}
      onClose={() => setPdfRecipe(null)}
      data={pdfRecipe ? {
        title: pdfRecipe.title,
        cookbook: pdfRecipe.cookbook,
        method: pdfRecipe.method,
        reviewCount: pdfRecipe.reviewCount,
        time: pdfRecipe.time,
        servings: pdfRecipe.servings,
        session: pdfRecipe.session,
        ingredientGroups: pdfRecipe.ingredientGroups ?? [],
        tools: pdfRecipe.tools ?? [],
        steps: pdfRecipe.steps,
        stepGroups: pdfRecipe.stepGroups,
      } : undefined}
    />
    </>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
    flex: 1,
  },
  searchPillOuter: {
    flex: 1,
    maxWidth: 480,
  },
  searchPill: {
    ...navPillStyle,
    paddingHorizontal: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    paddingVertical: 2,
    outlineStyle: 'none',
  } as any,
});
