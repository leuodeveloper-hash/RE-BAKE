import React from 'react';
import {View, StyleSheet} from 'react-native';
import {HomeScreen} from '@screens/HomeScreen';
import {useColorsV2} from '@contexts/ThemeContext';

export default function HomeRoute() {
  const colors = useColorsV2();
  return (
    <View style={[styles.container, {backgroundColor: colors['surface/normal']}]}>
      <HomeScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
