import React, {useCallback, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {doc, deleteDoc} from 'firebase/firestore';
import {RecipeDetailScreen} from '@screens/RecipeDetailScreen';
import {BottomTabBar, type TabItem, type AddMenuItem} from '@components/Layout/BottomTabBar';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useAddSheet} from '@contexts/AddSheetContext';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipes} from '@hooks/useExploreRecipes';
import {db} from '@config/firebase';
import {MOCK_RECIPES} from '@data/mockRecipes';
import {parseSession, formatSession} from '@utils/session';
import {Spacing} from '@constants/spacing';
import {
  IconHomeFilled,
  IconBookFilled,
  IconAdd,
  IconEarthFilled,
  IconUserFilled,
  IconNoteFilled,
} from '@components/Icon/IconIndex';

export default function RecipeDetailRoute() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const colors = useColors();
  const {findRecipeById, recipes, setRecipes} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {isAdmin} = useAuth();
  const {recipes: exploreRecipes} = useExploreRecipes();
  const {showAddSheet, setShowAddSheet} = useAddSheet();
  const [isCookingMode, setIsCookingMode] = useState(false);

  const recipe = findRecipeById(id) ?? exploreRecipes.find(r => r.id === id) ?? MOCK_RECIPES.find(r => r.id === id);
  const isMyRecipe = recipes.some(r => r.id === id);
  const isExploreRecipe = !isMyRecipe && exploreRecipes.some(r => r.id === id);
  const alreadyImported = recipes.some(r => r.sourceId === id);
  const activeTab = isExploreRecipe ? 'explore' : 'home';

  const addMenuItems = useMemo<AddMenuItem[]>(() => {
    const items: AddMenuItem[] = [
      {id: 'recipe', label: '레시피', icon: IconNoteFilled, iconColor: colors['custom-greenvar']},
      {id: 'cookbook', label: '요리책', icon: IconBookFilled, iconColor: colors['custom-brownvar']},
    ];
    if (isAdmin) {
      items.push({id: 'official', label: '공식 레시피', icon: IconNoteFilled, iconColor: colors['custom-yellow']});
    }
    return items;
  }, [colors, isAdmin]);

  const handleAddItemPress = useCallback((item: AddMenuItem) => {
    setShowAddSheet(false);
    if (item.id === 'recipe') {
      router.push('/recipe/edit');
    } else if (item.id === 'official') {
      router.push('/recipe/edit?official=true' as any);
    }
  }, [router, setShowAddSheet]);

  const tabs = useMemo<TabItem[]>(() => [
    {id: 'home', label: '홈', icon: IconHomeFilled, onPress: () => router.navigate('/')},
    {id: 'group', label: '그룹', icon: IconBookFilled, onPress: () => router.navigate('/group')},
    {id: 'add', label: '추가', icon: IconAdd, onPress: () => setShowAddSheet(true)},
    {id: 'explore', label: '둘러보기', icon: IconEarthFilled, onPress: () => router.navigate('/explore')},
    {id: 'profile', label: '나', icon: IconUserFilled, useRandomAvatar: true, onPress: () => router.navigate('/profile')},
  ], [router, setShowAddSheet]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  const handleEdit = useCallback((section?: string) => {
    const path = section ? `/recipe/edit/${id}?section=${section}` : `/recipe/edit/${id}`;
    router.push(path as any);
  }, [router, id]);

  const handleExploreEdit = useCallback(() => {
    router.back();
  }, [router]);

  const handleDelete = useCallback(async () => {
    if (!recipe) return;
    if (isMyRecipe) {
      setRecipes(prev => prev.filter(r => r.id !== id));
      showSnackbar(`'${recipe.title}' 삭제됨`);
    } else if (isExploreRecipe && isAdmin) {
      try {
        await deleteDoc(doc(db, 'explore_recipes', id!));
        showSnackbar(`'${recipe.title}' 삭제됨`);
      } catch {
        showSnackbar('삭제에 실패했습니다');
      }
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [recipe, isMyRecipe, isExploreRecipe, isAdmin, id, setRecipes, showSnackbar, router]);

  const handleComingSoon = useCallback(() => {
    showSnackbar('기능 추가 예정입니다');
  }, [showSnackbar]);

  const handleImport = useCallback(() => {
    if (!recipe) return;
    const copied = {
      ...recipe,
      id: `user_${Date.now()}`,
      sourceId: recipe.id,
    };
    setRecipes(prev => [...prev, copied]);
    showSnackbar('내 레시피에 저장했습니다', {
      label: '이동',
      onPress: () => router.navigate('/'),
    });
  }, [recipe, setRecipes, showSnackbar, router]);

  const handleRemake = useCallback(() => {
    if (!recipe) return;

    const {total} = parseSession(recipe.session);
    const newTotal = total + 1;
    const groupId = recipe.remakeGroupId || recipe.id;

    const newId = `remake_${Date.now()}`;
    const newRecipe = {
      ...recipe,
      id: newId,
      session: formatSession(newTotal, newTotal),
      remakeGroupId: groupId,
      reviews: [] as {evaluation: string; improvement: string}[],
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
  }, [recipe, setRecipes, showSnackbar, router]);

  const sessionItems = useMemo(() => {
    if (!recipe?.remakeGroupId) return [];
    const group = recipes
      .filter(r => r.remakeGroupId === recipe.remakeGroupId || r.id === recipe.remakeGroupId)
      .sort((a, b) => parseSession(a.session).current - parseSession(b.session).current);
    if (group.length < 2) return [];
    return group.map(r => ({id: r.id, label: `${parseSession(r.session).current}회차`}));
  }, [recipe, recipes]);

  const handleSessionSelect = useCallback((recipeId: string) => {
    router.replace(`/recipe/${recipeId}` as any);
  }, [router]);

  if (!recipe) return null;

  const canEdit = isMyRecipe || (isExploreRecipe && isAdmin);
  const canDelete = isMyRecipe || (isExploreRecipe && isAdmin);

  return (
    <View style={[styles.container, {backgroundColor: colors['surface-surfacedim']}]}>
      <RecipeDetailScreen
        title={recipe.title}
        category={recipe.category}
        method={recipe.method}
        reviewCount={recipe.reviewCount}
        reviews={recipe.reviews}
        imageSource={recipe.imageSource}
        time={recipe.time}
        servings={recipe.servings}
        session={recipe.session}
        ingredientGroups={recipe.ingredientGroups}
        tools={recipe.tools}
        steps={recipe.steps}
        stepGroups={recipe.stepGroups}
        activeFieldIds={recipe.activeFieldIds}
        onBack={handleBack}
        onComingSoon={handleComingSoon}
        onEdit={canEdit ? (isMyRecipe ? handleEdit : handleExploreEdit) : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        onRemake={isMyRecipe ? handleRemake : undefined}
        onImport={!isMyRecipe && !alreadyImported ? handleImport : undefined}
        sessionItems={sessionItems}
        onSessionSelect={handleSessionSelect}
        onUpdate={isMyRecipe ? (data) => {
          const updated = {...recipe, ...data};
          setRecipes(prev => prev.map(r => r.id === id ? updated : r));
        } : undefined}
        onCookingModeChange={setIsCookingMode}
      />
      {!isCookingMode && (
        <View style={styles.tabBarWrapper}>
          <BottomTabBar
            tabs={tabs}
            activeTab={activeTab}
            expanded={showAddSheet}
            onClose={() => setShowAddSheet(false)}
            addMenuItems={addMenuItems}
            onAddItemPress={handleAddItemPress}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
    zIndex: 30,
  },
});
