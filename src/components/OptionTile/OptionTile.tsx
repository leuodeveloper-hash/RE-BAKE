import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import type {SemanticColors} from '@constants/tokens';

type SemanticColorKey = keyof SemanticColors;
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {Card} from '@components/Container/Card';
import {AppIcon, AppIconSize} from '@components/Icon/AppIcon';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';

/** 선택 상태 색 */
export type OptionTileTone = 'accent' | 'neutral' | 'warning';
/** 선택 표시 방식 */
export type OptionTileSelectedStyle = 'fill' | 'outline';

export interface OptionTileProps {
  /** 없으면 아이콘 없이 글자만 — 재료처럼 그림이 없는 항목용 */
  icon?: React.FC<SvgProps>;
  iconSize?: AppIconSize;
  label: string;
  /** 라벨 아래 보조 글자 (예: 분량) */
  sublabel?: string;
  /** 고를 수 있는 타일일 때의 선택 상태 — 색으로 드러낸다 */
  selected?: boolean;
  /** 선택 색 (기본 accent). 쓰는 화면의 결에 맞춰 고른다 */
  selectedTone?: OptionTileTone;
  /**
   * 선택 표시 방식.
   * - 'fill'(기본): 배경까지 칠한다 — 고른 것이 한눈에 몰려 보인다
   * - 'outline': 테두리만 — 사진·글자가 주인공이라 배경을 덮으면 안 될 때
   */
  selectedStyle?: OptionTileSelectedStyle;
  style?: ViewStyle;
  onPress?: () => void;
}

/** 톤별 색 묶음 — 배경·테두리·글자가 따로 놀지 않게 한 곳에 둔다 */
const TONES: Record<OptionTileTone, {bg: SemanticColorKey; border: SemanticColorKey; fg: SemanticColorKey}> = {
  accent: {bg: 'fill/accent', border: 'border/accent-subtle', fg: 'foreground/on-accent-container'},
  neutral: {bg: 'fill/normal', border: 'border/normal', fg: 'foreground/on-surface'},
  warning: {bg: 'custom/yellow-subtle', border: 'custom/yellow-border', fg: 'custom/yellow'},
};

export function OptionTile({
  icon,
  iconSize = 'sm',
  label,
  sublabel,
  selected = false,
  selectedTone = 'accent',
  selectedStyle = 'fill',
  style,
  onPress,
}: OptionTileProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const tone = TONES[selectedTone];
  const content = (
    <Card
      style={[
        styles.card,
        selected && (selectedStyle === 'outline'
          // 테두리만 — 배경은 그대로 두고 선을 진하게 해 고른 것을 표시한다
          ? {borderColor: colors[tone.fg], borderWidth: 1.5}
          : {backgroundColor: colors[tone.bg], borderColor: colors[tone.border]}),
      ]}>
      {icon && (
        <AppIcon
          icon={icon}
          size={iconSize}
          color={selected ? colors[tone.fg] : colors['foreground/on-surface-muted']}
        />
      )}
      <Text style={[styles.label, selected && {color: colors[tone.fg]}]} numberOfLines={2}>{label}</Text>
      {sublabel ? (
        <Text style={[styles.sublabel, selected && {color: colors[tone.fg]}]} numberOfLines={1}>{sublabel}</Text>
      ) : null}
    </Card>
  );
  // 크기(style)는 바깥이 받는다 — Card에만 주면 pressable의 flex가 이겨
  // 지정한 폭·높이가 무시된다
  if (onPress) {
    return <Pressable style={[styles.pressable, style]} onPress={onPress}>{content}</Pressable>;
  }
  return <View style={[styles.pressable, style]}>{content}</View>;
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
