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
  /**
   * 내용이 카드 밖으로 나갈 수 있게 클립 해제.
   * 회전·그림자로 모서리가 삐져나오는 콘텐츠(요리모드 사진 스택 등)에 필요.
   */
  clip?: boolean;
}

/**
 * 공통 카드 컴포넌트
 * - surface-surfacebright 배경
 * - radius-lg 모서리
 * - borderlight 테두리
 */
export function Card({children, style, variant = 'default', clip = true}: CardProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <CardVariantContext.Provider value={variant}>
      <View style={[styles.card, variant === 'yellow' && styles.cardYellow, !clip && styles.noClip, style]}>
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
  // borderRadius가 남아 있으면 RN이 여전히 모서리를 클립하므로 같이 해제한다.
  noClip: {
    overflow: 'visible',
    borderRadius: 0,
  },
  // 옐로우 카드 테두리 — 배경만으로는 페이지 배경과 경계가 흐려 보인다
  // 옐로우 카드 배경 — 반투명 오버레이가 아닌 불투명 단색.
  // 반투명은 뒤 페이지 배경이 비쳐 탁해지고, 그 위에 얹는 요소의 색도 흐려진다.
  cardYellow: {
    backgroundColor: colors['custom/yellow-container'],
    borderWidth: 1,
    borderColor: colors['custom/yellow-border'],
  },
});
