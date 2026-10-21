import React, {useState, useCallback, useMemo, useEffect, useRef} from 'react';
import {saveRecipeVersion} from '@utils/recipeHistory';
import {View, StyleSheet} from 'react-native';
import {setAlbumScope} from '@components/AlbumPicker/albumPicker';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {doc, getDoc, setDoc, deleteField} from 'firebase/firestore';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RecipeEditScreen} from '@screens/RecipeEditScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {db} from '@config/firebase';
import {uploadRecipeImage, deleteRecipeImage, isLocalUri, isImagesNotUploaded} from '@utils/imageUpload';
import {uploadAllImagesOrThrow} from '@hooks/useRecipeStorage';
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
  const {id, section, target, bulk} = useLocalSearchParams<{id: string; section?: string; target?: string; bulk?: string}>();
  const router = useRouter();
  const {t} = useTranslation();
  const colors = useColors();
  const {findRecipeById, recipes, setRecipes, availableCookbooks, cookbookColors, setCookbookColor} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {user, isAdmin} = useAuth();
  const {recipes: exploreRecipes, exploreCookbooks, reload: reloadExplore} = useExploreRecipeContext();

  const isMyRecipe = recipes.some(r => r.id === id);
  const isExploreTarget = target === 'explore';
  // 사진첩은 이 레시피에서 마지막으로 연 앨범부터. 닫을 땐 비우지 않는다 — 뒤의 상세가 같은 레시피라 계속 쓴다
  useEffect(() => { setAlbumScope(id); }, [id]);

  const mergedCookbookColors = useMemo(() => {
    if (!isExploreTarget) return cookbookColors;
    const merged: Record<string, AvatarColor> = {...cookbookColors};
    exploreCookbooks.forEach(c => {
      if (!merged[c.name]) merged[c.name] = (c.color || 'orange') as AvatarColor;
    });
    return merged;
  }, [isExploreTarget, cookbookColors, exploreCookbooks]);

  // 공식(둘러보기) 레시피 편집 중 인라인 레시피 북 추가 → 개인 색맵이 아니라 explore_cookbooks(Firestore)로.
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
  const foundRecipe = findRecipeById(id)
    ?? exploreRecipes.find(r => r.id === id);
  // 저장 중 둘러보기 목록을 다시 읽는 동안 잠깐 못 찾아도 마지막 판을 쓴다 —
  // 비면 편집 화면이 내려갔다 다시 올라와 맨 위로 튄 뒤에 저장되는 것처럼 보였다
  const lastRecipeRef = useRef(foundRecipe);
  if (foundRecipe) lastRecipeRef.current = foundRecipe;
  const recipe = foundRecipe ?? lastRecipeRef.current;

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

  const handleSave = useCallback(async (data: any, opts?: {stay?: boolean}) => {
    // 로그인 상태에서 로컬 이미지 → Firebase Storage 업로드
    const oldImageUri = recipe?.imageUri;
    if (user && data.imageUri && isLocalUri(data.imageUri)) {
      try {
        data.imageUri = await uploadRecipeImage(data.imageUri, id!);
      } catch (e) {
        console.warn('Image upload failed, keeping local URI:', e);
      }
    }
    // 추가 상단 이미지도 같은 규칙으로 업로드 — 대표와 겹치지 않게 접미사를 붙인다
    if (user && Array.isArray(data.imageUris) && data.imageUris.length > 0) {
      data.imageUris = await Promise.all(
        data.imageUris.map(async (u: string, i: number) => {
          if (!isLocalUri(u)) return u;
          try {
            return await uploadRecipeImage(u, `${id!}_hero${i + 1}`);
          } catch (e) {
            console.warn('Extra image upload failed, keeping local URI:', e);
            return u;
          }
        }),
      );
    }
    // 이미지가 완전히 삭제된 경우에만 Storage에서 제거
    // (교체 시에는 같은 경로에 덮어쓰므로 삭제 불필요)
    if (oldImageUri && !isLocalUri(oldImageUri) && !data.imageUri) {
      deleteRecipeImage(id!).catch(() => {});
    }

    if (isExploreTarget && isAdmin) {
      // 둘러보기 레시피 편집 → explore_recipes에 저장
      try {
        // 과정·조언 사진도 서버에 올린다 — 내 레시피 저장과 같은 함수.
        // (빠져 있어서 공식 레시피의 과정 사진이 폰 안 주소(file://)로 저장돼 다른 기기에서 안 보였다)
        const uploaded = await uploadAllImagesOrThrow({...data, id: id!} as any);
        const {imageSource: _imgSrc, ...rest} = uploaded as any;
        const serializable = stripUndefined(rest);
        // merge:true는 undefined(삭제된 필드)를 무시하므로 → 비운 optional 필드는 deleteField()로 명시해 실제 삭제.
        const OPTIONAL_FIELDS = ['sourceUrl', 'referenceUrl', 'advice', 'advicePhotos', 'kind', 'imageUri', 'imageUris', 'ratio', 'time', 'servings', 'method'] as const;
        for (const f of OPTIONAL_FIELDS) {
          if ((rest as any)[f] === undefined) (serializable as any)[f] = deleteField();
        }
        // 다른 기기(PC 등)에서 더 새로 고친 공식 레시피면 덮어쓰지 않는다 — 덮어쓸 땐 이전 판을 기록으로
        const ref = doc(db, 'explore_recipes', id!);
        const cur = await getDoc(ref);
        const remote = cur.data() as any;
        if (remote && (remote.updatedAt ?? '') > ((recipe as any)?.updatedAt ?? '')) {
          showSnackbar(t('id.newerElsewhere'), {tone: 'error'});
          return;
        }
        if (remote) await saveRecipeVersion(ref, remote);
        (serializable as any).updatedAt = new Date().toISOString();
        await setDoc(ref, serializable, {merge: true});
        // explore는 1회 fetch+캐시라 저장 후 즉시 반영이 안 됨 → fresh reload로 바로 반영
        await reloadExplore();
      } catch (e: any) {
        console.error('Explore recipe save failed:', e);
        // 사진을 다 못 올렸으면 저장하지 않고 바로 알린다(공식 레시피에 폰 주소가 섞이면 안 된다)
        showSnackbar(isImagesNotUploaded(e) ? t('upload.notUploadedNotSaved', {count: e.count}) : t('id.saveFailed', {message: e?.message ?? e}), {tone: 'error'});
        return;
      }
    } else if (isMyRecipe) {
      setRecipes(prev => prev.map(r =>
        r.id === id ? {...r, ...data, reviewCount: data.reviews?.length ?? 0} : r,
      ));
    }
    showSnackbar(t('id.recipeUpdated'));
    // 입력 툴바 저장은 편집 화면에 남는다
    if (!opts?.stay) navigateBack();
  }, [id, isMyRecipe, isExploreTarget, isAdmin, recipe, setRecipes, showSnackbar, navigateBack, t]);

  const [editorKey, setEditorKey] = useState(0);
  const handleLoadVersion = useCallback(async (v: any) => {
    const {savedAt: _saved, ...version} = v ?? {};
    if (isExploreTarget && isAdmin) {
      const ref = doc(db, 'explore_recipes', id!);
      const cur = await getDoc(ref);
      if (cur.exists()) await saveRecipeVersion(ref, cur.data());
      await setDoc(ref, stripUndefined({...version, id, updatedAt: new Date().toISOString()}));
      await reloadExplore();
    } else if (isMyRecipe) {
      setRecipes(prev => prev.map(r => (r.id === id ? {...version, id} as any : r)));
    }
    showSnackbar(t('id.versionLoaded'), {tone: 'positive'});
    setEditorKey(k => k + 1);
  }, [id, isExploreTarget, isAdmin, isMyRecipe, setRecipes, reloadExplore, showSnackbar, t]);

  if (!recipe) return null;

  return (
    <SafeAreaProvider>
      <View style={[styles.container, {backgroundColor: colors['surface/dim']}]}>
        <RecipeEditScreen
          key={editorKey}
          recipe={recipe}
          recipeId={id}
          // 이전 버전 고름 — 그 판을 저장하고(지금 판은 기록으로 남는다) 편집 화면을 새로 연다
          onLoadVersion={handleLoadVersion}
          cookbooks={isExploreTarget
            ? [...new Set([...DEFAULT_EXPLORE_COOKBOOKS, ...exploreCookbooks.map(c => c.name)])]
            : availableCookbooks}
          cookbookColors={mergedCookbookColors}
          initialSection={section}
          // 상세 한번에 보기에서 들어오면 재료·과정을 한번에 쓰기로
          initialBulk={bulk === '1'}
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
