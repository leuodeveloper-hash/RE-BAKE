import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, LayoutChangeEvent, PanResponder, StyleSheet, Text, View} from 'react-native';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconArrowRight, IconTick} from '@components/Icon/IconIndex';
import {Radius, type SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {triggerHaptic} from '@utils/haptics';

const TRACK_H = 56;
const KNOB_M = 4; // 트랙 안쪽 여백

export interface SlideToConfirmProps {
  /** 트랙에 표시할 안내 문구 */
  label: string;
  /** 완료 후 표시할 문구 */
  confirmedLabel?: string;
  /** 끝까지 밀었을 때 */
  onConfirm: () => void;
  /** 완료 상태에서 반대로 밀어 되돌렸을 때 (없으면 되돌리기 비활성) */
  onUndo?: () => void;
  /** 이미 완료된 상태로 표시 */
  confirmed?: boolean;
  disabled?: boolean;
}

/**
 * 밀어서 확인 — 되돌리기 어려운 마무리 동작에 쓴다(오탭 방지).
 * 손잡이를 끝까지(80% 이상) 밀면 확정되고, 못 미치면 원위치로 되돌아온다.
 */
export function SlideToConfirm({
  label,
  confirmedLabel,
  onConfirm,
  onUndo,
  confirmed = false,
  disabled = false,
}: SlideToConfirmProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [done, setDone] = useState(confirmed);
  const x = useRef(new Animated.Value(0)).current;
  // PanResponder 클로저가 최신 값을 보도록 ref로 유지
  const maxRef = useRef(0);
  const doneRef = useRef(confirmed);
  doneRef.current = done;
  const onUndoRef = useRef(onUndo);
  onUndoRef.current = onUndo;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    // 손잡이는 left:KNOB_M에서 시작하고 폭이 TRACK_H - KNOB_M*2 이므로,
    // 오른쪽 끝까지 가는 거리는 w - TRACK_H 다(KNOB_M을 두 번 빼면 그만큼 덜 간다)
    setTrackW(w);
    maxRef.current = Math.max(0, w - TRACK_H);
    // 이미 완료 상태면 손잡이를 오른쪽 끝에 둔다(되돌리기 시작 위치)
    if (doneRef.current) x.setValue(maxRef.current);
  }, [x]);

  // 바깥에서 confirmed가 바뀐 경우 동기화
  useEffect(() => {
    setDone(confirmed);
    x.setValue(confirmed ? maxRef.current : 0);
  }, [confirmed, x]);

  // next: 이동 후 확정 상태(true=숙지, false=미숙지, null=상태 변화 없음)
  const settle = useCallback((toValue: number, next: boolean | null) => {
    Animated.spring(x, {toValue, useNativeDriver: true, friction: 9, tension: 90}).start(() => {
      if (next === null) return;
      setDone(next);
      triggerHaptic(next ? 'success' : 'light');
      if (next) onConfirm(); else onUndo?.();
    });
  }, [x, onConfirm, onUndo]);

  const pan = useRef(
    PanResponder.create({
      // 완료 상태여도 되돌리기(onUndo)가 있으면 잡는다
      onStartShouldSetPanResponder: () => !disabled && (!doneRef.current || !!onUndoRef.current),
      onMoveShouldSetPanResponder: (_, g) =>
        !disabled && (!doneRef.current || !!onUndoRef.current) && Math.abs(g.dx) > 2,
      onPanResponderMove: (_, g) => {
        const max = maxRef.current;
        // 완료 상태면 손잡이가 오른쪽 끝(max)에서 시작 → 왼쪽으로만 이동
        const base = doneRef.current ? max : 0;
        x.setValue(Math.min(Math.max(0, base + g.dx), max));
      },
      onPanResponderRelease: (_, g) => {
        const max = maxRef.current;
        if (max <= 0) return;
        const base = doneRef.current ? max : 0;
        const pos = Math.min(Math.max(0, base + g.dx), max);
        if (doneRef.current) {
          // 되돌리기: 20% 아래까지 밀면 해제, 아니면 다시 끝으로
          if (pos <= max * 0.2) settle(0, false);
          else settle(max, null);
        } else {
          // 확정: 80% 이상 밀면 숙지, 아니면 원위치
          if (pos >= max * 0.8) settle(max, true);
          else settle(0, null);
        }
      },
      onPanResponderTerminate: () => settle(doneRef.current ? maxRef.current : 0, null),
    }),
  ).current;

  const isDone = done || confirmed;
  // 절반을 지나면 두 문구가 교차한다 — 완료 문구가 차오르고 원래 문구는 사라진다.
  // 놓으면 확정된다는 예고를, 딱 바뀌는 대신 손잡이 위치에 붙여 보여준다.
  const [trackW, setTrackW] = useState(0);
  const half = Math.max(1, (trackW - TRACK_H) * 0.5);
  const fadeIn = x.interpolate({inputRange: [half, half * 2], outputRange: [0, 1], extrapolate: 'clamp'});
  const fadeOut = x.interpolate({inputRange: [half, half * 2], outputRange: [1, 0], extrapolate: 'clamp'});
  // 밀수록 트랙이 accent로 물든다 — 확정에 가까워지는 걸 색으로도 보여준다.
  // useNativeDriver는 색을 다루지 못하므로 accent 레이어의 투명도를 움직인다.
  const accentIn = x.interpolate({inputRange: [0, Math.max(1, half * 2)], outputRange: [0, 1], extrapolate: 'clamp'});

  return (
    <View
      style={[styles.track, isDone && styles.trackDone, disabled && styles.trackDisabled]}
      onLayout={onLayout}>
      {!isDone && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.accentFill, {opacity: accentIn}]}
        />
      )}
      {isDone ? (
        // 손잡이가 오른쪽 끝에 있으므로 그만큼 비워 텍스트가 가려지지 않게
        <View style={[styles.doneRow, {paddingRight: TRACK_H}]}>
          <Text style={styles.doneText}>{confirmedLabel ?? label}</Text>
        </View>
      ) : (
        // 두 문구를 같은 자리에 겹친다 — 흐름에 하나만 두고 나머지를 절대위치로
        // 얹으면 중앙 정렬 기준이 어긋나지 않는다
        <View pointerEvents="none">
          <Animated.Text style={[styles.label, {opacity: fadeOut}]} numberOfLines={1}>
            {label}
          </Animated.Text>
          <Animated.View style={[StyleSheet.absoluteFill, styles.labelOverlay, {opacity: fadeIn}]}>
            <Text style={styles.label} numberOfLines={1}>
              {confirmedLabel ?? label}
            </Text>
          </Animated.View>
        </View>
      )}
      {/* 손잡이는 항상 렌더 — 완료 상태에선 오른쪽 끝에서 왼쪽으로 밀어 되돌린다 */}
      <Animated.View
        style={[styles.knob, {transform: [{translateX: x}]}]}
        {...pan.panHandlers}>
        <AppIcon
          icon={isDone ? IconTick : IconArrowRight}
          size="sm"
          // 손잡이가 흰 원이라 아이콘은 트랙과 같은 어두운 색이어야 보인다
          color={colors['background/primary']}
        />
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  // 트랙 전체가 채워진 색, 손잡이는 그 위에 뜬 반투명 원(레퍼런스와 동일 구조)
  track: {
    height: TRACK_H,
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['background/primary'],
    justifyContent: 'center',
    overflow: 'hidden',
  },
  accentFill: {
    backgroundColor: colors['background/accent'],
  },
  trackDone: {
    // 미는 동안 accent로 물들다가 완료에서 primary로 돌아가면 어색하다
    backgroundColor: colors['background/accent'],
  },
  trackDisabled: {
    opacity: 0.5,
  },
  labelOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.label.large,
    fontWeight: Typography.label.large.fontWeight as '500',
    color: colors['foreground/on-primary'],
    textAlign: 'center',
  },
  knob: {
    position: 'absolute',
    left: KNOB_M,
    width: TRACK_H - KNOB_M * 2,
    height: TRACK_H - KNOB_M * 2,
    borderRadius: Radius['radius-full'],
    // 트랙 위에 얹힌 흰 원 — 반투명이면 트랙 색이 비쳐 손잡이가 덜 또렷하다
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  doneText: {
    ...Typography.label.large,
    fontWeight: Typography.label.large.fontWeight as '500',
    color: colors['foreground/on-primary'],
  },
});

export default SlideToConfirm;
