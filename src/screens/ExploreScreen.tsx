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
  IconNoteFilled,
  IconTrashTwotone,
  IconArrowDownToLine,
} from '@components/Icon/IconIndex';
import {getColorVarKey} from '@components/ColorPicker/ColorPicker';
import type {ExploreCookbook} from '@hooks/useExploreRecipes';
import {GroupScreen} from './GroupScreen';
import {axisLabel, useAxisMenuItems, type AxisOverrides, type GroupAxis} from '@components/RecipeGroups/groupAxis';
import {IconExprolerBookFilled} from '@components/Icon/IconIndex';
import type {AvatarColor} from '@components/Avatar/Avatar';

// 둘러보기 노출 축: 회고 제외 (둘러보기 레시피엔 회고가 없음)
const EXPLORE_AXES: GroupAxis[] = ['all', 'cookbook', 'method'];
// 둘러보기에선 '레시피 북' → '공식 레시피북' + 로고(네모) 아이콘
const EXPLORE_AXIS_OVERRIDES: AxisOverrides = {
  cookbook: {label: '공식 레시피북', icon: IconExprolerBookFilled},
};

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
  /** PDF 다운로드(둘러보기 리스트 익스포트) — 게스트면 로그인 유도 처리는 상위에서 */
  onDownloadPdf?: () => void;
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
  onDownloadPdf,
}: ExploreScreenProps) {
  const colors = useColorsV2();
  const {selectedExploreCookbook, setSelectedExploreCookbook} = useRecipes();
  // 홈과 동일한 그룹화 축 (전체/레시피북/공법). 'all'=평면 리스트, 그 외=GroupScreen.
  const [exploreAxis, setExploreAxis] = useState<GroupAxis>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('__all__');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const axisMenuItems = useAxisMenuItems(EXPLORE_AXES, EXPLORE_AXIS_OVERRIDES);

  // 외부에서 레시피 북 필터가 설정되면 반영 후 초기화 (해당 레시피 북으로 평면 필터)
  React.useEffect(() => {
    if (selectedExploreCookbook) {
      setSelectedMethod(null);
      setSelectedCategory(selectedExploreCookbook);
      setExploreAxis('all');
      setSelectedExploreCookbook(null);
    }
  }, [selectedExploreCookbook, setSelectedExploreCookbook]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showFlatMoreMenu, setShowFlatMoreMenu] = useState(false);
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

  // GroupScreen용 레시피 북 색상 맵 (둘러보기 레시피 북 이름 → 색)
  const exploreCookbookColors = useMemo(() => {
    const map: Record<string, AvatarColor> = {};
    exploreCookbooks?.forEach(c => { map[c.name] = c.color as AvatarColor; });
    return map;
  }, [exploreCookbooks]);

  // 축 드롭다운 선택: 전체→평면 리스트(필터 해제), 레시피북/공법→GroupScreen
  const handleAxisSelect = useCallback((id: string) => {
    setShowCategoryMenu(false);
    const a = id as GroupAxis;
    if (a === 'all') {
      setSelectedCategory('__all__');
      setSelectedMethod(null);
    }
    setExploreAxis(a);
  }, []);


  const filteredData = useMemo(() => {
    let result = data;
    if (selectedMethod) {
      result = result.filter(r => (r.method?.trim() || '공법 없음') === selectedMethod);
    } else if (selectedCategory === '공식 레시피 북 없음') {
      result = result.filter(r => !r.cookbook);
    } else if (selectedCategory && selectedCategory !== '__all__') {
      result = result.filter(r => r.cookbook === selectedCategory);
    }
    return result;
  }, [data, selectedCategory, selectedMethod]);

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

  const handleGroupRecipePress = useCallback((id: string) => {
    const r = data.find(x => x.id === id);
    if (r) handleRecipePress(r);
  }, [data, handleRecipePress]);

  // 그룹 모드(레시피북/공법): 홈과 동일하게 공통 GroupScreen 호스팅 (리스트/팩 + 펼침)
  if (exploreAxis !== 'all') {
    return (
      <GroupScreen
        recipes={data}
        cookbookColors={exploreCookbookColors}
        axis={exploreAxis}
        onAxisChange={handleAxisSelect}
        availableAxes={EXPLORE_AXES}
        axisOverrides={EXPLORE_AXIS_OVERRIDES}
        onComingSoon={onComingSoon}
        onCookbookPress={(n) => { setSelectedMethod(null); setSelectedCategory(n); setExploreAxis('all'); }}
        onMethodPress={(m) => { setSelectedCategory('__all__'); setSelectedMethod(m); setExploreAxis('all'); }}
        onRecipePress={handleGroupRecipePress}
        onRefresh={onRefresh}
        isAdmin={!!onAddRecipe}
        showAddButton={!!onAddRecipe}
        bookCarousel
        addAsOfficial
        onDownloadPdf={onDownloadPdf}
      />
    );
  }

  // 평면 리스트('전체' 축): 필터(레시피북/공법)된 결과 + 축 드롭다운
  const flatFilterLabel = selectedMethod ?? (selectedCategory !== '__all__' ? selectedCategory : undefined);

  return (
    <>
    <RecipeListTemplate
      data={paywallData}
      loading={loading}
      onRecipePress={handleRecipePress}
      cardMenuItems={cardMenuItems}
      onCardMenuSelect={handleCardMenuSelect}
      onRefresh={onRefresh}
      onOverlayPress={() => { setShowCategoryMenu(false); setShowFlatMoreMenu(false); }}
      extraOverlayVisible={showCategoryMenu || showFlatMoreMenu}
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
      renderAppBar={({handleFilterPress, showLayoutMenu, closeMenus, layoutMenu, filterIcon}) =>
        <AppBar
          title={flatFilterLabel ?? axisLabel(exploreAxis, EXPLORE_AXIS_OVERRIDES)}
          showDropdown
          filterIcon={filterIcon}
          showAddButton={!!onAddRecipe}
          showMenuButton={!!onDownloadPdf}
          menuOpen={showFlatMoreMenu}
          onMenuPress={() => {
            closeMenus();
            setShowCategoryMenu(false);
            setShowFlatMoreMenu(prev => !prev);
          }}
          onTitlePress={() => {
            closeMenus();
            setShowFlatMoreMenu(false);
            setShowCategoryMenu(prev => !prev);
          }}
          onAddPress={() => {
            closeMenus();
            setShowCategoryMenu(false);
            setShowFlatMoreMenu(false);
            onAddRecipe?.(selectedCategory !== '__all__' ? selectedCategory : undefined);
          }}
          onFilterPress={() => {
            setShowCategoryMenu(false);
            setShowFlatMoreMenu(false);
            handleFilterPress();
          }}
          filterMenuOpen={showLayoutMenu}
          titleMenu={
            <Menu
              items={axisMenuItems}
              selectedId={exploreAxis}
              onSelect={handleAxisSelect}
              visible={showCategoryMenu}
            />
          }
          rightMenu={
            <>
              {layoutMenu}
              {onDownloadPdf ? (
                <Menu
                  items={[{id: 'downloadPdf', label: 'PDF 다운로드', icon: IconArrowDownToLine}]}
                  visible={showFlatMoreMenu}
                  onSelect={(id) => {
                    setShowFlatMoreMenu(false);
                    if (id === 'downloadPdf') onDownloadPdf();
                  }}
                />
              ) : null}
            </>
          }
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
