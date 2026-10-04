import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {IconChevronRight} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface SelectFieldProps {
  /** 고른 값 글자 — 없으면 placeholder */
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  /** outlined(기본, 칸 배경) | ghost(InputGroup 안 — 배경·좌우 여백 없음, TextInput ghost와 짝) */
  style?: 'outlined' | 'ghost';
}

/**
 * 누르면 고르는 단계로 넘어가는 필드(날짜 등) — 입력 칸(TextInput outlined)과 같은 모양.
 * 직접 타이핑하는 칸이 아니라 오른쪽 > 로 "누르면 고른다"를 알린다.
 */
export function SelectField({value, placeholder, onPress, style = 'outlined'}: SelectFieldProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  return (
    <Pressable style={[styles.field, style === 'ghost' && styles.fieldGhost]} onPress={onPress}>
      <Text style={[styles.text, !value && styles.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
      <IconChevronRight width={16} height={16} color={colors['foreground/on-surface-muted']} />
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  // TextInput(outlined)의 inputContainer와 같은 값 — 나란히 놓여도 한 벌로 보이게
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors['surface/container'],
    borderRadius: Radius['radius-md'],
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    gap: Spacing.sm,
  },
  fieldGhost: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  text: {
    flex: 1,
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
    paddingVertical: Spacing.sm,
  },
  placeholder: {
    color: colors['foreground/on-surface-muted'],
  },
});
