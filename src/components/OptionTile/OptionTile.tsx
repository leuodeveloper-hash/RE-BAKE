import React from 'react';
import {Pressable, StyleSheet, Text, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {Card} from '@components/Container/Card';
import {AppIcon, AppIconSize} from '@components/Icon/AppIcon';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';

export interface OptionTileProps {
  /** 없으면 아이콘 없이 글자만 — 재료처럼 그림이 없는 항목용 */
  icon?: React.FC<SvgProps>;
  iconSize?: AppIconSize;
  label: string;
  /** 라벨 아래 보조 글자 (예: 분량) */
  sublabel?: string;
  /** 고를 수 있는 타일일 때의 선택 상태 — 색으로 드러낸다 */
  selected?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

export function OptionTile({
  icon,
  iconSize = 'sm',
  label,
  sublabel,
  selected = false,
  style,
  onPress,
}: OptionTileProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const content = (
    <Card style={[styles.card, selected && styles.cardSelected, style]}>
      {icon && (
        <AppIcon
          icon={icon}
          size={iconSize}
          color={selected ? colors['foreground/on-accent-container'] : colors['foreground/on-surface-muted']}
        />
      )}
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={2}>{label}</Text>
      {sublabel ? (
        <Text style={[styles.sublabel, selected && styles.labelSelected]} numberOfLines={1}>{sublabel}</Text>
      ) : null}
    </Card>
  );
  if (onPress) {
    return <Pressable style={styles.pressable} onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  pressable: {
    flex: 1,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  cardSelected: {
    backgroundColor: colors['fill/accent'],
    borderColor: colors['border/accent-subtle'],
  },
  labelSelected: {
    color: colors['foreground/on-accent-container'],
  },
  sublabel: {
    fontFamily: Typography.label.small.fontFamily,
    fontSize: Typography.label.small.fontSize,
    fontWeight: Typography.label.small.fontWeight as '500',
    lineHeight: Typography.label.small.lineHeight,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
  },
  label: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
});
