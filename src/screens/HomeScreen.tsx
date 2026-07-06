import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text} from 'react-native';
import {useFocusEffect, useRouter} from 'expo-router';
import {AppBar} from '@components/Navigation';
import {Breadcrumb} from '@components/Navigation/Breadcrumb';
import {Menu} from '@components/Menu';
import {RecipeListTemplate} from '@components/Recipe/RecipeListTemplate';
import {Dialog, PdfPreviewDialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {EmptyState} from '@components/EmptyState';
import {InlineBanner} from '@components/InlineBanner';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import type {Recipe} from '../types/recipe';
import {useTranslation} from '@contexts/LanguageContext';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';
import {useSubscription} from '@contexts/SubscriptionContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {GroupScreen} from './GroupScreen';
import {axisLabel, useAxisMenuItems, type GroupAxis} from '@components/RecipeGroups/groupAxis';
import {Spacing} from '@constants/spacing';
import {generateRecipeListHtml, generateRecipeHtml} from '@utils/generateRecipeHtml';
import {parseSession, formatSession} from '@utils/session';
import {getRecipeMenuItems} from '@utils/recipeMenuItems';
import {CookbookSelectSheet} from '@components/BottomSheet';
import {
  IconTrash,
  IconTrashTwotone,
  IconArrowDownToLine,
  IconCloudFilled,
} from '@components/Icon/IconIndex';


const makeMoreMenuItems = (t: (key: string) => string) => [
  {id: 'downloadAll', label: t('home.downloadPdf'), icon: IconArrowDownToLine},
  {id: 'deleteAll', label: t('home.deleteAll'), icon: IconTrash, destructive: true},
];

const getDefaultCardMenuItems = (recipe: Recipe, t: (key: string, params?: Record<string, unknown>) => string) =>
  getRecipeMenuItems({t, session: recipe.session, showRemake: true, showEdit: true, showDelete: true, showCookbook: true});

export function HomeScreen() {
  const {t} = useTranslation();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const router = useRouter();
  const {recipes, setRecipes, selectedCookbook, setSelectedCookbook, selectedMethod, setSelectedMethod, availableCookbooks, cookbookColors, setCookbookColor, removeCookbookColor, isLoading, reload, canAddRecipe} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {isPro} = useSubscription();
  const {user, isAdmin} = useAuth();
  // 홈은 개인 레시피만 표시. explore는 pull-to-refresh 동기화 용도로만 reload 사용.
  const {reload: exploreReload, exploreCookbooks} = useExploreRecipeContext();
  const isGuest = !user;

  // 정리: 개인 cookbookColors에 잘못 들어간 '공식 레시피 북' 이름의 빈 껍데기 제거.
  // (과거 오배선으로 공식 북 이름이 개인 색맵에 새어 홈에 빈 레시피 북으로 뜨던 오염 청소.
  //  실제 개인 레시피가 그 이름을 쓰면 정상 개인 북이므로 보존.)
  useEffect(() => {
    if (!exploreCookbooks?.length) return;
    const officialNames = new Set(exploreCookbooks.map(c => c.name));
    const usedByPersonal = new Set(recipes.map(r => r.cookbook).filter(Boolean) as string[]);
    for (const nameKey of Object.keys(cookbookColors)) {
      if (officialNames.has(nameKey) && !usedByPersonal.has(nameKey)) {
        removeCookbookColor(nameKey);
      }
    }
  }, [exploreCookbooks, cookbookColors, recipes, removeCookbookColor]);

  // 그룹화 축: 'all'이면 평면 리스트, 그 외엔 그룹 화면(GroupScreen) 호스팅
  const [groupAxis, setGroupAxis] = useState<GroupAxis>('all');
  const handleAxisChange = useCallback((a: GroupAxis) => {
    setGroupAxis(a);
    if (a === 'all') { setSelectedCookbook(null); setSelectedMethod(null); }
  }, [setSelectedCookbook, setSelectedMethod]);
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false);

  // 화면에 다시 진입할 때마다 게스트 배너 dismissal 초기화 → 재표시
  useFocusEffect(
    useCallback(() => {
      setGuestBannerDismissed(false);
    }, []),
  );

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  // 브레드크럼 메뉴: 'axis'(1뎁스 축) | 'item'(2뎁스 항목) | null
  const [crumbMenu, setCrumbMenu] = useState<'axis' | 'item' | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [cookbookSheetRecipe, setCookbookSheetRecipe] = useState<Recipe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);

  // 홈 타이틀 드롭다운 = 그룹화 축 선택 (공통 모듈, 전체/레시피북/공법/회고)
  const axisMenuItems = useAxisMenuItems();

  const handleHomeAxisSelect = (id: string) => {
    setCrumbMenu(null);
    handleAxisChange(id as GroupAxis);
  };

  // ===== 브레드크럼 (2뎁스) ===== (AXIS_LABELS는 공통 모듈)
  // 필터가 걸려 있으면 그 축으로, 아니면 현재 groupAxis
  const crumbAxis: GroupAxis = selectedCookbook ? 'cookbook' : selectedMethod ? 'method' : groupAxis;
  const crumbItemLabel = selectedCookbook ?? selectedMethod ?? undefined;

  // 2뎁스 항목 메뉴 (책/공법 목록 + '전체로')
  const ALL_ID = '__all__';
  const crumbItemMenuItems = useMemo(() => {
    if (crumbAxis === 'cookbook') {
      const names = new Set<string>();
      for (const r of recipes) names.add(r.cookbook || t('home.noCookbook'));
      availableCookbooks.forEach(n => names.add(n));
      return [{id: ALL_ID, label: t('home.all')}, ...[...names].map(n => ({id: n, label: n}))];
    }
    if (crumbAxis === 'method') {
      const names = new Set<string>();
      for (const r of recipes) names.add(r.method?.trim() || t('home.noMethod'));
      return [{id: ALL_ID, label: t('home.all')}, ...[...names].map(n => ({id: n, label: n}))];
    }
    return [];
  }, [crumbAxis, recipes, availableCookbooks, t]);

  const handleCrumbItemSelect = (id: string) => {
    setCrumbMenu(null);
    if (crumbAxis === 'cookbook') {
      setSelectedCookbook(id === ALL_ID ? null : id);
    } else if (crumbAxis === 'method') {
      setSelectedMethod(id === ALL_ID ? null : id);
    }
  };

  // 리메이크 그룹에서 최신 회차만 표시 + 그룹 전체 회고 합산
  const visibleRecipes = useMemo(() => {
    const latestByGroup = new Map<string, Recipe>();
    const reviewsByGroup = new Map<string, number>();
    const standalone: Recipe[] = [];
    for (const r of recipes) {
      if (!r.remakeGroupId) {
        standalone.push(r);
        continue;
      }
      // 그룹 전체 회고 합산
      const prev = reviewsByGroup.get(r.remakeGroupId) ?? 0;
      reviewsByGroup.set(r.remakeGroupId, prev + (r.reviews?.length ?? 0));
      // 최신 회차 추적
      const existing = latestByGroup.get(r.remakeGroupId);
      if (!existing) {
        latestByGroup.set(r.remakeGroupId, r);
      } else {
        const existNum = parseInt(existing.session?.match(/(\d+)/)?.[1] ?? '0', 10);
        const rNum = parseInt(r.session?.match(/(\d+)/)?.[1] ?? '0', 10);
        if (rNum > existNum) latestByGroup.set(r.remakeGroupId, r);
      }
    }
    // 최신 회차에 그룹 전체 회고 수 반영
    const result: Recipe[] = [...standalone];
    for (const [groupId, recipe] of latestByGroup) {
      const totalReviews = reviewsByGroup.get(groupId) ?? 0;
      result.push({...recipe, reviewCount: totalReviews});
    }
    return result;
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    let result = visibleRecipes;
    if (selectedCookbook) {
      result = result.filter(r => (r.cookbook || t('home.noCookbook')) === selectedCookbook);
    }
    if (selectedMethod) {
      result = result.filter(r => (r.method?.trim() || t('home.noMethod')) === selectedMethod);
    }
    return result;
  }, [visibleRecipes, selectedCookbook, selectedMethod, t]);

  const handleMoreMenuSelect = (id: string) => {
    setShowMoreMenu(false);
    if (id === 'downloadAll') {
      const pdfData = recipes.map(r => ({
        title: r.title,
        cookbook: r.cookbook,
        method: r.method,
        reviewCount: r.reviewCount,
        time: r.time,
        servings: r.servings,
        session: r.session,
        ingredientGroups: r.ingredientGroups ?? [],
        tools: r.tools ?? [],
        steps: r.steps,
        stepGroups: r.stepGroups,
      }));
      setPdfHtml(generateRecipeListHtml(pdfData));
      setShowPdfPreview(true);
    } else if (id === 'deleteAll') {
      setShowDeleteAllDialog(true);
    }
  };

  const handleDeleteAll = useCallback(() => {
    const backup = [...recipes];
    setRecipes([]);
    setShowDeleteAllDialog(false);
    showSnackbar(t('home.deletedRecipesCount', {count: backup.length}), {
      label: t('home.undo'),
      onPress: () => setRecipes(backup),
    });
  }, [recipes, setRecipes, showSnackbar, t]);

  const handleCardMenuSelect = useCallback((id: string, recipe: Recipe): void => {
    if (id === 'cookbook') {
      setCookbookSheetRecipe(recipe);
      return;
    }
    if (id === 'remake') {
      if (!canAddRecipe()) {
        showSnackbar(t('home.maxRecipesLimit'));
        return;
      }
      const {total} = parseSession(recipe.session);
      if (total >= 5) {
        showSnackbar(t('home.maxRemakeLimit'));
        return;
      }
      const newTotal = total + 1;
      const groupId = recipe.remakeGroupId || recipe.id;
      const newId = `remake_${Date.now()}`;
      const newRecipe: Recipe = {
        ...recipe,
        id: newId,
        session: formatSession(newTotal, newTotal),
        remakeGroupId: groupId,
        reviews: [],
        reviewCount: 0,
        createdAt: new Date().toISOString(),
      };
      setRecipes(prev => [
        ...prev.map(r => {
          if (r.id === recipe.id && !r.remakeGroupId) {
            const {current} = parseSession(r.session);
            return {...r, remakeGroupId: groupId, session: formatSession(current, newTotal)};
          }
          if (r.remakeGroupId === groupId) {
            const {current} = parseSession(r.session);
            return {...r, session: formatSession(current, newTotal)};
          }
          return r;
        }),
        newRecipe,
      ]);
      showSnackbar(t('home.newSessionAdded'));
      router.push(`/recipe/${newId}` as any);
    } else if (id === 'edit') {
      router.push(`/recipe/edit/${recipe.id}`);
    } else if (id === 'delete') {
      setDeleteTarget(recipe);
    } else if (id === 'download') {
      setPdfHtml(generateRecipeHtml({
        title: recipe.title,
        cookbook: recipe.cookbook,
        method: recipe.method,
        reviewCount: recipe.reviewCount,
        time: recipe.time,
        servings: recipe.servings,
        session: recipe.session,
        ingredientGroups: recipe.ingredientGroups ?? [],
        tools: recipe.tools ?? [],
        steps: recipe.steps,
        stepGroups: recipe.stepGroups,
      }));
      setShowPdfPreview(true);
    }
  }, [router, setRecipes, showSnackbar, canAddRecipe, t]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const recipe = deleteTarget;
    setDeleteTarget(null);
    const groupId = recipe.remakeGroupId;
    const deleted = groupId
      ? recipes.filter(r => r.remakeGroupId === groupId || r.id === groupId)
      : [recipe];
    setRecipes(prev => prev.filter(r => !deleted.some(d => d.id === r.id)));
    showSnackbar(t('home.recipeDeleted', {title: recipe.title}), {
      label: t('home.undo'),
      onPress: () => setRecipes(prev => [...prev, ...deleted]),
    });
  }, [deleteTarget, recipes, setRecipes, showSnackbar, t]);

  const handleCookbookSheetSelect = useCallback((cookbookName: string) => {
    if (!cookbookSheetRecipe) return;
    const newCookbook = cookbookName === '__none__' ? '' : cookbookName;
    setRecipes(prev => prev.map(r =>
      r.id === cookbookSheetRecipe.id ? {...r, cookbook: newCookbook} : r
    ));
    setCookbookSheetRecipe(null);
    showSnackbar(t('home.movedToCookbook', {title: cookbookSheetRecipe.title, cookbook: newCookbook || t('home.noCookbook')}));
  }, [cookbookSheetRecipe, setRecipes, showSnackbar, t]);

  const handleAddCookbook = useCallback((name: string, color: import('@components/Avatar/Avatar').AvatarColor) => {
    setCookbookColor(name, color);
    if (cookbookSheetRecipe) {
      setRecipes(prev => prev.map(r =>
        r.id === cookbookSheetRecipe.id ? {...r, cookbook: name} : r
      ));
      setCookbookSheetRecipe(null);
      showSnackbar(t('home.movedToCookbook', {title: cookbookSheetRecipe.title, cookbook: name}));
    }
  }, [cookbookSheetRecipe, setCookbookColor, setRecipes, showSnackbar, t]);

  const closeLocalMenus = useCallback(() => {
    setShowMoreMenu(false);
    setCrumbMenu(null);
  }, []);

  // 레시피 추가 — 레시피북 진입 중이면 해당 북으로 미리 지정
  const handleAddRecipe = useCallback(() => {
    if (!canAddRecipe()) {
      showSnackbar(t('home.maxRecipesLimit'));
      return;
    }
    const params = selectedCookbook ? `?cookbook=${encodeURIComponent(selectedCookbook)}` : '';
    router.push(`/recipe/edit${params}` as any);
  }, [canAddRecipe, showSnackbar, selectedCookbook, router, t]);

  // ===== 그룹 모드 (axis !== 'all') 핸들러 =====
  const handleGroupComingSoon = useCallback(() => {
    showSnackbar(t('home.comingSoon'));
  }, [showSnackbar, t]);

  const handleGroupDeleteCookbook = useCallback((name: string) => {
    setRecipes(prev => prev.map(r => (r.cookbook === name ? {...r, cookbook: undefined} : r)));
    removeCookbookColor(name);
    showSnackbar(t('home.cookbookDeleted', {name}));
  }, [setRecipes, removeCookbookColor, showSnackbar, t]);

  // 그룹 탭 = 제자리 필터: 해당 그룹으로 필터하고 평면 리스트로 전환
  const handleGroupCookbookPress = useCallback((name: string) => {
    setSelectedMethod(null);
    setSelectedCookbook(name);
    setGroupAxis('all');
  }, [setSelectedCookbook, setSelectedMethod]);

  const handleGroupMethodPress = useCallback((method: string) => {
    setSelectedCookbook(null);
    setSelectedMethod(method);
    setGroupAxis('all');
  }, [setSelectedCookbook, setSelectedMethod]);

  const handleGroupRecipePress = useCallback((recipeId: string) => {
    router.push(`/recipe/${recipeId}` as any);
  }, [router]);

  const handleGroupRefresh = useCallback(async () => {
    await Promise.all([reload(), exploreReload()]);
  }, [reload, exploreReload]);

  // 그룹 모드: 홈 평면 리스트 대신 그룹 화면을 호스팅
  if (groupAxis !== 'all') {
    // 홈 = 내 개인 레시피 북만. 공식(explore) 데이터는 GroupScreen에 주입하지 않는다 (둘러보기 전용)
    return (
      <GroupScreen
        recipes={recipes}
        cookbookColors={cookbookColors}
        axis={groupAxis}
        onAxisChange={handleAxisChange}
        onComingSoon={handleGroupComingSoon}
        onDeleteCookbook={handleGroupDeleteCookbook}
        onCookbookPress={handleGroupCookbookPress}
        onMethodPress={handleGroupMethodPress}
        isAdmin={isAdmin}
        onRefresh={handleGroupRefresh}
        onRecipePress={handleGroupRecipePress}
        onAddRecipeToCookbook={(cookbook) => {
          if (!canAddRecipe()) { showSnackbar(t('home.maxRecipesLimit')); return; }
          router.push(`/recipe/edit?cookbook=${encodeURIComponent(cookbook)}` as any);
        }}
        bookCarousel
      />
    );
  }

  return (
    <RecipeListTemplate
      data={isLoading ? [] : filteredRecipes}
      loading={isLoading}
      onRecipePress={(item) => router.push(`/recipe/${item.id}`)}
      cardMenuItems={(recipe) => getDefaultCardMenuItems(recipe, t)}
      onCardMenuSelect={handleCardMenuSelect}
      onOverlayPress={closeLocalMenus}
      extraOverlayVisible={showMoreMenu || crumbMenu !== null}
      onRefresh={reload}
      listHeaderExtra={isGuest && !guestBannerDismissed ? (
        <InlineBanner
          icon={IconCloudFilled}
          label={t('home.guestBanner')}
          color="accent"
          size="medium"
          action={{
            label: t('home.sync'),
            onPress: () => router.navigate('/profile' as any),
          }}
          onClose={() => setGuestBannerDismissed(true)}
          style={styles.localBanner}
        />
      ) : undefined}
      listEmptyComponent={
        !isLoading ? (
          selectedCookbook ? (
            <EmptyState
              category="no-recipe"
              title={t('home.emptyCookbookTitle')}
              subtitle={t('home.emptyCookbookSubtitle')}
              actionLabel={t('home.addRecipe')}
              onAction={() => {
                if (!canAddRecipe()) {
                  showSnackbar(t('home.maxRecipesLimit'));
                  return;
                }
                router.push(`/recipe/edit?cookbook=${encodeURIComponent(selectedCookbook)}` as any);
              }}
            />
          ) : (
            <EmptyState
              category="no-recipe"
              title={t('home.emptyRecipesTitle')}
              subtitle={t('home.emptyRecipesSubtitle')}
              actionLabel={t('home.exploreRecipes')}
              onAction={() => router.push('/(tabs)/explore' as any)}
            />
          )
        ) : undefined
      }
      renderAppBar={({handleFilterPress, showLayoutMenu, closeMenus, layoutMenu, filterIcon}) => (
        <AppBar
          filterIcon={filterIcon}
          titleNode={
            <Breadcrumb
              axisLabel={axisLabel(t, crumbAxis)}
              axisIcon={axisMenuItems.find(i => i.id === crumbAxis)?.icon}
              axisIconColor={axisMenuItems.find(i => i.id === crumbAxis)?.iconColor}
              itemLabel={crumbItemLabel}
              onAxisPress={() => {
                closeMenus();
                setShowMoreMenu(false);
                setCrumbMenu(prev => (prev === 'axis' ? null : 'axis'));
              }}
              onBack={() => {
                closeMenus();
                setShowMoreMenu(false);
                setCrumbMenu(null);
                // 상위 목록(레시피북/공법 GroupScreen)으로 복귀
                setGroupAxis(crumbAxis);
                setSelectedCookbook(null);
                setSelectedMethod(null);
              }}
              onItemPress={() => {
                closeMenus();
                setShowMoreMenu(false);
                setCrumbMenu(prev => (prev === 'item' ? null : 'item'));
              }}
            />
          }
          onAddPress={handleAddRecipe}
          onFilterPress={() => {
            closeLocalMenus();
            handleFilterPress();
          }}
          onMenuPress={() => {
            closeMenus();
            setCrumbMenu(null);
            setShowMoreMenu(prev => !prev);
          }}
          filterMenuOpen={showLayoutMenu}
          menuOpen={showMoreMenu}
          titleMenu={
            <>
              <Menu
                items={axisMenuItems}
                selectedId={crumbAxis}
                onSelect={handleHomeAxisSelect}
                visible={crumbMenu === 'axis'}
              />
              {crumbItemLabel != null && (
                <Menu
                  items={crumbItemMenuItems}
                  selectedId={crumbItemLabel}
                  onSelect={handleCrumbItemSelect}
                  visible={crumbMenu === 'item'}
                />
              )}
            </>
          }
          rightMenu={
            <>
              {layoutMenu}
              <Menu
                items={makeMoreMenuItems(t).map(item =>
                  item.id === 'deleteAll' ? {...item, disabled: recipes.length === 0} : item
                )}
                onSelect={handleMoreMenuSelect}
                visible={showMoreMenu}
              />
            </>
          }
        />
      )}
    >
      {/* 전체 삭제 확인 다이얼로그 */}
      <Dialog
        visible={showDeleteAllDialog}
        onClose={() => setShowDeleteAllDialog(false)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title={t('home.deleteAllTitle')}
        description={<>{t('home.deleteAllPrefix')} <Text style={styles.deleteAllCount}>{t('home.recipesCount', {count: recipes.length})}</Text>{t('home.deleteAllSuffix')}{'\n'}{t('home.deleteAllIrreversible')}</>}
        actions={<>
          <Button label={t('home.cancel')} variant="soft" onPress={() => setShowDeleteAllDialog(false)} />
          <Button label={t('home.delete')} variant="soft" destructive onPress={handleDeleteAll} />
        </>}
      />

      {/* 레시피 삭제 확인 다이얼로그 */}
      <Dialog
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title={t('home.deleteRecipeTitle')}
        description={t('home.deleteRecipeDescription')}
        actions={<>
          <Button label={t('home.cancel')} variant="soft" onPress={() => setDeleteTarget(null)} />
          <Button label={t('home.delete')} variant="soft" destructive onPress={handleConfirmDelete} />
        </>}
      />

      {/* PDF 미리보기 다이얼로그 */}
      <PdfPreviewDialog
        visible={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        html={pdfHtml}
        filename={t('home.allCookbooksFilename')}
      />

      {/* 레시피 북 선택 바텀시트 */}
      <CookbookSelectSheet
        visible={!!cookbookSheetRecipe}
        onClose={() => setCookbookSheetRecipe(null)}
        cookbooks={availableCookbooks}
        cookbookColors={cookbookColors}
        selectedCookbook={cookbookSheetRecipe?.cookbook}
        onSelect={handleCookbookSheetSelect}
        onAddCookbook={handleAddCookbook}
      />
    </RecipeListTemplate>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  deleteAllCount: {
    color: colors['foreground/on-surface-var'],
  },
  localBanner: {
    marginBottom: Spacing.sm,
  },
});
