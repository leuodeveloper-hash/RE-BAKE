import React, {useCallback, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {doc, deleteDoc, setDoc} from 'firebase/firestore';
import {ExploreScreen} from '@screens/ExploreScreen';
import {RecipeEditScreen} from '@screens/RecipeEditScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipes} from '@hooks/useExploreRecipes';
import {db} from '@config/firebase';
import {MockRecipe} from '@data/mockRecipes';

export default function ExploreRoute() {
  const router = useRouter();
  const colors = useColors();
  const {recipes, setRecipes} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {isAdmin} = useAuth();
  const {recipes: exploreRecipes} = useExploreRecipes();
  const [editingRecipe, setEditingRecipe] = useState<MockRecipe | null>(null);

  const myRecipeSourceIds = useMemo(() => recipes.map(r => r.sourceId ?? r.id), [recipes]);

  const handleImportRecipe = useCallback((recipe: MockRecipe) => {
    const copied: MockRecipe = {
      ...recipe,
      id: `user_${Date.now()}`,
      sourceId: recipe.id,
    };
    setRecipes(prev => [...prev, copied]);
    showSnackbar('내 레시피에 저장했습니다', {
      label: '이동',
      onPress: () => router.navigate('/'),
    });
  }, [setRecipes, showSnackbar, router]);

  const handleRecipePress = useCallback((recipe: MockRecipe) => {
    router.push(`/recipe/${recipe.id}`);
  }, [router]);

  const handleEditRecipe = useCallback((recipe: MockRecipe) => {
    setEditingRecipe(recipe);
  }, []);

  const handleEditSave = useCallback(async (data: any) => {
    if (!editingRecipe) return;
    try {
      const {imageSource, ...serializable} = {...editingRecipe, ...data};
      await setDoc(doc(db, 'explore_recipes', editingRecipe.id), serializable);
      showSnackbar('레시피가 수정되었습니다');
    } catch {
      showSnackbar('수정에 실패했습니다');
    }
    setEditingRecipe(null);
  }, [editingRecipe, showSnackbar]);

  const handleDeleteRecipe = useCallback(async (recipe: MockRecipe) => {
    try {
      await deleteDoc(doc(db, 'explore_recipes', recipe.id));
      showSnackbar(`'${recipe.title}' 삭제됨`);
    } catch {
      showSnackbar('삭제에 실패했습니다');
    }
  }, [showSnackbar]);

  const handleComingSoon = useCallback(() => {
    showSnackbar('기능 추가 예정입니다');
  }, [showSnackbar]);

  if (editingRecipe) {
    return (
      <View style={[styles.container, {backgroundColor: colors['surface-surfacedim']}]}>
        <RecipeEditScreen
          recipe={editingRecipe}
          cookbooks={[]}
          onClose={() => setEditingRecipe(null)}
          onSave={handleEditSave}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors['surface-surfacedim']}]}>
      <ExploreScreen
        data={exploreRecipes}
        isAdmin={isAdmin}
        myRecipeIds={myRecipeSourceIds}
        onImportRecipe={handleImportRecipe}
        onRecipePress={handleRecipePress}
        onEditRecipe={isAdmin ? handleEditRecipe : undefined}
        onDeleteRecipe={isAdmin ? handleDeleteRecipe : undefined}
        onComingSoon={handleComingSoon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
