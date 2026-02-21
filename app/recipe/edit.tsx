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
import {useExploreRecipes} from '@hooks/useExploreRecipes';
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
  const {exploreCookbooks} = useExploreRecipes();

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
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };

    if (isExploreTarget) {
      try {
        const {imageSource, ...rest} = newRecipe;
        const serializable = stripUndefined(rest);
        await setDoc(doc(db, 'explore_recipes', id), serializable);
        showSnackbar('둘러보기에 레시피가 추가되었습니다');
      } catch {
        showSnackbar('저장에 실패했습니다');
      }
    } else {
      setRecipes(prev => [...prev, newRecipe]);
      showSnackbar('레시피가 저장되었습니다');
    }
    router.back();
  }, [isExploreTarget, setRecipes, showSnackbar, router]);

  return (
    <SafeAreaProvider>
      <View style={[styles.container, {backgroundColor: colors['surface-surfacedim']}]}>
        <RecipeEditScreen
          cookbooks={isExploreTarget
            ? [...new Set([...DEFAULT_EXPLORE_COOKBOOKS, ...exploreCookbooks.map(c => c.name)])]
            : availableCookbooks}
          cookbookColors={mergedCookbookColors}
          onClose={handleClose}
          onSave={handleSave}
          onSetCookbookColor={setCookbookColor}
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
