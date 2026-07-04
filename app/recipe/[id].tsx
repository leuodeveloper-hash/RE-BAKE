import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, View, StyleSheet} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {doc, updateDoc, setDoc, deleteField} from 'firebase/firestore';
import {RecipeDetailScreen} from '@screens/RecipeDetailScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useAddSheet} from '@contexts/AddSheetContext';
import {useColorsV2} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useRewardedAd} from '@hooks/useRewardedAd';
import {db} from '@config/firebase';
import {parseSession, formatSession} from '@utils/session';
import {shareRecipe} from '@utils/shareRecipe';
import {uploadRecipeImage, isLocalUri} from '@utils/imageUpload';
import {getColorVarKey} from '@components/ColorPicker';
import {DEFAULT_COOKBOOK_COLOR} from '@contexts/RecipeContext';
import {IconTrashFilled, IconExprolerBookFilled} from '@components/Icon/IconIndex';
import {CookbookSelectSheet} from '@components/BottomSheet';
import {SUBSCRIPTION_ENABLED} from '@contexts/SubscriptionContext';
import {usePlanSheet} from '@contexts/PlanSheetContext';
import {useAuthSheet} from '@contexts/AuthSheetContext';

export default function RecipeDetailRoute() {
  const {id: routeId, from, locked: lockedParam} = useLocalSearchParams<{id: string; from?: string; locked?: string}>();
  // 회차 전환은 화면 이동 없이 제자리(setId)로 → RulerSlider 리마운트 없이 플립 유지
  const [id, setId] = useState(routeId);
  const router = useRouter();
  const colors = useColorsV2();
  const {findRecipeById, recipes, setRecipes, availableCookbooks, cookbookColors} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {isAdmin, user} = useAuth();
  const {open: openAuthSheet} = useAuthSheet();
  const {recipes: exploreRecipes, exploreCookbooks} = useExploreRecipeContext();
  const {setHideTabBar, setHideContentMask} = useAddSheet();
  const {isLoaded: adLoaded, isLoading: adLoading, show: showAd} = useRewardedAd();
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showExploreCookbookSheet, setShowExploreCookbookSheet] = useState(false);
  const {open: openPlanSheet} = usePlanSheet();
  const isLocked = lockedParam === '1' && !unlocked;

  // 라우트가 바뀌면(다른 레시피로 진입) active id 동기화
  useEffect(() => { if (routeId) setId(routeId); }, [routeId]);

  const recipe = findRecipeById(id) ?? exploreRecipes.find(r => r.id === id);
  const isMyRecipe = recipes.some(r => r.id === id);
  const isExploreRecipe = !isMyRecipe && exploreRecipes.some(r => r.id === id);
  const alreadyImported = recipes.some(r => r.sourceId === id);

  const exploreCookbookColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of exploreCookbooks) {
      map.set(c.name, c.color as string);
    }
    return map;
  }, [exploreCookbooks]);

  const recipeItems = useMemo(() => {
    const toSearchable = (r: typeof recipes[0]) =>
      [r.cookbook, r.method, r.specificGravity].filter(Boolean) as string[];
    if (isMyRecipe) return recipes.map(r => ({
      id: r.id,
      label: r.title,
      imageUrl: r.imageUri,
      iconColor: r.cookbook
        ? colors[getColorVarKey(cookbookColors[r.cookbook] ?? DEFAULT_COOKBOOK_COLOR)]
        : undefined,
      searchableTexts: toSearchable(r),
    }));
    if (isExploreRecipe) return exploreRecipes.map(r => ({
      id: r.id,
      label: r.title,
      imageUrl: r.imageUri,
      iconColor: r.cookbook
        ? colors[getColorVarKey((exploreCookbookColorMap.get(r.cookbook) ?? 'orange') as any)]
        : undefined,
      searchableTexts: toSearchable(r),
    }));
    return undefined;
  }, [isMyRecipe, isExploreRecipe, recipes, exploreRecipes, cookbookColors, exploreCookbookColorMap, colors]);

  const handleRecipeSwitch = useCallback((recipeId: string) => {
    router.replace(`/recipe/${recipeId}` as any);
  }, [router]);

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
        await updateDoc(doc(db, 'explore_recipes', id!), {
          deletedAt: new Date().toISOString(),
        });
        showSnackbar(`'${recipe.title}' 삭제됨`, {
          action: {
            label: '되돌리기',
            onPress: async () => {
              try {
                await updateDoc(doc(db, 'explore_recipes', id!), {
                  deletedAt: deleteField(),
                });
              } catch {
                showSnackbar('복원에 실패했습니다');
              }
            },
          },
        });
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

  const sessionReviews = useMemo(() => {
    if (!recipe?.remakeGroupId) return undefined;
    const group = recipes
      .filter(r => r.remakeGroupId === recipe.remakeGroupId || r.id === recipe.remakeGroupId)
      .sort((a, b) => parseSession(a.session).current - parseSession(b.session).current);
    if (group.length < 2) return undefined;
    const items = group
      .filter(r => r.reviews?.some(rv => rv.evaluation || rv.improvement))
      .map(r => ({
        id: r.id,
        label: `${parseSession(r.session).current}회차`,
        reviews: r.reviews!,
      }));
    return items.length > 0 ? items : undefined;
  }, [recipe, recipes]);

  // 2회차+ 이면 1회차 원본 데이터를 비교 기준으로 전달 (1회차 자신을 볼 땐 null)
  const compareBaseline = useMemo(() => {
    if (!recipe?.remakeGroupId) return null;
    const group = recipes
      .filter(r => r.remakeGroupId === recipe.remakeGroupId || r.id === recipe.remakeGroupId)
      .sort((a, b) => parseSession(a.session).current - parseSession(b.session).current);
    if (group.length < 2) return null;
    const first = group[0];
    if (first.id === recipe.id) return null;
    return {
      ingredientGroups: first.ingredientGroups,
      steps: first.steps,
      stepGroups: first.stepGroups,
      method: first.method,
      specificGravity: first.specificGravity,
    };
  }, [recipe, recipes]);

  // 회차 전환은 화면 이동 없이 제자리에서 (리마운트 X → 눈금 플립 유지, 히스토리 안 꼬임)
  const handleSessionSelect = useCallback((recipeId: string) => {
    setId(recipeId);
  }, []);

  const handleCookbookChange = useCallback((newCookbook: string) => {
    if (!isMyRecipe) return;
    setRecipes(prev => prev.map(r =>
      r.id === id ? {...r, cookbook: newCookbook} : r
    ));
    showSnackbar(`레시피 북을 '${newCookbook || '레시피 북 없음'}'으로 변경했습니다`);
  }, [id, isMyRecipe, setRecipes, showSnackbar]);

  const handleShare = useCallback(() => {
    if (!recipe) return;
    shareRecipe({
      id,
      title: recipe.title,
      onCopied: () => showSnackbar('링크를 복사했습니다'),
      onError: msg => showSnackbar(msg),
    });
  }, [recipe, id, showSnackbar]);

  const handleUnlock = useCallback(() => {
    if (Platform.OS === 'web') {
      showSnackbar('광고 보기는 모바일 앱에서만 지원돼요');
      return;
    }
    if (!adLoaded) {
      showSnackbar('광고를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    showAd(() => {
      setUnlocked(true);
    });
  }, [adLoaded, showAd, showSnackbar]);

  const handleExploreCookbookSelect = useCallback(async (cookbookName: string) => {
    if (!recipe) return;
    setShowExploreCookbookSheet(false);
    const exploreId = `explore_${Date.now()}`;
    const {
      id: _id, sourceId: _src, remakeGroupId: _grp,
      session: _sess, reviews: _rev, reviewCount: _rc,
      deletedAt: _del,
      ...recipeData
    } = recipe;
    const exploreRecipe = {
      ...recipeData,
      cookbook: cookbookName === '__none__' ? '' : cookbookName,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };
    // Firestore는 undefined 미지원 → 재귀 제거
    const strip = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(strip);
      if (obj && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [k, strip(v)]),
        );
      }
      return obj;
    };
    try {
      await setDoc(doc(db, 'explore_recipes', exploreId), strip(exploreRecipe));
      showSnackbar('둘러보기에 복사되었습니다');
    } catch {
      showSnackbar('복사에 실패했습니다');
    }
  }, [recipe, showSnackbar]);

  if (!recipe) return null;

  const canEdit = isMyRecipe || (isExploreRecipe && isAdmin);
  const canDelete = isMyRecipe || (isExploreRecipe && isAdmin);

  return (
    <View style={[styles.container, {backgroundColor: colors['surface/normal']}]}>
      <RecipeDetailScreen
        id={id}
        title={recipe.title}
        cookbook={recipe.cookbook}
        method={recipe.method}
        ratio={recipe.specificGravity}
        reviewCount={recipe.reviewCount}
        reviews={recipe.reviews}
        advice={recipe.advice}
        imageUri={recipe.imageUri}
        time={recipe.time}
        servings={recipe.servings}
        session={recipe.session}
        ingredientGroups={recipe.ingredientGroups}
        tools={recipe.tools}
        toolGroups={recipe.toolGroups}
        steps={recipe.steps}
        stepGroups={recipe.stepGroups}
        activeFieldIds={recipe.activeFieldIds}
        referenceUrl={recipe.referenceUrl}
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
        sessionReviews={sessionReviews}
        compareBaseline={compareBaseline}
        onSessionSelect={handleSessionSelect}
        onUpdate={canEdit ? (data) => {
          if (isMyRecipe) {
            setRecipes(prev => prev.map(r => r.id === id ? {...r, ...data} : r));
          } else if (isExploreRecipe && isAdmin) {
            // 로컬 이미지 → Storage 업로드 후 Firestore 저장
            (async () => {
              try {
                const uploaded = {...data};
                const uploadPhotos = async (photos: string[]) =>
                  Promise.all(photos.map(async (uri, i) => {
                    if (!isLocalUri(uri)) return uri;
                    return uploadRecipeImage(uri, `explore_${id}_p${Date.now()}_${i}`);
                  }));
                if (uploaded.stepGroups) {
                  uploaded.stepGroups = await Promise.all(
                    uploaded.stepGroups.map(async (g: any) => ({
                      ...g,
                      steps: await Promise.all(g.steps.map(async (s: any) =>
                        s.photos?.some(isLocalUri)
                          ? {...s, photos: await uploadPhotos(s.photos)}
                          : s,
                      )),
                    })),
                  );
                }
                if (uploaded.steps) {
                  uploaded.steps = await Promise.all(
                    uploaded.steps.map(async (s: any) =>
                      s.photos?.some(isLocalUri)
                        ? {...s, photos: await uploadPhotos(s.photos)}
                        : s,
                    ),
                  );
                }
                await updateDoc(doc(db, 'explore_recipes', id!), uploaded);
              } catch {
                showSnackbar('수정에 실패했습니다');
              }
            })();
          }
        } : undefined}
        onCookingModeChange={setIsCookingMode}
        locked={isLocked}
        onUnlock={handleUnlock}
        adLoading={adLoading}
        onSubscribe={() => {
          // 게스트면 AuthSheet 먼저 → 로그인 성공 시 PlanSheet 오픈
          // 로그인 상태면 PlanSheet 바로 오픈 (UnlockDialog 애니메이션 대기 200ms)
          setTimeout(() => {
            if (!user) {
              openAuthSheet({onSuccess: () => setTimeout(openPlanSheet, 300)});
            } else {
              openPlanSheet();
            }
          }, 200);
        }}
        recipeItems={recipeItems}
        currentRecipeId={id}
        onRecipeSelect={handleRecipeSwitch}
        onCopyToExplore={isMyRecipe && isAdmin ? () => setShowExploreCookbookSheet(true) : undefined}
        showDeleteConfirm={isMyRecipe || (isExploreRecipe && isAdmin)}
        onShare={isExploreRecipe ? handleShare : undefined}
      />
      {isAdmin && (
        <CookbookSelectSheet
          visible={showExploreCookbookSheet}
          onClose={() => setShowExploreCookbookSheet(false)}
          cookbooks={[...new Set([
            ...exploreCookbooks.map(c => c.name),
            ...exploreRecipes.map(r => r.cookbook).filter(Boolean),
          ])]}
          cookbookColors={Object.fromEntries(
            exploreCookbooks.map(c => [c.name, c.color as any]),
          )}
          onSelect={handleExploreCookbookSelect}
          bookIcon={IconExprolerBookFilled}
          ungroupedLabel="공식 레시피 북 없음"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
