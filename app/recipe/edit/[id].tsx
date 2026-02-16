import React, {useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {RecipeEditScreen} from '@screens/RecipeEditScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';

export default function RecipeEditRoute() {
  const {id, section} = useLocalSearchParams<{id: string; section?: string}>();
  const router = useRouter();
  const colors = useColors();
  const {findRecipeById, setRecipes, availableCookbooks} = useRecipes();
  const {showSnackbar} = useSnackbar();

  const recipe = findRecipeById(id);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  const handleSave = useCallback((data: any) => {
    setRecipes(prev => prev.map(r =>
      r.id === id ? {...r, ...data} : r,
    ));
    showSnackbar('레시피가 수정되었습니다');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [id, setRecipes, showSnackbar, router]);

  if (!recipe) return null;

  return (
    <View style={[styles.container, {backgroundColor: colors['surface-surfacedim']}]}>
      <RecipeEditScreen
        recipe={recipe}
        cookbooks={availableCookbooks}
        initialSection={section}
        onClose={handleClose}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
