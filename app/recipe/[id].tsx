import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, Platform, View, StyleSheet} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {computeLockedIds, useSetExploreLock} from '@hooks/useExploreLock';
import {duplicateRecipe} from '@utils/recipeMenuItems';
import {setAlbumScope} from '@components/AlbumPicker/albumPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, getDoc, updateDoc, setDoc, deleteField} from 'firebase/firestore';
import {RecipeDetailScreen} from '@screens/RecipeDetailScreen';
import {sendRecipeFeedback, type FeedbackKind} from '@utils/recipeFeedback';
import {useMadeCount} from '@hooks/useMadeCount';
import {useRecipeReviews} from '@hooks/useRecipeReviews';
import {useMadeStamps} from '@hooks/useMadeStamps';
import {useExplorePins} from '@hooks/useExplorePins';
import {ShareRecipeSheet} from '@components/BottomSheet/ShareRecipeSheet';
import {recordNewSession, sessionKey, currentSessionNumber} from '@utils/session';
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
import {getSharedRecipe} from '@utils/sharedRecipeCache';
import {uploadRecipeImage, isLocalUri} from '@utils/imageUpload';
import {getCookbookColorKey} from '@components/ColorPicker';
import {DEFAULT_COOKBOOK_COLOR} from '@contexts/RecipeContext';
import {IconTrashFilled, IconExprolerBookFilled, IconExprolerBookTwotone} from '@components/Icon/IconIndex';
import {CookbookSelectSheet} from '@components/BottomSheet';
import {Dialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {SUBSCRIPTION_ENABLED, useSubscription} from '@contexts/SubscriptionContext';
import {usePlanSheet} from '@contexts/PlanSheetContext';
import {savePhoto} from '@utils/savePhoto';
import {usePdfExportQuota} from '@hooks/usePdfExportQuota';
import {useEntitlement} from '@hooks/useEntitlement';
import {useAuthSheet} from '@contexts/AuthSheetContext';
import {useTranslation} from '@contexts/LanguageContext';

export default function RecipeDetailRoute() {
  const {id: routeId, from, locked: lockedParam, cooking: cookingParam, menu: menuParam} = useLocalSearchParams<{id: string; from?: string; locked?: string; cooking?: string; menu?: string}>();
  // 회차 전환은 화면 이동 없이 제자리(setId)로 → RulerSlider 리마운트 없이 플립 유지
  const [id, setId] = useState(routeId);
  const router = useRouter();
  const colors = useColors();
  const {findRecipeById, recipes, setRecipes, availableCookbooks, cookbookColors, reload: reloadRecipes} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {isAdmin, user, handle, displayName, avatarSeed} = useAuth();
  const {open: openAuthSheet} = useAuthSheet();
  const {recipes: exploreRecipes, exploreCookbooks, reload: exploreReload} = useExploreRecipeContext();
  const {setHideTabBar, setHideContentMask} = useAddSheet();
  const {isLoaded: adLoaded, isLoading: adLoading, show: showAd} = useRewardedAd();
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showExploreCookbookSheet, setShowExploreCookbookSheet] = useState(false);
  // 둘러보기 복사 확인 다이얼로그 대상 쿠북 (선택 후 확인받고 실제 복사)
  const [copyToExploreCookbook, setCopyToExploreCookbook] = useState<string | null>(null);
  const {open: openPlanSheet} = usePlanSheet();
  // PDF 내보내기 등급별 횟수 제한
  const {used: pdfUsed, increment: incrementPdf} = usePdfExportQuota();
  const {limits, tier} = useEntitlement();
  const pdfLimit = limits.quota.pdfExports;
  const {t} = useTranslation();
  // 잠금은 목록에서 넘긴 표시(locked=1)지만, 구독 중이면 풀린다.
  // 로그인 직후엔 구독 확인이 끝나기 전 잠깐 isPro가 false라 잠금 화면이 번쩍였다 →
  // 로그인한 상태에서 확인 중일 때는 잠그지 않고 기다린다(게스트는 바로 잠근다).
  const {isPro, isLoading: subLoading} = useSubscription();
  const isLocked = lockedParam === '1' && !unlocked && !isPro && !(user && subLoading);

  // 라우트가 바뀌면(다른 레시피로 진입) active id 동기화
  useEffect(() => { if (routeId) setId(routeId); }, [routeId]);

  const recipe = findRecipeById(id) ?? exploreRecipes.find(r => r.id === id) ?? getSharedRecipe(id);
  // 보고 있는 지난 회차(null = 지금 회차). 지난 회차는 보기만 — 편집은 지금 회차만
  const [viewSessionId, setViewSessionId] = useState<string | null>(null);
  useEffect(() => { setViewSessionId(null); }, [id]);
  const viewedSession = viewSessionId ? recipe?.sessions?.find(x => x.id === viewSessionId) : undefined;
  // 화면에 보일 회차 내용 — 지난 회차면 그 기록, 아니면 레시피 그대로
  const shown = viewedSession ? {...recipe, ...viewedSession} : recipe;
  // 스탬프도 회차마다 — 보고 있는 회차 기준
  const madeKey = viewedSession ? viewedSession.id : recipe ? sessionKey(recipe) : id;

  // 마지막으로 본 레시피 저장 → 앱 재시작 시 이 화면으로 복귀 (_layout에서 사용).
  // + 위젯 "본 것 제외" 순환용 seen 기록. 실제 존재하는 레시피일 때만.
  useEffect(() => {
    if (!id || !recipe) return;
    AsyncStorage.setItem('last_viewed_recipe_id', id);
    // 최근 본 레시피 이력(검색바 첫 화면용) — 최신을 앞에, 중복 제거, 최대 20개.
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('recently_viewed_ids');
        const prev: string[] = raw ? JSON.parse(raw) : [];
        const next = [id, ...prev.filter(x => x !== id)].slice(0, 20);
        await AsyncStorage.setItem('recently_viewed_ids', JSON.stringify(next));
      } catch { /* 무시 */ }
    })();
    // 위젯에 뜬 레시피를 봤으면 seen에 추가 → 위젯은 안 본 것부터 순환.
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('widget_seen_ids');
        const seen: string[] = raw ? JSON.parse(raw) : [];
        if (!seen.includes(id)) {
          await AsyncStorage.setItem('widget_seen_ids', JSON.stringify([...seen, id]));
        }
      } catch { /* 무시 */ }
    })();
  }, [id, recipe]);

  // 삭제/무효한 레시피로 진입(예: 복귀 대상이 사라짐)하면 잠깐 로드를 기다렸다가
  // 그래도 없으면 홈으로. (recipe undefined 상태로 렌더하면 크래시 방지)
  useEffect(() => {
    if (recipe || !id) return;
    const timer = setTimeout(() => {
      if (!findRecipeById(id) && !exploreRecipes.find(r => r.id === id) && !getSharedRecipe(id)) {
        AsyncStorage.removeItem('last_viewed_recipe_id');
        router.replace('/recipes' as any);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [recipe, id, findRecipeById, exploreRecipes, router]);

  const madeCount = useMadeCount();
  const {reviewsOf, sessionReviewsOf} = useRecipeReviews();
  const {setMade, madeAtOf} = useMadeStamps();
  const isMyRecipe = recipes.some(r => r.id === id);
  const isExploreRecipe = !isMyRecipe && exploreRecipes.some(r => r.id === id);

  // 핀 — 홈과 같은 규칙: 내 레시피는 레시피 안 pinnedAt, 둘러보기는 계정 핀. 내가 쓴 공식 레시피는 둘을 같은 것으로 본다
  const {pins: explorePins, togglePin: setExplorePin} = useExplorePins();
  const myAuthorKeyForPin = isAdmin ? OFFICIAL_AUTHOR_ID : user?.uid;
  const {ownForPin, exploreIdForPin} = useMemo(() => {
    if (!recipe) return {ownForPin: undefined, exploreIdForPin: undefined};
    if (isMyRecipe) {
      const pub = myAuthorKeyForPin
        ? exploreRecipes.find(p => p.authorId === myAuthorKeyForPin && (p.sourceRecipeId === id || p.title.trim() === recipe.title.trim()))
        : undefined;
      return {ownForPin: recipe, exploreIdForPin: pub?.id};
    }
    if (isExploreRecipe) {
      const mine = recipe.authorId === myAuthorKeyForPin;
      const own = mine
        ? recipes.find(r => r.id === recipe.sourceRecipeId || r.title.trim() === recipe.title.trim())
        : undefined;
      return {ownForPin: own, exploreIdForPin: id};
    }
    return {ownForPin: undefined, exploreIdForPin: undefined};
  }, [recipe, isMyRecipe, isExploreRecipe, exploreRecipes, recipes, myAuthorKeyForPin, id]);
  const canPin = !!ownForPin || !!exploreIdForPin;
  // 이미 둘러보기에 있는 내 레시피 — 가져온 것(sourceId) 또는 공개한 것
  const inExplore = isMyRecipe && (!!recipe?.sourceId || !!exploreIdForPin);
  const isPinned = !!ownForPin?.pinnedAt || (!!exploreIdForPin && !!explorePins[exploreIdForPin]);
  const handlePinChange = useCallback((pinned: boolean) => {
    if (ownForPin) {
      const pinnedAt = pinned ? new Date().toISOString() : undefined;
      setRecipes(prev => prev.map(r => (r.id === ownForPin.id ? {...r, pinnedAt} : r)));
    }
    if (exploreIdForPin) setExplorePin(exploreIdForPin, pinned);
    showSnackbar(t(pinned ? 'home.pinned' : 'home.unpinned'), {tone: 'positive'});
  }, [ownForPin, exploreIdForPin, setRecipes, setExplorePin, showSnackbar, t]);

  // 다른 기기에서 고친 게 있는지 — 서버의 고친 시각(updatedAt)이 지금 보는 것과 다르면 '업데이트됨' 버튼을 띄운다.
  // 열 때와 앱으로 돌아올 때 확인한다(내 레시피는 실시간으로도 받지만, 둘러보기는 한 번 받아 두는 데이터라 여기서 확인)
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    if (!id || (!isMyRecipe && !isExploreRecipe)) return;
    const path = isExploreRecipe ? doc(db, 'explore_recipes', id) : user ? doc(db, 'user_recipes', user.uid, 'recipes', id) : null;
    if (!path) return;
    const check = () => getDoc(path).then(snap => {
      const remote = (snap.data() as any)?.updatedAt;
      setUpdateAvailable(!!remote && remote !== (recipe as any)?.updatedAt && remote > ((recipe as any)?.updatedAt ?? ''));
    }).catch(() => {});
    check();
    const sub = AppState.addEventListener('change', st => { if (st === 'active') check(); });
    return () => sub.remove();
  }, [id, isMyRecipe, isExploreRecipe, user, (recipe as any)?.updatedAt]);
  const alreadyImported = recipes.some(r => r.sourceId === id);
  // 사진첩은 이 레시피에서 마지막으로 연 앨범부터(상세·요리모드에서 사진 넣을 때)
  useEffect(() => {
    setAlbumScope(id);
    return () => setAlbumScope(undefined);
  }, [id]);
  // 둘러보기 잠금(어드민 메뉴 표시용) — 목록과 같은 규칙, 숨김 아닌 공식 레시피 순서 기준
  const exploreLockedIds = useMemo(() => computeLockedIds(exploreRecipes.filter(r => !r.hidden)), [exploreRecipes]);
  const setExploreLock = useSetExploreLock();

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
        ? colors[getCookbookColorKey(cookbookColors[r.cookbook] ?? DEFAULT_COOKBOOK_COLOR)]
        : undefined,
      searchableTexts: toSearchable(r),
    }));
    if (isExploreRecipe) return exploreRecipes.map(r => ({
      id: r.id,
      label: r.title,
      imageUrl: r.imageUri,
      iconColor: r.cookbook
        ? colors[getCookbookColorKey((exploreCookbookColorMap.get(r.cookbook) ?? 'orange') as any)]
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
    // 사용자가 상세를 닫으면 "마지막 본 레시피" 복귀 대상에서 제외
    // (안 지우면 앱 재시작마다 이 상세가 계속 다시 열림).
    AsyncStorage.removeItem('last_viewed_recipe_id').catch(() => {/* 무시 */});
    if (router.canGoBack()) {
      router.back();
    } else if (from) {
      router.navigate(`/${from}` as any);
    } else {
      router.replace('/recipes' as any);
    }
  }, [router, from]);

  // 사진 저장은 유료 기능 — 무료/게스트는 기존 PDF 할당량과 같은 방식으로 유도한다.
  const handleDownloadPhoto = useCallback((uri: string) => {
    if (!uri) return;
    if (tier !== 'pro') {
      // 플랜 시트를 바로 띄운다 — 스낵바로 한 번 더 누르게 하면 흐름이 끊긴다.
      // 게스트는 로그인이 먼저(구독하려면 계정이 있어야 한다) → 성공 후 플랜.
      // 대기 시간은 onSubscribe(잠금 해제)와 같은 값으로 맞춘다.
      // 게스트는 로그인 → 플랜(로그인 시트가 공통으로 플랜을 띄운다)
      if (!user) openAuthSheet();
      else openPlanSheet();
      return;
    }
    savePhoto(uri).then(ok => { if (!ok) showSnackbar(t('photoSave.failed'), {tone: 'error'}); });
  }, [tier, user, showSnackbar, t, openAuthSheet, openPlanSheet]);

  const handleEdit = useCallback((section?: string, opts?: {bulk?: boolean}) => {
    const params = new URLSearchParams();
    if (section) params.set('section', section);
    if (opts?.bulk) params.set('bulk', '1');
    if (isExploreRecipe) params.set('target', 'explore');
    const qs = params.toString();
    const path = `/recipe/edit/${id}${qs ? `?${qs}` : ''}`;
    router.push(path as any);
  }, [router, id, isExploreRecipe]);

  /**
   * 보고 있는 회차만 지운다. 지난 회차면 그 기록만, 지금 회차면 바로 전 회차 내용이 지금 회차가 된다.
   */
  const handleDeleteSession = useCallback(() => {
    if (!recipe?.sessions?.length) return;
    const now = new Date().toISOString();
    const removedNumber = viewedSession ? viewedSession.number : currentSessionNumber(recipe);
    setRecipes(prev => prev.map(r => {
      if (r.id !== id) return r;
      const past = r.sessions ?? [];
      if (viewedSession) return {...r, sessions: past.filter(x => x.id !== viewedSession.id), updatedAt: now};
      const prevSession = past[past.length - 1];
      const {id: prevId, number: prevNumber, createdAt: _c, ...content} = prevSession;
      return {...r, ...content, sessions: past.slice(0, -1), sessionId: prevId, sessionNumber: prevNumber, session: undefined, updatedAt: now};
    }));
    setViewSessionId(null);
    showSnackbar(t('id.recipeDeleted', {title: recipe.title, sessionLabel: ` ${t('id.sessionLabel', {current: removedNumber})}`}), {icon: IconTrashFilled});
  }, [recipe, viewedSession, id, setRecipes, showSnackbar, t]);

const handleDelete = useCallback(async () => {
    if (!recipe) return;
    if (isMyRecipe) {
      setRecipes(prev => prev.filter(r => r.id !== id));
      showSnackbar(t('id.recipeDeleted', {title: recipe.title, sessionLabel: ''}), {icon: IconTrashFilled});
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
                showSnackbar(t('id.restoreFailed'), {tone: 'error'});
              }
            },
          },
        });
      } catch {
        showSnackbar(t('id.deleteFailed'), {tone: 'error'});
      }
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/recipes' as any);
    }
  }, [recipe, isMyRecipe, isExploreRecipe, isAdmin, id, setRecipes, showSnackbar, router, t]);

  const handleComingSoon = useCallback(() => {
    // 처리 안 된 메뉴 — '예정' 안내는 띄우지 않는다(심사에서 미완성으로 본다)
  }, []);

  const importRef = useRef<() => void>(() => {});
  const handleImport = useCallback(() => {
    if (!recipe) return;
    // 게스트는 로그인 → 플랜 선택(공통) → 이어서 복사 — 목록에서 복사할 때와 같다
    if (!user) {
      openAuthSheet({onSuccess: () => setTimeout(() => importRef.current(), 300)});
      return;
    }
    const copied = {
      ...recipe,
      id: `user_${Date.now()}`,
      sourceId: recipe.id,
      // 둘러보기 원본 출처 박제 — 복사/회차로 내 것이 돼도 "원본: @작성자" 표시 유지
      sourceHandle: recipe.authorHandle,
      sourceAuthorId: recipe.authorId,
      // 가져오면 내 콘텐츠가 된다 — 작성자를 나로 박제(원본 작성자 → 나). remake와 동일.
      // (출처 source*는 위에서 박제하므로 "원본: @작성자" 표시는 그대로 유지)
      authorId: user?.uid,
      authorHandle: handle ?? undefined,
      authorDisplayName: displayName ?? undefined,
      authorAvatarSeed: avatarSeed != null ? String(avatarSeed) : undefined,
      createdAt: new Date().toISOString(),
    };
    setRecipes(prev => [...prev, copied]);
    showSnackbar(t('id.savedToMyRecipes'), {
      tone: 'positive',
      label: t('id.goTo'),
      onPress: () => router.navigate('/recipes' as any),
    });
  }, [recipe, setRecipes, showSnackbar, router, t, user, handle, displayName, avatarSeed, openAuthSheet]);
  importRef.current = handleImport;

  // 새 회차 만들기 — 레시피는 하나. 지금 내용을 지난 회차 기록으로 넘기고 다음 번호 회차로 이어서 고친다(최근 5개만)
  const handleRemake = useCallback(() => {
    if (!recipe) return;
    setRecipes(prev => prev.map(r => (r.id === recipe.id ? recordNewSession(r) : r)));
    setViewSessionId(null);
    showSnackbar(t('id.sessionAdded'), {tone: 'positive'});
  }, [recipe, setRecipes, showSnackbar, t]);

  // 회차 넘기기 — 지난 회차 기록 + 지금 회차. 회차가 하나면 안 보인다
  const sessionItems = useMemo(() => {
    if (!recipe?.sessions?.length) return [];
    return [
      ...recipe.sessions.map(x => ({id: x.id, label: t('id.sessionLabel', {current: x.number})})),
      {id: sessionKey(recipe), label: t('id.sessionLabel', {current: currentSessionNumber(recipe)})},
    ];
  }, [recipe, t]);

  const sessionReviews = useMemo(() => {
    if (!recipe?.sessions?.length) return undefined;
    // 회차별 회고 — 지난 회차 기록 + 지금 회차(계정에 회차 id로 보관한 것까지)
    const items = [
      ...recipe.sessions.map(x => ({id: x.id, label: t('id.sessionLabel', {current: x.number}), reviews: sessionReviewsOf(x)})),
      {id: sessionKey(recipe), label: t('id.sessionLabel', {current: currentSessionNumber(recipe)}), reviews: reviewsOf(recipe)},
    ].filter(x => x.reviews.length > 0);
    return items.length > 0 ? items : undefined;
  }, [recipe, reviewsOf, sessionReviewsOf, t]);

  // 1회차(가장 오래된 기록)와 비교 — 그 회차 자신을 볼 땐 없음
  const compareBaseline = useMemo(() => {
    const first = recipe?.sessions?.[0];
    if (!first || viewedSession?.id === first.id) return null;
    return {
      ingredientGroups: first.ingredientGroups,
      steps: first.steps,
      stepGroups: first.stepGroups,
      method: first.method,
      specificGravity: first.specificGravity,
    };
  }, [recipe, viewedSession]);

  // 회차 전환은 제자리에서 — 지난 회차를 고르면 그 기록을 보기만(편집은 지금 회차만)
  const handleSessionSelect = useCallback((sid: string) => {
    setViewSessionId(recipe && sid === sessionKey(recipe) ? null : sid);
  }, [recipe]);

  const handleCookbookChange = useCallback((newCookbook: string) => {
    if (!isMyRecipe) return;
    setRecipes(prev => prev.map(r =>
      r.id === id ? {...r, cookbook: newCookbook} : r
    ));
    showSnackbar(t('id.cookbookChanged', {cookbook: newCookbook || t('id.noCookbook')}));
  }, [id, isMyRecipe, setRecipes, showSnackbar, t]);

  // 공유 — 카드(커버 사진 + 레시피명·작성자) 창. 링크는 둘러보기(공개) 레시피만
  const [shareOpen, setShareOpen] = useState(false);
  const handleShare = useCallback(() => {
    if (!recipe) return;
    setShareOpen(true);
  }, [recipe]);

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
      showSnackbar(t('id.copiedToExplore'), {tone: 'positive'});
    } catch {
      showSnackbar(t('id.copyFailed'), {tone: 'error'});
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
      showSnackbar(t('id.submitFailed'), {tone: 'error'});
    }
  }, [recipe, user, handle, displayName, avatarSeed, showSnackbar, t]);

  // 스탬프는 내 레시피에만 찍힌다 — 둘러보기 레시피는 가져와야 요리할 수 있고,
  // 가져오면 sourceId로 원본 칸이 채워진다(스탬프북이 그렇게 센다).
  /**
   * 스탬프는 내 레시피든 공식이든 계정에 보관한다(회고와 같은 자리).
   * Recipe.madeAt에 박으면 공식 레시피엔 쓸 수 없고, 경로가 둘로 갈려
   * 한쪽만 저장되는 일이 생긴다.
   */
  const handleMadeChange = useCallback((made: boolean) => {
    if (!user) { openAuthSheet(); return; }
    setMade(madeKey, made);
    if (made) {
      router.push(`/stamps?just=${encodeURIComponent(madeKey)}` as any);
      showSnackbar(t('home.marked'), {
        tone: 'positive',
        label: t('home.undo'),
        onPress: () => setMade(madeKey, false),
      });
    } else {
      showSnackbar(t('home.unmarked'), {
        label: t('home.undo'),
        onPress: () => setMade(madeKey, true),
      });
    }
  }, [id, setMade, router, user, openAuthSheet, showSnackbar, t, madeKey]);

  // 의견은 공식(둘러보기) 레시피에만 — 내 레시피는 직접 고치면 된다
  const handleFeedback = useCallback(async (kind: string, message: string) => {
    if (!recipe) return;
    try {
      await sendRecipeFeedback({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        kind: kind as FeedbackKind,
        message,
        uid: user?.uid,
        handle: handle ?? undefined,
      });
      showSnackbar(t('feedback.sent'));
    } catch (e) {
      console.warn('[feedback] 저장 실패:', e);
      showSnackbar(t('feedback.failed'), {tone: 'error'});
    }
  }, [recipe, user?.uid, handle, showSnackbar, t]);

  if (!recipe) return null;

  // 내 목록에 있으면 복사본이어도 편집 가능(원본 출처는 sourceId 등으로 계속 표시된다).
  // 기존엔 복사본을 막아 탭·롱프레스가 아무 반응 없이 먹통이었다.
  const isMade = !!madeAtOf(recipe ? {id: madeKey, madeAt: viewedSession ? undefined : recipe.madeAt} : undefined);
  const canEdit = isMyRecipe || (isExploreRecipe && isAdmin);
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
        method={shown?.method}
        ratio={shown?.specificGravity}
        reviewCount={recipe.reviewCount}
        // 계정에 보관한 회고까지 합쳐서 넘긴다 — 한쪽만 보면 절반이 사라져 보인다
        reviews={viewedSession ? sessionReviewsOf(viewedSession) : reviewsOf(recipe)}
        description={recipe.description}
        advice={recipe.advice}
        imageUri={recipe.imageUri}
        imageUris={recipe.imageUris}
        time={shown?.time}
        servings={shown?.servings}
        doughTemp={shown?.doughTemp}
        divideWeight={shown?.divideWeight}
        session={sessionItems.length ? t('id.sessionLabel', {current: viewedSession?.number ?? currentSessionNumber(recipe)}) : undefined}
        ingredientGroups={shown?.ingredientGroups}
        tools={shown?.tools}
        toolGroups={shown?.toolGroups}
        steps={shown?.steps}
        stepGroups={shown?.stepGroups}
        activeFieldIds={recipe.activeFieldIds}
        referenceUrl={recipe.referenceUrl}
        isMade={isMade}
        isPinned={isPinned}
        onPinChange={canPin ? handlePinChange : undefined}
        stampIndex={madeCount}
        // 팁은 만드는 게 아니라 읽는 정보 — 만들었어요·다시 만들기·회고에서 빠진다
        onMadeChange={recipe?.kind === 'tip' ? undefined : handleMadeChange}
        isTip={recipe?.kind === 'tip'}
        onFeedback={isExploreRecipe ? handleFeedback : undefined}
        // 회고는 스탬프북에서 — 스탬프가 붙은 뒤 회고 시트가 뜬다(두 번 묻지 않게)
        onBack={handleBack}
        onComingSoon={handleComingSoon}
        // 지난 회차는 보기만 — 편집·바로 고치기는 지금 회차에서
        onEdit={canEdit && !viewedSession ? handleEdit : undefined}
        // 아래로 당겨 새로고침 — 내 레시피·둘러보기 둘 다 서버에서 다시
        onRefresh={async () => { await Promise.all([reloadRecipes(), exploreReload()]); setUpdateAvailable(false); }}
        updateAvailable={updateAvailable}
        onDownloadPhoto={handleDownloadPhoto}
        onDelete={canDelete ? handleDelete : undefined}
        initialMenuAction={menuParam}
        onDuplicate={isMyRecipe && recipe ? () => {
          const copy = duplicateRecipe(recipe, t('recipeMenuItems.duplicateSuffix'));
          setRecipes(prev => [copy, ...prev]);
          showSnackbar(t('recipeMenuItems.duplicated'), {tone: 'positive'});
          router.replace(`/recipe/${copy.id}` as any);
        } : undefined}
        // 어드민 — 둘러보기 레시피 잠금(목록 ⋮와 같은 항목)
        lockMenu={isExploreRecipe && isAdmin && recipe ? {lockMode: recipe.lockMode, locked: exploreLockedIds.has(recipe.id), onSelect: mid => setExploreLock(mid, recipe.id)} : undefined}
        onDeleteSession={isMyRecipe && (recipe?.sessions?.length ?? 0) > 0 ? handleDeleteSession : undefined}
        onRemake={isMyRecipe && recipe?.kind !== 'tip' && !viewedSession ? handleRemake : undefined}
        onImport={!isMyRecipe ? handleImport : undefined}
        onCookbookChange={isMyRecipe ? handleCookbookChange : undefined}
        availableCookbooks={availableCookbooks}
        cookbookColors={cookbookColors}
        sessionItems={sessionItems}
        currentSessionId={viewSessionId ?? (recipe ? sessionKey(recipe) : undefined)}
        viewingPastSession={!!viewedSession}
        sessionReviews={sessionReviews}
        compareBaseline={compareBaseline}
        onSessionSelect={handleSessionSelect}
        onUpdate={canEdit && !viewedSession ? (data) => {
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
                // 상단 사진(상세 뷰어에서 바로 올린 것 포함)
                if (typeof uploaded.imageUri === 'string' && isLocalUri(uploaded.imageUri)) {
                  uploaded.imageUri = await uploadRecipeImage(uploaded.imageUri, `explore_${id}_h${Date.now()}`);
                }
                if (Array.isArray(uploaded.imageUris) && uploaded.imageUris.some((u: string) => isLocalUri(u))) {
                  uploaded.imageUris = await uploadPhotos(uploaded.imageUris);
                }
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
                // updateDoc은 문서가 없으면(not-found) 실패한다. setDoc merge는 없으면 만들고
                // 있으면 부분 병합 → 요리모드 사진 추가가 안정적으로 저장됨(편집화면과 동일 톤).
                await setDoc(doc(db, 'explore_recipes', id!), stripUndefined(uploaded), {merge: true});
                // 저장 후 다시 불러온다. 내 레시피는 setRecipes로 화면이 바로 갱신되지만
                // 둘러보기는 갱신 수단이 없어, 저장돼도 화면·요리모드가 옛 데이터를 그대로
                // 들고 있었다("저장이 안 된다"의 실제 원인).
                await exploreReload();
              } catch (e: any) {
                console.warn('[explore update] 실패 code=', e?.code, 'msg=', e?.message, e);
                showSnackbar(t('id.updateFailed') + (e?.code ? ` (${e.code})` : ''), {tone: 'error'});
              }
            })();
          }
        } : undefined}
        initialCookingMode={cookingParam === '1'}
        onCookingModeChange={(visible) => {
          setIsCookingMode(visible);
          // URL에 요리모드 상태 반영 → 웹 새로고침해도 요리모드 유지. (히스토리 안 쌓게 setParams)
          router.setParams({cooking: visible ? '1' : undefined});
        }}
        locked={isLocked}
        canExportPdf={pdfUsed < pdfLimit}
        onPdfExported={incrementPdf}
        onPdfQuotaExceeded={() => {
          // 게스트는 로그인, 그 외는 업그레이드로 유도
          if (!user) {
            showSnackbar(t('pdf.quotaGuest'), {label: t('auth.signIn'), onPress: () => openAuthSheet()});
          } else {
            showSnackbar(t('pdf.quotaFree'), {label: t('profile.subscribe'), onPress: openPlanSheet});
          }
        }}
        onUnlock={handleUnlock}
        adLoading={adLoading}
        onSubscribe={() => {
          // 게스트면 AuthSheet 먼저 → 로그인 성공 시 PlanSheet 오픈
          // 로그인 상태면 PlanSheet 바로 오픈 (UnlockDialog 애니메이션 대기 200ms)
          setTimeout(() => {
            if (!user) {
              openAuthSheet(); // 로그인 → 플랜(공통)
            } else {
              openPlanSheet();
            }
          }, 200);
        }}
        recipeItems={recipeItems}
        currentRecipeId={id}
        onRecipeSelect={handleRecipeSwitch}
        // 둘러보기에서 가져왔거나 이미 공개한 레시피는 다시 올리지 않는다(목록 ⋮와 같은 규칙)
        onCopyToExplore={isMyRecipe && isAdmin && !inExplore ? () => setShowExploreCookbookSheet(true) : undefined}
        onSubmitToExplore={isMyRecipe && !isAdmin && user && !inExplore ? runSubmitToExplore : undefined}
        showDeleteConfirm={isMyRecipe || (isExploreRecipe && isAdmin)}
        // 내 레시피도 카드로 공유(이미지) — 링크는 공개 레시피만
        onShare={recipe?.kind !== 'tip' || isExploreRecipe ? handleShare : undefined}
        sourceUrl={recipe.sourceUrl}
        sourceHandle={recipe.sourceHandle}
        onSourcePress={recipe.sourceAuthorId ? () => router.push(`/u/${resolveAuthorHandle(recipe.sourceAuthorId, recipe.sourceHandle) ?? recipe.sourceAuthorId}` as any) : undefined}
        {...(() => {
          // 작성자 = 레시피에 박제된 값 우선(복사본은 원본 작성자 유지). 박제값이 없는 순수 내 레시피만 내 계정으로 폴백.
          // 둘러보기 레시피인데 작성자가 비어 있으면(예전에 어드민이 올린 것) 공식(베이키)으로 본다
          const authorId = recipe.authorId ?? (isExploreRecipe ? OFFICIAL_AUTHOR_ID : undefined);
          const hasStamped = !!authorId;
          // 표시는 전부 @handle로 통일. 공식은 최신 handle(bakey)로 치환, 핸들 없는 게스트는 @guest.
          const stampedHandle = resolveAuthorHandle(authorId, recipe.authorHandle);
          const badgeName = hasStamped
            ? `@${stampedHandle ?? 'guest'}`
            : `@${handle ?? 'guest'}`;
          const badgeSeed = hasStamped
            ? (recipe.authorAvatarSeed ?? authorId)
            : (avatarSeed != null ? String(avatarSeed) : undefined);
          const targetAuthorId = hasStamped ? authorId : user?.uid;
          // URL은 handle 기반(핸들=주소 일치). 박제 handle → 공식 치환 → 폴백 순.
          const targetHandle = hasStamped
            ? (resolveAuthorHandle(authorId, recipe.authorHandle) ?? authorId)
            : (handle ?? user?.uid);
          return {
            authorHandle: badgeName,
            authorAvatarSeed: badgeSeed,
            authorId: hasStamped ? authorId : user?.uid,
            onAuthorPress: targetAuthorId ? () => router.push(`/u/${targetHandle}` as any) : undefined,
          };
        })()}
      />
      {recipe ? (
        <ShareRecipeSheet
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          recipe={{id, title: recipe.title, imageUri: recipe.imageUri, authorHandle: recipe.authorHandle ?? handle ?? undefined, authorAvatarSeed: recipe.authorAvatarSeed ?? avatarSeed ?? undefined}}
          linkable={isExploreRecipe}
        />
      ) : null}
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
        icon={IconExprolerBookTwotone}
        avatarColor="darkred"
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
