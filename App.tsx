import React from 'react';
import {Text, TextInput} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ThemeProvider, useTheme} from '@contexts/ThemeContext';
import {RecipeListScreen} from '@screens/RecipeListScreen';

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

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ThemedStatusBar />
        <RecipeListScreen />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default App;
