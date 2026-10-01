import React from 'react';
import {StyleSheet, View} from 'react-native';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {useThemedStyles} from '@hooks/useThemedStyles';

/**
 * 입력칸 묶음 — fill/subtle 둥근 컨테이너 안에 줄마다 입력칸, 줄 사이 얇은 선.
 * 로그인(이메일·비밀번호)과 회고 쓰기(평가·개선점)가 같이 쓴다.
 * 자식 하나가 한 줄이다.
 */
export function InputGroup({children}: {children: React.ReactNode}) {
  const styles = useThemedStyles(createStyles);
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.row}>{row}</View>
        </React.Fragment>
      ))}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  group: {
    backgroundColor: colors['fill/subtle'],
    borderRadius: Radius['radius-lg'],
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: Spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors['border/muted'],
    marginHorizontal: Spacing.md,
  },
});
