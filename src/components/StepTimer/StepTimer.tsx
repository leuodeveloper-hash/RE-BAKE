import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {triggerHaptic} from '@utils/haptics';
import type {SemanticColors} from '@constants/tokens';
import {NOTICE_COLOR, noticeLabelStyle, noticePillStyle, noticeShadow} from '@components/FloatingNotice/FloatingNotice';
import {IconClockFilled} from '@components/Icon/IconIndex';
import {parseTime, TimeDialog} from '@components/Dialog/TimeDialog';

export interface StepTimerProps {
  /** 작성자가 정한 기본 시간 — 시간 설정 칸과 같은 형식("1시간 30분", "40분") */
  duration: string;
}

/** "1시간 30분" → 초 */
export function durationSeconds(duration: string): number {
  const {hours, minutes} = parseTime(duration);
  return ((parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0)) * 60;
}

/** 남은 초 → "40:00" / "1:05:09" */
function clock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

type Phase = 'idle' | 'running' | 'paused' | 'done';

/**
 * 과정 묶음 타이머 — 묶음 이름 앞의 작은 알약(업데이트됨 알림과 같은 크기·모양).
 * 누르면 시작 → 남은 시간이 줄어든다. 다시 누르면 멈춤/이어서.
 * 길게 누르면 시간 설정(상세 시간 칸과 같은 창) — 보는 사람이 이번에만 바꿔 쓴다. 저장하지 않으므로
 * 페이지를 나갔다 오면 작성자가 정한 기본 시간으로 돌아간다. 설정하면 처음부터.
 * 끝나면 '완료'로 바뀌고 진동, 누르면 처음으로.
 * 남은 시간은 끝나는 시각 기준으로 계산해, 화면이 잠깐 멈춰도 밀리지 않는다.
 */
export function StepTimer({duration: defaultDuration}: StepTimerProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {t} = useTranslation();
  // 이번에만 바꾼 시간(저장 안 함). 작성자 기본값이 바뀌면 그걸로 다시
  const [duration, setDuration] = useState(defaultDuration);
  useEffect(() => { setDuration(defaultDuration); }, [defaultDuration]);
  const [editing, setEditing] = useState(false);
  const total = durationSeconds(duration);
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(total);
  const endAt = useRef(0);

  // 시간 설정이 바뀌면 처음으로
  useEffect(() => { setPhase('idle'); setLeft(total); }, [total]);

  useEffect(() => {
    if (phase !== 'running') return;
    const tick = () => {
      const remain = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(remain);
      if (remain === 0) { setPhase('done'); triggerHaptic('success'); }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase]);

  if (durationSeconds(defaultDuration) <= 0) return null;

  const onPress = () => {
    triggerHaptic('light');
    if (phase === 'running') { setPhase('paused'); return; }
    if (phase === 'done') { setPhase('idle'); setLeft(total); return; }
    endAt.current = Date.now() + left * 1000;
    setPhase('running');
  };
  const onLongPress = () => {
    triggerHaptic('medium');
    setEditing(true);
  };

  // 돌아가는 중·끝남은 블루(업데이트됨 알림과 같은 색), 멈춤·대기는 옅은 바탕
  const active = phase === 'running' || phase === 'done';
  const blue = NOTICE_COLOR;
  const fg = active ? (colors['foreground/on-surface-inverse'] as string) : (colors['foreground/on-surface'] as string);
  const label = phase === 'idle' ? duration : phase === 'done' ? '완료' : clock(left);

  return (
    <>
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      hitSlop={4}
      style={({pressed}) => [
        styles.pill,
        active
          ? {backgroundColor: blue, boxShadow: noticeShadow(blue)} as any
          : styles.pillIdle,
        pressed && styles.pressed,
      ]}>
      <IconClockFilled width={16} height={16} color={fg} />
      <Text style={[styles.label, {color: fg}]} numberOfLines={1}>{label}</Text>
    </Pressable>
    <TimeDialog
      visible={editing}
      onClose={() => setEditing(false)}
      title={t('recipeEdit.groupTimer')}
      value={duration}
      // 같은 시간으로 확인해도 처음부터(시간이 그대로면 total 효과가 안 돌아 직접 되돌린다)
      onConfirm={v => { setDuration(v); setPhase('idle'); setLeft(durationSeconds(v)); }}
      // 비우면 작성자 기본 시간으로
      onDelete={() => { setDuration(defaultDuration); setPhase('idle'); setLeft(durationSeconds(defaultDuration)); }}
    />
    </>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  pill: noticePillStyle,
  pillIdle: {
    backgroundColor: colors['fill/normal'],
  },
  pressed: {
    opacity: 0.85,
    transform: [{scale: 0.97}],
  },
  label: {
    ...noticeLabelStyle,
    fontVariant: ['tabular-nums'], // 숫자 폭 고정 — 줄어들 때 알약이 흔들리지 않게
  },
});
