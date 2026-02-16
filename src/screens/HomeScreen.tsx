import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, Text} from 'react-native';
import {useRouter} from 'expo-router';
import {AppBar, APPBAR_CONTENT_BOTTOM} from '@components/Layout';
import {Menu} from '@components/Menu';
import {RecipeListTemplate} from '@components/Recipe/RecipeListTemplate';
import {Dialog, PdfPreviewDialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {EmptyState} from '@components/EmptyState';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {MockRecipe} from '@data/mockRecipes';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {generateRecipeListHtml, generateRecipeHtml} from '@utils/generateRecipeHtml';
import {parseSession, formatSession} from '@utils/session';
import {
  IconBookFilled,
  IconTrash,
  IconTrashTwotone,
  IconArrowDownToLine,
  IconHash,
  IconEdit,
} from '@components/Icon/IconIndex';
const emptyRecipeImage = require('../../assets/images/empty_recipe.png');

const MORE_MENU_ITEMS = [
  {id: 'downloadAll', label: 'PDF 다운로드', icon: IconArrowDownToLine},
  {id: 'deleteAll', label: '전체 삭제', icon: IconTrash, destructive: true},
];

const getCardMenuItems = (recipe: MockRecipe) => {
  const {total} = parseSession(recipe.session);
  return [
    {id: 'remake', label: `다시 만들기: ${total + 1}회차`, icon: IconHash},
    {id: 'edit', label: '편집', icon: IconEdit},
    {id: 'download', label: 'PDF 다운로드', icon: IconArrowDownToLine},
    {id: 'delete', label: '삭제', icon: IconTrash, destructive: true},
  ];
};

export function HomeScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const {recipes, setRecipes, selectedCookbook, setSelectedCookbook, isLoading} = useRecipes();
  const {showSnackbar} = useSnackbar();

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCookbookMenu, setShowCookbookMenu] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');

  const cookbookMenuItems = useMemo(() => {
    const categories = new Set(recipes.map(r => r.category || '그룹없음'));
    const items = [{id: '__all__', label: '모든 요리책', icon: IconBookFilled}];
    for (const cat of categories) {
      items.push({id: cat, label: cat, icon: IconBookFilled});
    }
    return items;
  }, [recipes]);

  // 리메이크 그룹에서 최신 회차만 표시 + 그룹 전체 회고 합산
  const visibleRecipes = useMemo(() => {
    const latestByGroup = new Map<string, MockRecipe>();
    const reviewsByGroup = new Map<string, number>();
    const standalone: MockRecipe[] = [];
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
    const result: MockRecipe[] = [...standalone];
    for (const [groupId, recipe] of latestByGroup) {
      const totalReviews = reviewsByGroup.get(groupId) ?? 0;
      result.push({...recipe, reviewCount: totalReviews});
    }
    return result;
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    if (!selectedCookbook) return visibleRecipes;
    return visibleRecipes.filter(r => (r.category || '그룹없음') === selectedCookbook);
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
        category: r.category,
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

  const handleCardMenuSelect = useCallback((id: string, recipe: MockRecipe) => {
    if (id === 'remake') {
      const {total} = parseSession(recipe.session);
      const newTotal = total + 1;
      const groupId = recipe.remakeGroupId || recipe.id;
      const newId = `remake_${Date.now()}`;
      const newRecipe: MockRecipe = {
        ...recipe,
        id: newId,
        session: formatSession(newTotal, newTotal),
        remakeGroupId: groupId,
        reviews: [],
        reviewCount: 0,
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
        category: recipe.category,
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

  const closeLocalMenus = useCallback(() => {
    setShowMoreMenu(false);
    setShowCookbookMenu(false);
  }, []);

  return (
    <RecipeListTemplate
      data={isLoading ? [] : filteredRecipes}
      onRecipePress={(item) => router.push(`/recipe/${item.id}`)}
      cardMenuItems={getCardMenuItems}
      onCardMenuSelect={handleCardMenuSelect}
      onOverlayPress={closeLocalMenus}
      extraOverlayVisible={showMoreMenu || showCookbookMenu}
      listEmptyComponent={
        !isLoading ? (
          <EmptyState
            image={emptyRecipeImage}
            title="저장된 레시피가 아직 없네요."
            subtitle="레시피를 저장하고 가져오면 여기에 표시 될거에요."
          />
        ) : undefined
      }
      contentExtra={
        <Menu
          items={MORE_MENU_ITEMS.map(item =>
            item.id === 'deleteAll' ? {...item, disabled: recipes.length === 0} : item
          )}
          onSelect={handleMoreMenuSelect}
          style={styles.moreMenu}
          visible={showMoreMenu}
        />
      }
      renderAppBar={({handleFilterPress, showLayoutMenu, closeMenus}) => (
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
        />
      )}
    >
      {/* 전체 삭제 확인 다이얼로그 */}
      <Dialog
        visible={showDeleteAllDialog}
        onClose={() => setShowDeleteAllDialog(false)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title="전체 삭제"
        actions={<>
          <Button label="취소" variant="soft" onPress={() => setShowDeleteAllDialog(false)} />
          <Button label="삭제" variant="filled" destructive onPress={handleDeleteAll} />
        </>}>
        <Text style={styles.deleteAllDescription}>
          모든 레시피 <Text style={styles.deleteAllCount}>{recipes.length}개</Text>가 삭제됩니다.{'\n'}이 작업은 되돌릴 수 있습니다.
        </Text>
      </Dialog>

      {/* PDF 미리보기 다이얼로그 */}
      <PdfPreviewDialog
        visible={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        html={pdfHtml}
        filename="모든 요리책"
      />
    </RecipeListTemplate>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  moreMenu: {
    position: 'absolute',
    top: APPBAR_CONTENT_BOTTOM + Spacing.xs,
    right: Spacing.md,
  },
  deleteAllDescription: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '400',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground-onsurfacemuted'],
  },
  deleteAllCount: {
    color: colors['foreground-onsurfacevar'],
  },
});
