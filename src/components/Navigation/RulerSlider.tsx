import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {GlassContainer} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {IconChevronLeft, IconChevronRight} from '@components/Icon/IconIndex';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

export interface RulerSliderItem {
  id: string;
  label: string;
}

export interface RulerSliderProps {
  /** 슬라이드 대상 목록 (회차, 같은 그룹/태그 내 항목 등 범용) */
  items: RulerSliderItem[];
  /** 현재 선택된 항목 id */
  selectedId?: string;
  /** 항목 선택 시 콜백 */
  onSelect?: (id: string) => void;
  /**
   * 중앙 라벨 탭 시 콜백. 지정하면 라벨이 탭 가능해짐.
   * 슬라이더 축 전환(예: 회차 ↔ 같은 태그/그룹 항목)에 사용.
   */
  onLabelPress?: () => void;
}

// 눈금 간격/크기 (Figma: width 2, gap 12, height 8 / major·active 16)
const TICK_W = 2;
const TICK_GAP = 12;
const SPACING = TICK_W + TICK_GAP; // 14
const TICK_H = 8;
const TICK_H_MAJOR = 16; // 5칸마다 긴 눈금 (Figma 기준 active와 동일 높이, 색만 다름)
const TICK_H_ACTIVE = 16;
const RULER_W = 168; // 눈금 뷰포트 가로폭 (양옆 클립)
// 측정 자처럼 항상 꽉 차 보이도록 실제 항목 양옆에 채우는 장식 눈금 수
const PAD = 7;
// 손가락 이동 대비 눈금 이동 비율 (<1 일수록 더 길게 끌어야 한 칸 이동 → 스냅 느낌 강화)
const DRAG_GAIN = 0.5;

/**
 * 눈금 슬라이더: 가로로 드래그하면 눈금에 딱딱 스냅, 좌우 화살표로 한 칸 이동.
 * 회차 전환 외에 같은 그룹/태그 내 항목 이동 등에 범용으로 재사용 가능.
 */
export function RulerSlider({
  items,
  selectedId,
  onSelect,
  onLabelPress,
}: RulerSliderProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();

  const count = items.length;
  const selectedIndex = Math.max(
    0,
    items.findIndex(i => i.id === selectedId),
  );

  // 실제 항목 i를 중앙에 놓는 translateX (앞쪽 PAD개 장식 눈금만큼 보정)
  const resting = (i: number) => -(PAD + i) * SPACING;

  const translateX = useRef(new Animated.Value(resting(selectedIndex))).current;
  const committedIndex = useRef(selectedIndex);
  const panStart = useRef(resting(selectedIndex));
  const liveIndexRef = useRef(selectedIndex);
  const countRef = useRef(count);
  countRef.current = count;

  const [liveIndex, setLiveIndexState] = useState(selectedIndex);
  const setLive = (i: number) => {
    liveIndexRef.current = i;
    setLiveIndexState(i);
  };

  // 최신 props/상태를 반영하는 commit (PanResponder는 1회만 생성되므로 ref로 호출)
  const commitRef = useRef<
    (idx: number, haptic?: boolean, fireSelect?: boolean) => void
  >(() => {});
  commitRef.current = (idx, haptic = true, fireSelect = true) => {
    const clamped = Math.min(count - 1, Math.max(0, idx));
    const changed = clamped !== committedIndex.current;
    committedIndex.current = clamped;
    panStart.current = resting(clamped);
    setLive(clamped);
    Animated.spring(translateX, {
      toValue: resting(clamped),
      useNativeDriver: true,
      tension: 300,
      friction: 28,
    }).start();
    if (changed && haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (changed && fireSelect) {
      onSelect?.(items[clamped].id);
    }
  };

  // 외부에서 selectedId가 바뀌면 동기화
  useEffect(() => {
    if (selectedIndex !== committedIndex.current) {
      commitRef.current(selectedIndex, false, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        translateX.stopAnimation();
        panStart.current = resting(committedIndex.current);
      },
      onPanResponderMove: (_, g) => {
        const c = countRef.current;
        const min = resting(c - 1);
        const max = resting(0);
        let next = panStart.current + g.dx * DRAG_GAIN;
        // 양 끝 러버밴드
        if (next > max) next = max + (next - max) * 0.3;
        else if (next < min) next = min + (next - min) * 0.3;
        translateX.setValue(next);
        const live = Math.min(
          c - 1,
          Math.max(0, Math.round(-next / SPACING) - PAD),
        );
        if (live !== liveIndexRef.current) {
          setLive(live);
          Haptics.selectionAsync();
        }
      },
      onPanResponderRelease: (_, g) => {
        // 관성 약간 반영해 가까운 눈금으로 스냅
        const projected = panStart.current + (g.dx + g.vx * 50) * DRAG_GAIN;
        commitRef.current(Math.round(-projected / SPACING) - PAD);
      },
      onPanResponderTerminate: () => {
        commitRef.current(committedIndex.current, false, false);
      },
    }),
  ).current;

  const atStart = liveIndex <= 0;
  const atEnd = liveIndex >= count - 1;

  return (
    <GlassContainer borderRadius="full" intensity={80} contentStyle={styles.pill}>
      <IconButton
        icon={IconChevronLeft}
        variant={atStart ? 'ghost' : 'soft'}
        size="medium"
        disabled={atStart}
        onPress={() => commitRef.current(committedIndex.current - 1)}
      />

      <View style={styles.center} {...pan.panHandlers}>
        {onLabelPress ? (
          <Pressable onPress={onLabelPress} hitSlop={8}>
            <Text style={styles.label} numberOfLines={1}>
              {items[liveIndex]?.label}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.label} numberOfLines={1}>
            {items[liveIndex]?.label}
          </Text>
        )}
        <View style={styles.rulerViewport}>
          <Animated.View
            style={[styles.rulerRow, {transform: [{translateX}]}]}>
            {Array.from({length: PAD + count + PAD}).map((_, slot) => {
              // slot 0..PAD-1: 앞쪽 장식, PAD..PAD+count-1: 실제 항목, 이후: 뒤쪽 장식
              const real = slot - PAD;
              const isItem = real >= 0 && real < count;
              const isActive = isItem && real === liveIndex;
              const isMajor = slot % 5 === 0;
              const height = isActive
                ? TICK_H_ACTIVE
                : isMajor
                  ? TICK_H_MAJOR
                  : TICK_H;
              return (
                <View
                  key={isItem ? items[real].id : `pad-${slot}`}
                  style={[
                    styles.tick,
                    {
                      height,
                      backgroundColor: isActive
                        ? colors['custom/orange-var']
                        : colors['border/normal'],
                    },
                  ]}
                />
              );
            })}
          </Animated.View>
        </View>
      </View>

      <IconButton
        icon={IconChevronRight}
        variant={atEnd ? 'ghost' : 'soft'}
        size="medium"
        disabled={atEnd}
        onPress={() => commitRef.current(committedIndex.current + 1)}
      />
    </GlassContainer>
  );
}

const createStyles = (colors: SemanticColorsV2) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.smd,
      paddingHorizontal: Spacing.smd,
      paddingVertical: Spacing.smd,
      width: 328,
      maxWidth: 328,
    },
    // 콘텐츠 행 높이 = 아이콘 버튼(40). 라벨은 이 안에서 상하좌우 정중앙,
    // 눈금은 바닥에 절대배치되는 오버레이 (Figma 구조 매칭).
    center: {
      flex: 1,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      ...Typography.label['xlarge - semibold'],
      color: colors['foreground/on-surface'],
      textAlign: 'center',
    },
    rulerViewport: {
      position: 'absolute',
      bottom: 0,
      left: '50%',
      marginLeft: -RULER_W / 2,
      width: RULER_W,
      height: TICK_H_ACTIVE,
      overflow: 'hidden',
    },
    rulerRow: {
      position: 'absolute',
      left: RULER_W / 2 - TICK_W / 2,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: TICK_GAP,
    },
    tick: {
      width: TICK_W,
      borderRadius: TICK_W / 2,
    },
  });
