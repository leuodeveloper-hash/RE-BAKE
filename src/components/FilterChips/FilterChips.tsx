import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useColors} from '@contexts/ThemeContext';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconAdd} from '@components/Icon/IconIndex';
import {useTranslation} from '@contexts/LanguageContext';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

export interface FilterChipsProps {
  /** 고를 수 있는 값들 (예: 레시피북 이름, 공법 이름) */
  options: string[];
  /** 현재 고른 값 (null = 전체) */
  selected: string | null;
  onSelect: (value: string | null) => void;
  /** '전체' 칩 라벨 (기본: 전체) */
  allLabel?: string;
  /** 맨 뒤에 붙는 추가 버튼 — 목록을 보던 자리에서 바로 만든다 */
  onAdd?: () => void;
}

/**
 * 가로로 늘어놓는 필터 칩 — 메뉴를 열지 않고 한 번에 거른다.
 *
 * 레시피북·공법 어디에나 쓴다. 공법 전용으로 두면 같은 줄을 북용으로
 * 한 벌 더 만들게 되고, 한쪽만 고치는 일이 생긴다.
 */
export function FilterChips({options, selected, onSelect, allLabel, onAdd}: FilterChipsProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {t} = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      <Chip
        label={allLabel ?? t('methodFilterChips.all')}
        active={selected === null}
        onPress={() => onSelect(null)}
        styles={styles}
      />
      {options.map(option => (
        <Chip
          key={option}
          label={option}
          active={selected === option}
          onPress={() => onSelect(option)}
          styles={styles}
        />
      ))}
      {onAdd && (
        <Pressable
          onPress={onAdd}
          style={({pressed}) => [styles.chip, styles.chipInactive, pressed && {opacity: 0.7}]}>
          <AppIcon icon={IconAdd} size="xs" color={colors['foreground/on-surface-muted']} />
        </Pressable>
      )}
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

const createStyles = (colors: SemanticColors) => StyleSheet.create({
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
