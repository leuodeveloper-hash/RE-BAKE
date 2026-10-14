import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {triggerHaptic} from '@utils/haptics';
import {withAlpha} from '@utils/color';
import type {SemanticColors} from '@constants/tokens';
import {PrimitiveColors, Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface FloatingNoticeProps {
  label: string;
  icon?: React.FC<SvgProps>;
  onPress: () => void;
  /** 처리 중 — 아이콘 자리에 돌아가는 표시, 누르기 막음 */
  loading?: boolean;
  /** 화면 아래에서 띄울 거리(탭바·하단 바 위). 기본 110 */
  bottom?: number;
}

/**
 * 화면 아래쪽에 떠 있는 알림 버튼 — "업데이트됨"처럼 눌러서 바로 처리하는 한 줄 안내.
 * 블루 바탕 + 같은 색 그림자로 일반 버튼과 구분되게 눈에 띈다. 위치(가운데·아래)는 이 컴포넌트가 정한다.
 */
/** 알림 알약 공통 — 업데이트됨 알림·과정 타이머가 같은 크기·색을 쓴다 */
export const NOTICE_COLOR = PrimitiveColors['blue/50'];
export const noticePillStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: Spacing.xs,
  height: 36,
  paddingHorizontal: Spacing.md,
  borderRadius: Radius['radius-full'],
};
export const noticeShadow = (color: string) => `0px 6px 16px -2px ${withAlpha(color, 0.45)}`;
export const noticeLabelStyle = {...Typography.caption.large, fontWeight: '600' as const};

export function FloatingNotice({label, icon: Icon, onPress, loading, bottom = 110}: FloatingNoticeProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  // 블루 한 단계 밝게(blue/40 → blue/50) — 기본 블루는 어둡고 무거워 '새 소식' 느낌이 덜했다
  const blue = NOTICE_COLOR;
  const fg = colors['foreground/on-surface-inverse'] as string;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, {bottom}]}>
      <Pressable
        disabled={loading}
        onPress={() => { triggerHaptic('light'); onPress(); }}
        style={({pressed}) => [
          styles.pill,
          {backgroundColor: blue, boxShadow: noticeShadow(blue)} as any,
          pressed && styles.pressed,
        ]}>
        {loading
          ? <ActivityIndicator size="small" color={fg} />
          : Icon ? <Icon width={16} height={16} color={fg} /> : null}
        <Text style={[styles.label, {color: fg}]} numberOfLines={1}>{label}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (_colors: SemanticColors) => StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: noticePillStyle,
  pressed: {
    opacity: 0.85,
    transform: [{scale: 0.97}],
  },
  label: noticeLabelStyle,
});
