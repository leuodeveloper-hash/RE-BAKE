import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {HomeScreen} from '@screens/HomeScreen';
import {useColors} from '@contexts/ThemeContext';

export default function HomeRoute() {
  const colors = useColors();
  // ?axis=cookbook — 설정의 공식 레시피북 칸에서 오면 레시피북 보기로(같은 내 홈 화면)
  const {axis} = useLocalSearchParams<{axis?: string}>();
  const initialAxis = axis === 'cookbook' || axis === 'method' ? axis : undefined;
  return (
    <View style={[styles.container, {backgroundColor: colors['surface/dim']}]}>
      <HomeScreen initialAxis={initialAxis} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
