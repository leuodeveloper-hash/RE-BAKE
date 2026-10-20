import React from 'react';
import {StyleSheet, Text, View, ViewStyle} from 'react-native';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useThemedStyles} from '@hooks/useThemedStyles';

export interface SubheaderProps {
  title: string;
  /** 오른쪽 끝 값(예: ×0.75) — 소제목과 같은 줄 */
  trailing?: string;
  style?: ViewStyle;
}

export function Subheader({title, trailing, style}: SubheaderProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.header, style]}>
      <Text style={styles.headerText}>{title}</Text>
      {trailing ? <Text style={[styles.headerText, styles.trailing]}>{trailing}</Text> : null}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  header: {
    height: 40,
    // 메뉴 항목(MenuItem)과 같은 12 — 8이면 소제목만 바깥으로 삐져나와 정렬이 안 맞았다
    paddingHorizontal: Spacing.smd,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trailing: {
    color: colors['foreground/on-surface'],
    fontVariant: ['tabular-nums'],
  },
  headerText: {
    fontFamily: Typography.caption.large.fontFamily,
    fontSize: Typography.caption.large.fontSize,
    fontWeight: Typography.caption.large.fontWeight as '500',
    lineHeight: Typography.caption.large.lineHeight,
    color: colors['foreground/on-surface-var'],
  },
});
