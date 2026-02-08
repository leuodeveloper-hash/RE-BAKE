import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {Spacing} from '@constants/spacing';

export interface ContentAreaProps {
  children: React.ReactNode;
  /** 추가 스타일 */
  style?: ViewStyle;
  /** 수평 패딩 사용 여부 (기본: true) */
  horizontalPadding?: boolean;
}

// 공통 레이아웃 상수
const APPBAR_HEIGHT = 72;
const TABBAR_BOTTOM_SPACE = 120;

/**
 * 페이지 공통 콘텐츠 영역
 * - AppBar 아래, TabBar 위 영역에 적절한 패딩 적용
 * - 모든 스크린에서 일관된 레이아웃 유지
 */
export function ContentArea({
  children,
  style,
  horizontalPadding = true,
}: ContentAreaProps) {
  return (
    <View
      style={[
        styles.container,
        horizontalPadding && styles.horizontalPadding,
        style,
      ]}>
      {children}
    </View>
  );
}

/** FlatList, ScrollView 등에 사용할 contentContainerStyle */
export const contentAreaPadding = {
  paddingTop: APPBAR_HEIGHT,
  paddingBottom: TABBAR_BOTTOM_SPACE,
  paddingHorizontal: Spacing.md,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: APPBAR_HEIGHT,
    paddingBottom: TABBAR_BOTTOM_SPACE,
  },
  horizontalPadding: {
    paddingHorizontal: Spacing.md,
  },
});
