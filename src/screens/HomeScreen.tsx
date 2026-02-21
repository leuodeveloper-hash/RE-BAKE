import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, Text} from 'react-native';
import {useRouter} from 'expo-router';
import {AppBar} from '@components/Navigation';
import {Menu} from '@components/Menu';
import {RecipeListTemplate} from '@components/Recipe/RecipeListTemplate';
import {Dialog, PdfPreviewDialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {EmptyState} from '@components/EmptyState';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import type {Recipe} from '../types/recipe';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {generateRecipeListHtml, generateRecipeHtml} from '@utils/generateRecipeHtml';
import {parseSession, formatSession} from '@utils/session';
import {getRecipeMenuItems} from '@utils/recipeMenuItems';
import {CookbookSelectSheet} from '@components/BottomSheet';
import {
  IconBookFilled,
  IconTrash,
  IconTrashTwotone,
  IconArrowDownToLine,
} from '@components/Icon/IconIndex';

const emptyCookbookImage = require('../../assets/images/empty_no_cookbook_recipe.png');

const MORE_MENU_ITEMS = [
  {id: 'downloadAll', label: 'PDF 다운로드', icon: IconArrowDownToLine},
  {id: 'deleteAll', label: '전체 삭제', icon: IconTrash, destructive: true},
];

const getDefaultCardMenuItems = (recipe: Recipe) =>
  getRecipeMenuItems({session: recipe.session, showRemake: true, showEdit: true, showDelete: true, showCookbook: true});

export function HomeScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const {recipes, setRecipes, selectedCookbook, setSelectedCookbook, availableCookbooks, cookbookColors, setCookbookColor, isLoading, reload} = useRecipes();
  const {showSnackbar} = useSnackbar();

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCookbookMenu, setShowCookbookMenu] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [cookbookSheetRecipe, setCookbookSheetRecipe] = useState<Recipe | null>(null);

  const cookbookMenuItems = useMemo(() => {
    const recipeCounts = new Map<string, number>();
    for (const r of recipes) {
      const key = r.cookbook || '그룹없음';
      recipeCounts.set(key, (recipeCounts.get(key) ?? 0) + 1);
    }
    const allNames = new Set([
      ...recipeCounts.keys(),
      ...availableCookbooks,
    ]);
    const items: {id: string; label: string; icon: typeof IconBookFilled; disabled?: boolean}[] = [
      {id: '__all__', label: '모든 요리책', icon: IconBookFilled},
    ];
    for (const name of allNames) {
      const count = recipeCounts.get(name) ?? 0;
      items.push({id: name, label: name, icon: IconBookFilled, disabled: count === 0});
    }
    return items;
  }, [recipes, availableCookbooks]);

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
    if (!selectedCookbook) return visibleRecipes;
    return visibleRecipes.filter(r => (r.cookbook || '그룹없음') === selectedCookbook);
  }, [visibleRecipes, selectedCookbook]);

  const handleCookbookSelect = (id: string) => {
    setShowCookbookMenu(false);
    setSelectedCookbook(id === '__all__' ? null : id);
  };

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
      const {total} = parseSession(recipe.session);
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
      const groupId = recipe.remakeGroupId;
      const deleted = groupId
        ? recipes.filter(r => r.remakeGroupId === groupId || r.id === groupId)
        : [recipe];
      setRecipes(prev => prev.filter(r => !deleted.some(d => d.id === r.id)));
      showSnackbar(`'${recipe.title}' 삭제됨`, {
        label: '되돌리기',
        onPress: () => setRecipes(prev => [...prev, ...deleted]),
      });
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

  const handleCookbookSheetSelect = useCallback((cookbookName: string) => {
    if (!cookbookSheetRecipe) return;
    const newCookbook = cookbookName === '__none__' ? '' : cookbookName;
    setRecipes(prev => prev.map(r =>
      r.id === cookbookSheetRecipe.id ? {...r, cookbook: newCookbook} : r
    ));
    setCookbookSheetRecipe(null);
    showSnackbar(`'${cookbookSheetRecipe.title}'을 '${newCookbook || '그룹없음'}'으로 이동했습니다`);
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
    setShowCookbookMenu(false);
  }, []);

  return (
    <RecipeListTemplate
      data={isLoading ? [] : filteredRecipes}
      loading={isLoading}
      onRecipePress={(item) => router.push(`/recipe/${item.id}`)}
      cardMenuItems={getDefaultCardMenuItems}
      onCardMenuSelect={handleCardMenuSelect}
      onOverlayPress={closeLocalMenus}
      extraOverlayVisible={showMoreMenu || showCookbookMenu}
      onRefresh={reload}
      listEmptyComponent={
        !isLoading ? (
          selectedCookbook ? (
            <EmptyState
              image={emptyCookbookImage}
              title="요리책이 비어 있어요."
              subtitle="첫 레시피를 추가해보세요."
              actionLabel="레시피 추가하기"
              onAction={() => router.push(`/recipe/edit?cookbook=${encodeURIComponent(selectedCookbook)}` as any)}
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
      renderAppBar={({handleFilterPress, showLayoutMenu, closeMenus, layoutMenu}) => (
        <AppBar
          title={selectedCookbook || '모든 요리책'}
          showDropdown
          onTitlePress={() => {
            closeMenus();
            setShowMoreMenu(false);
            setShowCookbookMenu(prev => !prev);
          }}
          onAddPress={() => router.push('/recipe/edit')}
          onFilterPress={() => {
            closeLocalMenus();
            handleFilterPress();
          }}
          onMenuPress={() => {
            closeMenus();
            setShowCookbookMenu(false);
            setShowMoreMenu(prev => !prev);
          }}
          filterMenuOpen={showLayoutMenu}
          menuOpen={showMoreMenu}
          titleMenu={
            <Menu
              items={cookbookMenuItems}
              selectedId={selectedCookbook || '__all__'}
              onSelect={handleCookbookSelect}
              visible={showCookbookMenu}
            />
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

      {/* PDF 미리보기 다이얼로그 */}
      <PdfPreviewDialog
        visible={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        html={pdfHtml}
        filename="모든 요리책"
      />

      {/* 요리책 선택 바텀시트 */}
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
    color: colors['foreground-onsurfacevar'],
  },
});
