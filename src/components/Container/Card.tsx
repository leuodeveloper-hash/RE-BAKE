import React, {createContext, useContext} from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';

export type CardVariant = 'default' | 'yellow';

const CardVariantContext = createContext<CardVariant>('default');
export const useCardVariant = () => useContext(CardVariantContext);

export interface CardProps {
  children: React.ReactNode;
  /** 추가 스타일 */
  style?: ViewStyle;
  /** 컬러 배리언트 */
  variant?: CardVariant;
}

/**
 * 공통 카드 컴포넌트
 * - surface-surfacebright 배경
 * - radius-lg 모서리
 * - borderlight 테두리
 */
export function Card({children, style, variant = 'default'}: CardProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <CardVariantContext.Provider value={variant}>
      <View style={[styles.card, style]}>
        {variant === 'yellow' && <View style={styles.colorOverlay} />}
        {children}
      </View>
    </CardVariantContext.Provider>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  card: {
    backgroundColor: colors['surface/bright'],
    borderRadius: Radius['radius-lg'],
    overflow: 'hidden',
  },
  colorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors['custom/yellow-subtle'],
  },
});
