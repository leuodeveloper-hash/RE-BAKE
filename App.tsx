import React, {useState} from 'react';
import {SafeAreaView, StatusBar, StyleSheet, View, TouchableOpacity, Text} from 'react-native';
import {Typography} from '@constants/typography';
import {SemanticColorsLight} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {RecipeEditScreen} from '@screens/RecipeEditScreen';
import {RecipeDetailScreen} from '@screens/RecipeDetailScreen';

function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<'edit' | 'detail'>('detail');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.screenSelector}>
        <TouchableOpacity
          style={[styles.selectorButton, currentScreen === 'edit' && styles.selectorButtonActive]}
          onPress={() => setCurrentScreen('edit')}>
          <Text style={[styles.selectorText, currentScreen === 'edit' && styles.selectorTextActive]}>
            레시피 편집
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectorButton, currentScreen === 'detail' && styles.selectorButtonActive]}
          onPress={() => setCurrentScreen('detail')}>
          <Text style={[styles.selectorText, currentScreen === 'detail' && styles.selectorTextActive]}>
            레시피 상세
          </Text>
        </TouchableOpacity>
      </View>
      {currentScreen === 'edit' ? <RecipeEditScreen /> : <RecipeDetailScreen />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SemanticColorsLight['surface-surfacebright'],
  },
  screenSelector: {
    flexDirection: 'row',
    padding: Spacing.sm,
    backgroundColor: SemanticColorsLight['surface-surfacecontainer'],
    gap: Spacing.sm,
  },
  selectorButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectorButtonActive: {
    backgroundColor: SemanticColorsLight['background-accentcontainer'],
  },
  selectorText: {
    ...Typography.label.large,
    color: SemanticColorsLight['foreground-onsurfacemuted'],
  },
  selectorTextActive: {
    color: SemanticColorsLight['foreground-onaccentcontainer'],
  },
});

export default App;
