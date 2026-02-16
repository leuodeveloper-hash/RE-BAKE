import React, {useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {RecipeEditScreen} from '@screens/RecipeEditScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';

export default function RecipeNewRoute() {
  const router = useRouter();
  const colors = useColors();
  const {recipes, setRecipes, availableCookbooks} = useRecipes();
  const {showSnackbar} = useSnackbar();

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  const handleSave = useCallback((data: any) => {
    const newRecipe = {
      id: `user_${Date.now()}`,
      ...data,
      reviewCount: 0,
    };
    setRecipes(prev => [...prev, newRecipe]);
    showSnackbar('레시피가 저장되었습니다');
    router.back();
  }, [setRecipes, showSnackbar, router]);

  return (
    <View style={[styles.container, {backgroundColor: colors['surface-surfacedim']}]}>
      <RecipeEditScreen
        cookbooks={availableCookbooks}
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
