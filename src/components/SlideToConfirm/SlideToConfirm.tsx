import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, LayoutChangeEvent, PanResponder, StyleSheet, Text, View} from 'react-native';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconArrowRight, IconCircleCheck} from '@components/Icon/IconIndex';
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
  const [trackW, setTrackW] = useState(0);
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
    setTrackW(w);
    maxRef.current = Math.max(0, w - TRACK_H - KNOB_M * 2);
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
    Animated.spring(x, {toValue, useNativeDriver: true, bounciness: 0, speed: 14}).start(() => {
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
  // 진행할수록 안내 문구가 흐려짐
  const labelOpacity = trackW > 0
    ? x.interpolate({inputRange: [0, Math.max(1, maxRef.current)], outputRange: [1, 0]})
    : 1;

  return (
    <View
      style={[styles.track, isDone && styles.trackDone, disabled && styles.trackDisabled]}
      onLayout={onLayout}>
      {isDone ? (
        // 손잡이가 오른쪽 끝에 있으므로 그만큼 비워 텍스트가 가려지지 않게
        <View style={[styles.doneRow, {paddingRight: TRACK_H}]}>
          <Text style={styles.doneText}>{confirmedLabel ?? label}</Text>
        </View>
      ) : (
        <Animated.Text style={[styles.label, {opacity: labelOpacity}]} numberOfLines={1}>
          {label}
        </Animated.Text>
      )}
      {/* 손잡이는 항상 렌더 — 완료 상태에선 오른쪽 끝에서 왼쪽으로 밀어 되돌린다 */}
      <Animated.View
        style={[styles.knob, {transform: [{translateX: x}]}]}
        {...pan.panHandlers}>
        <AppIcon
          icon={isDone ? IconCircleCheck : IconArrowRight}
          size="sm"
          color={colors['foreground/on-accent']}
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
    backgroundColor: colors['background/accent'],
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackDone: {
    backgroundColor: colors['background/accent'],
  },
  trackDisabled: {
    opacity: 0.5,
  },
  label: {
    ...Typography.label.large,
    fontWeight: Typography.label.large.fontWeight as '500',
    color: colors['foreground/on-accent'],
    textAlign: 'center',
  },
  knob: {
    position: 'absolute',
    left: KNOB_M,
    width: TRACK_H - KNOB_M * 2,
    height: TRACK_H - KNOB_M * 2,
    borderRadius: Radius['radius-full'],
    // 트랙 위에 얹힌 반투명 흰 원
    backgroundColor: 'rgba(255,255,255,0.28)',
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
    color: colors['foreground/on-accent'],
  },
});

export default SlideToConfirm;
