import React from 'react';
import {StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';
import {Spacing} from '@constants/spacing';

export interface MetaLineProps {
  /** 줄에 늘어놓을 항목 — 빈 값은 빠진다 */
  items: (string | null | undefined | false)[];
  /** 항목·점 공통 글자 스타일 */
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

/**
 * 가운데 점(·)으로 나눈 한 줄 — 앱의 모든 '항목 · 항목' 표기 공통.
 * 점 양옆은 글자 공백이 아니라 콘텐츠 간격 8로 띄운다(글꼴마다 공백 폭이 달라 들쭉날쭉했다).
 * 넘치면 마지막 항목이 말줄임된다.
 */
export function MetaLine({items, textStyle, style}: MetaLineProps) {
  const list = items.filter((v): v is string => !!v);
  if (list.length === 0) return null;
  return (
    <View style={[styles.row, style]}>
      {list.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Text style={textStyle}>·</Text>}
          <Text style={[textStyle, i === list.length - 1 && styles.last]} numberOfLines={1}>{item}</Text>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  last: {
    flexShrink: 1,
  },
});
