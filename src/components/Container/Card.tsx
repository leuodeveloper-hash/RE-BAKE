import React, {createContext, useContext} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {Container} from './Container';

export type CardVariant = 'default' | 'yellow';

const CardVariantContext = createContext<CardVariant>('default');
export const useCardVariant = () => useContext(CardVariantContext);

/** 묶음 카드 안인지 — 안의 목록 줄(ListItem)은 선 대신 자기 바탕만 그린다 */
const CardGroupContext = createContext(false);
export const useInCardGroup = () => useContext(CardGroupContext);

/** 묶음 카드 항목 사이 간격 — 선 대신 이 간격으로 뒤(페이지 배경)가 비쳐 구분된다 */
export const CARD_GROUP_GAP = 1;
/** 묶음 카드 맨 위·맨 아래 항목 모서리 — 카드가 잘라내기를 풀어도(메뉴가 카드 밖으로 나올 때) 라운딩이 남게 */
export const CARD_FIRST = {borderTopLeftRadius: Radius['radius-lg'], borderTopRightRadius: Radius['radius-lg']};
export const CARD_LAST = {borderBottomLeftRadius: Radius['radius-lg'], borderBottomRightRadius: Radius['radius-lg']};

export interface CardProps {
  children: React.ReactNode;
  /** 추가 스타일 */
  style?: StyleProp<ViewStyle>;
  /** 컬러 배리언트 */
  variant?: CardVariant;
  /**
   * 내용이 카드 밖으로 나갈 수 있게 클립 해제.
   * 회전·그림자로 모서리가 삐져나오는 콘텐츠(요리모드 사진 스택 등)에 필요.
   */
  clip?: boolean;
  /**
   * 섹션 묶음 — 바깥은 라운딩만, 안의 항목은 각자 바탕(CardItem·ListItem)을 갖고 사이를 1px 띄워 구분한다.
   * 줄마다 선을 그리던 방식은 선이 위 레이어(메뉴 등)를 뚫고 보였다.
   */
  group?: boolean;
}

/**
 * 공통 카드 컴포넌트
 * - surface-surfacebright 배경
 * - radius-lg 모서리
 * - borderlight 테두리
 */
export function Card({children, style, variant = 'default', clip = true, group = false}: CardProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <CardVariantContext.Provider value={variant}>
      <CardGroupContext.Provider value={group}>
        <View style={[styles.card, variant === 'yellow' && styles.cardYellow, group && styles.group, !clip && (group ? styles.noClipGroup : styles.noClip), style]}>
          {children}
        </View>
      </CardGroupContext.Provider>
    </CardVariantContext.Provider>
  );
}

/** 묶음 카드의 항목 하나 — 카드 바탕색을 직접 갖는다(목록 줄이 아닌 칸: 머리·버튼 줄·글 칸 등) */
export function CardItem({children, style}: {children: React.ReactNode; style?: StyleProp<ViewStyle>}) {
  const styles = useThemedStyles(createStyles);
  const variant = useCardVariant();
  // 공통 Container의 bright(surface/bright) 재질 — 모서리는 바깥 묶음 카드가 준다
  return (
    <Container material="bright" borderRadius={0} style={[variant === 'yellow' && styles.itemYellow, style]}>
      {children}
    </Container>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  group: {
    backgroundColor: 'transparent',
    gap: CARD_GROUP_GAP,
  },
  itemYellow: {
    backgroundColor: colors['custom/yellow-container'],
  },
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
  // 묶음 카드는 풀어도 라운딩 유지 — 바탕이 없어 모서리는 맨 위·아래 항목(CARD_FIRST/LAST)이 그린다
  noClipGroup: {
    overflow: 'visible',
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
