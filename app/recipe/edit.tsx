import React, {useCallback, useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {doc, setDoc} from 'firebase/firestore';
import {db} from '@config/firebase';
import {RecipeEditScreen} from '@screens/RecipeEditScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {uploadRecipeImage, isLocalUri} from '@utils/imageUpload';
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

export default function RecipeNewRoute() {
  const router = useRouter();
  const colors = useColors();
  const {target, cookbook} = useLocalSearchParams<{target?: string; cookbook?: string}>();
  const isExploreTarget = target === 'explore';
  const {user} = useAuth();
  const {setRecipes, availableCookbooks, cookbookColors, setCookbookColor} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {exploreCookbooks, reload: exploreReload} = useExploreRecipeContext();
  const {t} = useTranslation();

  // 공식(둘러보기) 레시피를 만들 때 인라인으로 쿡북을 추가하면 개인 색맵이 아니라
  // explore_cookbooks(Firestore)에 만들어야 한다. (개인 데이터로 새던 누수 수정)
  const handleSetCookbookColor = useCallback(async (name: string, color: AvatarColor) => {
    if (isExploreTarget) {
      try {
        await setDoc(doc(db, 'explore_cookbooks', name), {name, color, createdAt: new Date().toISOString()});
        await exploreReload();
      } catch (e) {
        console.warn('공식 레시피 북 추가 실패:', e);
      }
    } else {
      setCookbookColor(name, color);
    }
  }, [isExploreTarget, setCookbookColor, exploreReload]);

  const mergedCookbookColors = useMemo(() => {
    if (!isExploreTarget) return cookbookColors;
    const merged: Record<string, AvatarColor> = {...cookbookColors};
    exploreCookbooks.forEach(c => {
      if (!merged[c.name]) merged[c.name] = (c.color || 'orange') as AvatarColor;
    });
    return merged;
  }, [isExploreTarget, cookbookColors, exploreCookbooks]);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  const handleSave = useCallback(async (data: any) => {
    const id = `${isExploreTarget ? 'explore' : 'user'}_${Date.now()}`;

    // 로그인 상태에서 로컬 이미지 → Firebase Storage 업로드
    if (user && data.imageUri && isLocalUri(data.imageUri)) {
      try {
        data.imageUri = await uploadRecipeImage(data.imageUri, id);
      } catch (e) {
        console.warn('Image upload failed, keeping local URI:', e);
      }
    }

    const newRecipe = {
      id,
      ...data,
      reviewCount: data.reviews?.length ?? 0,
      createdAt: new Date().toISOString(),
    };

    if (isExploreTarget) {
      try {
        const {imageSource, ...rest} = newRecipe;
        const serializable = stripUndefined(rest);
        await setDoc(doc(db, 'explore_recipes', id), serializable);
        showSnackbar(t('edit.recipeAddedToExplore'));
      } catch {
        showSnackbar(t('edit.saveFailed'));
      }
    } else {
      setRecipes(prev => [...prev, newRecipe]);
      showSnackbar(t('edit.recipeSaved'));
    }
    router.back();
  }, [isExploreTarget, setRecipes, showSnackbar, router, t]);

  return (
    <SafeAreaProvider>
      <View style={[styles.container, {backgroundColor: colors['surface/dim']}]}>
        <RecipeEditScreen
          cookbooks={isExploreTarget
            ? [...new Set([...DEFAULT_EXPLORE_COOKBOOKS, ...exploreCookbooks.map(c => c.name)])]
            : availableCookbooks}
          cookbookColors={mergedCookbookColors}
          onClose={handleClose}
          onSave={handleSave}
          onSetCookbookColor={handleSetCookbookColor}
          initialCookbook={cookbook}
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
