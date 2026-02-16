import React, {useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {GroupScreen} from '@screens/GroupScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';

export default function GroupRoute() {
  const router = useRouter();
  const colors = useColors();
  const {recipes, setRecipes, setSelectedCookbook} = useRecipes();
  const {showSnackbar} = useSnackbar();

  const handleComingSoon = useCallback(() => {
    showSnackbar('기능 추가 예정입니다');
  }, [showSnackbar]);

  const handleRenameCookbook = useCallback((oldName: string, newName: string) => {
    setRecipes(prev => prev.map(r =>
      r.category === oldName ? {...r, category: newName} : r,
    ));
  }, [setRecipes]);

  const handleCookbookPress = useCallback((name: string) => {
    setSelectedCookbook(name);
    router.navigate('/');
  }, [setSelectedCookbook, router]);

  return (
    <View style={[styles.container, {backgroundColor: colors['surface-surfacedim']}]}>
      <GroupScreen
        recipes={recipes}
        onComingSoon={handleComingSoon}
        onRenameCookbook={handleRenameCookbook}
        onCookbookPress={handleCookbookPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
