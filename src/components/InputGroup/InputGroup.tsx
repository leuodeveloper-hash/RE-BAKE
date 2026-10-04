import React from 'react';
import {StyleSheet, View} from 'react-native';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {useThemedStyles} from '@hooks/useThemedStyles';

/**
 * 입력칸 묶음 — 둥근 바깥 뷰 안에 줄마다 배경 있는 칸, 칸 사이 1픽셀 틈(구분선 대신).
 * 로그인(이메일·비밀번호)과 회고 쓰기(평가·개선점)가 같이 쓴다.
 * 자식 하나가 한 줄이다.
 */
export function InputGroup({children}: {children: React.ReactNode}) {
  const styles = useThemedStyles(createStyles);
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>{row}</View>
      ))}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  // 바깥은 둥글게 자르기만 — 칸 사이 틈으로 시트 배경이 비친다
  group: {
    borderRadius: Radius['radius-lg'],
    overflow: 'hidden',
    gap: 1,
  },
  row: {
    backgroundColor: colors['fill/subtle'],
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: Spacing.md,
  },
});
