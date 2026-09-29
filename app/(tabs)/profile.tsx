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
  const {isPro} = useSubscription();
  const {t} = useTranslation();

  useEffect(() => {
    if (params.openPlan === '1') {
      setPlanSheetTrigger(t => t + 1);
      router.setParams({openPlan: undefined});
    }
  }, [params.openPlan, router]);

  const reviewCount = useMemo(() =>
    recipes.reduce((sum, r) => sum + (r.reviews?.length ?? 0), 0),
  [recipes]);

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
        reviewCount={reviewCount}
        userEmail={user?.email ?? null}
        handle={handle}
        lastSyncedAt={lastSyncedAt}
        lastSyncedDevice={lastSyncedDevice}
        onBack={handleBack}
        onExport={exportRecipes}
        onImport={importRecipes}
        onLogout={handleLogout}
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
        onExamNotifPress={() => router.push('/exam-notifications' as any)}
        onWidgetGuidePress={() => router.push('/widget-guide' as any)}
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
