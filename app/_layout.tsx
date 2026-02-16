import React from 'react';
import {Text, TextInput, ActivityIndicator, View} from 'react-native';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useFonts} from 'expo-font';
import {ThemeProvider, useTheme} from '@contexts/ThemeContext';
import {RecipeProvider} from '@contexts/RecipeContext';
import {SnackbarProvider} from '@contexts/SnackbarContext';
import {AddSheetProvider} from '@contexts/AddSheetContext';
import {AuthProvider} from '@contexts/AuthContext';

// 전역 Text 스타일 설정 (Android 폰트 패딩 제거)
if ((Text as any).defaultProps == null) {
  (Text as any).defaultProps = {};
}
(Text as any).defaultProps.style = {includeFontPadding: false};

if ((TextInput as any).defaultProps == null) {
  (TextInput as any).defaultProps = {};
}
(TextInput as any).defaultProps.style = {includeFontPadding: false};

function ThemedStatusBar() {
  const {isDark} = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'IBMPlexSans': require('../assets/fonts/IBMPlexSans-VariableFont_wdth,wght.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
      <SafeAreaProvider>
        <RecipeProvider>
          <SnackbarProvider>
            <AddSheetProvider>
              <ThemedStatusBar />
              <Stack screenOptions={{headerShown: false}}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="recipe/[id]"
                  options={{animation: 'slide_from_right'}}
                />
                <Stack.Screen
                  name="recipe/edit"
                  options={{animation: 'slide_from_bottom', presentation: 'fullScreenModal'}}
                />
                <Stack.Screen
                  name="recipe/edit/[id]"
                  options={{animation: 'slide_from_bottom', presentation: 'fullScreenModal'}}
                />
              </Stack>
            </AddSheetProvider>
          </SnackbarProvider>
        </RecipeProvider>
      </SafeAreaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
