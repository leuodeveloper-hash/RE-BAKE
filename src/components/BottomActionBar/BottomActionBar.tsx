import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Spacing} from '@constants/spacing';
import {withOpacity} from '@constants/tokens';

export interface BottomActionBarProps {
  children: React.ReactNode;
  /** 바 배경색 (기본 투명). 상단 마스크 그라디언트도 이 색으로 페이드 */
  background?: string;
  /** 상단 마스크 그라디언트 노출 (스크롤 콘텐츠가 바 아래로 자연스럽게 사라지게) */
  showTopMask?: boolean;
  style?: ViewStyle;
}

/**
 * 하단 고정 액션 바 (공통). BottomSheet / 풀스크린 모달 등에서 버튼을 하단에 고정할 때 사용.
 * - safe-area 하단 인셋 반영
 * - showTopMask: 바 위쪽에 배경색→투명 그라디언트를 깔아 스크롤 콘텐츠가 바 아래로 부드럽게 사라짐
 */
export function BottomActionBar({children, background, showTopMask = true, style}: BottomActionBarProps) {
  const insets = useSafeAreaInsets();
  const bg = background ?? 'transparent';

  return (
    <View style={[styles.wrap, {paddingBottom: insets.bottom + Spacing.md, backgroundColor: bg}, style]}>
      {showTopMask && background ? (
        <LinearGradient
          colors={[withOpacity(background, 0), background]}
          style={styles.topMask}
          pointerEvents="none"
        />
      ) : null}
      <View style={styles.row}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.smd,
  },
  topMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -24,
    height: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
});
