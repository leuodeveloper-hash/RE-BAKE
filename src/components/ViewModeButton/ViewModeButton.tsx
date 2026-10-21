import React from 'react';
import {StyleSheet, View} from 'react-native';
import {IconButton} from '@components/IconButton';
import {Menu} from '@components/Menu';
import {IconSliceVertical, IconDescriptionFilled, IconFlash} from '@components/Icon/IconIndex';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';

export type ViewMode = 'split' | 'all' | 'summary';

/**
 * 보기 버튼 — 묶음뷰 / 문장뷰 / 요약뷰. 상세 머리줄·편집 머리줄 공통.
 * 버튼 아이콘은 지금 보기, 누르면 메뉴(아이콘 밑 4·오른쪽 맞춤). ⋮ 옆이면 띄우게 marginRight는 쓰는 곳에서.
 */
export function ViewModeButton({value, onChange, withSummary, open, onOpenChange}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  /** 요약뷰 항목(과정만) */
  withSummary?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {t} = useTranslation();
  const items = [
    // 묶음 = 묶음마다 나눈 칸, 문장 = 설명 칸과 같은 아이콘, 요약 = 플래시(빠르게 훑기)
    {id: 'split', label: t('recipeDetail.bundleView'), icon: IconSliceVertical},
    {id: 'all', label: t('recipeDetail.sentenceView'), icon: IconDescriptionFilled},
    ...(withSummary ? [{id: 'summary', label: t('recipeDetail.summaryView'), icon: IconFlash}] : []),
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

const styles = StyleSheet.create({
  anchor: {overflow: 'visible', zIndex: 1000},
  // 아이콘 칸 28 — ⋮·+와 같은 크기
  slot: {width: 28, height: 28, alignItems: 'center', justifyContent: 'center'},
  menu: {position: 'absolute', top: '100%', right: 0, marginTop: Spacing.xs, zIndex: 1000, elevation: 1000},
});
