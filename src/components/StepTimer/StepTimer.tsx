import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {triggerHaptic} from '@utils/haptics';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {noticeLabelStyle, noticePillStyle} from '@components/FloatingNotice/FloatingNotice';
import {IconTimerTwotone, IconEditFilled, IconPauseFilled, IconPlayFilled, IconRefresh} from '@components/Icon/IconIndex';
import {Menu} from '@components/Menu/Menu';
import {View} from 'react-native';
import {parseTime, TimeDialog} from '@components/Dialog/TimeDialog';

export interface StepTimerProps {
  /** 작성자가 정한 기본 시간 — 시간 설정 칸과 같은 형식("1시간 30분", "40분"). 비어 있으면 재생 아이콘만(누르면 설정) */
  duration?: string;
  /**
   * 편집 모드 — 주면 돌아가지 않고 누르면 시간 설정, 정한 값을 넘긴다(비우면 undefined = 타이머 끄기).
   * 상세(보기)와 같은 모양을 편집 화면에서도 쓰기 위함.
   */
  onChange?: (duration?: string) => void;
  /** 시간이 없으면 버튼을 숨긴다(설정 창만 둔다) — 헤더 ⋮ 메뉴 '타이머 설정'으로 여는 곳 */
  hideWhenUnset?: boolean;
  /** 길게 누르기 메뉴 열림/닫힘 — 감싼 쪽이 이 줄을 맨 위 레이어로 올릴 때 */
  onMenuOpenChange?: (open: boolean) => void;
}

/** "1시간 30분" → 초 */
export function durationSeconds(duration: string): number {
  const {hours, minutes} = parseTime(duration);
  return ((parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0)) * 60;
}

/** 초 → 항상 "00:00:00"(시:분:초) */
function clock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
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
/** 바깥(섹션 헤더 메뉴 '타이머 설정' 등)에서 시간 설정 창 열기 */
export interface StepTimerHandle {
  openEditor: () => void;
}

export const StepTimer = forwardRef<StepTimerHandle, StepTimerProps>(function StepTimer({duration: defaultDuration = '', onChange, hideWhenUnset, onMenuOpenChange}, ref) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {t} = useTranslation();
  // 이번에만 바꾼 시간(저장 안 함). 작성자 기본값이 바뀌면 그걸로 다시
  const [duration, setDuration] = useState(defaultDuration);
  useEffect(() => { setDuration(defaultDuration); }, [defaultDuration]);
  const [editing, setEditing] = useState(false);
  useImperativeHandle(ref, () => ({openEditor: () => setEditing(true)}), []);
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


  // 시간이 없으면(작성자가 안 정했고 이번에도 안 정함) — 재생 아이콘만, 누르면 시간 설정
  const unset = total <= 0;
  const onPress = () => {
    triggerHaptic('light');
    if (unset || onChange) { setEditing(true); return; }
    if (phase === 'running') { setPhase('paused'); return; }
    if (phase === 'done') { setPhase('idle'); setLeft(total); return; }
    endAt.current = Date.now() + left * 1000;
    setPhase('running');
  };
  // 길게 누르면 메뉴 — 시간 설정(이번에만 바꾸기) · 리셋(처음 시간으로)
  const [menuOpen, setMenuOpenState] = useState(false);
  const setMenuOpen = (v: boolean) => { setMenuOpenState(v); onMenuOpenChange?.(v); };
  const onLongPress = (onChange || unset) ? undefined : () => {
    triggerHaptic('medium');
    setMenuOpen(true);
  };
  const stop = () => { setPhase('idle'); setLeft(total); };

  // 돌아가는 중·끝남은 오렌지 var, 멈춤·대기는 옅은 바탕
  const active = phase === 'running' || phase === 'done';
  // 활성(돌아가는 중·끝남) 색 — 오렌지 var
  const blue = colors['custom/orange-var'] as string;
  const fg = active ? (colors['foreground/on-surface-inverse'] as string) : (colors['foreground/on-surface'] as string);
  // 대기 중에도 '40분'이 아니라 00:40:00 — 시작하면 같은 자리 숫자가 줄어든다
  const label = phase === 'done' ? '완료' : clock(left);

  return (
    <View style={[styles.anchor, menuOpen && styles.anchorOpen]}>
    {!(unset && hideWhenUnset) && (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      hitSlop={4}
      style={({pressed}) => [
        styles.pill,
        unset && styles.pillIconOnly,
        active
          ? {backgroundColor: blue}
          : styles.pillIdle,
        pressed && styles.pressed,
      ]}>
      {/* 돌아가는 중엔 일시정지(누르면 멈춤), 그 밖엔 재생(누르면 시작·이어서) */}
      {phase === 'running'
        ? <IconPauseFilled width={12} height={12} color={fg} />
        : <IconPlayFilled width={12} height={12} color={active ? fg : (colors['foreground/on-surface-muted'] as string)} />}
      {!unset && <Text style={[styles.label, {color: fg}]} numberOfLines={1}>{label}</Text>}
    </Pressable>
    )}
    <Menu
      items={[
        {id: 'edit', label: t('stepTimer.edit'), icon: IconEditFilled},
        // 시작 전(처음 시간 그대로)엔 되돌릴 게 없다
        {id: 'reset', label: t('stepTimer.reset'), icon: IconRefresh, disabled: phase === 'idle' && left === total},
      ]}
      visible={menuOpen}
      onSelect={id => { setMenuOpen(false); if (id === 'edit') setEditing(true); else stop(); }}
      onClose={() => setMenuOpen(false)}
      style={styles.menu}
    />
    <TimeDialog
      visible={editing}
      onClose={() => setEditing(false)}
      title={t('recipeEdit.groupTimer')}
      icon={IconTimerTwotone}
      avatarColor="orange"
      value={duration}
      // 같은 시간으로 확인해도 처음부터(시간이 그대로면 total 효과가 안 돌아 직접 되돌린다)
      onConfirm={v => { if (onChange) { onChange(v); return; } setDuration(v); setPhase('idle'); setLeft(durationSeconds(v)); }}
      // 비우면 작성자 기본 시간으로
      onDelete={() => { if (onChange) { onChange(undefined); return; } setDuration(defaultDuration); setPhase('idle'); setLeft(durationSeconds(defaultDuration)); }}
    />
    </View>
  );
});

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  // 알림 알약보다 두 단계 작게(28) — 묶음 머리줄 안에 들어가므로
  // 오른쪽을 2 더 — 숫자 끝(글자 여백)이 아이콘 쪽보다 좁아 보여, 눈으로 같아 보이게 보정
  anchor: {
    overflow: 'visible',
  },
  anchorOpen: {
    zIndex: 1000,
    elevation: 1000,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: Spacing.xs,
    zIndex: 1000,
    elevation: 1000,
  },
  pill: {...noticePillStyle, height: 28, paddingLeft: Spacing.sm, paddingRight: Spacing.sm + 2},
  // 아이콘만 — 정사각 원(28)
  pillIconOnly: {
    width: 28,
    paddingLeft: 0,
    paddingRight: 0,
    justifyContent: 'center',
  },
  pillIdle: {
    backgroundColor: colors['fill/normal'],
  },
  pressed: {
    opacity: 0.85,
    transform: [{scale: 0.97}],
  },
  label: {
    ...noticeLabelStyle,
    ...Typography.caption.medium,
    fontWeight: '600',
    fontVariant: ['tabular-nums'], // 숫자 폭 고정 — 줄어들 때 알약이 흔들리지 않게
  },
});
