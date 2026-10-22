import React from 'react';
import {StyleSheet, View, type ViewStyle} from 'react-native';
import {Selector} from '@components/Selector';
import {Menu} from '@components/Menu';
import {useColors} from '@contexts/ThemeContext';
import type {AvatarColor} from '@components/Avatar/Avatar';
import {Spacing} from '@constants/spacing';
import {ColorPicker, getColorVarKey} from './ColorPicker';

/**
 * 색 피커 — 공통 Selector 고스트(앞에 지금 색 칩 + ⌃⌄). 메뉴는 ColorMenu로 따로 —
 * 입력칸 묶음처럼 둥글게 잘라내는 상자 안에 두면 메뉴가 잘려 안 보여서, 메뉴는 상자 바깥에 둔다
 */
export function ColorSelect({value, open, onOpenChange}: {
  value: AvatarColor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const colors = useColors();
  return (
    <Selector
      variant="ghost"
      showDropdown
      leadingColor={colors[getColorVarKey(value)] as string}
      onPress={() => onOpenChange(!open)}
      // 고르는 칩과 같은 var 색. 칸 여백(16)과 겹치지 않게 셀렉터 좌우 여백을 당긴다
      style={styles.flush}
    />
  );
}

/** 색 고르기 메뉴 — 공통 메뉴 상자 안에 색 점 줄(이름 없이). 피커 칸 바깥(묶음 상자 밖)에 absolute로 놓는다 */
export function ColorMenu({value, onChange, colors: list, open, onOpenChange, style}: {
  value: AvatarColor;
  onChange: (color: AvatarColor) => void;
  colors: AvatarColor[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  style?: ViewStyle;
}) {
  return (
    <Menu
      visible={open}
      onClose={() => onOpenChange(false)}
      // 칩 줄이 다 보이게 넓은 묶음(wide)
      sections={[{wide: true, content: (
        <View style={styles.dots}>
          <ColorPicker selected={value} onSelect={c => { onOpenChange(false); onChange(c); }} colors={list} dotSize={20} />
        </View>
      )}]}
      style={[styles.menu, style] as any}
    />
  );
}

const styles = StyleSheet.create({
  flush: {marginHorizontal: -Spacing.smd},
  dots: {paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs},
  menu: {position: 'absolute', top: '100%', left: 0, marginTop: Spacing.xs, zIndex: 1000, elevation: 1000},
});
