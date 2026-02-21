import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {View, StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {deleteDoc, doc} from 'firebase/firestore';
import {ExploreScreen} from '@screens/ExploreScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipes} from '@hooks/useExploreRecipes';
import {useOnlineStatus} from '@hooks/useOnlineStatus';
import {useSubscription} from '@contexts/SubscriptionContext';
import {db} from '@config/firebase';
import type {Recipe} from '../../src/types/recipe';

export default function ExploreRoute() {
  const router = useRouter();
  const colors = useColors();
  const {recipes, setRecipes} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {isAdmin} = useAuth();
  const isOnline = useOnlineStatus();
  const {recipes: exploreRecipes, exploreCookbooks, isLoading: exploreLoading, reload: exploreReload} = useExploreRecipes(showSnackbar);
  const {isPro} = useSubscription();
  const isFreeUser = !isAdmin && !isPro;

  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (prevOnlineRef.current && !isOnline) {
      showSnackbar('네트워크 연결이 끊어졌어요');
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, showSnackbar]);

  const myRecipeSourceIds = useMemo(() => recipes.map(r => r.sourceId ?? r.id), [recipes]);

  const handleImportRecipe = useCallback((recipe: Recipe) => {
    const copied: Recipe = {
      ...recipe,
      id: `user_${Date.now()}`,
      sourceId: recipe.id,
      createdAt: new Date().toISOString(),
    };
    setRecipes(prev => [...prev, copied]);
    showSnackbar('내 레시피에 저장했습니다', {
      label: '이동',
      onPress: () => router.navigate('/'),
    });
  }, [setRecipes, showSnackbar, router]);

  const handleRecipePress = useCallback((recipe: Recipe, locked?: boolean) => {
    const params = locked ? 'from=explore&locked=1' : 'from=explore';
    router.push(`/recipe/${recipe.id}?${params}` as any);
  }, [router]);

  const handleEditRecipe = useCallback((recipe: Recipe) => {
    router.push(`/recipe/edit/${recipe.id}?target=explore` as any);
  }, [router]);

  const handleAddRecipe = useCallback((cookbook?: string) => {
    const params = cookbook
      ? `target=explore&cookbook=${encodeURIComponent(cookbook)}`
      : 'target=explore';
    router.push(`/recipe/edit?${params}` as any);
  }, [router]);

  const handleDeleteRecipe = useCallback(async (recipe: Recipe) => {
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

  return (
    <View style={[styles.container, {backgroundColor: colors['surface-surfacedim']}]}>
      <ExploreScreen
        data={exploreRecipes}
        loading={exploreLoading}
        isAdmin={isAdmin}
        isOnline={isOnline}
        myRecipeIds={myRecipeSourceIds}
        onImportRecipe={handleImportRecipe}
        onRecipePress={handleRecipePress}
        onEditRecipe={isAdmin ? handleEditRecipe : undefined}
        onDeleteRecipe={isAdmin ? handleDeleteRecipe : undefined}
        onAddRecipe={isAdmin ? handleAddRecipe : undefined}
        onComingSoon={handleComingSoon}
        onRefresh={exploreReload}
        exploreCookbooks={exploreCookbooks}
        isFreeUser={isFreeUser}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
