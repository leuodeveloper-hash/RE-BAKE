import React, {useRef, useState} from 'react';
import {PanResponder, StyleSheet, Text, View} from 'react-native';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {triggerHaptic} from '@utils/haptics';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface DotSliderProps {
  /** 고를 수 있는 값들(왼쪽 → 오른쪽) */
  items: {id: string; label: string}[];
  selectedId: string;
  /** 탭하거나 끄는 중 점이 바뀔 때마다 */
  onChange: (id: string) => void;
  /** 위 값 라벨(×0.75) — 메뉴 소제목에 값을 붙여 쓰면 끈다 */
  showLabel?: boolean;
  /** 중앙 기준(예: ×1) — 주면 그 점에서 손잡이까지만 채운다(줄이기는 왼쪽, 늘리기는 오른쪽) */
  centerId?: string;
}

const DOT = 4;
const TRACK_H = 16;
// 손잡이 — 트랙과 같은 높이의 동그라미
const HANDLE_W = TRACK_H;
const HANDLE_H = TRACK_H;
const PAD = TRACK_H / 2; // 첫·끝 점이 둥근 끝 안쪽에 오게
// 누르는 영역 높이 — 보이는 트랙(16)은 얇아도 손가락으로 잡기 쉽게 위아래를 넓힌다
const TOUCH_H = 32;
const TOP = (TOUCH_H - TRACK_H) / 2;

/**
 * 작은 점 슬라이더 — 메뉴 안 같은 좁은 곳용. 가로 줄에 값마다 점, 점을 탭하거나 줄 위를 끌어 고른다.
 * 위에 지금 값 라벨. 알약 줄 전체 오렌지 var + 흰 점(모두 같게), 손잡이는 흰색+그림자로 트랙 위에 떠 있다.
 */
export function DotSlider({items, selectedId, onChange, showLabel = true, centerId}: DotSliderProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [w, setW] = useState(0);
  const wRef = useRef(0);
  const lastRef = useRef(selectedId);
  lastRef.current = selectedId;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const count = items.length;
  const idx = Math.max(0, items.findIndex(i => i.id === selectedId));

  // 손가락 x → 가장 가까운 점
  const pick = (x: number) => {
    const n = itemsRef.current.length;
    if (n < 2 || wRef.current <= 0) return;
    const inner = Math.max(1, wRef.current - PAD * 2);
    const i = Math.min(n - 1, Math.max(0, Math.round(((x - PAD) / inner) * (n - 1))));
    const id = itemsRef.current[i].id;
    if (id !== lastRef.current) {
      lastRef.current = id;
      triggerHaptic('selection');
      onChange(id);
    }
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => pick(e.nativeEvent.locationX),
    onPanResponderMove: e => pick(e.nativeEvent.locationX),
  })).current;

  // 손잡이 위치(줄 안쪽 여백 PAD를 빼고 점 사이 균등) — 왼쪽은 채움+흰 점, 오른쪽은 흰 바탕+색 점
  const inner = Math.max(0, w - PAD * 2);
  const xOf = (i: number) => PAD + (count > 1 ? (inner * i) / (count - 1) : inner / 2);
  const hx = xOf(idx);
  const accent = colors['custom/orange-var'] as string;
  // 채움 시작점 — 중앙 기준 점(없으면 왼쪽 끝)
  const centerIdx = centerId != null ? items.findIndex(i => i.id === centerId) : -1;
  const fromX = centerIdx >= 0 ? xOf(centerIdx) : 0;

  return (
    <View style={styles.wrap}>
      {showLabel ? <Text style={styles.label}>{items[idx]?.label}</Text> : null}
      <View
        style={styles.track}
        onLayout={e => { wRef.current = e.nativeEvent.layout.width; setW(e.nativeEvent.layout.width); }}
        {...pan.panHandlers}>
        {w > 0 && (
          <>
            {/* 트랙 — 중앙 기준이면 옅은 바탕 + 기준점~손잡이만 오렌지 var, 아니면 왼쪽 끝~손잡이 */}
            <View pointerEvents="none" style={[styles.bar, {backgroundColor: centerIdx >= 0 ? colors['fill/strong'] : accent}]} />
            <View
              pointerEvents="none"
              style={[styles.fillSeg, {
                left: Math.min(fromX, hx),
                width: Math.abs(hx - fromX),
                backgroundColor: accent,
              }]}
            />
            {items.map((it, i) => (
              <View
                key={it.id}
                pointerEvents="none"
                style={[styles.dot, {
                  left: xOf(i) - DOT / 2,
                  // 점은 모두 같은 흰색 — 지금 위치는 손잡이가 보여준다(손잡이 자리 점만 숨김)
                  backgroundColor: colors['surface/bright'],
                  opacity: i === idx ? 0 : 1,
                }]}
              />
            ))}
            {/* 손잡이 — 세로 막대 */}
            {/* 손잡이 — 트랙 높이의 흰 동그라미 + 그림자로 위에 떠 보인다 */}
            <View pointerEvents="none" style={[styles.handle, {left: hx - HANDLE_W / 2, backgroundColor: colors['surface/bright']}]} />
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  wrap: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.body['medium - semibold'],
    color: colors['foreground/on-surface'],
    textAlign: 'center',
  },
  track: {
    height: TOUCH_H,
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: TOP,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
  },
  fillSeg: {
    position: 'absolute',
    top: TOP,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    top: TOP + (TRACK_H - DOT) / 2,
  },
  handle: {
    position: 'absolute',
    top: TOP - (HANDLE_H - TRACK_H) / 2,
    // 트랙 위에 떠 있는 그림자
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.24)',
    width: HANDLE_W,
    height: HANDLE_H,
    borderRadius: HANDLE_H / 2,
  },
});
