import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Spacing} from '@constants/spacing';
import {ContentContainer} from './ContentContainer';

export interface FloatingNavBarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  /** 좌측 캡슐 아래에 표시할 메뉴 */
  leftMenu?: React.ReactNode;
  /** left 영역을 전체 너비로 확장 */
  leftFull?: boolean;
  style?: ViewStyle;
}

/** NavBar pill 높이 */
export const NAV_PILL_HEIGHT = 44;

/** 공통 pill 스타일 — GlassContainer contentStyle에 사용 */
export const navPillStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  height: NAV_PILL_HEIGHT,
  padding: 2,
  gap: 2,
};

/** AppBar 영역 하단 위치 (paddingTop + pill height). 메뉴 top 기준으로 사용 */
export const APPBAR_CONTENT_BOTTOM = Spacing.smd + NAV_PILL_HEIGHT; // 10 + 44 = 54

export function FloatingNavBar({left, right, leftMenu, leftFull, style}: FloatingNavBarProps) {
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, style]}
      pointerEvents="box-none">
      <View style={styles.inner} pointerEvents="box-none">
        <ContentContainer
          style={styles.content}
          horizontalPadding={false}>
          {left ? (
            <View style={leftFull ? styles.leftFull : undefined}>
              {left}
              {leftMenu && (
                <View style={styles.leftMenuContainer}>
                  {leftMenu}
                </View>
              )}
            </View>
          ) : null}
          {right && <View style={styles.right}>{right}</View>}
        </ContentContainer>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  inner: {
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  leftFull: {
    flex: 1,
  },
  leftMenuContainer: {
    position: 'absolute' as const,
    top: NAV_PILL_HEIGHT + Spacing.xs,
    left: 0,
    zIndex: 20,
  },
});
