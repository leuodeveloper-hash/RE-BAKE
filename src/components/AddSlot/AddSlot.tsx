import React, {useState} from 'react';
import {Pressable, StyleSheet, type StyleProp, type ViewStyle} from 'react-native';
import {DashedBorder} from '@components/DashedBorder/DashedBorder';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconAdd} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {triggerHaptic} from '@utils/haptics';

export interface AddSlotProps {
  /** 정사각 한 변 */
  size: number;
  radius?: number;
  onPress?: () => void;
  /** 더하기 크기 — 큰 칸(요리모드 사진 카드)은 md */
  iconSize?: 'sm' | 'md';
  /** 바탕색 — 기본 fill/faint */
  background?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * 사진 등 '더하기' 빈 칸 — 점선 테두리(SVG, 대시 6·간격 5) + 가운데 +.
 * 과정 사진 빈 칸·요리모드 사진 추가 카드가 같은 걸 쓴다.
 * (RN borderStyle:'dashed'는 대시 길이를 못 정해 플랫폼마다 다르게 그려졌다)
 */
export function AddSlot({size, radius = 8, onPress, iconSize = 'sm', background, style}: AddSlotProps) {
  const colors = useColors();
  const [w, setW] = useState(size);
  return (
    <Pressable
      onPress={onPress ? () => { triggerHaptic('light'); onPress(); } : undefined}
      onLayout={e => setW(e.nativeEvent.layout.width)}
      style={[styles.slot, {width: size, height: size, borderRadius: radius, backgroundColor: background ?? colors['fill/faint']}, style]}>
      <DashedBorder width={w} height={size} radius={radius} strokeWidth={1} dash={6} gap={5} color={colors['border/normal'] as string} />
      <AppIcon icon={IconAdd} size={iconSize} color={colors['foreground/on-surface-muted']} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
