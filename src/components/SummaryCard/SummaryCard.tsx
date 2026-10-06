import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {triggerHaptic} from '@utils/haptics';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface SummaryCardProps {
  /** 맨 위 아이콘 — leading이 있으면 무시 */
  icon?: React.FC<SvgProps>;
  /** 맨 위 요소(아바타 등) */
  leading?: React.ReactNode;
  title: string;
  /** 한 줄 설명 — 여러 값이면 배열(값 사이 간격 8, 점 없이) */
  subtitle?: string | string[];
  onPress?: () => void;
}

/**
 * 요약 칸 — 위에 아이콘(또는 아바타), 아래 제목·한 줄 설명. 설정 맨 위처럼 두 칸씩 나란히 쓴다.
 * 부모 줄(row) 안에서 같은 폭으로 늘어난다(flex 1).
 */
export function SummaryCard({icon: Icon, leading, title, subtitle, onPress}: SummaryCardProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  return (
    <Pressable
      style={({pressed}) => [styles.card, pressed && onPress && styles.pressed]}
      onPress={onPress ? () => { triggerHaptic('light'); onPress(); } : undefined}
      disabled={!onPress}>
      <View style={styles.top}>
        {leading ?? (Icon ? <Icon width={24} height={24} color={colors['foreground/on-surface-muted']} /> : null)}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {Array.isArray(subtitle) ? (
        <View style={styles.subtitleRow}>
          {subtitle.map((v, i) => <Text key={i} style={styles.subtitle} numberOfLines={1}>{v}</Text>)}
        </View>
      ) : subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors['surface/bright'],
    // 모서리 16 — 아래 목록 카드와 같은 둥글기
    borderRadius: Radius['radius-lg'],
    padding: Spacing.md,
    // 제목과 설명 사이 2
    gap: 2,
  },
  pressed: {
    backgroundColor: colors['state/pressed'],
  },
  // 아이콘(아바타) 칸 — 24, 아래 제목까지 8(카드 gap 2 + 6)
  top: {
    height: 24,
    justifyContent: 'center',
    marginBottom: 6,
  },
  // 제목 title medium 16, 설명은 캡션 라지 14
  title: {
    ...Typography.title.medium,
    color: colors['foreground/on-surface'],
  },
  subtitleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  subtitle: {
    ...Typography.caption.large,
    color: colors['foreground/on-surface-muted'],
  },
});
