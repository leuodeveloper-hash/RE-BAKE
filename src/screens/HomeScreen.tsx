import React, {useCallback, useMemo, useState} from 'react';
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
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import type {SemanticColorsV2} from '@constants/tokens';
import type {Recipe} from '../types/recipe';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColorsV2} from '@contexts/ThemeContext';
import {useSubscription} from '@contexts/SubscriptionContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {GroupScreen} from './GroupScreen';
import {AXIS_LABELS, useAxisMenuItems, type GroupAxis} from '@components/RecipeGroups/groupAxis';
import {deleteDoc, doc} from 'firebase/firestore';
import {db} from '@config/firebase';
import {Spacing} from '@constants/spacing';
import {generateRecipeListHtml, generateRecipeHtml} from '@utils/generateRecipeHtml';
import {parseSession, formatSession} from '@utils/session';
import {getRecipeMenuItems} from '@utils/recipeMenuItems';
import {CookbookSelectSheet} from '@components/BottomSheet';
import {FloatingActionButton} from '@components/FloatingActionButton';
import {
  IconAdd,
  IconTrash,
  IconTrashTwotone,
  IconArrowDownToLine,
  IconCloudFilled,
} from '@components/Icon/IconIndex';

const emptyCookbookImage = require('../../assets/images/empty_no_cookbook_recipe.png');

const MORE_MENU_ITEMS = [
  {id: 'downloadAll', label: 'PDF 다운로드', icon: IconArrowDownToLine},
  {id: 'deleteAll', label: '전체 삭제', icon: IconTrash, destructive: true},
];

const getDefaultCardMenuItems = (recipe: Recipe) =>
  getRecipeMenuItems({session: recipe.session, showRemake: true, showEdit: true, showDelete: true, showCookbook: true});

export function HomeScreen() {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const router = useRouter();
  const {recipes, setRecipes, selectedCookbook, setSelectedCookbook, selectedMethod, setSelectedMethod, setSelectedExploreCookbook, availableCookbooks, cookbookColors, setCookbookColor, removeCookbookColor, isLoading, reload, canAddRecipe} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {isPro} = useSubscription();
  const {user, isAdmin} = useAuth();
  const {recipes: exploreRecipes, exploreCookbooks, reload: exploreReload} = useExploreRecipeContext();
  const isGuest = !user;

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
      for (const r of recipes) names.add(r.cookbook || '레시피 북 없음');
      availableCookbooks.forEach(n => names.add(n));
      return [{id: ALL_ID, label: '전체'}, ...[...names].map(n => ({id: n, label: n}))];
    }
    if (crumbAxis === 'method') {
      const names = new Set<string>();
      for (const r of recipes) names.add(r.method?.trim() || '공법 없음');
      return [{id: ALL_ID, label: '전체'}, ...[...names].map(n => ({id: n, label: n}))];
    }
    return [];
  }, [crumbAxis, recipes, availableCookbooks]);

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
      result = result.filter(r => (r.cookbook || '레시피 북 없음') === selectedCookbook);
    }
    if (selectedMethod) {
      result = result.filter(r => (r.method?.trim() || '공법 없음') === selectedMethod);
    }
    return result;
  }, [visibleRecipes, selectedCookbook, selectedMethod]);

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
    showSnackbar(`레시피 ${backup.length}개를 삭제했습니다`, {
      label: '되돌리기',
      onPress: () => setRecipes(backup),
    });
  }, [recipes, setRecipes, showSnackbar]);

  const handleCardMenuSelect = useCallback((id: string, recipe: Recipe): void => {
    if (id === 'cookbook') {
      setCookbookSheetRecipe(recipe);
      return;
    }
    if (id === 'remake') {
      if (!canAddRecipe()) {
        showSnackbar('레시피는 최대 30개까지 등록할 수 있어요');
        return;
      }
      const {total} = parseSession(recipe.session);
      if (total >= 5) {
        showSnackbar('리메이크는 최대 5회까지 가능해요');
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
      showSnackbar('새 회차가 추가되었습니다');
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
  }, [router, setRecipes, showSnackbar]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const recipe = deleteTarget;
    setDeleteTarget(null);
    const groupId = recipe.remakeGroupId;
    const deleted = groupId
      ? recipes.filter(r => r.remakeGroupId === groupId || r.id === groupId)
      : [recipe];
    setRecipes(prev => prev.filter(r => !deleted.some(d => d.id === r.id)));
    showSnackbar(`'${recipe.title}' 삭제됨`, {
      label: '되돌리기',
      onPress: () => setRecipes(prev => [...prev, ...deleted]),
    });
  }, [deleteTarget, recipes, setRecipes, showSnackbar]);

  const handleCookbookSheetSelect = useCallback((cookbookName: string) => {
    if (!cookbookSheetRecipe) return;
    const newCookbook = cookbookName === '__none__' ? '' : cookbookName;
    setRecipes(prev => prev.map(r =>
      r.id === cookbookSheetRecipe.id ? {...r, cookbook: newCookbook} : r
    ));
    setCookbookSheetRecipe(null);
    showSnackbar(`'${cookbookSheetRecipe.title}'을 '${newCookbook || '레시피 북 없음'}'으로 이동했습니다`);
  }, [cookbookSheetRecipe, setRecipes, showSnackbar]);

  const handleAddCookbook = useCallback((name: string, color: import('@components/Avatar/Avatar').AvatarColor) => {
    setCookbookColor(name, color);
    if (cookbookSheetRecipe) {
      setRecipes(prev => prev.map(r =>
        r.id === cookbookSheetRecipe.id ? {...r, cookbook: name} : r
      ));
      setCookbookSheetRecipe(null);
      showSnackbar(`'${cookbookSheetRecipe.title}'을 '${name}'으로 이동했습니다`);
    }
  }, [cookbookSheetRecipe, setCookbookColor, setRecipes, showSnackbar]);

  const closeLocalMenus = useCallback(() => {
    setShowMoreMenu(false);
    setCrumbMenu(null);
  }, []);

  // 레시피 추가 — 레시피북 진입 중이면 해당 북으로 미리 지정
  const handleAddRecipe = useCallback(() => {
    if (!canAddRecipe()) {
      showSnackbar('레시피는 최대 30개까지 등록할 수 있어요');
      return;
    }
    const params = selectedCookbook ? `?cookbook=${encodeURIComponent(selectedCookbook)}` : '';
    router.push(`/recipe/edit${params}` as any);
  }, [canAddRecipe, showSnackbar, selectedCookbook, router]);

  // ===== 그룹 모드 (axis !== 'all') 핸들러 =====
  const handleGroupComingSoon = useCallback(() => {
    showSnackbar('기능 추가 예정입니다');
  }, [showSnackbar]);

  const handleGroupDeleteCookbook = useCallback((name: string) => {
    setRecipes(prev => prev.map(r => (r.cookbook === name ? {...r, cookbook: undefined} : r)));
    removeCookbookColor(name);
    showSnackbar(`'${name}' 레시피 북이 삭제되었습니다`);
  }, [setRecipes, removeCookbookColor, showSnackbar]);

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

  const handleGroupExploreCookbookPress = useCallback((name: string) => {
    setSelectedExploreCookbook(name);
    router.navigate('/explore' as any);
  }, [setSelectedExploreCookbook, router]);

  const handleGroupRecipePress = useCallback((recipeId: string) => {
    router.push(`/recipe/${recipeId}` as any);
  }, [router]);

  const handleGroupRefresh = useCallback(async () => {
    await Promise.all([reload(), exploreReload()]);
  }, [reload, exploreReload]);

  const handleGroupDeleteExploreCookbook = useCallback(async (name: string) => {
    try {
      await deleteDoc(doc(db, 'explore_cookbooks', name));
      showSnackbar(`공식 레시피 북 '${name}'이(가) 삭제되었습니다`);
    } catch {
      showSnackbar('삭제에 실패했습니다');
    }
  }, [showSnackbar]);

  // 그룹 모드: 홈 평면 리스트 대신 그룹 화면을 호스팅
  if (groupAxis !== 'all') {
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
        exploreRecipes={exploreRecipes}
        exploreCookbooks={exploreCookbooks}
        isAdmin={isAdmin}
        onExploreCookbookPress={handleGroupExploreCookbookPress}
        onDeleteExploreCookbook={isAdmin ? handleGroupDeleteExploreCookbook : undefined}
        onRefresh={handleGroupRefresh}
        onRecipePress={handleGroupRecipePress}
        bookCarousel
      />
    );
  }

  return (
    <RecipeListTemplate
      data={isLoading ? [] : filteredRecipes}
      loading={isLoading}
      onRecipePress={(item) => router.push(`/recipe/${item.id}`)}
      cardMenuItems={getDefaultCardMenuItems}
      onCardMenuSelect={handleCardMenuSelect}
      onOverlayPress={closeLocalMenus}
      extraOverlayVisible={showMoreMenu || crumbMenu !== null}
      onRefresh={reload}
      listHeaderExtra={isGuest && !guestBannerDismissed ? (
        <InlineBanner
          icon={IconCloudFilled}
          label={'게스트 모드에서는 레시피가 내 기기에만 저장돼요.'}
          color="accent"
          size="medium"
          action={{
            label: '동기화',
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
              image={emptyCookbookImage}
              title="레시피 북이 비어 있어요."
              subtitle="첫 레시피를 추가해보세요."
              actionLabel="레시피 추가하기"
              onAction={() => {
                if (!canAddRecipe()) {
                  showSnackbar('레시피는 최대 30개까지 등록할 수 있어요');
                  return;
                }
                router.push(`/recipe/edit?cookbook=${encodeURIComponent(selectedCookbook)}` as any);
              }}
            />
          ) : (
            <EmptyState
              category="no-recipe"
              title="저장된 레시피가 아직 없네요."
              subtitle="레시피를 작성하거나 가져오면 여기에 표시 될거에요."
              actionLabel="레시피 둘러보기"
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
              axisLabel={AXIS_LABELS[crumbAxis]}
              itemLabel={crumbItemLabel}
              onAxisPress={() => {
                closeMenus();
                setShowMoreMenu(false);
                setCrumbMenu(prev => (prev === 'axis' ? null : 'axis'));
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
                items={MORE_MENU_ITEMS.map(item =>
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
      {/* 레시피북 진입 시: 우측 하단 + 플로팅 버튼으로 해당 북에 바로 추가 */}
      {selectedCookbook && !isLoading && (
        <FloatingActionButton
          icon={IconAdd}
          onPress={handleAddRecipe}
          accessibilityLabel={`'${selectedCookbook}'에 레시피 추가`}
        />
      )}

      {/* 전체 삭제 확인 다이얼로그 */}
      <Dialog
        visible={showDeleteAllDialog}
        onClose={() => setShowDeleteAllDialog(false)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title="삭제하기"
        description={<>모든 레시피 <Text style={styles.deleteAllCount}>{recipes.length}개</Text>가 삭제됩니다.{'\n'}삭제한 레시피는 다시 되돌릴 수 없습니다.</>}
        actions={<>
          <Button label="취소" variant="soft" onPress={() => setShowDeleteAllDialog(false)} />
          <Button label="삭제" variant="soft" destructive onPress={handleDeleteAll} />
        </>}
      />

      {/* 레시피 삭제 확인 다이얼로그 */}
      <Dialog
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title="레시피를 삭제할까요?"
        description="삭제된 레시피는 되돌릴 수 있습니다."
        actions={<>
          <Button label="취소" variant="soft" onPress={() => setDeleteTarget(null)} />
          <Button label="삭제" variant="soft" destructive onPress={handleConfirmDelete} />
        </>}
      />

      {/* PDF 미리보기 다이얼로그 */}
      <PdfPreviewDialog
        visible={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        html={pdfHtml}
        filename="모든 레시피 북"
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

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  deleteAllCount: {
    color: colors['foreground/on-surface-var'],
  },
  localBanner: {
    marginBottom: Spacing.sm,
  },
});
