import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Spacing} from '@constants/spacing';
import {DIALOG_PADDING} from './DialogHeader';

/**
 * 팝업 버튼 줄 — 버튼을 같은 폭으로 나란히, 좌우 20, 위 여백 8을 스스로 갖는다(아래는 카드 여백).
 * 버튼은 둥근 사각(square) — 알약보다 카드와 어울린다
 */
export function DialogActions({children}: {children: React.ReactNode}) {
  const items = React.Children.toArray(
    React.isValidElement(children) && children.type === React.Fragment ? (children.props as {children: React.ReactNode}).children : children,
  ).filter(Boolean);
  return (
    <View style={styles.row}>
      {items.map((child, i) => (
        <View key={i} style={styles.cell}>
          {React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<any>, {shape: 'square'}) : child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: DIALOG_PADDING,
    paddingTop: Spacing.sm,
  },
  cell: {flex: 1},
});
