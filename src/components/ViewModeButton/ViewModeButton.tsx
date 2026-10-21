import React from 'react';
import {StyleSheet, View} from 'react-native';
import {IconButton} from '@components/IconButton';
import {Menu} from '@components/Menu';
import {IconSliceVertical, IconDescription, IconFlash, IconFlashFilled} from '@components/Icon/IconIndex';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';

export type ViewMode = 'split' | 'all';

/**
 * 보기 버튼 — 묶음뷰 / 문장뷰. 상세 머리줄·편집 머리줄 공통(요약은 옆 SummaryToggle).
 * 버튼 아이콘은 지금 보기, 누르면 메뉴(아이콘 밑 4·오른쪽 맞춤). ⋮ 옆이면 띄우게 marginRight는 쓰는 곳에서.
 */
export function ViewModeButton({value, onChange, open, onOpenChange}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {t} = useTranslation();
  const items = [
    // 묶음 = 묶음마다 나눈 칸, 문장 = 설명 칸과 같은 아이콘
    {id: 'split', label: t('recipeDetail.bundleView'), icon: IconSliceVertical},
    {id: 'all', label: t('recipeDetail.sentenceView'), icon: IconDescription},
  ];
  return (
    <View style={styles.anchor}>
      <View style={styles.slot}>
        <IconButton
          icon={items.find(i => i.id === value)?.icon ?? IconSliceVertical}
          variant="ghost-secondary"
          size="medium"
          forcePressed={open}
          onPress={() => onOpenChange(!open)}
        />
      </View>
      <Menu
        items={items}
        selectedId={value}
        visible={open}
        onClose={() => onOpenChange(false)}
        onSelect={id => { onOpenChange(false); onChange(id as ViewMode); }}
        style={styles.menu}
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
  anchor: {overflow: 'visible', zIndex: 1000},
  // 아이콘 칸 28 — ⋮·+와 같은 크기
  slot: {width: 28, height: 28, alignItems: 'center', justifyContent: 'center'},
  menu: {position: 'absolute', top: '100%', right: 0, marginTop: Spacing.xs, zIndex: 1000, elevation: 1000},
});
