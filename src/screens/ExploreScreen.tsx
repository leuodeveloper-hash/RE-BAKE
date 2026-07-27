import React, {useCallback, useMemo, useState} from 'react';
import {useRouter} from 'expo-router';
import {AppBar} from '@components/Navigation';
import {Breadcrumb} from '@components/Navigation/Breadcrumb';
import {EmptyState} from '@components/EmptyState';
import {Menu} from '@components/Menu';
import {Dialog, PdfPreviewDialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {SearchCommandBar} from '@components/SearchCommandBar';
import {RecipeListTemplate} from '@components/Recipe/RecipeListTemplate';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useRecipes} from '@contexts/RecipeContext';
import type {Recipe} from '../types/recipe';
import {getRecipeMenuItems} from '@utils/recipeMenuItems';
import {
  IconNoteFilled,
  IconTrashTwotone,
  IconArrowDownToLine,
  IconUserFilled,
} from '@components/Icon/IconIndex';
import {getColorVarKey} from '@components/ColorPicker/ColorPicker';
import type {ExploreCookbook} from '@hooks/useExploreRecipes';
import {GroupScreen} from './GroupScreen';
import {axisLabel, useAxisMenuItems, type AxisOverrides, type GroupAxis} from '@components/RecipeGroups/groupAxis';
import {IconExprolerBookFilled} from '@components/Icon/IconIndex';
import type {AvatarColor} from '@components/Avatar/Avatar';
import {resolveAuthorHandle} from '../types/author';

// 둘러보기 노출 축: 회고 제외 (둘러보기 레시피엔 회고가 없음)
const EXPLORE_AXES: GroupAxis[] = ['all', 'cookbook', 'method'];
// 둘러보기에선 '레시피 북' → '공식 레시피북' + 로고(네모) 아이콘
const makeExploreAxisOverrides = (t: (key: string) => string): AxisOverrides => ({
  cookbook: {label: t('explore.officialCookbook'), icon: IconExprolerBookFilled},
});

const FREE_RECIPE_COUNT = 3;

const makeBaseCardMenuItems = (t: (key: string, params?: Record<string, unknown>) => string) =>
  getRecipeMenuItems({t, showImport: true});
const makeAdminCardMenuItems = (t: (key: string, params?: Record<string, unknown>) => string) =>
  getRecipeMenuItems({t, showImport: true, showEdit: true, showDelete: true});

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
  /** 공식 레시피 북 삭제 (어드민 전용) — Firestore explore_cookbooks 삭제 */
  onDeleteExploreCookbook?: (name: string) => void;
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
  onDeleteExploreCookbook,
}: ExploreScreenProps) {
  const colors = useColors();
  const {t} = useTranslation();
  const router = useRouter();
  const EXPLORE_AXIS_OVERRIDES = useMemo(() => makeExploreAxisOverrides(t), [t]);
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
  const [showItemMenu, setShowItemMenu] = useState(false);
  const [showFlatMoreMenu, setShowFlatMoreMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [pdfRecipe, setPdfRecipe] = useState<Recipe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);

  const cardMenuItems = useMemo(
    () => isAdmin ? makeAdminCardMenuItems(t) : makeBaseCardMenuItems(t),
    [isAdmin, t],
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

  // 작성자 검색: 둘러보기 레시피에 박제된 authorId별로 집계 (레시피 수 내림차순)
  const authorItems = useMemo(() => {
    const byAuthor = new Map<string, {displayName: string; handle: string; count: number}>();
    for (const r of data) {
      if (!r.authorId) continue;
      const entry = byAuthor.get(r.authorId);
      if (entry) {
        entry.count += 1;
      } else {
        byAuthor.set(r.authorId, {
          displayName: (() => { const h = resolveAuthorHandle(r.authorId, r.authorHandle); return h ? `@${h}` : r.authorId!; })(),
          handle: resolveAuthorHandle(r.authorId, r.authorHandle) || '',
          count: 1,
        });
      }
    }
    return Array.from(byAuthor.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([authorId, a]) => ({
        // 네비게이션 URL = handle(핸들=주소 일치). handle 없으면 authorId 폴백.
        id: a.handle || authorId,
        label: a.displayName,
        searchableTexts: [
          a.handle ? `@${a.handle}` : '',
          t('searchCommandBar.userRecipeCount', {count: a.count}),
        ].filter(Boolean),
      }));
  }, [data, t]);

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

  // ===== 평면 리스트 뎁스 브레드크럼 (홈과 동일: 뒤로가기 + 항목 셀렉터) =====
  const CRUMB_ALL = '__all__';
  const crumbAxis: GroupAxis = selectedMethod ? 'method' : (selectedCategory !== CRUMB_ALL ? 'cookbook' : 'all');
  const crumbItemMenuItems = useMemo(() => {
    if (crumbAxis === 'cookbook') {
      const names = new Set<string>();
      for (const r of data) names.add(r.cookbook || '공식 레시피 북 없음');
      exploreCookbooks?.forEach(c => names.add(c.name));
      return [{id: CRUMB_ALL, label: t('explore.all')}, ...[...names].map(n => ({id: n, label: n}))];
    }
    if (crumbAxis === 'method') {
      const names = new Set<string>();
      for (const r of data) names.add(r.method?.trim() || '공법 없음');
      return [{id: CRUMB_ALL, label: t('explore.all')}, ...[...names].map(n => ({id: n, label: n}))];
    }
    return [];
  }, [crumbAxis, data, exploreCookbooks, t]);

  const handleCrumbItemSelect = useCallback((id: string) => {
    setShowItemMenu(false);
    if (crumbAxis === 'cookbook') { setSelectedMethod(null); setSelectedCategory(id === CRUMB_ALL ? CRUMB_ALL : id); }
    else if (crumbAxis === 'method') { setSelectedCategory(CRUMB_ALL); setSelectedMethod(id === CRUMB_ALL ? null : id); }
  }, [crumbAxis]);

  // 뒤로가기: 상위 목록(레시피북/공법 GroupScreen)으로
  const handleCrumbBack = useCallback(() => {
    setShowCategoryMenu(false); setShowItemMenu(false); setShowFlatMoreMenu(false);
    setExploreAxis(crumbAxis);
    setSelectedCategory(CRUMB_ALL); setSelectedMethod(null);
  }, [crumbAxis]);

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
        onMethodGuidePress={() => router.push('/method-guide' as any)}
        onRecipePress={handleGroupRecipePress}
        onRefresh={onRefresh}
        isAdmin={!!onAddRecipe}
        showAddButton={!!onAddRecipe}
        bookCarousel
        addAsOfficial
        cookbooksAreOfficial
        exploreCookbooks={exploreCookbooks}
        onDeleteExploreCookbook={onDeleteExploreCookbook}
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
      authorHandle="bakey"
      onAuthorPress={(h) => router.push(`/u/${h}` as any)}
      onCookbookPress={(n) => { setSelectedMethod(null); setSelectedCategory(n); setExploreAxis('all'); }}
      onMethodPress={(m) => { setSelectedCategory(CRUMB_ALL); setSelectedMethod(m); setExploreAxis('all'); }}
      onRecipePress={handleRecipePress}
      cardMenuItems={cardMenuItems}
      onCardMenuSelect={handleCardMenuSelect}
      onRefresh={onRefresh}
      onOverlayPress={() => { setShowCategoryMenu(false); setShowItemMenu(false); setShowFlatMoreMenu(false); }}
      extraOverlayVisible={showCategoryMenu || showItemMenu || showFlatMoreMenu}
      scrollEnabled
      lockedRecipeIds={lockedRecipeIds}
      listEmptyComponent={
        !isOnline && data.length === 0 ? (
          <EmptyState
            category="network-error"
            title={t('explore.networkErrorTitle')}
            subtitle={t('explore.networkErrorSubtitle')}
          />
        ) : selectedCategory && selectedCategory !== '__all__' ? (
          <EmptyState
            category="no-recipe"
            title={t('explore.emptyCookbookTitle')}
            subtitle={t('explore.emptyCookbookSubtitle')}
            actionLabel={onAddRecipe ? t('explore.addRecipeAction') : undefined}
            onAction={onAddRecipe ? () => onAddRecipe(selectedCategory) : undefined}
          />
        ) : data.length === 0 ? (
          <EmptyState
            category="no-recipe"
            title={t('explore.noExploreRecipesTitle')}
            subtitle={t('explore.noExploreRecipesSubtitle')}
          />
        ) : undefined
      }
      renderAppBar={({handleFilterPress, showLayoutMenu, closeMenus, layoutMenu, filterIcon}) =>
        <AppBar
          titleNode={
            <Breadcrumb
              axisLabel={axisLabel(t, crumbAxis, EXPLORE_AXIS_OVERRIDES)}
              axisIcon={axisMenuItems.find(i => i.id === crumbAxis)?.icon}
              axisIconColor={axisMenuItems.find(i => i.id === crumbAxis)?.iconColor}
              itemLabel={flatFilterLabel}
              onAxisPress={() => {
                closeMenus();
                setShowFlatMoreMenu(false);
                setShowItemMenu(false);
                setShowCategoryMenu(prev => !prev);
              }}
              onBack={handleCrumbBack}
              onItemPress={() => {
                closeMenus();
                setShowFlatMoreMenu(false);
                setShowCategoryMenu(false);
                setShowItemMenu(prev => !prev);
              }}
            />
          }
          filterIcon={filterIcon}
          showAddButton={!!onAddRecipe}
          showMenuButton={!!onDownloadPdf}
          menuOpen={showFlatMoreMenu}
          onMenuPress={() => {
            closeMenus();
            setShowCategoryMenu(false);
            setShowItemMenu(false);
            setShowFlatMoreMenu(prev => !prev);
          }}
          onAddPress={() => {
            closeMenus();
            setShowCategoryMenu(false);
            setShowFlatMoreMenu(false);
            onAddRecipe?.(selectedCategory !== '__all__' ? selectedCategory : undefined);
          }}
          onFilterPress={() => {
            setShowCategoryMenu(false);
            setShowItemMenu(false);
            setShowFlatMoreMenu(false);
            handleFilterPress();
          }}
          filterMenuOpen={showLayoutMenu}
          titleMenu={
            <>
              <Menu
                items={axisMenuItems}
                selectedId={exploreAxis}
                onSelect={handleAxisSelect}
                visible={showCategoryMenu}
              />
              {flatFilterLabel != null && (
                <Menu
                  items={crumbItemMenuItems}
                  selectedId={selectedMethod ?? selectedCategory}
                  onSelect={handleCrumbItemSelect}
                  visible={showItemMenu}
                />
              )}
            </>
          }
          rightMenu={
            <>
              {layoutMenu}
              {onDownloadPdf ? (
                <Menu
                  items={[{id: 'downloadPdf', label: t('explore.downloadPdf'), icon: IconArrowDownToLine}]}
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
      tabs={[
        {
          id: 'recipes',
          label: t('searchCommandBar.tabRecipes'),
          items: searchItems,
          icon: IconNoteFilled,
          iconColor: colors['custom/green-var'],
          onSelect: (id) => {
            setShowSearch(false);
            const recipe = data.find(r => r.id === id);
            if (recipe) handleRecipePress(recipe);
          },
        },
        {
          id: 'users',
          label: t('searchCommandBar.tabUsers'),
          items: authorItems,
          icon: IconUserFilled,
          iconColor: colors['custom/blue-var'],
          emptyLabel: (query) => t('searchCommandBar.emptyUsers', {query}),
          onSelect: (id) => {
            setShowSearch(false);
            router.push(`/u/${id}` as any);
          },
        },
      ]}
    />

    <Dialog
      visible={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      icon={IconTrashTwotone}
      avatarColor="red"
      title={t('explore.deleteRecipeTitle')}
      description={t('explore.deleteRecipeDescription')}
      actions={
        <>
          <Button label={t('explore.cancel')} variant="soft" onPress={() => setDeleteTarget(null)} />
          <Button
            label={t('explore.delete')}
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
