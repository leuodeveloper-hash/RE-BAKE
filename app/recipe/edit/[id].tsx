import React, {useCallback, useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {doc, setDoc, deleteField} from 'firebase/firestore';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RecipeEditScreen} from '@screens/RecipeEditScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useTranslation} from '@contexts/LanguageContext';
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
  const {t} = useTranslation();
  const colors = useColors();
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

  // 공식(둘러보기) 레시피 편집 중 인라인 쿡북 추가 → 개인 색맵이 아니라 explore_cookbooks(Firestore)로.
  const handleSetCookbookColor = useCallback(async (name: string, color: AvatarColor) => {
    if (isExploreTarget) {
      try {
        await setDoc(doc(db, 'explore_cookbooks', name), {name, color, createdAt: new Date().toISOString()});
        await reloadExplore();
      } catch (e) {
        console.warn('공식 레시피 북 추가 실패:', e);
      }
    } else {
      setCookbookColor(name, color);
    }
  }, [isExploreTarget, setCookbookColor, reloadExplore]);

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
        // merge:true는 undefined(삭제된 필드)를 무시하므로 → 비운 optional 필드는 deleteField()로 명시해 실제 삭제.
        const OPTIONAL_FIELDS = ['sourceUrl', 'referenceUrl', 'advice', 'imageUri', 'ratio', 'time', 'servings', 'method'] as const;
        for (const f of OPTIONAL_FIELDS) {
          if ((rest as any)[f] === undefined) (serializable as any)[f] = deleteField();
        }
        await setDoc(doc(db, 'explore_recipes', id!), serializable, {merge: true});
        // explore는 1회 fetch+캐시라 저장 후 즉시 반영이 안 됨 → fresh reload로 바로 반영
        await reloadExplore();
      } catch (e: any) {
        console.error('Explore recipe save failed:', e);
        showSnackbar(t('id.saveFailed', {message: e?.message ?? e}));
        return;
      }
    } else if (isMyRecipe) {
      setRecipes(prev => prev.map(r =>
        r.id === id ? {...r, ...data, reviewCount: data.reviews?.length ?? 0} : r,
      ));
    }
    showSnackbar(t('id.recipeUpdated'));
    navigateBack();
  }, [id, isMyRecipe, isExploreTarget, isAdmin, recipe, setRecipes, showSnackbar, navigateBack, t]);

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
          onSetCookbookColor={handleSetCookbookColor}
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
