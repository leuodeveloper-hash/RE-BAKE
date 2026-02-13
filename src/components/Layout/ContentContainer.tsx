import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {Spacing} from '@constants/spacing';

// 공통 레이아웃 상수
export const MAX_CONTENT_WIDTH = 800;

export interface ContentContainerProps {
  children: React.ReactNode;
  /** 추가 스타일 */
  style?: ViewStyle;
  /** 수평 패딩 사용 여부 (기본: true) */
  horizontalPadding?: boolean;
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
}: ContentContainerProps) {
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

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  horizontalPadding: {
    paddingHorizontal: Spacing.md,
  },
});
