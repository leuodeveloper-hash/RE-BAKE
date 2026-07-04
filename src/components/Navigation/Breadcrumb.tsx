import React from 'react';
import {StyleSheet} from 'react-native';
import {GlassContainer} from '@components/Container';
import {Selector} from '@components/Selector';
import {IconChevronRight} from '@components/Icon/IconIndex';
import {useColorsV2} from '@contexts/ThemeContext';

export interface BreadcrumbProps {
  /** 1뎁스: 축 라벨 (전체/레시피 북/공법/회고 노트) */
  axisLabel: string;
  /** 2뎁스: 선택 항목 (특정 책/공법). 없으면 1뎁스만 */
  itemLabel?: string;
  onAxisPress?: () => void;
  onItemPress?: () => void;
}

/**
 * 앱바 타이틀용 2뎁스 브레드크럼. `[축] › [선택 항목]`
 * 각 세그먼트가 탭 가능 (메뉴는 부모가 AppBar titleMenu로 앵커링).
 */
export function Breadcrumb({axisLabel, itemLabel, onAxisPress, onItemPress}: BreadcrumbProps) {
  const colors = useColorsV2();
  const hasItem = itemLabel != null && itemLabel !== '';
  return (
    <GlassContainer contentStyle={styles.pill}>
      <Selector
        label={axisLabel}
        showDropdown={!hasItem}
        onPress={onAxisPress}
        variant="ghost"
      />
      {hasItem && (
        <>
          <IconChevronRight width={14} height={14} color={colors['foreground/on-surface-muted']} />
          <Selector
            label={itemLabel!}
            showDropdown
            onPress={onItemPress}
            variant="ghost"
          />
        </>
      )}
    </GlassContainer>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    gap: 2,
  },
});
