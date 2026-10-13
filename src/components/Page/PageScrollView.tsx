import React, {forwardRef} from 'react';
import {ScrollView, StyleSheet, type ScrollViewProps} from 'react-native';
import {usePageContentPadding} from '@components/Navigation/FloatingNavBar';
import {useTabBarSpace} from '@hooks/useTabBarSpace';
import {Spacing} from '@constants/spacing';

/**
 * 페이지 본문 스크롤 — 앱바 아래 8, 탭바(안전영역 포함) 위 8을 여기서만 넣는다.
 *
 * 룰
 * - 앱바가 있는 페이지의 본문 스크롤은 이걸 쓴다(맨 ScrollView + 숫자 여백 금지).
 * - 안전영역은 이 컴포넌트가 맡으므로 바깥에서 SafeAreaView top/bottom으로 감싸지 않는다.
 * - 첫 섹션 위·마지막 섹션 아래에 marginTop/marginBottom, 빈 View 스페이서를 두지 않는다.
 *   섹션 사이 간격은 gap으로 준다.
 * - 빈 상태(EmptyState fullscreen)는 남은 높이의 상하 중앙에 온다. 그러려면 본문이 남은 높이를
 *   채워야 하므로 이 스크롤은 flexGrow:1이고, EmptyState를 감싸는 ContentContainer에는 fill을 준다.
 */
export const PageScrollView = forwardRef<ScrollView, ScrollViewProps>(function PageScrollView(
  {contentContainerStyle, ...rest},
  ref,
) {
  const pagePadding = usePageContentPadding();
  // 아래는 떠 있는 탭바(기기 안전영역 포함) 위 8까지 — 안전영역만 빼면 마지막 내용이 탭바에 가렸다
  const tabBarSpace = useTabBarSpace();
  return <ScrollView ref={ref} {...rest} contentContainerStyle={[styles.grow, pagePadding, {paddingBottom: tabBarSpace + Spacing.sm}, contentContainerStyle]} />;
});

const styles = StyleSheet.create({
  // 내용이 짧아도 화면 높이를 채운다 — 빈 상태가 상하 중앙에 오게
  grow: {flexGrow: 1},
});
