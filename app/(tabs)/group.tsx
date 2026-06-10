import React, {useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {deleteDoc, doc} from 'firebase/firestore';
import {GroupScreen} from '@screens/GroupScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColorsV2} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {db} from '@config/firebase';


export default function GroupRoute() {
  const router = useRouter();
  const colors = useColorsV2();
  const {recipes, setRecipes, setSelectedCookbook, cookbookColors, removeCookbookColor, reload} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {isAdmin} = useAuth();
  const {recipes: exploreRecipes, exploreCookbooks, reload: exploreReload} = useExploreRecipeContext();

  const handleComingSoon = useCallback(() => {
    showSnackbar('기능 추가 예정입니다');
  }, [showSnackbar]);

  const handleDeleteCookbook = useCallback((name: string) => {
    setRecipes(prev => prev.map(r =>
      r.cookbook === name ? {...r, cookbook: undefined} : r,
    ));
    removeCookbookColor(name);
    showSnackbar(`'${name}' 레시피 북이 삭제되었습니다`);
  }, [setRecipes, removeCookbookColor, showSnackbar]);

  const {selectedExploreCookbook: _, setSelectedExploreCookbook} = useRecipes();

  const handleCookbookPress = useCallback((name: string) => {
    setSelectedCookbook(name);
    router.navigate('/');
  }, [setSelectedCookbook, router]);

  const handleExploreCookbookPress = useCallback((name: string) => {
    setSelectedExploreCookbook(name);
    router.navigate('/explore');
  }, [setSelectedExploreCookbook, router]);

  const handleRecipePress = useCallback((recipeId: string) => {
    router.push(`/recipe/${recipeId}` as any);
  }, [router]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([reload(), exploreReload()]);
  }, [reload, exploreReload]);

  const handleDeleteExploreCookbook = useCallback(async (name: string) => {
    try {
      await deleteDoc(doc(db, 'explore_cookbooks', name));
      showSnackbar(`공식 레시피 북 '${name}'이(가) 삭제되었습니다`);
    } catch {
      showSnackbar('삭제에 실패했습니다');
    }
  }, [showSnackbar]);

  return (
    <View style={[styles.container, {backgroundColor: colors['surface/normal']}]}>
      <GroupScreen
        recipes={recipes}
        cookbookColors={cookbookColors}
        onComingSoon={handleComingSoon}
        onDeleteCookbook={handleDeleteCookbook}
        onCookbookPress={handleCookbookPress}
        exploreRecipes={exploreRecipes}
        exploreCookbooks={exploreCookbooks}
        isAdmin={isAdmin}
        onExploreCookbookPress={handleExploreCookbookPress}
        onDeleteExploreCookbook={isAdmin ? handleDeleteExploreCookbook : undefined}
        onRefresh={handleRefresh}
        onRecipePress={handleRecipePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
