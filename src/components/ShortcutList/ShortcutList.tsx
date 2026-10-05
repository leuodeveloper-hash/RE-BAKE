import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Badge} from '@components/Badge';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface ShortcutRow {
  /** 왼쪽 — 무엇을 하는 줄인지 */
  label: string;
  /** 오른쪽 — 쓰는 기호(회색 뱃지로) */
  keys: string[];
}

/**
 * 단축키 목록 — "뜻 ··· 기호" 줄을 늘어놓는다. FloatingPanel 안에 넣어 쓴다.
 */
export function ShortcutList({rows}: {rows: ShortcutRow[]}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View>
      {rows.map(row => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <View style={styles.keys}>
            {row.keys.map(k => <Badge key={k} label={k} />)}
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    minHeight: 30,
  },
  rowLabel: {
    flex: 1,
    // 줄 이름 — 바디 서체 레귤러, 기본보다 한 단계 옅은 글자색(var)
    ...Typography.body.small,
    fontFamily: 'Pretendard-Regular',
    fontWeight: '400',
    color: colors['foreground/on-surface-var'],
  },
  keys: {
    flexDirection: 'row',
    gap: 4,
  },
});
