import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';

export interface CardProps {
  children: React.ReactNode;
  /** 추가 스타일 */
  style?: ViewStyle;
}

/**
 * 공통 카드 컴포넌트
 * - surface-surfacebright 배경
 * - radius-lg 모서리
 * - borderlight 테두리
 */
export function Card({children, style}: CardProps) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  card: {
    backgroundColor: colors['surface-surfacebright'],
    borderRadius: Radius['radius-lg'],
    overflow: 'hidden',
  },
});
