import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {HomeScreen} from '@screens/HomeScreen';
import {useColors} from '@contexts/ThemeContext';

export default function MyRecipesRoute() {
  const colors = useColors();
  // ?axis=cookbook — 설정의 공식 레시피북 칸에서 오면 레시피북 보기로(같은 내 홈 화면)
  const {axis} = useLocalSearchParams<{axis?: string}>();
  const initialAxis = axis === 'cookbook' || axis === 'method' ? axis : undefined;
  // 한 번 반영하면 주소에서 지운다 — 남아 있으면 새로고침할 때마다 그 축으로 돌아가 마지막 선택을 덮었다
  const router = useRouter();
  React.useEffect(() => {
    if (axis) { const id = setTimeout(() => router.setParams({axis: undefined} as any), 0); return () => clearTimeout(id); }
  }, [axis, router]);
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
