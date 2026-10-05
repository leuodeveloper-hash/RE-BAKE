import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
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
  const {user, handle, displayName, signOut, deleteAccount, updateHandle, updateDisplayName, avatarSeed, isAdmin} = useAuth();
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

  const handleDeleteAccount = useCallback(async () => {
    try {
      await deleteAccount();
      showSnackbar(t('profile.accountDeleted'));
      return true;
    } catch (e) {
      console.error('[profile] deleteAccount failed', e);
      showSnackbar(t('profile.deleteAccountFailed'), {tone: 'error'});
      return false;
    }
  }, [deleteAccount, showSnackbar, t]);

  return (
    <View style={[styles.container, {backgroundColor: colors['surface/dim']}]}>
      <ProfileScreen
        recipeCount={recipes.length}
        reviewCount={reviewCount}
        userEmail={user?.email ?? null}
        handle={handle}
        lastSyncedAt={lastSyncedAt}
        lastSyncedDevice={lastSyncedDevice}
        onBack={handleBack}
        onExport={exportRecipes}
        onImport={importRecipes}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
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
