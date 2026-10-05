import React, {useEffect, useRef} from 'react';
import {Animated, PanResponder, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {Badge} from '@components/Badge';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {GlassContainer} from '@components/Container';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface CheatsheetRow {
  /** 왼쪽 — 무엇을 하는 줄인지 */
  label: string;
  /** 오른쪽 — 쓰는 기호(회색 뱃지로) */
  keys: string[];
}

/** 한 묶음 — 묶음끼리 붙여 한 목록처럼 보인다(제목·선·간격 없이) */
export interface CheatsheetSection {
  rows: CheatsheetRow[];
}

export interface CheatsheetProps {
  visible: boolean;
  /** 처음 자리 기준 — 여는 버튼의 화면 위치(measureInWindow). 메뉴처럼 그 아래 4, 오른쪽 끝 맞춤 */
  anchor?: {x: number; y: number; width: number; height: number} | null;
  sections: CheatsheetSection[];
  /** 맨 아래 한 줄 안내(끌어서 옮기기 등) */
  footer?: string;
}

/**
 * 단축키·쓰기 규칙 모음 — 묶음 제목 아래 "뜻 ··· 기호" 줄을 늘어놓는 떠 있는 패널.
 * 위 손잡이를 끌어 옮길 수 있어, 글을 쓰면서 가리지 않는 자리에 둔다. 여닫기는 부르는 쪽 버튼으로.
 * 부모의 전체 화면 레이어(예: BottomSheet floating) 안에 둔다.
 */
export function Cheatsheet({visible, anchor, sections, footer}: CheatsheetProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {width: windowWidth, height: windowHeight} = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY({x: 0, y: 0})).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // 열 때마다 처음 자리(위쪽 가운데)에서 페이드인
  useEffect(() => {
    if (!visible) return;
    pan.setValue({x: 0, y: 0});
    pan.setOffset({x: 0, y: 0});
    opacity.setValue(0);
    Animated.timing(opacity, {toValue: 1, duration: 150, useNativeDriver: true}).start();
  }, [visible, pan, opacity]);

  // 머리를 끌면 패널 전체가 따라온다
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
  const width = Math.min(200, windowWidth - Spacing.lg * 2);

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
      {/* 컨테이너는 메뉴와 같은 것 — 유리 컨테이너, radius lg, 짙은 그림자, surface/normal 배경 */}
      <GlassContainer
        borderRadius="lg"
        elevation="strong"
        contentStyle={{padding: Spacing.xs, maxHeight: windowHeight * 0.6, backgroundColor: colors['surface/normal']}}>
      {/* 맨 위 손잡이 — 바텀시트처럼. 잡고 끌면 패널이 따라온다(닫기는 여는 버튼으로) */}
      <View style={styles.handleArea} {...responder.panHandlers}>
        <View style={styles.handle} />
      </View>
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {sections.map((sec, si) => (
          <View key={si}>
            {sec.rows.map(row => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <View style={styles.keys}>
                  {row.keys.map(k => <Badge key={k} label={k} />)}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      {footer ? <View style={styles.footer} {...responder.panHandlers}><Text style={styles.footerText}>{footer}</Text></View> : null}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    minHeight: 30,
  },
  rowLabel: {
    flex: 1,
    // 줄 이름 — 바디 서체 레귤러, 기본보다 한 단계 옅은 글자색(var)
    ...Typography.body.small,
    fontFamily: 'Pretendard-Regular',
    fontWeight: '400',
    color: colors['foreground/on-surface-var'],
  },
  keys: {
    flexDirection: 'row',
    gap: 4,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors['border/muted'],
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.xs,
  },
  footerText: {
    ...Typography.label.small,
    color: colors['foreground/on-surface-muted'],
  },
});
