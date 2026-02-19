import React, {useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {ProfileScreen} from '@screens/ProfileScreen';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useAvatarSeed} from '@hooks/useAvatarSeed';

export default function ProfileRoute() {
  const router = useRouter();
  const colors = useColors();
  const {recipes, exportRecipes, importRecipes, lastSyncedAt, lastSyncedDevice} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {user, handle, signIn, signUp, signInWithGoogle, signOut, updateHandle} = useAuth();
  const avatarSeed = useAvatarSeed();

  const handleBack = useCallback(() => {
    router.navigate('/');
  }, [router]);

  const handleLogout = useCallback(async () => {
    await signOut();
    showSnackbar('로그아웃 되었습니다');
  }, [signOut, showSnackbar]);

  return (
    <View style={[styles.container, {backgroundColor: colors['surface-surfacedim']}]}>
      <ProfileScreen
        recipeCount={recipes.length}
        userEmail={user?.email ?? null}
        userDisplayName={user?.displayName ?? null}
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
        avatarSeed={avatarSeed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
