import React from 'react';
import {StyleSheet, View} from 'react-native';
import {IconButton} from '@components/IconButton';
import {IconSliceVertical, IconDescription, IconFlash, IconFlashFilled} from '@components/Icon/IconIndex';

export type ViewMode = 'split' | 'all';

/**
 * 보기 토글 — 묶음뷰 ↔ 문장뷰. 상세 머리줄·편집 머리줄 공통(요약은 옆 SummaryToggle).
 * 아이콘은 지금 보기(묶음 = 세로 나누기, 문장 = 설명), 누르면 다른 보기로 바로 바뀐다
 */
export function ViewModeButton({value, onChange}: {value: ViewMode; onChange: (mode: ViewMode) => void}) {
  return (
    <View style={styles.slot}>
      <IconButton
        icon={value === 'split' ? IconSliceVertical : IconDescription}
        variant="ghost-secondary"
        size="medium"
        onPress={() => onChange(value === 'split' ? 'all' : 'split')}
      />
    </View>
  );
}

/**
 * 요약뷰 토글 — 보기 버튼 옆 플래시 아이콘(과정만). 켜면 오렌지 var·채운 플래시, 누를 때 바탕 없이
 */
export function SummaryToggle({value, onChange}: {value: boolean; onChange: (v: boolean) => void}) {
  return (
    <View style={styles.slot}>
      <IconButton
        icon={value ? IconFlashFilled : IconFlash}
        variant={value ? 'ghost-accent' : 'ghost-secondary'}
        size="medium"
        pressedBackground={false}
        onPress={() => onChange(!value)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 아이콘 칸 20(높이 28) — 머리줄 아이콘 버튼 공통 칸, 칸 사이는 16
  slot: {width: 20, height: 28, alignItems: 'center', justifyContent: 'center'},
});
