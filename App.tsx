import React from 'react';
import {StatusBar, Text, TextInput} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
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

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <RecipeListScreen />
    </SafeAreaProvider>
  );
}

export default App;
