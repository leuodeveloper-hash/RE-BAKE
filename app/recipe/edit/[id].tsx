import React, {useCallback, useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {doc, setDoc} from 'firebase/firestore';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RecipeEditScreen} from '@screens/RecipeEditScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipes} from '@hooks/useExploreRecipes';
import {db} from '@config/firebase';
import {EXPLORE_MOCK_RECIPES} from '@data/mockRecipes';
import {uploadRecipeImage, deleteRecipeImage, isLocalUri} from '@utils/imageUpload';
import type {AvatarColor} from '@components/Avatar/Avatar';

const DEFAULT_EXPLORE_COOKBOOKS = ['제과기능사', '제빵기능사'];

/** Firestore에 보낼 수 없는 undefined 값을 재귀적으로 제거 */
function stripUndefined(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    );
  }
  return obj;
}

export default function RecipeEditRoute() {
  const {id, section, target} = useLocalSearchParams<{id: string; section?: string; target?: string}>();
  const router = useRouter();
  const colors = useColors();
  const {findRecipeById, recipes, setRecipes, availableCookbooks, cookbookColors, setCookbookColor} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {user, isAdmin} = useAuth();
  const {recipes: exploreRecipes, exploreCookbooks} = useExploreRecipes();

  const isMyRecipe = recipes.some(r => r.id === id);
  const isExploreTarget = target === 'explore';

  const mergedCookbookColors = useMemo(() => {
    if (!isExploreTarget) return cookbookColors;
    const merged: Record<string, AvatarColor> = {...cookbookColors};
    exploreCookbooks.forEach(c => {
      if (!merged[c.name]) merged[c.name] = (c.color || 'orange') as AvatarColor;
    });
    return merged;
  }, [isExploreTarget, cookbookColors, exploreCookbooks]);

  // 레시피 찾기: 로컬 → explore 구독 → EXPLORE_MOCK_RECIPES 폴백
  const recipe = findRecipeById(id)
    ?? exploreRecipes.find(r => r.id === id)
    ?? EXPLORE_MOCK_RECIPES.find(r => r.id === id);

  const navigateBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/recipe/${id}` as any);
    }
  }, [router, id]);

  const handleClose = useCallback(() => {
    navigateBack();
  }, [navigateBack]);

  const handleSave = useCallback(async (data: any) => {
    // 로그인 상태에서 로컬 이미지 → Firebase Storage 업로드
    const oldImageUri = recipe?.imageUri;
    if (user && data.imageUri && isLocalUri(data.imageUri)) {
      try {
        data.imageUri = await uploadRecipeImage(data.imageUri, id!);
      } catch (e) {
        console.warn('Image upload failed, keeping local URI:', e);
      }
    }
    // 기존 클라우드 이미지가 교체/삭제된 경우 Storage에서 삭제
    if (oldImageUri && !isLocalUri(oldImageUri) && oldImageUri !== data.imageUri) {
      deleteRecipeImage(id!).catch(() => {});
    }

    if (isExploreTarget && isAdmin) {
      // 둘러보기 레시피 편집 → explore_recipes에 저장
      try {
        const {imageSource, ...rest} = data;
        const serializable = stripUndefined(rest);
        await setDoc(doc(db, 'explore_recipes', id!), serializable, {merge: true});
      } catch (e: any) {
        console.error('Explore recipe save failed:', e);
        showSnackbar(`저장 실패: ${e?.message ?? e}`);
        return;
      }
    } else if (isMyRecipe) {
      setRecipes(prev => prev.map(r =>
        r.id === id ? {...r, ...data} : r,
      ));
    }
    showSnackbar('레시피가 수정되었습니다');
    navigateBack();
  }, [id, isMyRecipe, isExploreTarget, isAdmin, recipe, setRecipes, showSnackbar, navigateBack]);

  if (!recipe) return null;

  return (
    <SafeAreaProvider>
      <View style={[styles.container, {backgroundColor: colors['surface-surfacedim']}]}>
        <RecipeEditScreen
          recipe={recipe}
          cookbooks={isExploreTarget
            ? [...new Set([...DEFAULT_EXPLORE_COOKBOOKS, ...exploreCookbooks.map(c => c.name)])]
            : availableCookbooks}
          cookbookColors={mergedCookbookColors}
          initialSection={section}
          onClose={handleClose}
          onSave={handleSave}
          onSetCookbookColor={setCookbookColor}
          isExplore={isExploreTarget}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
