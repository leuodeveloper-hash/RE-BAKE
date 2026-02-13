import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Spacing} from '@constants/spacing';
import {ContentContainer} from './ContentContainer';

export interface FloatingNavBarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: ViewStyle;
}

/** 공통 pill 스타일 — GlassContainer contentStyle에 사용 */
export const navPillStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  height: 44,
  padding: 2,
  gap: 2,
};

export function FloatingNavBar({left, right, style}: FloatingNavBarProps) {
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, style]}
      pointerEvents="box-none">
      <View style={styles.inner} pointerEvents="box-none">
        <ContentContainer
          style={styles.content}
          horizontalPadding={false}>
          {left}
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
});
