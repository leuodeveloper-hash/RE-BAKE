import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {triggerHaptic} from '@utils/haptics';
import {withAlpha} from '@utils/color';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
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
 * 파란 바탕 + 파란 그림자로 일반 버튼과 구분되게 눈에 띈다. 위치(가운데·아래)는 이 컴포넌트가 정한다.
 */
export function FloatingNotice({label, icon: Icon, onPress, loading, bottom = 110}: FloatingNoticeProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const blue = colors['custom/blue'] as string;
  const fg = colors['foreground/on-surface-inverse'] as string;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, {bottom}]}>
      <Pressable
        disabled={loading}
        onPress={() => { triggerHaptic('light'); onPress(); }}
        style={({pressed}) => [
          styles.pill,
          {backgroundColor: blue, boxShadow: `0px 6px 16px -2px ${withAlpha(blue, 0.45)}`} as any,
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius['radius-full'],
  },
  pressed: {
    opacity: 0.85,
    transform: [{scale: 0.97}],
  },
  label: {
    ...Typography.caption.large,
    fontWeight: '600',
  },
});
