import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useRouter, useLocalSearchParams} from 'expo-router';
import {ProfileScreen} from '@screens/ProfileScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColorsV2} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useSubscription} from '@contexts/SubscriptionContext';

export default function ProfileRoute() {
  const router = useRouter();
  const colors = useColorsV2();
  const params = useLocalSearchParams<{openPlan?: string}>();
  const [planSheetTrigger, setPlanSheetTrigger] = useState(0);
  const {recipes, exportRecipes, importRecipes, lastSyncedAt, lastSyncedDevice} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {user, handle, signIn, signUp, signInWithGoogle, signOut, updateHandle, avatarSeed, isAdmin} = useAuth();
  const {isPro} = useSubscription();

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
    await signOut();
    showSnackbar('로그아웃 되었습니다');
  }, [signOut, showSnackbar]);

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
        onLogin={signIn}
        onSignUp={signUp}
        onGoogleSignIn={signInWithGoogle}
        onLogout={handleLogout}
        onUpdateHandle={updateHandle}
        onTermsPress={() => router.push('/terms')}
        onPrivacyPress={() => router.push('/privacy')}
        onLabsPress={() => router.push('/labs' as any)}
        onExamNotifPress={() => router.push('/exam-notifications' as any)}
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
