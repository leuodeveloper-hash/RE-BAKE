import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useMyAuthor} from '@hooks/useAuthor';
import {resolveAuthorHandle, OFFICIAL_AUTHOR_HANDLE, OFFICIAL_AUTHOR_ID} from '../../src/types/author';
import {useRouter, useLocalSearchParams} from 'expo-router';
import {ProfileScreen} from '@screens/ProfileScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useMadeStamps} from '@hooks/useMadeStamps';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useSubscription} from '@contexts/SubscriptionContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useRecipeReviews} from '@hooks/useRecipeReviews';

export default function ProfileRoute() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{openPlan?: string}>();
  const [planSheetTrigger, setPlanSheetTrigger] = useState(0);
  const {recipes, exportRecipes, importRecipes, lastSyncedAt, lastSyncedDevice} = useRecipes();
  const {recipes: exploreRecipes} = useExploreRecipeContext();
  // 스탬프는 계정에 있다 — 내 레시피·공식 레시피를 함께 센다
  const {madeAtOf} = useMadeStamps();
  const stampCount = useMemo(
    () => [...recipes, ...exploreRecipes].filter(r => madeAtOf(r)).length,
    [recipes, exploreRecipes, madeAtOf],
  );
  const {showSnackbar} = useSnackbar();
  const {user, handle, displayName, signOut, updateHandle, updateDisplayName, avatarSeed, isAdmin} = useAuth();
  // 내 작성자 프로필(공식 레시피를 올린 계정) — 프로필 보기에서 그 작성자 홈으로
  const {author: myAuthor} = useMyAuthor(user?.uid);
  // 내가 둘러보기에 올린 레시피 — 어드민은 공식 작성자(베이키) 이름으로 저장된다
  const myAuthorId = isAdmin ? OFFICIAL_AUTHOR_ID : myAuthor?.id;
  const myOfficial = useMemo(() => {
    const mine = myAuthorId ? exploreRecipes.filter(r => r.authorId === myAuthorId && !r.hidden) : [];
    return {books: new Set(mine.map(r => r.cookbook).filter(Boolean)).size, recipes: mine.length};
  }, [exploreRecipes, myAuthorId]);
  // 프로필 보기·레시피북 칸 공통 — 내 작성자 홈(공식 레시피). 레시피북 칸은 레시피북 보기로 떨군다
  const openMyAuthorHome = useCallback((axis?: 'cookbook') => {
    const slug = isAdmin ? OFFICIAL_AUTHOR_HANDLE
      : myAuthor ? resolveAuthorHandle(myAuthor.id, myAuthor.handle) : handle;
    if (slug) router.push(`/u/${slug}${axis ? `?axis=${axis}` : ''}` as any);
  }, [isAdmin, myAuthor, handle, router]);
  const {isPro} = useSubscription();
  const {t} = useTranslation();

  useEffect(() => {
    if (params.openPlan === '1') {
      setPlanSheetTrigger(t => t + 1);
      router.setParams({openPlan: undefined});
    }
  }, [params.openPlan, router]);

  // 회고는 계정에 저장된다(레시피 id별 하나) — 내 레시피만 돌며 세면
  // 둘러보기 레시피에 쓴 회고가 빠진다. 계정 회고는 전부, 예전 방식(레시피 안) 회고는 더한다.
  const {reviews} = useRecipeReviews();
  const reviewCount = useMemo(() => {
    const legacy = recipes.reduce(
      (sum, r) => sum + (r.reviews ?? []).filter(rv => rv.evaluation?.trim() || rv.improvement?.trim()).length,
      0,
    );
    return legacy + Object.keys(reviews).length;
  }, [recipes, reviews]);

  const handleBack = useCallback(() => {
    router.navigate('/');
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      showSnackbar(t('profile.loggedOut'));
    } catch (e) {
      // 이전엔 catch가 없어 signOut이 throw하면 조용히 삼켜져 "눌러도 반응 없음"으로 보였다.
      console.error('[profile] signOut failed', e);
      showSnackbar(t('profile.logoutFailed'), {tone: 'error'});
    }
  }, [signOut, showSnackbar, t]);


  return (
    <View style={[styles.container, {backgroundColor: colors['surface/dim']}]}>
      <ProfileScreen
        recipeCount={recipes.length}
        // 레시피북 칸 — 내가 공식(둘러보기)으로 올린 레시피북·레시피 수, 누르면 그 작성자 홈(프로필 보기와 같은 곳)
        cookbookCount={myOfficial.books}
        officialRecipeCount={myOfficial.recipes}
        onCookbooksPress={() => openMyAuthorHome('cookbook')}
        reviewCount={reviewCount}
        userEmail={user?.email ?? null}
        handle={handle}
        lastSyncedAt={lastSyncedAt}
        lastSyncedDevice={lastSyncedDevice}
        onBack={handleBack}
        onExport={exportRecipes}
        onImport={importRecipes}
        onLogout={handleLogout}
        onAccountPress={() => router.push('/account' as any)}
        onDataPress={() => router.push('/data' as any)}
        // 프로필 보기 = 내가 공식(둘러보기)으로 올린 레시피 — 작성자 홈. 내 작성자 프로필이 있으면 그 아이디로
        onProfilePress={() => openMyAuthorHome()}
        onUpdateHandle={updateHandle}
        displayName={displayName}
        onUpdateDisplayName={updateDisplayName}
        onTermsPress={() => router.push('/terms')}
        onPrivacyPress={() => router.push('/privacy')}
        onStampsPress={() => router.push('/stamps' as any)}
        stampCount={stampCount}
        onOcrLogsPress={() => router.push('/admin/ocr-logs' as any)}
        onLabsPress={() => router.push('/labs' as any)}
        onWidgetPreviewPress={() => router.push('/widget-preview' as any)}
        onSubmissionsPress={() => router.push('/admin/submissions' as any)}
        // 웹에서도 들어간다 — 시험 일정·내 D-day는 웹에서도 쓰고, 알림 설정 화면이 앱 전용임을 안내한다
        onExamNotifPress={() => router.push('/exam-notifications' as any)}
        // 위젯 추가 방법은 웹(PC)에서도 미리 볼 수 있게 — 실제 추가는 아이폰에서
        onWidgetGuidePress={() => router.push('/widget-guide' as any)}
        onDdaysPress={() => router.push('/ddays' as any)}
        isPro={isPro}
        isAdmin={isAdmin}
        avatarSeed={avatarSeed}
        openPlanSheetSignal={planSheetTrigger}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
