import React, {useCallback, useRef, useState} from 'react';
import {useRouter} from 'expo-router';
import {CookbookSelectSheet} from '@components/BottomSheet/CookbookSelectSheet';
import {useAuth} from '@contexts/AuthContext';
import {useAuthSheet} from '@contexts/AuthSheetContext';
import {useRecipes} from '@contexts/RecipeContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useTranslation} from '@contexts/LanguageContext';
import type {Recipe} from '../types/recipe';

/**
 * 내 레시피로 복사 — 상세·둘러보기 목록 공통(한 곳에서만 고친다).
 * 1) 게스트면 로그인부터 2) 넣을 레시피북 고르기(새 북 만들기 가능, 어드민은 공식 북도 내 북) 3) 복사 + 스낵바.
 * 쓰는 쪽은 startImport(recipe)를 부르고, 돌려준 importSheet를 화면에 그려 두면 된다.
 */
export function useImportToMyRecipes() {
  const router = useRouter();
  const {t} = useTranslation();
  const {isAdmin, user, handle, displayName, avatarSeed} = useAuth();
  const {open: openAuthSheet} = useAuthSheet();
  const {setRecipes, availableCookbooks, cookbookColors, setCookbookColor} = useRecipes();
  const {exploreCookbooks} = useExploreRecipeContext();
  const {showSnackbar} = useSnackbar();

  const [target, setTarget] = useState<Recipe | null>(null);
  // 시트만 닫는다 — 시트 안 '레시피북 추가'가 시트를 닫고 팝업을 띄워도 복사할 레시피는 남아 있어야 한다
  const [sheetOpen, setSheetOpen] = useState(false);
  // 로그인 직후엔 콜백이 아직 게스트 시절 값이라 다시 부를 땐 최신 걸 쓴다
  const startRef = useRef<(r: Recipe) => void>(() => {});

  const startImport = useCallback((recipe: Recipe) => {
    if (!user) {
      openAuthSheet({onSuccess: () => setTimeout(() => startRef.current(recipe), 300)});
      return;
    }
    setTarget(recipe);
    setSheetOpen(true);
  }, [user, openAuthSheet]);
  startRef.current = startImport;

  const doImport = useCallback((cookbookName: string) => {
    const recipe = target;
    setTarget(null);
    setSheetOpen(false);
    if (!recipe) return;
    const copied: Recipe = {
      ...recipe,
      cookbook: cookbookName === '__none__' ? '' : cookbookName,
      id: `user_${Date.now()}`,
      sourceId: recipe.id,
      // 둘러보기 원본 출처 박제 — 복사/회차로 내 것이 돼도 "원본: @작성자" 표시 유지
      sourceHandle: recipe.authorHandle,
      sourceAuthorId: recipe.authorId,
      // 가져오면 내 콘텐츠 — 작성자를 나로(출처 source*는 위에서 박제)
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
  }, [target, user, handle, displayName, avatarSeed, setRecipes, showSnackbar, router, t]);

  const importSheet = (
    <CookbookSelectSheet
      visible={sheetOpen}
      onClose={() => setSheetOpen(false)}
      // 어드민은 공식 레시피북도 내 북이다(홈에도 같이 보인다)
      cookbooks={isAdmin ? [...new Set([...availableCookbooks, ...exploreCookbooks.map(c => c.name)])] : availableCookbooks}
      cookbookColors={isAdmin ? {...Object.fromEntries(exploreCookbooks.map(c => [c.name, c.color as any])), ...cookbookColors} : cookbookColors}
      onSelect={doImport}
      // 새 북을 만들고 바로 그 북으로 복사
      onAddCookbook={(name, color) => { setCookbookColor(name, color); doImport(name); }}
    />
  );

  return {startImport, importSheet};
}
