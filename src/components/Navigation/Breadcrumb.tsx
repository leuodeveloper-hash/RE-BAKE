import React from 'react';
import {StyleSheet, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {GlassContainer} from '@components/Container';
import {Selector} from '@components/Selector';
import {IconChevronRight, IconChevronLeft} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {NavPillButton} from '@components/Navigation';

export interface BreadcrumbProps {
  /** 1뎁스: 축 라벨 (전체/레시피 북/공법/회고 노트) */
  axisLabel: string;
  /** 1뎁스 축 아이콘 — 선택된 축을 메뉴와 동일하게 표시 (레시피북/공법 등) */
  axisIcon?: React.FC<SvgProps>;
  axisIconColor?: string;
  /** 2뎁스: 선택 항목 (특정 책/공법). 없으면 1뎁스만 */
  itemLabel?: string;
  onAxisPress?: () => void;
  onItemPress?: () => void;
  /**
   * 지정 시, 2뎁스(item)로 들어간 상태에선 1뎁스 축 텍스트 대신 뒤로가기(‹) 버튼을 렌더.
   * → 브레드크럼이 길어지지 않고 상위 목록으로 되돌아가는 동작만 남긴다. (항목 셀렉터는 유지)
   */
  onBack?: () => void;
}

/**
 * 앱바 타이틀용 2뎁스 브레드크럼. `[축] › [선택 항목]`
 * 각 세그먼트가 탭 가능 (메뉴는 부모가 AppBar titleMenu로 앵커링).
 *
 * onBack이 주어지고 항목(2뎁스)이 있으면: `[‹ 뒤로가기] [항목 ⌄]` 형태로 축 텍스트를 버튼으로 대체.
 */
export function Breadcrumb({axisLabel, axisIcon, axisIconColor, itemLabel, onAxisPress, onItemPress, onBack}: BreadcrumbProps) {
  const colors = useColors();
  const hasItem = itemLabel != null && itemLabel !== '';

  // 뎁스 진입 + onBack 제공 → 축을 뒤로가기 버튼으로 대체 (텍스트 길이 축소)
  if (hasItem && onBack) {
    return (
      <View style={styles.row}>
        <NavPillButton
          icon={IconChevronLeft}
          onPress={onBack}
          variant="ghost-secondary"
        />
        <GlassContainer contentStyle={styles.pill}>
          <Selector
            label={itemLabel!}
            showDropdown
            onPress={onItemPress}
            variant="ghost"
          />
        </GlassContainer>
      </View>
    );
  }

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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    gap: 2,
  },
});
