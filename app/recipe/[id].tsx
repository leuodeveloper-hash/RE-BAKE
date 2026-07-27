import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, View, StyleSheet} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, updateDoc, setDoc, deleteField} from 'firebase/firestore';
import {RecipeDetailScreen} from '@screens/RecipeDetailScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useAddSheet} from '@contexts/AddSheetContext';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useRewardedAd} from '@hooks/useRewardedAd';
import {db} from '@config/firebase';
import {OFFICIAL_AUTHOR_ID, OFFICIAL_AUTHOR_HANDLE, OFFICIAL_AUTHOR_DISPLAY_NAME, resolveAuthorHandle} from '../../src/types/author';
import {parseSession, formatSession, sortSessionGroup} from '@utils/session';
import {shareRecipe} from '@utils/shareRecipe';
import {uploadRecipeImage, isLocalUri} from '@utils/imageUpload';
import {getColorVarKey} from '@components/ColorPicker';
import {DEFAULT_COOKBOOK_COLOR} from '@contexts/RecipeContext';
import {IconTrashFilled, IconExprolerBookFilled} from '@components/Icon/IconIndex';
import {CookbookSelectSheet} from '@components/BottomSheet';
import {Dialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {SUBSCRIPTION_ENABLED} from '@contexts/SubscriptionContext';
import {usePlanSheet} from '@contexts/PlanSheetContext';
import {useAuthSheet} from '@contexts/AuthSheetContext';
import {useTranslation} from '@contexts/LanguageContext';

export default function RecipeDetailRoute() {
  const {id: routeId, from, locked: lockedParam} = useLocalSearchParams<{id: string; from?: string; locked?: string}>();
  // 회차 전환은 화면 이동 없이 제자리(setId)로 → RulerSlider 리마운트 없이 플립 유지
  const [id, setId] = useState(routeId);
  const router = useRouter();
  const colors = useColors();
  const {findRecipeById, recipes, setRecipes, availableCookbooks, cookbookColors} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {isAdmin, user, handle, displayName, avatarSeed} = useAuth();
  const {open: openAuthSheet} = useAuthSheet();
  const {recipes: exploreRecipes, exploreCookbooks} = useExploreRecipeContext();
  const {setHideTabBar, setHideContentMask} = useAddSheet();
  const {isLoaded: adLoaded, isLoading: adLoading, show: showAd} = useRewardedAd();
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showExploreCookbookSheet, setShowExploreCookbookSheet] = useState(false);
  // 둘러보기 복사 확인 다이얼로그 대상 쿠북 (선택 후 확인받고 실제 복사)
  const [copyToExploreCookbook, setCopyToExploreCookbook] = useState<string | null>(null);
  const {open: openPlanSheet} = usePlanSheet();
  const {t} = useTranslation();
  const isLocked = lockedParam === '1' && !unlocked;

  // 라우트가 바뀌면(다른 레시피로 진입) active id 동기화
  useEffect(() => { if (routeId) setId(routeId); }, [routeId]);

  const recipe = findRecipeById(id) ?? exploreRecipes.find(r => r.id === id);

  // 마지막으로 본 레시피 저장 → 앱 재시작 시 이 화면으로 복귀 (_layout에서 사용).
  // 실제 존재하는 레시피일 때만 저장(유효하지 않으면 저장 안 해 복귀 시 홈 유지).
  useEffect(() => {
    if (id && recipe) AsyncStorage.setItem('last_viewed_recipe_id', id);
  }, [id, recipe]);

  // 삭제/무효한 레시피로 진입(예: 복귀 대상이 사라짐)하면 잠깐 로드를 기다렸다가
  // 그래도 없으면 홈으로. (recipe undefined 상태로 렌더하면 크래시 방지)
  useEffect(() => {
    if (recipe || !id) return;
    const timer = setTimeout(() => {
      if (!findRecipeById(id) && !exploreRecipes.find(r => r.id === id)) {
        AsyncStorage.removeItem('last_viewed_recipe_id');
        router.replace('/');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [recipe, id, findRecipeById, exploreRecipes, router]);

  const isMyRecipe = recipes.some(r => r.id === id);
  const isExploreRecipe = !isMyRecipe && exploreRecipes.some(r => r.id === id);
  const alreadyImported = recipes.some(r => r.sourceId === id);
  // 복사본(원본 그대로) — 내 목록에 있지만 작성자가 나(내 uid)가 아님. 편집 불가, 회차로만 내 것으로 만들 수 있다.
  const isCopiedFromOthers = isMyRecipe && !!recipe?.authorId && recipe.authorId !== user?.uid;

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
      const sessionLabel = total > 1 ? ` ${t('id.sessionLabel', {current})}` : '';
      showSnackbar(t('id.recipeDeleted', {title: recipe.title, sessionLabel}), {icon: IconTrashFilled});
    } else if (isExploreRecipe && isAdmin) {
      try {
        await updateDoc(doc(db, 'explore_recipes', id!), {
          deletedAt: new Date().toISOString(),
        });
        showSnackbar(t('id.exploreRecipeDeleted', {title: recipe.title}), {
          action: {
            label: t('id.undo'),
            onPress: async () => {
              try {
                await updateDoc(doc(db, 'explore_recipes', id!), {
                  deletedAt: deleteField(),
                });
              } catch {
                showSnackbar(t('id.restoreFailed'));
              }
            },
          },
        });
      } catch {
        showSnackbar(t('id.deleteFailed'));
      }
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [recipe, isMyRecipe, isExploreRecipe, isAdmin, id, setRecipes, showSnackbar, router, t]);

  const handleComingSoon = useCallback(() => {
    showSnackbar(t('id.comingSoon'));
  }, [showSnackbar, t]);

  const handleImport = useCallback(() => {
    if (!recipe) return;
    const copied = {
      ...recipe,
      id: `user_${Date.now()}`,
      sourceId: recipe.id,
      // 둘러보기 원본 출처 박제 — 복사/회차로 내 것이 돼도 "원본: @작성자" 표시 유지
      sourceHandle: recipe.authorHandle,
      sourceAuthorId: recipe.authorId,
      // 가져오면 내 콘텐츠가 된다 — 작성자를 나로 박제(원본 작성자 → 나). remake와 동일.
      // 이렇게 해야 isCopiedFromOthers=false → 편집·요리모드 사진 추가가 가능해진다.
      // (출처 source*는 위에서 박제하므로 "원본: @작성자" 표시는 그대로 유지)
      authorId: user?.uid,
      authorHandle: handle ?? undefined,
      authorDisplayName: displayName ?? undefined,
      authorAvatarSeed: avatarSeed != null ? String(avatarSeed) : undefined,
      createdAt: new Date().toISOString(),
    };
    setRecipes(prev => [...prev, copied]);
    showSnackbar(t('id.savedToMyRecipes'), {
      label: t('id.goTo'),
      onPress: () => router.navigate('/'),
    });
  }, [recipe, setRecipes, showSnackbar, router, t, user, handle, displayName, avatarSeed]);

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
      // 회차를 만들면 내 콘텐츠가 된다 — 작성자를 나로 박제(복사본 원본 작성자 → 나로 교체).
      // 단 원본 출처(sourceId/sourceHandle/sourceAuthorId)는 spread로 유지 → "원본: @작성자" 계속 표시.
      authorId: user?.uid,
      authorHandle: handle ?? undefined,
      authorDisplayName: displayName ?? undefined,
      authorAvatarSeed: avatarSeed != null ? String(avatarSeed) : undefined,
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

    showSnackbar(t('id.sessionAdded'));
    router.push(`/recipe/${newId}` as any);
  }, [recipe, setRecipes, showSnackbar, router, t, user, handle, displayName, avatarSeed]);

  const sessionItems = useMemo(() => {
    if (!recipe?.remakeGroupId) return [];
    const group = sortSessionGroup(
      recipes.filter(r => r.remakeGroupId === recipe.remakeGroupId || r.id === recipe.remakeGroupId),
    );
    if (group.length < 2) return [];
    // #번호 = session 문자열이 아니라 정렬된 배열 위치(1-based)
    return group.map((r, i) => ({id: r.id, label: t('id.sessionLabel', {current: i + 1})}));
  }, [recipe, recipes, t]);

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
        label: t('id.sessionLabel', {current: parseSession(r.session).current}),
        reviews: r.reviews!,
      }));
    return items.length > 0 ? items : undefined;
  }, [recipe, recipes, t]);

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
    showSnackbar(t('id.cookbookChanged', {cookbook: newCookbook || t('id.noCookbook')}));
  }, [id, isMyRecipe, setRecipes, showSnackbar, t]);

  const handleShare = useCallback(() => {
    if (!recipe) return;
    shareRecipe({
      id,
      title: recipe.title,
      onCopied: () => showSnackbar(t('id.linkCopied')),
      onError: msg => showSnackbar(msg),
    });
  }, [recipe, id, showSnackbar, t]);

  const handleUnlock = useCallback(() => {
    if (Platform.OS === 'web') {
      showSnackbar(t('id.adMobileOnly'));
      return;
    }
    if (!adLoaded) {
      showSnackbar(t('id.adLoading'));
      return;
    }
    showAd(() => {
      setUnlocked(true);
    });
  }, [adLoaded, showAd, showSnackbar, t]);

  // 쿠북 선택 → 시트 닫고 확인 다이얼로그로 (바로 복사하지 않음)
  const handleExploreCookbookSelect = useCallback((cookbookName: string) => {
    setShowExploreCookbookSheet(false);
    setCopyToExploreCookbook(cookbookName);
  }, []);

  const runCopyToExplore = useCallback(async (cookbookName: string) => {
    if (!recipe) return;
    const exploreId = `explore_${Date.now()}`;
    const {
      id: _id, sourceId: _src, remakeGroupId: _grp,
      session: _sess, reviews: _rev, reviewCount: _rc,
      deletedAt: _del,
      ...recipeData
    } = recipe;
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
      // 로컬 이미지(file://)는 다른 유저에게 안 보이므로 Storage에 업로드해 URL로 저장.
      // 대표 이미지 + 각 과정 사진 모두 변환. 업로드는 exploreId 경로 하위로.
      const uploadIfLocal = async (uri: string, key: string): Promise<string> =>
        isLocalUri(uri) ? uploadRecipeImage(uri, `${exploreId}_${key}`) : uri;

      const uploadedImageUri = recipeData.imageUri
        ? await uploadIfLocal(recipeData.imageUri, 'main')
        : recipeData.imageUri;

      const uploadedSteps = recipeData.steps
        ? await Promise.all(recipeData.steps.map(async (step: any, si: number) => {
            if (!step.photos?.length) return step;
            const photos = await Promise.all(
              step.photos.map((p: string, pi: number) => uploadIfLocal(p, `s${si}_${pi}`)),
            );
            return {...step, photos};
          }))
        : recipeData.steps;

      const exploreRecipe = {
        ...recipeData,
        imageUri: uploadedImageUri,
        steps: uploadedSteps,
        cookbook: cookbookName === '__none__' ? '' : cookbookName,
        reviewCount: 0,
        createdAt: new Date().toISOString(),
        // 작성자 귀속: 어드민이 올리면 공식 "baeki"(어드민 여럿 공동소유, 계정 소멸 무관),
        // 일반 유저가 올리면 본인 이름(authorId=uid). 표시용 handle/avatar는 칩 즉시표시 위해 박제.
        ...(isAdmin
          ? {authorId: OFFICIAL_AUTHOR_ID, authorHandle: OFFICIAL_AUTHOR_HANDLE, authorDisplayName: OFFICIAL_AUTHOR_DISPLAY_NAME, authorAvatarSeed: OFFICIAL_AUTHOR_ID}
          : {authorId: user?.uid, authorHandle: handle ?? undefined, authorDisplayName: displayName ?? undefined, authorAvatarSeed: avatarSeed != null ? String(avatarSeed) : undefined}),
      };
      await setDoc(doc(db, 'explore_recipes', exploreId), strip(exploreRecipe));
      showSnackbar(t('id.copiedToExplore'));
    } catch {
      showSnackbar(t('id.copyFailed'));
    }
  }, [recipe, showSnackbar, t, isAdmin, user, handle, avatarSeed]);

  // 유저: 둘러보기 공개 신청 → submissions에 pending 생성 (어드민 승인 대기)
  const runSubmitToExplore = useCallback(async () => {
    if (!recipe || !user) return;
    const submissionId = `sub_${Date.now()}`;
    const {
      id: _id, sourceId: _src, remakeGroupId: _grp,
      session: _sess, reviews: _rev, reviewCount: _rc,
      deletedAt: _del,
      ...recipeData
    } = recipe;
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
      const uploadIfLocal = async (uri: string, key: string): Promise<string> =>
        isLocalUri(uri) ? uploadRecipeImage(uri, `${submissionId}_${key}`) : uri;
      const uploadedImageUri = recipeData.imageUri ? await uploadIfLocal(recipeData.imageUri, 'main') : recipeData.imageUri;
      const uploadedSteps = recipeData.steps
        ? await Promise.all(recipeData.steps.map(async (step: any, si: number) => {
            if (!step.photos?.length) return step;
            const photos = await Promise.all(step.photos.map((p: string, pi: number) => uploadIfLocal(p, `s${si}_${pi}`)));
            return {...step, photos};
          }))
        : recipeData.steps;

      const submission = {
        ...recipeData,
        imageUri: uploadedImageUri,
        steps: uploadedSteps,
        reviewCount: 0,
        // 작성자 = 유저 본인 (승인돼도 유지)
        authorId: user.uid,
        authorHandle: handle ?? undefined,
        authorDisplayName: displayName ?? undefined,
        authorAvatarSeed: avatarSeed != null ? String(avatarSeed) : undefined,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        sourceRecipeId: recipe.id,
      };
      await setDoc(doc(db, 'submissions', submissionId), strip(submission));
      showSnackbar(t('id.submittedToExplore'));
    } catch {
      showSnackbar(t('id.submitFailed'));
    }
  }, [recipe, user, handle, displayName, avatarSeed, showSnackbar, t]);

  if (!recipe) return null;

  // 복사본(원본 그대로)은 편집 불가 — 회차를 만들어야 내 것이 되어 편집 가능. 삭제는 내 목록이므로 가능.
  const canEdit = (isMyRecipe && !isCopiedFromOthers) || (isExploreRecipe && isAdmin);
  const canDelete = isMyRecipe || (isExploreRecipe && isAdmin);

  // 레시피 로딩 중/무효 — 빈 배경만(위 effect가 무효면 홈으로 보냄). recipe.xxx 크래시 방지.
  if (!recipe) {
    return <View style={[styles.container, {backgroundColor: colors['surface/normal']}]} />;
  }

  return (
    <View style={[styles.container, {backgroundColor: colors['surface/normal']}]}>
      <RecipeDetailScreen
        id={id}
        title={recipe.title}
        hidden={recipe.hidden}
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
                // 스텝 사진: string(uri) 또는 {uri, caption} 둘 다 지원. uri만 업로드하고 caption 유지.
                const photoUri = (p: any): string => (typeof p === 'string' ? p : p?.uri);
                const hasLocalPhoto = (photos: any[]) => photos?.some((p: any) => isLocalUri(photoUri(p)));
                const uploadPhotos = async (photos: any[]) =>
                  Promise.all(photos.map(async (p, i) => {
                    const uri = photoUri(p);
                    const nextUri = isLocalUri(uri) ? await uploadRecipeImage(uri, `explore_${id}_p${Date.now()}_${i}`) : uri;
                    return typeof p === 'string' ? nextUri : {...p, uri: nextUri};
                  }));
                if (uploaded.stepGroups) {
                  uploaded.stepGroups = await Promise.all(
                    uploaded.stepGroups.map(async (g: any) => ({
                      ...g,
                      steps: await Promise.all(g.steps.map(async (s: any) =>
                        hasLocalPhoto(s.photos)
                          ? {...s, photos: await uploadPhotos(s.photos)}
                          : s,
                      )),
                    })),
                  );
                }
                if (uploaded.steps) {
                  uploaded.steps = await Promise.all(
                    uploaded.steps.map(async (s: any) =>
                      hasLocalPhoto(s.photos)
                        ? {...s, photos: await uploadPhotos(s.photos)}
                        : s,
                    ),
                  );
                }
                // Firestore는 undefined 값을 거부한다(throw) → 저장 전 undefined 필드 제거.
                // (예: 캡션 없는 사진 {uri, caption: undefined} 등)
                const stripUndefined = (v: any): any => {
                  if (Array.isArray(v)) return v.map(stripUndefined);
                  if (v && typeof v === 'object') {
                    const o: any = {};
                    for (const k of Object.keys(v)) {
                      if (v[k] !== undefined) o[k] = stripUndefined(v[k]);
                    }
                    return o;
                  }
                  return v;
                };
                await updateDoc(doc(db, 'explore_recipes', id!), stripUndefined(uploaded));
              } catch (e: any) {
                // 원인 구분: code(권한/문서없음 등) + message
                console.warn('[explore update] 실패 code=', e?.code, 'msg=', e?.message, e);
                showSnackbar(t('id.updateFailed') + (e?.code ? ` (${e.code})` : ''));
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
        onSubmitToExplore={isMyRecipe && !isAdmin && user ? runSubmitToExplore : undefined}
        showDeleteConfirm={isMyRecipe || (isExploreRecipe && isAdmin)}
        onShare={isExploreRecipe ? handleShare : undefined}
        sourceUrl={recipe.sourceUrl}
        sourceHandle={recipe.sourceHandle}
        onSourcePress={recipe.sourceAuthorId ? () => router.push(`/u/${resolveAuthorHandle(recipe.sourceAuthorId, recipe.sourceHandle) ?? recipe.sourceAuthorId}` as any) : undefined}
        {...(() => {
          // 작성자 = 레시피에 박제된 값 우선(복사본은 원본 작성자 유지). 박제값이 없는 순수 내 레시피만 내 계정으로 폴백.
          const hasStamped = !!recipe.authorId;
          // 표시는 전부 @handle로 통일. 공식은 최신 handle(bakey)로 치환, 핸들 없는 게스트는 @guest.
          const stampedHandle = resolveAuthorHandle(recipe.authorId, recipe.authorHandle);
          const badgeName = hasStamped
            ? `@${stampedHandle ?? 'guest'}`
            : `@${handle ?? 'guest'}`;
          const badgeSeed = hasStamped
            ? (recipe.authorAvatarSeed ?? recipe.authorId)
            : (avatarSeed != null ? String(avatarSeed) : undefined);
          const targetAuthorId = hasStamped ? recipe.authorId : user?.uid;
          // URL은 handle 기반(핸들=주소 일치). 박제 handle → 공식 치환 → 폴백 순.
          const targetHandle = hasStamped
            ? (resolveAuthorHandle(recipe.authorId, recipe.authorHandle) ?? recipe.authorId)
            : (handle ?? user?.uid);
          return {
            authorHandle: badgeName,
            authorAvatarSeed: badgeSeed,
            authorId: hasStamped ? recipe.authorId : user?.uid,
            onAuthorPress: targetAuthorId ? () => router.push(`/u/${targetHandle}` as any) : undefined,
          };
        })()}
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
          ungroupedLabel={t('id.noOfficialCookbook')}
        />
      )}
      <Dialog
        visible={copyToExploreCookbook !== null}
        onClose={() => setCopyToExploreCookbook(null)}
        icon={IconExprolerBookFilled}
        title={t('id.copyToExploreTitle')}
        description={t('id.copyToExploreDesc', {
          title: recipe?.title ?? '',
          cookbook: copyToExploreCookbook === '__none__' || !copyToExploreCookbook
            ? t('id.noOfficialCookbook')
            : copyToExploreCookbook,
        })}
        actions={
          <>
            <Button label={t('id.cancel')} variant="soft" onPress={() => setCopyToExploreCookbook(null)} />
            <Button
              label={t('id.copy')}
              variant="soft"
              onPress={() => {
                const cb = copyToExploreCookbook;
                setCopyToExploreCookbook(null);
                if (cb !== null) runCopyToExplore(cb);
              }}
            />
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
