import React, {useCallback, useMemo, useState} from 'react';
import {AppBar} from '@components/Navigation';
import {EmptyState} from '@components/EmptyState';
import {Menu} from '@components/Menu';
import {Dialog, PdfPreviewDialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {SearchCommandBar} from '@components/SearchCommandBar';
import {RecipeListTemplate} from '@components/Recipe/RecipeListTemplate';
import {useColorsV2} from '@contexts/ThemeContext';
import {useRecipes} from '@contexts/RecipeContext';
import type {Recipe} from '../types/recipe';
import {getRecipeMenuItems} from '@utils/recipeMenuItems';
import {
  IconExprolerBookFilled,
  IconNoteFilled,
  IconTrashTwotone,
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
  /** 둘러보기 레시피 북 목록 (이름+컬러) */
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
  const colors = useColorsV2();
  const {selectedExploreCookbook, setSelectedExploreCookbook} = useRecipes();
  const [selectedCategory, setSelectedCategory] = useState(selectedExploreCookbook ?? '제과기능사');

  // 외부에서 레시피 북 필터가 설정되면 반영 후 초기화
  React.useEffect(() => {
    if (selectedExploreCookbook) {
      setSelectedCategory(selectedExploreCookbook);
      setSelectedExploreCookbook(null);
    }
  }, [selectedExploreCookbook, setSelectedExploreCookbook]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [pdfRecipe, setPdfRecipe] = useState<Recipe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);

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
    // 레시피가 있는 레시피 북 카운트
    const recipeCounts = new Map<string, number>();
    for (const r of data) {
      const key = r.cookbook || '공식 레시피 북 없음';
      recipeCounts.set(key, (recipeCounts.get(key) ?? 0) + 1);
    }
    // exploreCookbooks의 빈 레시피 북도 포함
    const allNames = new Set([
      ...recipeCounts.keys(),
      ...(exploreCookbooks ?? []).map(c => c.name),
    ]);
    const items: {id: string; label: string; icon?: React.FC<any>; iconColor?: string; disabled?: boolean}[] = [
      {id: '__all__', label: '모든 레시피 북'},
    ];
    for (const name of allNames) {
      if (name === '공식 레시피 북 없음') continue;
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
    if (recipeCounts.has('공식 레시피 북 없음')) {
      items.push({id: '공식 레시피 북 없음', label: '공식 레시피 북 없음'});
    }
    return items;
  }, [data, exploreCookbookMap, exploreCookbooks, colors]);

  const filteredData = useMemo(() => {
    let result = data;
    if (selectedCategory === '공식 레시피 북 없음') {
      result = result.filter(r => !r.cookbook);
    } else if (selectedCategory && selectedCategory !== '__all__') {
      result = result.filter(r => r.cookbook === selectedCategory);
    }
    return result;
  }, [data, selectedCategory]);

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

  const searchItems = useMemo(() =>
    data.map(r => {
      const ecColor = r.cookbook ? exploreCookbookMap.get(r.cookbook) : undefined;
      return {
        id: r.id,
        label: r.title,
        locked: lockedRecipeIds?.has(r.id),
        iconColor: r.cookbook ? colors[getColorVarKey((ecColor ?? 'orange') as any)] : undefined,
        searchableTexts: [r.cookbook, r.method, r.specificGravity].filter(Boolean) as string[],
      };
    }),
    [data, lockedRecipeIds, exploreCookbookMap, colors],
  );

  const handleCardMenuSelect = useCallback((id: string, recipe: Recipe) => {
    if (id === 'save') {
      onImportRecipe(recipe);
    } else if (id === 'download') {
      setPdfRecipe(recipe);
    } else if (id === 'edit' && onEditRecipe) {
      onEditRecipe(recipe);
    } else if (id === 'delete' && onDeleteRecipe) {
      setDeleteTarget(recipe);
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
      scrollEnabled
      lockedRecipeIds={lockedRecipeIds}
      listEmptyComponent={
        !isOnline && data.length === 0 ? (
          <EmptyState
            category="network-error"
            title="네트워크에 연결할 수 없어요."
            subtitle="인터넷 연결을 확인하고 다시 시도해 주세요."
          />
        ) : selectedCategory && selectedCategory !== '__all__' ? (
          <EmptyState
            image={emptyCookbookImage}
            title="레시피 북이 비어 있어요."
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
            onAddRecipe?.(selectedCategory !== '__all__' ? selectedCategory : undefined);
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

    <SearchCommandBar
      visible={showSearch}
      onClose={() => setShowSearch(false)}
      items={searchItems}
      icon={IconNoteFilled}
      iconColor={colors['custom/green-var']}
      onSelect={(id) => {
        setShowSearch(false);
        const recipe = data.find(r => r.id === id);
        if (recipe) handleRecipePress(recipe);
      }}
    />

    <Dialog
      visible={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      icon={IconTrashTwotone}
      avatarColor="red"
      title="레시피를 삭제할까요?"
      description="24시간 이내에 되돌릴 수 있습니다."
      actions={
        <>
          <Button label="취소" variant="soft" onPress={() => setDeleteTarget(null)} />
          <Button
            label="삭제"
            variant="soft"
            destructive
            onPress={() => {
              if (deleteTarget) onDeleteRecipe?.(deleteTarget);
              setDeleteTarget(null);
            }}
          />
        </>
      }
    />
    </>
  );
}
