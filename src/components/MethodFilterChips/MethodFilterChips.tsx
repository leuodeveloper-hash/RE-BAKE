import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useColorsV2} from '@contexts/ThemeContext';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

export interface MethodFilterChipsProps {
  /** 모든 가능한 용법 목록 (예: ['시폰법', '별립법']) */
  methods: string[];
  /** 현재 선택된 용법 (null = 전체) */
  selectedMethod: string | null;
  onSelect: (method: string | null) => void;
}

export function MethodFilterChips({methods, selectedMethod, onSelect}: MethodFilterChipsProps) {
  const styles = useThemedStylesV2(createStyles);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      <Chip
        label="전체"
        active={selectedMethod === null}
        onPress={() => onSelect(null)}
        styles={styles}
      />
      {methods.map(method => (
        <Chip
          key={method}
          label={method}
          active={selectedMethod === method}
          onPress={() => onSelect(method)}
          styles={styles}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        pressed && {opacity: 0.7},
      ]}>
      <Text style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelInactive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors['foreground/on-surface'],
  },
  chipInactive: {
    backgroundColor: colors['fill/normal'],
  },
  chipLabel: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: Typography.label.medium.letterSpacing,
    marginTop: FONT_BASELINE_OFFSET,
  },
  chipLabelActive: {
    color: colors['surface/normal'],
  },
  chipLabelInactive: {
    color: colors['foreground/on-surface'],
  },
});
