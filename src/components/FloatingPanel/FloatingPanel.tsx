import React, {useEffect, useRef} from 'react';
import {Animated, PanResponder, ScrollView, StyleSheet, View, useWindowDimensions} from 'react-native';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {GlassContainer} from '@components/Container';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';

export interface FloatingPanelProps {
  visible: boolean;
  /** 처음 자리 기준 — 여는 버튼의 화면 위치(measureInWindow). 메뉴처럼 그 아래 4, 오른쪽 끝 맞춤. 없으면 위쪽 가운데 */
  anchor?: {x: number; y: number; width: number; height: number} | null;
  /** 패널 폭(최대) — 기본 200 */
  width?: number;
  /**
   * 손잡이(드래거) — 있으면 끌어 옮기는 패널, 없으면 제자리에 고정된 패널. 기본 true.
   * 옮길 수 있는지는 손잡이로 보여준다(손잡이 없이 움직이면 알 수가 없다).
   */
  draggable?: boolean;
  /** 내용 슬롯 — 무엇이든(단축키 목록 등) */
  children: React.ReactNode;
}

/**
 * 떠 있는 패널 — 글을 쓰면서 옆에 띄워 두는 작은 창.
 * 위 손잡이를 끌어 옮길 수 있고(가리지 않는 자리로), 닫기 전까지 열려 있다. 여닫기는 부르는 쪽 버튼으로.
 * 컨테이너는 메뉴와 같다(유리 컨테이너, radius lg, 짙은 그림자, surface/normal). 내용은 children 슬롯.
 * 부모의 전체 화면 레이어(예: BottomSheet floating) 안에 둔다.
 */
export function FloatingPanel({visible, anchor, width: maxWidth = 200, draggable = true, children}: FloatingPanelProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {width: windowWidth, height: windowHeight} = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY({x: 0, y: 0})).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // 열 때마다 처음 자리에서 페이드인
  useEffect(() => {
    if (!visible) return;
    pan.setValue({x: 0, y: 0});
    pan.setOffset({x: 0, y: 0});
    opacity.setValue(0);
    Animated.timing(opacity, {toValue: 1, duration: 150, useNativeDriver: true}).start();
  }, [visible, pan, opacity]);

  // 손잡이를 끌면 패널 전체가 따라온다
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 2,
    onPanResponderGrant: () => {
      pan.setOffset({x: (pan.x as any)._value, y: (pan.y as any)._value});
      pan.setValue({x: 0, y: 0});
    },
    onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {useNativeDriver: false}),
    onPanResponderRelease: () => pan.flattenOffset(),
    onPanResponderTerminate: () => pan.flattenOffset(),
  })).current;

  if (!visible) return null;
  const width = Math.min(maxWidth, windowWidth - Spacing.lg * 2);

  return (
    <Animated.View
      style={[
        styles.panel,
        anchor
          // 버튼 바로 아래 4, 오른쪽 끝을 버튼 오른쪽에 — 화면 밖으로 나가지 않게
          ? {width, top: anchor.y + anchor.height + 4, left: Math.max(Spacing.sm, Math.min(anchor.x + anchor.width - width, windowWidth - width - Spacing.sm))}
          : {width, top: 64, left: (windowWidth - width) / 2},
        {opacity, transform: pan.getTranslateTransform()},
      ]}>
      <GlassContainer
        borderRadius="lg"
        elevation="strong"
        contentStyle={{padding: Spacing.xs, maxHeight: windowHeight * 0.6, backgroundColor: colors['surface/normal']}}>
        {/* 맨 위 손잡이 — 바텀시트처럼. 고정 패널이면 없다 */}
        {draggable ? (
          <View style={styles.handleArea} {...responder.panHandlers}>
            <View style={styles.handle} />
          </View>
        ) : null}
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </GlassContainer>
    </Animated.View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  panel: {
    position: 'absolute',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors['border/normal'],
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
});
