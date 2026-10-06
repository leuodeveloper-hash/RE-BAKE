import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle, type StyleProp, TextStyle} from 'react-native';
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
/** 글자 크기 — large는 한 단계 크게(요리 중처럼 멀리서 봐야 할 때) */
export type OptionTileSize = 'medium' | 'large';
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
  /** 글자 크기 (기본 medium) */
  size?: OptionTileSize;
  style?: StyleProp<ViewStyle>;
  /** 칸 배경 — bright(기본, 카드) / faint(흰 시트 위 회색 칸) */
  surface?: 'bright' | 'faint';
  /** 아이콘·라벨 사이 간격 (기본 Spacing.xs) */
  gap?: number;
  /** 고르기 전 아이콘 색 (기본 muted) — [+] 시트처럼 칸마다 색을 줄 때 */
  iconColor?: string;
  /** 라벨 글자 스타일 덮어쓰기 — 옆 목록 줄 제목과 크기를 맞출 때 */
  labelStyle?: StyleProp<TextStyle>;
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
  size = 'medium',
  style,
  surface = 'bright',
  gap,
  labelStyle,
  iconColor,
  onPress,
}: OptionTileProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const tone = TONES[selectedTone];
  const content = (
    <Card
      style={[
        styles.card,
        surface === 'faint' && styles.cardFaint,
        gap != null && {gap},
        // outline은 "테두리가 있는 타입" — 고르기 전에도 선이 보이고,
        // 고르면 그 선이 진해진다. 선이 아예 없으면 어디가 칸인지 모른다.
        selectedStyle === 'outline' && styles.cardOutline,
        // 고르면 어느 타입이든 배경이 채워진다 — outline은 그 위에 옅은
        // 아웃라인이 남아 테두리 타입이라는 성격을 유지한다.
        selected && {backgroundColor: colors[tone.bg], borderColor: colors[tone.border]},
      ]}>
      {icon && (
        <AppIcon
          icon={icon}
          size={iconSize}
          color={selected ? colors[tone.fg] : iconColor ?? colors['foreground/on-surface-muted']}
        />
      )}
      {/* large는 높이가 낮은 자리(요리모드 재료)에 쓰여 한 줄 — 길면 말줄임 */}
      <Text style={[styles.label, size === 'large' && styles.labelLarge, labelStyle, selected && {color: colors[tone.fg]}]} numberOfLines={size === 'large' ? 1 : 2}>{label}</Text>
      {sublabel ? (
        <Text style={[styles.sublabel, size === 'large' && styles.sublabelLarge, selected && {color: colors[tone.fg]}]} numberOfLines={1}>{sublabel}</Text>
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
  // 흰 시트 위에선 bright 카드가 배경과 같아 칸이 안 보인다 → 회색 칸
  cardFaint: {
    backgroundColor: colors['fill/faint'],
  },
  cardOutline: {
    borderWidth: 1,
    borderColor: colors['border/normal'],
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  sublabel: {
    fontFamily: Typography.caption.small.fontFamily,
    fontSize: Typography.caption.small.fontSize,
    fontWeight: Typography.caption.small.fontWeight as '500',
    lineHeight: Typography.caption.small.lineHeight,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
  },
  label: {
    fontFamily: Typography.caption.medium.fontFamily,
    fontSize: Typography.caption.medium.fontSize,
    fontWeight: Typography.caption.medium.fontWeight as '600',
    lineHeight: Typography.caption.medium.lineHeight,
    color: colors['foreground/on-surface'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
  // large — 한 단계 큰 글자 (라벨 12→14, 보조 11→12)
  labelLarge: {
    fontFamily: Typography.title.small.fontFamily,
    fontSize: Typography.title.small.fontSize,
    fontWeight: Typography.title.small.fontWeight as '600',
    lineHeight: Typography.title.small.lineHeight,
  },
  sublabelLarge: {
    fontSize: Typography.caption.medium.fontSize,
    lineHeight: Typography.caption.medium.lineHeight,
  },
});
