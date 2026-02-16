import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, TextInput as RNTextInput, View} from 'react-native';
import {AppBar, FloatingNavBar, GlassContainer, navPillStyle, IconButton} from '@components/Layout';
import {EmptyState} from '@components/EmptyState';
import {Menu} from '@components/Menu';
import {PdfPreviewDialog} from '@components/Dialog';
import {RecipeListTemplate} from '@components/Recipe/RecipeListTemplate';
import {useColors} from '@contexts/ThemeContext';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import {MockRecipe} from '@data/mockRecipes';
import {
  IconRecipeFilled,
  IconWheatFilled,
  IconArrowDownToLine,
  IconEdit,
  IconTrash,
  IconSearch,
  IconClose,
  IconCloseCircleFilled,
} from '@components/Icon/IconIndex';

const CATEGORY_MENU_ITEMS = [
  {id: 'pastry', label: '제과기능사', icon: IconRecipeFilled},
  {id: 'bread', label: '제빵기능사', icon: IconWheatFilled, disabled: true},
];

const BASE_CARD_MENU_ITEMS = [
  {id: 'save', label: '내 레시피로 저장', icon: IconArrowDownToLine},
  {id: 'download', label: 'PDF 다운로드', icon: IconArrowDownToLine},
];

const ADMIN_CARD_MENU_ITEMS = [
  {id: 'save', label: '내 레시피로 저장', icon: IconArrowDownToLine},
  {id: 'download', label: 'PDF 다운로드', icon: IconArrowDownToLine},
  {id: 'edit', label: '편집', icon: IconEdit},
  {id: 'delete', label: '삭제', icon: IconTrash},
];

export interface ExploreScreenProps {
  data: MockRecipe[];
  isAdmin?: boolean;
  myRecipeIds: string[];
  onImportRecipe: (recipe: MockRecipe) => void;
  onRecipePress: (recipe: MockRecipe) => void;
  onEditRecipe?: (recipe: MockRecipe) => void;
  onDeleteRecipe?: (recipe: MockRecipe) => void;
  onComingSoon: () => void;
}

export function ExploreScreen({
  data,
  isAdmin = false,
  onImportRecipe,
  onRecipePress,
  onEditRecipe,
  onDeleteRecipe,
  onComingSoon,
}: ExploreScreenProps) {
  const colors = useColors();
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfRecipe, setPdfRecipe] = useState<MockRecipe | null>(null);

  const cardMenuItems = useMemo(
    () => isAdmin ? ADMIN_CARD_MENU_ITEMS : BASE_CARD_MENU_ITEMS,
    [isAdmin],
  );

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.trim().toLowerCase();
    return data.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.method?.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
  }, []);

  const handleCardMenuSelect = useCallback((id: string, recipe: MockRecipe) => {
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
      data={filteredData}
      onRecipePress={onRecipePress}
      cardMenuItems={cardMenuItems}
      onCardMenuSelect={handleCardMenuSelect}
      onOverlayPress={() => setShowCategoryMenu(false)}
      extraOverlayVisible={showCategoryMenu}
      forceLayout={showSearch && searchQuery.trim() ? 'list' : undefined}
      listEmptyComponent={
        showSearch && searchQuery.trim() ? (
          <EmptyState
            icon={IconSearch}
            title="검색 결과가 없습니다."
            subtitle={`'${searchQuery.trim()}'에 해당하는 레시피를 찾지 못했어요.`}
          />
        ) : undefined
      }
      renderAppBar={({handleFilterPress, showLayoutMenu, closeMenus}) =>
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
            title="제과기능사"
            showDropdown
            showAddButton={false}
            showSearchButton
            showMenuButton={false}
            onTitlePress={() => {
              closeMenus();
              setShowCategoryMenu(prev => !prev);
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
                items={CATEGORY_MENU_ITEMS}
                selectedId="pastry"
                onSelect={() => setShowCategoryMenu(false)}
                visible={showCategoryMenu}
              />
            }
          />
        )
      }
    />
    <PdfPreviewDialog
      visible={!!pdfRecipe}
      onClose={() => setPdfRecipe(null)}
      data={pdfRecipe ? {
        title: pdfRecipe.title,
        category: pdfRecipe.category,
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
    gap: Spacing.smd,
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
