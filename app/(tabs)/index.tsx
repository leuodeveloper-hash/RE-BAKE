import React from 'react';
import {View, StyleSheet} from 'react-native';
import {HomeScreen} from '@screens/HomeScreen';
import {useColors} from '@contexts/ThemeContext';

export default function HomeRoute() {
  const colors = useColors();
  return (
    <View style={[styles.container, {backgroundColor: colors['surface-surfacedim']}]}>
      <HomeScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
