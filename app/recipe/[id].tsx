import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {doc, deleteDoc, updateDoc} from 'firebase/firestore';
import {RecipeDetailScreen} from '@screens/RecipeDetailScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useAddSheet} from '@contexts/AddSheetContext';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipes} from '@hooks/useExploreRecipes';
import {useRewardedAd} from '@hooks/useRewardedAd';
import {db} from '@config/firebase';
import {parseSession, formatSession} from '@utils/session';
import {IconTrashFilled} from '@components/Icon/IconIndex';

export default function RecipeDetailRoute() {
  const {id, from, locked: lockedParam} = useLocalSearchParams<{id: string; from?: string; locked?: string}>();
  const router = useRouter();
  const colors = useColors();
  const {findRecipeById, recipes, setRecipes, availableCookbooks, cookbookColors} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {isAdmin} = useAuth();
  const {recipes: exploreRecipes} = useExploreRecipes();
  const {setHideTabBar, setHideContentMask} = useAddSheet();
  const {isLoaded: adLoaded, isLoading: adLoading, show: showAd} = useRewardedAd();
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const isLocked = lockedParam === '1' && !unlocked;

  const recipe = findRecipeById(id) ?? exploreRecipes.find(r => r.id === id);
  const isMyRecipe = recipes.some(r => r.id === id);
  const isExploreRecipe = !isMyRecipe && exploreRecipes.some(r => r.id === id);
  const alreadyImported = recipes.some(r => r.sourceId === id);

  // 쿠킹 모드일 때 탭바 숨기기
  useEffect(() => {
    setHideTabBar(isCookingMode);
    return () => setHideTabBar(false);
  }, [isCookingMode, setHideTabBar]);

  // locked일 때 레이아웃 기존 하단 블러 숨기기 (잠금 전용 블러로 대체)
  useEffect(() => {
    setHideContentMask(isLocked);
    return () => setHideContentMask(false);
  }, [isLocked, setHideContentMask]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (from) {
      router.navigate(`/${from}` as any);
    } else {
      router.replace('/');
    }
  }, [router, from]);

  const handleEdit = useCallback((section?: string) => {
    const params = new URLSearchParams();
    if (section) params.set('section', section);
    if (isExploreRecipe) params.set('target', 'explore');
    const qs = params.toString();
    const path = `/recipe/edit/${id}${qs ? `?${qs}` : ''}`;
    router.push(path as any);
  }, [router, id, isExploreRecipe]);

const handleDelete = useCallback(async () => {
    if (!recipe) return;
    if (isMyRecipe) {
      const groupId = recipe.remakeGroupId;
      setRecipes(prev => {
        const filtered = prev.filter(r => r.id !== id);
        if (!groupId) return filtered;
        const remaining = filtered.filter(r => r.remakeGroupId === groupId || r.id === groupId);
        const newTotal = remaining.length;
        if (newTotal <= 1) {
          return filtered.map(r => {
            if (r.remakeGroupId === groupId || r.id === groupId) {
              const {current} = parseSession(r.session);
              return {...r, remakeGroupId: undefined, session: formatSession(current, 1)};
            }
            return r;
          });
        }
        return filtered.map(r => {
          if (r.remakeGroupId === groupId || r.id === groupId) {
            const {current} = parseSession(r.session);
            return {...r, session: formatSession(current, newTotal)};
          }
          return r;
        });
      });
      const {current, total} = parseSession(recipe.session);
      const sessionLabel = total > 1 ? ` ${current}회차` : '';
      showSnackbar(`'${recipe.title}'${sessionLabel} 삭제됨`, {icon: IconTrashFilled});
    } else if (isExploreRecipe && isAdmin) {
      try {
        await deleteDoc(doc(db, 'explore_recipes', id!));
        showSnackbar(`'${recipe.title}' 삭제됨`, {icon: IconTrashFilled});
      } catch {
        showSnackbar('삭제에 실패했습니다');
      }
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [recipe, isMyRecipe, isExploreRecipe, isAdmin, id, setRecipes, showSnackbar, router]);

  const handleComingSoon = useCallback(() => {
    showSnackbar('기능 추가 예정입니다');
  }, [showSnackbar]);

  const handleImport = useCallback(() => {
    if (!recipe) return;
    const copied = {
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
  }, [recipe, setRecipes, showSnackbar, router]);

  const handleRemake = useCallback(() => {
    if (!recipe) return;

    const {total} = parseSession(recipe.session);
    const newTotal = total + 1;
    const groupId = recipe.remakeGroupId || recipe.id;

    const newId = `remake_${Date.now()}`;
    const newRecipe = {
      ...recipe,
      id: newId,
      session: formatSession(newTotal, newTotal),
      remakeGroupId: groupId,
      reviews: [] as {evaluation: string; improvement: string}[],
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };

    setRecipes(prev => [
      ...prev.map(r => {
        if (r.id === recipe.id && !r.remakeGroupId) {
          const {current} = parseSession(r.session);
          return {...r, remakeGroupId: groupId, session: formatSession(current, newTotal)};
        }
        if (r.remakeGroupId === groupId) {
          const {current} = parseSession(r.session);
          return {...r, session: formatSession(current, newTotal)};
        }
        return r;
      }),
      newRecipe,
    ]);

    showSnackbar('새 회차가 추가되었습니다');
    router.push(`/recipe/${newId}` as any);
  }, [recipe, setRecipes, showSnackbar, router]);

  const sessionItems = useMemo(() => {
    if (!recipe?.remakeGroupId) return [];
    const group = recipes
      .filter(r => r.remakeGroupId === recipe.remakeGroupId || r.id === recipe.remakeGroupId)
      .sort((a, b) => parseSession(a.session).current - parseSession(b.session).current);
    if (group.length < 2) return [];
    return group.map(r => ({id: r.id, label: `${parseSession(r.session).current}회차`}));
  }, [recipe, recipes]);

  const handleSessionSelect = useCallback((recipeId: string) => {
    router.replace(`/recipe/${recipeId}` as any);
  }, [router]);

  const handleCookbookChange = useCallback((newCookbook: string) => {
    if (!isMyRecipe) return;
    setRecipes(prev => prev.map(r =>
      r.id === id ? {...r, cookbook: newCookbook} : r
    ));
    showSnackbar(`요리책을 '${newCookbook || '그룹없음'}'으로 변경했습니다`);
  }, [id, isMyRecipe, setRecipes, showSnackbar]);

  const handleUnlock = useCallback(() => {
    if (!adLoaded) {
      showSnackbar('광고를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    showAd(() => {
      setUnlocked(true);
    });
  }, [adLoaded, showAd, showSnackbar]);

  if (!recipe) return null;

  const canEdit = isMyRecipe || (isExploreRecipe && isAdmin);
  const canDelete = isMyRecipe || (isExploreRecipe && isAdmin);

  return (
    <View style={[styles.container, {backgroundColor: colors['surface-surfacedim']}]}>
      <RecipeDetailScreen
        id={id}
        title={recipe.title}
        cookbook={recipe.cookbook}
        method={recipe.method}
        ratio={recipe.specificGravity}
        reviewCount={recipe.reviewCount}
        reviews={recipe.reviews}
        imageUri={recipe.imageUri}
        time={recipe.time}
        servings={recipe.servings}
        session={recipe.session}
        ingredientGroups={recipe.ingredientGroups}
        tools={recipe.tools}
        steps={recipe.steps}
        stepGroups={recipe.stepGroups}
        activeFieldIds={recipe.activeFieldIds}
        onBack={handleBack}
        onComingSoon={handleComingSoon}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        onRemake={isMyRecipe ? handleRemake : undefined}
        onImport={!isMyRecipe && !alreadyImported ? handleImport : undefined}
        onCookbookChange={isMyRecipe ? handleCookbookChange : undefined}
        availableCookbooks={availableCookbooks}
        cookbookColors={cookbookColors}
        sessionItems={sessionItems}
        onSessionSelect={handleSessionSelect}
        onUpdate={canEdit ? (data) => {
          if (isMyRecipe) {
            setRecipes(prev => prev.map(r => r.id === id ? {...r, ...data} : r));
          } else if (isExploreRecipe && isAdmin) {
            updateDoc(doc(db, 'explore_recipes', id!), data).catch(() => {
              showSnackbar('수정에 실패했습니다');
            });
          }
        } : undefined}
        onCookingModeChange={setIsCookingMode}
        locked={isLocked}
        onUnlock={handleUnlock}
        adLoading={adLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
