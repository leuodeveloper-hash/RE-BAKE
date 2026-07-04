import React, {useCallback, useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {doc, setDoc} from 'firebase/firestore';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RecipeEditScreen} from '@screens/RecipeEditScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColorsV2} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {db} from '@config/firebase';
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
  const colors = useColorsV2();
  const {findRecipeById, recipes, setRecipes, availableCookbooks, cookbookColors, setCookbookColor} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {user, isAdmin} = useAuth();
  const {recipes: exploreRecipes, exploreCookbooks, reload: reloadExplore} = useExploreRecipeContext();

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

  // 레시피 찾기: 로컬 → explore 구독
  const recipe = findRecipeById(id)
    ?? exploreRecipes.find(r => r.id === id);

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
    // 이미지가 완전히 삭제된 경우에만 Storage에서 제거
    // (교체 시에는 같은 경로에 덮어쓰므로 삭제 불필요)
    if (oldImageUri && !isLocalUri(oldImageUri) && !data.imageUri) {
      deleteRecipeImage(id!).catch(() => {});
    }

    if (isExploreTarget && isAdmin) {
      // 둘러보기 레시피 편집 → explore_recipes에 저장
      try {
        const {imageSource: _imgSrc, ...rest} = data;
        const serializable = stripUndefined(rest);
        await setDoc(doc(db, 'explore_recipes', id!), serializable, {merge: true});
        // explore는 1회 fetch+캐시라 저장 후 즉시 반영이 안 됨 → fresh reload로 바로 반영
        await reloadExplore();
      } catch (e: any) {
        console.error('Explore recipe save failed:', e);
        showSnackbar(`저장 실패: ${e?.message ?? e}`);
        return;
      }
    } else if (isMyRecipe) {
      setRecipes(prev => prev.map(r =>
        r.id === id ? {...r, ...data, reviewCount: data.reviews?.length ?? 0} : r,
      ));
    }
    showSnackbar('레시피가 수정되었습니다');
    navigateBack();
  }, [id, isMyRecipe, isExploreTarget, isAdmin, recipe, setRecipes, showSnackbar, navigateBack]);

  if (!recipe) return null;

  return (
    <SafeAreaProvider>
      <View style={[styles.container, {backgroundColor: colors['surface/dim']}]}>
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
