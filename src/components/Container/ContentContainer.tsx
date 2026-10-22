import React from 'react';
import {StyleSheet, View, ViewStyle, type StyleProp} from 'react-native';
import {Spacing} from '@constants/spacing';
import {APPBAR_CONTENT_TOP} from '@constants/layout';

// 공통 레이아웃 상수
export const MAX_CONTENT_WIDTH = 800;

// AppBar 아래, TabBar 위 영역 패딩 (FlatList contentContainerStyle용)
// 앱바 아래 첫 요소 위치 — 앱바 공간(64) + 8. 따로 숫자를 두면 화면마다 간격이 달라진다
export const APPBAR_HEIGHT = APPBAR_CONTENT_TOP;
export const TABBAR_BOTTOM_SPACE = 120;

export const contentAreaPadding = {
  paddingTop: APPBAR_HEIGHT,
  paddingBottom: TABBAR_BOTTOM_SPACE,
  paddingHorizontal: Spacing.md,
};

export interface ContentContainerProps {
  children: React.ReactNode;
  /** 추가 스타일 */
  style?: StyleProp<ViewStyle>;
  /** 수평 패딩 사용 여부 (기본: true) */
  horizontalPadding?: boolean;
  /** 남은 높이를 채운다 — 안에 빈 상태(EmptyState)가 있을 때 상하 중앙에 오게 */
  fill?: boolean;
  /** 터치 — 'box-none'이면 빈 자리는 아래로 통과(다른 요소와 겹쳐 놓을 때) */
  pointerEvents?: 'box-none' | 'auto';
}

/**
 * 콘텐츠 최대 너비를 제한하는 공통 컨테이너
 * - maxWidth: 800px
 * - 태블릿/웹에서 콘텐츠가 너무 넓어지지 않도록 제한
 */
export function ContentContainer({
  children,
  style,
  horizontalPadding = true,
  fill,
  pointerEvents,
}: ContentContainerProps) {
  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        styles.container,
        horizontalPadding && styles.horizontalPadding,
        fill && styles.fill,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  fill: {
    flexGrow: 1,
  },
  horizontalPadding: {
    paddingHorizontal: Spacing.md,
  },
});
